import { describe, it, expect } from 'vitest';
import {
  monthlyCost, yearlyCost, summarizeSubscriptions, sortByMonthlyCost,
  advanceDate, daysUntil, collectDueBillings, MAX_CATCH_UP,
} from '../lib/subscriptions.js';

describe('monthlyCost / yearlyCost', () => {
  // 整個功能的重點：不換算成月均就看不出真實負擔
  it('把各種週期換算成每月平均', () => {
    expect(monthlyCost({ amount: 390, cycle: 'monthly' })).toBe(390);
    expect(monthlyCost({ amount: 1200, cycle: 'yearly' })).toBe(100);
    expect(monthlyCost({ amount: 300, cycle: 'quarterly' })).toBe(100);
    expect(monthlyCost({ amount: 60, cycle: 'weekly' })).toBeCloseTo(260, 0);
  });

  it('年費用', () => {
    expect(yearlyCost({ amount: 390, cycle: 'monthly' })).toBe(4680);
    expect(yearlyCost({ amount: 1200, cycle: 'yearly' })).toBe(1200);
  });

  it('週期無效或金額壞掉時回 0，不是 NaN', () => {
    expect(monthlyCost({ amount: 100, cycle: 'daily' })).toBe(0);
    expect(monthlyCost({ amount: 'abc', cycle: 'monthly' })).toBe(0);
    expect(monthlyCost(null)).toBe(0);
  });
});

describe('summarizeSubscriptions', () => {
  const subs = [
    { name: 'A', amount: 390, cycle: 'monthly' },
    { name: 'B', amount: 1200, cycle: 'yearly' },
    { name: 'C', amount: 500, cycle: 'monthly', active: false },
  ];

  it('合計月均與年總', () => {
    const r = summarizeSubscriptions(subs);
    expect(r.monthly).toBe(490);   // 390 + 100
    expect(r.yearly).toBe(5880);   // 4680 + 1200
  });

  // 暫停的訂閱要留在清單裡，但不能算進花費
  it('暫停的訂閱不計入金額，但有計數', () => {
    const r = summarizeSubscriptions(subs);
    expect(r.activeCount).toBe(2);
    expect(r.pausedCount).toBe(1);
  });

  it('空清單', () => {
    expect(summarizeSubscriptions([])).toMatchObject({ monthly: 0, yearly: 0, activeCount: 0 });
  });
});

describe('sortByMonthlyCost', () => {
  it('依月均由大到小，最貴的排最前面', () => {
    const sorted = sortByMonthlyCost([
      { name: '小', amount: 60, cycle: 'monthly' },
      { name: '大', amount: 6000, cycle: 'yearly' },   // 月均 500
      { name: '中', amount: 300, cycle: 'monthly' },
    ]);
    expect(sorted.map((s) => s.name)).toEqual(['大', '中', '小']);
  });

  it('不會改到原本的陣列', () => {
    const original = [{ amount: 1, cycle: 'monthly' }, { amount: 2, cycle: 'monthly' }];
    sortByMonthlyCost(original);
    expect(original[0].amount).toBe(1);
  });
});

