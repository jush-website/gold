import { describe, it, expect } from 'vitest';
import { sanitizeSeries, priceBounds, smoothPath } from '../lib/chart.js';

describe('sanitizeSeries', () => {
  const good = [{ price: 3100 }, { price: 3110 }, { price: 3095 }, { price: 3120 }, { price: 3105 }];

  it('保留正常資料', () => {
    expect(sanitizeSeries(good)).toHaveLength(5);
  });

  // 這一組守的是實際遇到的災情：一筆 0 元把 Y 軸整個拉開，
  // 其餘真實波動被壓成頂端一條線，圖上看起來像金價瞬間腰斬。
  it('剔除 0 元的壞資料', () => {
    const result = sanitizeSeries([...good, { price: 0 }]);
    expect(result).toHaveLength(5);
    expect(result.some((d) => d.price === 0)).toBe(false);
  });

  it('剔除離譜的離群值（腰斬或翻倍）', () => {
    expect(sanitizeSeries([...good, { price: 5 }, { price: 99000 }])).toHaveLength(5);
  });

  it('保留合理的漲跌，不可誤殺', () => {
    // 3100 → 3400 是大漲但完全可能發生
    expect(sanitizeSeries([...good, { price: 3400 }])).toHaveLength(6);
  });

  it('非數字、負數、缺欄位一律剔除', () => {
    expect(sanitizeSeries([...good, { price: 'abc' }, { price: -100 }, {}, null])).toHaveLength(5);
  });

  it('資料太少時不做離群值判斷（樣本不足）', () => {
    expect(sanitizeSeries([{ price: 3100 }, { price: 9 }])).toHaveLength(2);
  });

  it('壞輸入回空陣列而不是丟例外', () => {
    expect(sanitizeSeries(null)).toEqual([]);
    expect(sanitizeSeries('x')).toEqual([]);
  });
});

describe('priceBounds', () => {
  it('上下留白，線不會貼著邊緣', () => {
    const { min, max } = priceBounds([3000, 3100]);
    expect(min).toBeLessThan(3000);
    expect(max).toBeGreaterThan(3100);
  });

  it('全部同價時仍有可畫的範圍', () => {
    const { min, max } = priceBounds([3000, 3000, 3000]);
    expect(max).toBeGreaterThan(min);
  });
});

describe('smoothPath', () => {
  it('空資料回空字串', () => {
    expect(smoothPath([])).toBe('');
  });

  it('兩點畫直線', () => {
    expect(smoothPath([[0, 0], [100, 100]])).toBe('M 0,0 L 100,100');
  });

  it('三點以上用貝茲曲線', () => {
    const d = smoothPath([[0, 50], [50, 10], [100, 60]]);
    expect(d.startsWith('M 0,50')).toBe(true);
    expect(d).toContain('C');
  });

  // 單調插值的重點：曲線不可以衝過實際資料的最高／最低點，
  // 否則圖上會出現從來沒發生過的價格。
  it('不會超出資料的數值範圍', () => {
    const pts = [[0, 80], [25, 20], [50, 22], [75, 78], [100, 40]];
    const nums = smoothPath(pts).match(/-?\d+(\.\d+)?/g).map(Number);
    const ys = nums.filter((_, i) => i % 2 === 1);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(20 - 0.001);
    expect(Math.max(...ys)).toBeLessThanOrEqual(80 + 0.001);
  });
});
