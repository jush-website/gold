import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler from '../api/gold.js';

const mockRes = () => {
  const res = { headers: {}, statusCode: null, body: null };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

const botHtml = '<tr><td>1公克</td><td class="text-right">3,050</td><td class="text-right">3,110</td></tr>';
const botCsv = ['日期,買,現,賣', '20260826,3010,3005,3105', '20260825,3000,2995,3095'].join('\n');

// 用 URL 決定要回傳什麼，其餘一律當成連線失敗
const stubFetch = (routes) => vi.fn(async (url) => {
  const key = Object.keys(routes).find((k) => String(url).includes(k));
  if (!key) throw new Error('network unavailable');
  return { ok: true, text: async () => routes[key], json: async () => JSON.parse(routes[key]) };
});

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); });

describe('/api/gold', () => {
  it('台銀牌價頁可用時採用即時賣出價', async () => {
    global.fetch = stubFetch({ 'rate.bot.com.tw/gold?': botHtml, '/gold/csv/': botCsv });
    const res = mockRes();
    await handler({}, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.currentPrice).toBe(3110);
    expect(res.body.priceSource).toBe('bot');
    expect(res.body.historySource).toBe('bot-csv');
  });

  it('週末休市只有 CSV 時，採用最後交易日收盤價', async () => {
    global.fetch = stubFetch({ '/gold/csv/': botCsv });
    const res = mockRes();
    await handler({}, res);

    expect(res.body.currentPrice).toBe(3105); // CSV 中最新那一天的賣出價
    expect(res.body.priceSource).toBe('bot-close');
    expect(res.body.history[res.body.history.length - 1].date).toBe('2026-08-26');
  });

  // P2 的修正：以前這裡會回傳寫死的 2880，
  // 使用者看到的總市值與損益全是錯的卻沒有任何提示。
  it('所有來源都失敗時回傳 null，不可捏造價格', async () => {
    global.fetch = vi.fn(async () => { throw new Error('down'); });
    const res = mockRes();
    await handler({}, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.currentPrice).toBeNull();
    expect(res.body.currentPrice).not.toBe(2880);
    expect(res.body.history).toEqual([]);
  });

  it('成功的回應交給 CDN 快取', async () => {
    global.fetch = stubFetch({ 'rate.bot.com.tw/gold?': botHtml, '/gold/csv/': botCsv });
    const res = mockRes();
    await handler({}, res);
    expect(res.headers['Cache-Control']).toBe('s-maxage=300, stale-while-revalidate=1800');
  });

  it('抓不到價格時不可快取，否則一次失敗會擴散五分鐘', async () => {
    global.fetch = vi.fn(async () => { throw new Error('down'); });
    const res = mockRes();
    await handler({}, res);
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it('回應帶有 updatedAt 供前端顯示資料時間', async () => {
    global.fetch = stubFetch({ '/gold/csv/': botCsv });
    const res = mockRes();
    await handler({}, res);
    expect(Number.isNaN(Date.parse(res.body.updatedAt))).toBe(false);
  });
});
