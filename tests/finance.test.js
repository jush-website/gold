import { describe, it, expect } from 'vitest';
import { summarizeDebt, splitDebtsBySettlement, summarizeDebts, summarizeGold } from '../lib/finance.js';

describe('summarizeDebt', () => {
  it('累加多筆還款', () => {
    const r = summarizeDebt({ amount: 1000, repayments: [{ amount: 300 }, { amount: 200 }] });
    expect(r.repaid).toBe(500);
    expect(r.remaining).toBe(500);
    expect(r.isSettled).toBe(false);
  });

  it('剛好還完視為結清', () => {
    expect(summarizeDebt({ amount: 1000, repayments: [{ amount: 1000 }] }).isSettled).toBe(true);
  });

  it('溢繳也視為結清', () => {
    const r = summarizeDebt({ amount: 1000, repayments: [{ amount: 1200 }] });
    expect(r.remaining).toBe(-200);
    expect(r.isSettled).toBe(true);
  });

  it('沒有還款紀錄', () => {
    expect(summarizeDebt({ amount: 500 }).remaining).toBe(500);
  });

  // 舊寫法用 Number(r.amount) 沒有 || 0，遇到髒資料會算出 NaN；
  // 而 NaN <= 0 是 false，那筆借款會永遠卡在「未結清」拿不掉。
  it('還款金額缺值或非數字時當成 0，不可產生 NaN', () => {
    const r = summarizeDebt({ amount: 1000, repayments: [{ amount: 400 }, {}, { amount: 'abc' }] });
    expect(r.repaid).toBe(400);
    expect(Number.isNaN(r.remaining)).toBe(false);
    expect(r.remaining).toBe(600);
  });

  it('字串金額也能算', () => {
    expect(summarizeDebt({ amount: '1000', repayments: [{ amount: '250' }] }).remaining).toBe(750);
  });
});

describe('splitDebtsBySettlement', () => {
  it('分成未結清與已結清兩組', () => {
    const { activeDebtsList, settledDebtsList } = splitDebtsBySettlement([
      { id: 'a', amount: 1000, repayments: [{ amount: 1000 }] },
      { id: 'b', amount: 500 },
      { id: 'c', amount: 800, repayments: [{ amount: 300 }] },
    ]);
    expect(settledDebtsList.map((d) => d.id)).toEqual(['a']);
    expect(activeDebtsList.map((d) => d.id)).toEqual(['b', 'c']);
  });

  it('空清單', () => {
    const r = splitDebtsBySettlement([]);
    expect(r.activeDebtsList).toEqual([]);
    expect(r.settledDebtsList).toEqual([]);
  });
});

describe('summarizeDebts', () => {
  it('整本帳本的合計', () => {
    const r = summarizeDebts([
      { amount: 1000, repayments: [{ amount: 400 }] },
      { amount: 2000, repayments: [{ amount: 500 }, { amount: 500 }] },
    ]);
    expect(r).toEqual({ totalBorrowed: 3000, totalRepaid: 1400, remaining: 1600 });
  });
});

describe('summarizeGold', () => {
  const holdings = [
    { weight: 10, totalCost: 30000 },
    { weight: 5, totalCost: 16000 },
  ];

  it('計算持倉、平均成本與損益', () => {
    const r = summarizeGold(holdings, 3200);
    expect(r.totalWeight).toBe(15);
    expect(r.totalCost).toBe(46000);
    expect(r.avgCost).toBeCloseTo(3066.67, 1);
    expect(r.currentValue).toBe(48000);
    expect(r.profit).toBe(2000);
  });

  it('虧損時 profit 為負', () => {
    expect(summarizeGold(holdings, 2800).profit).toBe(-4000);
  });

  // P2 的修正：抓不到金價時不可以算出一個假的市值
  it('沒有金價時市值與損益為 null，但成本仍可計算', () => {
    const r = summarizeGold(holdings, null);
    expect(r.currentValue).toBeNull();
    expect(r.profit).toBeNull();
    expect(r.totalCost).toBe(46000);
    expect(r.avgCost).toBeCloseTo(3066.67, 1);
  });

  it('沒有任何紀錄時平均成本為 0，不可是 NaN（除以零）', () => {
    const r = summarizeGold([], 3200);
    expect(r.avgCost).toBe(0);
    expect(Number.isNaN(r.avgCost)).toBe(false);
  });
});
