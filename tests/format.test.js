import { describe, it, expect } from 'vitest';
import {
  formatMoney, formatMoneyOrDash, formatWeight,
  getLocalYMD, getSortTime, generateId,
} from '../lib/format.js';

describe('getLocalYMD', () => {
  // 這一組是 P2 修掉的真實 bug：原本用 toISOString()（UTC），
  // 台灣時間早上 8 點前新增的紀錄會被記成前一天。
  it('台灣清晨 07:30 要回傳當天，不是前一天', () => {
    // 2026-08-27T23:30:00Z = 台北時間 2026-08-28 07:30
    const d = new Date('2026-08-27T23:30:00Z');
    expect(getLocalYMD(d)).toBe('2026-08-28');
    expect(d.toISOString().split('T')[0]).toBe('2026-08-27'); // 舊寫法會記錯
  });

  it('台灣深夜 23:59 仍是當天', () => {
    expect(getLocalYMD(new Date('2026-08-27T15:59:00Z'))).toBe('2026-08-27');
  });

  it('月份與日期補零', () => {
    expect(getLocalYMD(new Date('2026-01-05T04:00:00Z'))).toBe('2026-01-05');
  });
});

describe('formatWeight', () => {
  it('公克換算成錢（1 錢 = 3.75 克）', () => {
    expect(formatWeight(37.5, 'tw_qian')).toBe('10.00錢');
  });

  it('公克換算成兩（1 兩 = 37.5 克）', () => {
    expect(formatWeight(37.5, 'tw_liang')).toBe('1.000兩');
  });

  it('預設單位是錢', () => {
    expect(formatWeight(3.75)).toBe('1.00錢');
  });

  it('無效輸入當成 0，不能是 NaN', () => {
    expect(formatWeight(undefined, 'g')).toBe('0.00克');
    expect(formatWeight('abc', 'g')).toBe('0.00克');
  });
});

describe('formatMoney / formatMoneyOrDash', () => {
  it('加上千分位且不顯示小數', () => {
    expect(formatMoney(1234567)).toBe('$1,234,567');
  });

  it('無效金額當成 0', () => {
    expect(formatMoney(undefined)).toBe('$0');
  });

  it('null 顯示破折號而不是 $0（金價尚未取得）', () => {
    expect(formatMoneyOrDash(null)).toBe('—');
    expect(formatMoneyOrDash(undefined)).toBe('—');
    expect(formatMoneyOrDash(0)).toBe('$0'); // 0 是有效金額，不可當成沒資料
  });
});

describe('getSortTime', () => {
  it('支援 Firestore Timestamp 物件', () => {
    expect(getSortTime({ toMillis: () => 1700000000000 })).toBe(1700000000000);
  });

  it('支援 { seconds } 形式', () => {
    expect(getSortTime({ seconds: 1700000000 })).toBe(1700000000000);
  });

  it('serverTimestamp 尚未回填（null）時不能爆炸', () => {
    expect(typeof getSortTime(null)).toBe('number');
  });
});

describe('generateId', () => {
  it('連續產生不重複', () => {
    const ids = new Set(Array.from({ length: 500 }, generateId));
    expect(ids.size).toBe(500);
  });
});
