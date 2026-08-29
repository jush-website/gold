import { describe, it, expect } from 'vitest';
import {
  computeFactor, applyFactor, applyFactorToSeries, describeFactor,
  isValidFactor, DEFAULT_FACTOR,
} from '../lib/calibration.js';

describe('computeFactor', () => {
  // 使用者只要照抄台銀網站的數字，除法由程式做
  it('由台銀實際價與 App 顯示價推算倍率', () => {
    expect(computeFactor(4750, 4698)).toBeCloseTo(1.01107, 5);
  });

  it('兩者相同時倍率為 1', () => {
    expect(computeFactor(4700, 4700)).toBe(1);
  });

  it('打錯字造成離譜的倍率一律拒絕', () => {
    expect(computeFactor(47500, 4698)).toBeNull(); // 多打一個 0
    expect(computeFactor(470, 4698)).toBeNull();   // 少打一位
  });

  it('無效輸入回 null 而不是 NaN', () => {
    expect(computeFactor('abc', 4698)).toBeNull();
    expect(computeFactor(0, 4698)).toBeNull();
    expect(computeFactor(4750, 0)).toBeNull();
    expect(computeFactor(null, null)).toBeNull();
  });
});

describe('applyFactor', () => {
  it('套用倍率並取整', () => {
    expect(applyFactor(4698, 1.01107)).toBe(4750);
  });

  it('沒有倍率時原值不變', () => {
    expect(applyFactor(4698)).toBe(4698);
    expect(applyFactor(4698, DEFAULT_FACTOR)).toBe(4698);
  });

  // 壞掉的倍率不可以污染價格 —— 寧可顯示未校準的原值
  it('離譜的倍率被忽略，不套用', () => {
    expect(applyFactor(4698, 99)).toBe(4698);
    expect(applyFactor(4698, 'abc')).toBe(4698);
    expect(applyFactor(4698, null)).toBe(4698);
  });

  // 金價取不到時是 null，絕不能被校準成 0
  // —— 那會讓「無法取得」變成顯示 $0，是會誤導人的
  it('null 原樣回傳，不可變成 0', () => {
    expect(applyFactor(null, 1.01)).toBeNull();
    expect(applyFactor(undefined, 1.01)).toBeUndefined();
  });

  it('非數字的價格原樣回傳', () => {
    expect(applyFactor('abc', 1.01)).toBe('abc');
  });
});

describe('applyFactorToSeries', () => {
  const series = [{ date: 'a', price: 100 }, { date: 'b', price: 200 }];

  it('整條走勢一起套用，且保留其他欄位', () => {
    const r = applyFactorToSeries(series, 1.1);
    expect(r.map((p) => p.price)).toEqual([110, 220]);
    expect(r[0].date).toBe('a');
  });

  it('不會改到原本的陣列', () => {
    applyFactorToSeries(series, 1.1);
    expect(series[0].price).toBe(100);
  });

  it('壞輸入回空陣列或原樣', () => {
    expect(applyFactorToSeries(null, 1.1)).toEqual([]);
    expect(applyFactorToSeries(series, 99)).toBe(series);
  });
});

describe('describeFactor', () => {
  it('轉成百分比說明', () => {
    expect(describeFactor(1.0114)).toBe('+1.14%');
    expect(describeFactor(0.99)).toBe('-1.00%');
  });

  it('未校準時不顯示', () => {
    expect(describeFactor(1)).toBeNull();
    expect(describeFactor(undefined)).toBeNull();
  });
});

describe('isValidFactor', () => {
  it('接受合理範圍', () => {
    expect(isValidFactor(1.02)).toBe(true);
    expect(isValidFactor(0.95)).toBe(true);
  });

  it('拒絕離譜的值', () => {
    expect(isValidFactor(0.5)).toBe(false);
    expect(isValidFactor(2)).toBe(false);
    expect(isValidFactor(NaN)).toBe(false);
  });
});
