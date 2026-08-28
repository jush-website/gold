import { describe, it, expect } from 'vitest';
import { parseBotGramPrice, parseBotCsv, usdOunceToTwdGram } from '../lib/gold-parsers.js';

describe('parseBotGramPrice（台銀牌價頁）', () => {
  // 這一組守的是一個實際存在過的 bug：
  // 原本用 rowHtml.match(/>([0-9,]+)<\/td>/g)，但 String.match 加 /g
  // 回傳的是完整比對字串 ">3,110</td>" 而不是括號群組，
  // 於是 parseFloat(">3110") === NaN，即時牌價其實從來沒抓成功過。
  it('取出本行賣出價（第二個數字欄）', () => {
    const html = `
      <table><tr><td>1公克</td>
      <td class="text-right">3,050</td>
      <td class="text-right">3,110</td></tr></table>`;
    expect(parseBotGramPrice(html)).toBe(3110);
  });

  it('沒有千分位也能解析', () => {
    expect(parseBotGramPrice('<tr><td>1 公克</td><td>950</td><td>988</td></tr>')).toBe(988);
  });

  it('結果必須是可運算的數字，不能是 NaN', () => {
    const price = parseBotGramPrice('<tr><td>1公克</td><td>3,050</td><td>3,110</td></tr>');
    expect(Number.isNaN(price)).toBe(false);
    expect(price * 2).toBe(6220);
  });

  it('頁面改版或維護中時回 null，不可回 NaN 或 0', () => {
    expect(parseBotGramPrice('<html><body>系統維護中</body></html>')).toBeNull();
    expect(parseBotGramPrice('')).toBeNull();
    expect(parseBotGramPrice(null)).toBeNull();
  });

  it('欄位不足時回 null', () => {
    expect(parseBotGramPrice('<tr><td>1公克</td><td>3050</td></tr>')).toBeNull();
  });
});

describe('parseBotCsv（台銀歷史牌價）', () => {
  const csv = [
    '日期,本行買入,現金買入,本行賣出',
    '20260826,3010,3005,3110',
    '20260825,3000,2995,3100',
    '20260822,2980,2975,3080',
  ].join('\n');

  it('解析出日期與賣出價', () => {
    const rows = parseBotCsv(csv);
    expect(rows).toHaveLength(3);
    expect(rows[rows.length - 1]).toMatchObject({ date: '2026-08-26', price: 3110, label: '08/26' });
  });

  it('一律回傳「舊 → 新」的順序供圖表繪製', () => {
    const dates = parseBotCsv(csv).map((r) => r.date);
    expect(dates).toEqual([...dates].sort());
  });

  it('CSV 本來就是舊到新時不會被反轉', () => {
    const ascending = ['日期,買,現,賣', '20260825,3000,0,3100', '20260826,3010,0,3110'].join('\n');
    expect(parseBotCsv(ascending).map((r) => r.date)).toEqual(['2026-08-25', '2026-08-26']);
  });

  it('略過欄位不足、日期異常或價格非數字的列', () => {
    const dirty = ['日期,買,現,賣', '20260826,3010,3005,3110', '壞掉的列', '2026,1,2,3', '20260825,3000,2995,不是數字'].join('\n');
    const rows = parseBotCsv(dirty);
    expect(rows).toHaveLength(1);
    expect(rows[0].price).toBe(3110);
  });

  it('空輸入回空陣列而不是丟例外', () => {
    expect(parseBotCsv('')).toEqual([]);
    expect(parseBotCsv(null)).toEqual([]);
    expect(parseBotCsv('只有標題列')).toEqual([]);
  });
});

describe('usdOunceToTwdGram', () => {
  it('美元／盎司換算台幣／公克', () => {
    // 2500 USD/oz ÷ 31.1034768 g × 32.5 TWD ≈ 2612 TWD/g
    expect(Math.round(usdOunceToTwdGram(2500, 32.5))).toBe(2612);
  });

  it('套用溢價倍率', () => {
    const base = usdOunceToTwdGram(2500, 32.5);
    expect(usdOunceToTwdGram(2500, 32.5, 1.02)).toBeCloseTo(base * 1.02, 6);
  });

  it('無效輸入回 null，不可回 NaN 或 Infinity', () => {
    expect(usdOunceToTwdGram(undefined, 32.5)).toBeNull();
    expect(usdOunceToTwdGram(2500, 0)).toBeNull();
    expect(usdOunceToTwdGram(-1, 32.5)).toBeNull();
    expect(usdOunceToTwdGram(NaN, 32.5)).toBeNull();
  });
});
