// 這是運行在 Vercel 伺服器端的程式碼 (Node.js)
import { parseBotGramPrice, parseBotCsv, usdOunceToTwdGram, GRAMS_PER_TROY_OUNCE } from '../lib/gold-parsers.js';

// 每個外部請求都要有逾時。台銀不是快站台，四個請求串起來很容易
// 拖到 Vercel function 的執行上限，那會變成整支 API 沒有回應。
// 逾時的個別失敗會被下游的備援機制接住。
const fetchWithTimeout = (url, options = {}, ms = 5000) =>
  fetch(url, { ...options, signal: AbortSignal.timeout(ms) });

// 對方回 200 但內容不是預期資料時，要看得出那到底是什麼
// —— 攔截頁、JS 驗證頁、還是版面改了。去掉標籤只留可讀文字。
const bodySnippet = (text, max = 240) =>
  String(text)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

export default async function handler(req, res) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
  };

  try {
    let currentPrice = 0;
    let history = [];
    let intraday = []; 
    // 價格來源：讓前端知道這個數字是台銀牌價、上一個交易日收盤，還是國際金價換算
    let priceSource = null;
    let historySource = null;
    let intradaySource = null;
    // 即時匯率：階段三取得後，歷史備援也要用同一個基準，
    // 否則歷史線與現價會落在不同的匯率上，兩者的差距分不出是漲跌還是換算誤差。
    let liveTwdRate = null;
    // 各階段的失敗原因。台銀擋境外機房 IP 是常見情況，
    // 沒有這些訊息只會看到「資料是 Yahoo 來的」卻不知道為什麼。
    const diagnostics = [];
    
    // --- 階段一：嘗試從 HTML 網頁抓取「台銀即時金價」 ---
    try {
        const htmlResponse = await fetchWithTimeout('https://rate.bot.com.tw/gold?Lang=zh-TW', { headers }, 6000);
        if (htmlResponse.ok) {
            const html = await htmlResponse.text();
            const gramPrice = parseBotGramPrice(html);
            if (gramPrice) {
                currentPrice = gramPrice;
                priceSource = 'bot';
            } else {
                diagnostics.push(`bot-html: 取得網頁但解析不到 1 公克牌價（${html.length} bytes）｜內容：${bodySnippet(html)}`);
            }
        } else {
            diagnostics.push(`bot-html: HTTP ${htmlResponse.status}`);
        }
    } catch (e) {
        console.warn("HTML Scraping failed:", e.message);
        diagnostics.push(`bot-html: ${e.name} ${e.message}`);
    }

    // --- 階段二：無論階段一是否成功，都嘗試抓取 CSV 歷史紀錄 ---
    // (修正：之前的版本如果 currentPrice 是 0 就不會進來這裡，導致週末無法取得歷史價格)
    try {
        const csvResponse = await fetchWithTimeout('https://rate.bot.com.tw/gold/csv/0', { headers }, 6000);
        if (csvResponse.ok) {
            const csvText = await csvResponse.text();
            // parseBotCsv 已保證回傳「舊 -> 新」的順序供圖表使用
            const parsedHistory = parseBotCsv(csvText);

            if (parsedHistory.length > 0) {
                historySource = 'bot-csv';
                history = parsedHistory;
            } else {
                diagnostics.push(`bot-csv: 取得檔案但解析不到資料列（${csvText.length} bytes）｜內容：${bodySnippet(csvText)}`);
            }
        } else {
            diagnostics.push(`bot-csv: HTTP ${csvResponse.status}`);
        }
    } catch (e) {
        console.warn("CSV Fetch failed:", e.message);
        diagnostics.push(`bot-csv: ${e.name} ${e.message}`);
    }

    // --- 關鍵修正：如果 HTML 抓不到價格 (週末休市)，使用歷史紀錄的最後一筆 (週五收盤價) ---
    if (!currentPrice && history.length > 0) {
        currentPrice = history[history.length - 1].price;
        priceSource = 'bot-close';
        console.log("Using history last price as current:", currentPrice);
    }

    // --- 階段三：抓取 Yahoo Finance 取得「當天即時走勢」 (Intraday) ---
    try {
        const yahooGoldUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=15m&range=1d';
        const yahooTwdUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/TWD=X?interval=1d&range=1d'; 

        const [gRes, tRes] = await Promise.all([
            fetchWithTimeout(yahooGoldUrl, { headers }, 5000),
            fetchWithTimeout(yahooTwdUrl, { headers }, 5000)
        ]);

        if (gRes.ok && tRes.ok) {
            const gData = await gRes.json();
            const tData = await tRes.json();
            
            const quote = gData.chart.result[0];
            const timestamps = quote.timestamp;
            const prices = quote.indicators.quote[0].close;
            const twdRate = tData.chart.result[0].meta.regularMarketPrice;
            liveTwdRate = twdRate;
            const ozToGram = GRAMS_PER_TROY_OUNCE; 
            
            if (timestamps && prices) {
                 // 計算校正參數 (Scaler)
                 let scaler = 1.02; // 預設溢價
                 
                 const validPrices = prices.filter(p => p);
                 const lastRawPrice = validPrices.length > 0 ? validPrices[validPrices.length-1] : 0;
                 const lastYahooPriceTwd = usdOunceToTwdGram(lastRawPrice, twdRate);
                 
                 if (currentPrice && lastYahooPriceTwd) {
                     scaler = currentPrice / lastYahooPriceTwd;
                 } else if (!currentPrice && lastYahooPriceTwd) {
                     // 如果還是沒有 currentPrice，用 Yahoo 算出來的頂著用
                     currentPrice = Math.floor(lastYahooPriceTwd * scaler);
                     priceSource = 'yahoo';
                 }

                 intraday = timestamps.map((ts, i) => {
                     if (!prices[i]) return null;
                     const p = ((prices[i] * twdRate) / ozToGram) * scaler;
                     const d = new Date(ts * 1000);
                     const timeStr = d.toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false });
                     return { date: d.toISOString(), price: Math.floor(p), label: timeStr };
                 }).filter(x => x !== null);

                 // 這條曲線是 COMEX 黃金期貨（GC=F）的形狀乘上校正倍率，
                 // 不是台銀當天的牌價變化 —— 前端必須據此標示清楚。
                 if (intraday.length > 0) intradaySource = 'yahoo-gcf';
            }
        }
    } catch (e) {
        console.error("Intraday fetch failed", e);
        diagnostics.push(`yahoo-intraday: ${e.name} ${e.message}`);
    }

    // --- 備援機制：如果歷史資料還是空的，嘗試用 Yahoo 補歷史日線 ---
    if (history.length < 5) {
         try {
            const yHistRes = await fetchWithTimeout('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=3mo', { headers }, 5000);
            if (yHistRes.ok) {
                const yData = await yHistRes.json();
                const quotes = yData.chart.result[0];
                // 優先用階段三取得的即時匯率，與 currentPrice 同一個換算基準。
                // 拿不到才退回估計值，並在 historySource 標明差別。
                const rate = liveTwdRate || 32.5;
                const rateIsEstimated = !liveTwdRate;
                const premium = 1.02;
                
                if (quotes.timestamp && quotes.indicators.quote[0].close) {
                    historySource = rateIsEstimated ? 'yahoo-estimated' : 'yahoo';
                    history = quotes.timestamp.map((ts, i) => {
                        const p = quotes.indicators.quote[0].close[i];
                        if (!p) return null;
                        const priceTwd = Math.floor(((p * rate) / GRAMS_PER_TROY_OUNCE) * premium);
                        const d = new Date(ts * 1000);
                        return {
                            date: d.toISOString().split('T')[0],
                            price: priceTwd,
                            label: `${d.getMonth()+1}/${d.getDate()}`
                        };
                    }).filter(x => x !== null);
                }
            }
         } catch (e) {
             console.error("History fallback failed", e);
         }
         
         // 最後防線：只接受真的抓到的資料。
         // 以前這裡會回傳寫死的 2880，使用者看到的是一個「看起來正常但錯誤」的價格，
         // 連帶讓總市值與損益全部算錯 —— 寧可回 null 讓前端顯示「無法取得」。
         if (!currentPrice && history.length > 0) {
             currentPrice = history[history.length - 1].price;
             priceSource = historySource === 'yahoo-estimated' ? 'yahoo' : 'bot-close';
         }
    }

    // Vercel Edge / CDN 快取：5 分鐘內的重複請求直接由 CDN 回應，
    // 之後 30 分鐘內先回舊資料再背景更新（stale-while-revalidate），
    // 避免每位使用者每次開 App 都去爬台銀網頁而變慢或被擋。
    // 但「抓不到價格」不可以被快取 —— 否則一次短暫失敗會讓所有人
    // 在接下來 5 分鐘都看到「無法取得」。
    res.setHeader('Cache-Control', currentPrice
        ? 's-maxage=300, stale-while-revalidate=1800'
        : 'no-store');
    res.status(200).json({
      success: true,
      currentPrice: currentPrice || null,
      priceSource,
      historySource,
      intradaySource,
      // 只有明確要求時才附上，平常保持回應乾淨
      ...(req?.query?.debug ? { diagnostics, twdRate: liveTwdRate } : {}),
      history,
      intraday,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Gold API Error:', error);
    // 失敗不快取，讓下一次請求重新嘗試
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).json({ 
      success: false, 
      error: error.message || "Unknown error",
      currentPrice: null, 
      history: [],
      intraday: []
    });
  }
}
