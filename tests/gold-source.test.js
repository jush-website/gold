import { describe, it, expect } from 'vitest';
import { describePriceSource, describeSeriesSource, describePriceTitle } from '../lib/gold-source.js';

describe('describePriceSource', () => {
  it('台銀即時牌價不需要特別警示', () => {
    expect(describePriceSource('bot')).toEqual({ text: '台銀即時牌價', tone: 'normal' });
  });

  it('週末休市時標明是上一交易日收盤', () => {
    expect(describePriceSource('bot-close').tone).toBe('muted');
  });

  // 換算值必須警示：它不是台銀真正掛出來的價格
  it('國際金價換算要標成警示', () => {
    const r = describePriceSource('yahoo');
    expect(r.tone).toBe('warn');
    expect(r.text).toContain('國際金價換算');
  });

  it('來源不明時不硬掰說明', () => {
    expect(describePriceSource(null)).toBeNull();
    expect(describePriceSource('something-else')).toBeNull();
  });
});

describe('describeSeriesSource', () => {
  // 「今日」畫的是 GC=F 期貨的形狀，台銀一天只調幾次牌價，
  // 不講清楚會讓人以為那是台銀當天的牌價變化。
  it('今日走勢要標明是國際金價換算', () => {
    const r = describeSeriesSource('1d', { intradaySource: 'yahoo-gcf' });
    expect(r.tone).toBe('warn');
    expect(r.text).toContain('非台銀牌價變化');
  });

  it('沒有當日資料時不顯示說明', () => {
    expect(describeSeriesSource('1d', {})).toBeNull();
  });

  it('台銀歷史牌價是可信的，低調標示即可', () => {
    expect(describeSeriesSource('90d', { historySource: 'bot-csv' })).toEqual({
      text: '台銀歷史牌價', tone: 'muted',
    });
  });

  // 標題已經是「黃金參考價」、價格下方也標了「國際金價換算」，
  // 圖表下方再講一次只是雜訊
  it('走 Yahoo 的歷史不重複說明（標題已經講過）', () => {
    expect(describeSeriesSource('90d', { historySource: 'yahoo' })).toBeNull();
  });

  // 這條路徑用寫死的匯率 32.5 換算，會有系統性誤差，必須讓使用者知道
  it('估算的歷史資料要警示匯率是估計值', () => {
    const r = describeSeriesSource('90d', { historySource: 'yahoo-estimated' });
    expect(r.tone).toBe('warn');
    expect(r.text).toContain('估計值');
  });

  it('沒有來源資訊時回 null 而不是丟例外', () => {
    expect(describeSeriesSource('10d')).toBeNull();
    expect(describeSeriesSource('10d', {})).toBeNull();
  });
});

describe('describePriceTitle', () => {
  // 拿不到台銀牌價時，標題不能還寫「台銀賣出金價」
  it('走 Yahoo 時標題不可自稱台銀', () => {
    expect(describePriceTitle('yahoo')).toBe('黃金參考價');
  });

  it('台銀通了就顯示台銀', () => {
    expect(describePriceTitle('bot')).toBe('台銀賣出金價');
    expect(describePriceTitle('bot-close')).toBe('台銀賣出金價');
  });

  it('來源不明時用中性的說法', () => {
    expect(describePriceTitle(null)).toBe('黃金價格');
  });
});
