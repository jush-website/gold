import { describe, it, expect } from 'vitest';
import { describePriceSource, describeSeriesSource } from '../lib/gold-source.js';

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
    expect(r.text).toContain('非台銀牌價');
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

  it('用即時匯率換算的歷史仍要標明不是台銀牌價', () => {
    const r = describeSeriesSource('90d', { historySource: 'yahoo' });
    expect(r.tone).toBe('warn');
    expect(r.text).toContain('非台銀牌價');
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