describe('advanceDate', () => {
  it('每週加七天', () => {
    expect(advanceDate('2026-08-28', 'weekly')).toBe('2026-09-04');
  });

  // 月底是最容易出錯的地方：1/31 的下個月不該溢位成 3/3
  it('月底往後推會夾到當月最後一天', () => {
    expect(advanceDate('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(advanceDate('2024-01-31', 'monthly')).toBe('2024-02-29'); // 閏年
    expect(advanceDate('2026-03-31', 'monthly')).toBe('2026-04-30');
  });

  it('跨年', () => {
    expect(advanceDate('2026-12-15', 'monthly')).toBe('2027-01-15');
    expect(advanceDate('2026-11-30', 'quarterly')).toBe('2027-02-28');
    expect(advanceDate('2026-02-29', 'yearly')).toBe(null); // 2026 不是閏年，這天不存在
  });

  it('每季與每年', () => {
    expect(advanceDate('2026-01-15', 'quarterly')).toBe('2026-04-15');
    expect(advanceDate('2026-01-15', 'yearly')).toBe('2027-01-15');
  });

  it('壞日期回 null 而不是丟例外', () => {
    expect(advanceDate('2026-02-31', 'monthly')).toBeNull(); // 不存在的日期
    expect(advanceDate('abc', 'monthly')).toBeNull();
    expect(advanceDate('2026-01-15', 'daily')).toBeNull();
  });
});

describe('daysUntil', () => {
  it('計算距離天數', () => {
    expect(daysUntil('2026-09-01', '2026-08-28')).toBe(4);
    expect(daysUntil('2026-08-28', '2026-08-28')).toBe(0);
    expect(daysUntil('2026-08-25', '2026-08-28')).toBe(-3);
  });

  it('壞輸入回 null', () => {
    expect(daysUntil('abc', '2026-08-28')).toBeNull();
  });
});

describe('collectDueBillings', () => {
  const base = {
    id: 'sub1', name: 'Netflix', amount: 390, cycle: 'monthly',
    active: true, autoLog: true, autoLogFrom: '2026-01-01',
  };

  it('還沒到期就不記帳', () => {
    const r = collectDueBillings({ ...base, nextBillingDate: '2026-09-05' }, '2026-08-28');
    expect(r.billings).toHaveLength(0);
    expect(r.nextBillingDate).toBe('2026-09-05');
  });

  it('到期當天要記一筆，並把下次扣款日往後推', () => {
    const r = collectDueBillings({ ...base, nextBillingDate: '2026-08-28' }, '2026-08-28');
    expect(r.billings).toHaveLength(1);
    expect(r.billings[0]).toMatchObject({ date: '2026-08-28', amount: 390 });
    expect(r.nextBillingDate).toBe('2026-09-28');
  });

  it('很久沒開 App 會把中間漏掉的期數補齊', () => {
    const r = collectDueBillings({ ...base, nextBillingDate: '2026-06-15' }, '2026-08-28');
    expect(r.billings.map((b) => b.date)).toEqual(['2026-06-15', '2026-07-15', '2026-08-15']);
    expect(r.nextBillingDate).toBe('2026-09-15');
  });

  // 這是自動記帳最危險的地方：重複執行不可以產生兩筆
  it('每期的 id 由訂閱與日期決定，重跑會得到同樣的 id', () => {
    const sub = { ...base, nextBillingDate: '2026-08-28' };
    const a = collectDueBillings(sub, '2026-08-28');
    const b = collectDueBillings(sub, '2026-08-28');
    expect(a.billings[0].id).toBe('sub-sub1-2026-08-28');
    expect(b.billings[0].id).toBe(a.billings[0].id);
  });

  // 把「下次扣款日」填成很久以前，不該一次灌進幾十筆
  it('補記期數有上限', () => {
    const r = collectDueBillings({ ...base, autoLogFrom: '2000-01-01', nextBillingDate: '2010-01-01' }, '2026-08-28');
    expect(r.billings.length).toBeLessThanOrEqual(MAX_CATCH_UP);
  });

  it('不補記訂閱建立之前的期數', () => {
    const r = collectDueBillings(
      { ...base, autoLogFrom: '2026-08-01', nextBillingDate: '2026-06-15' },
      '2026-08-28',
    );
    expect(r.billings.map((b) => b.date)).toEqual(['2026-08-15']);
  });

  it('暫停或關掉自動記帳就完全不動作', () => {
    const due = { ...base, nextBillingDate: '2026-08-01' };
    expect(collectDueBillings({ ...due, active: false }, '2026-08-28').billings).toHaveLength(0);
    expect(collectDueBillings({ ...due, autoLog: false }, '2026-08-28').billings).toHaveLength(0);
  });

  it('壞資料不丟例外', () => {
    expect(collectDueBillings(null, '2026-08-28').billings).toEqual([]);
    expect(collectDueBillings({ ...base, nextBillingDate: 'abc' }, '2026-08-28').billings).toEqual([]);
    expect(collectDueBillings({ ...base, nextBillingDate: '2026-08-01' }, 'abc').billings).toEqual([]);
  });
});
