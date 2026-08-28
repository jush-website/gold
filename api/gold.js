// 這是運行在 Vercel 伺服器端的程式碼 (Node.js)
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
    
    // --- 階段一：嘗試從 HTML 網頁抓取「台銀即時金價」 ---
    try {
        const htmlResponse = await fetch('https://rate.bot.com.tw/gold?Lang=zh-TW', { headers });
        if (htmlResponse.ok) {
            const html = await htmlResponse.text();
            const gramRowMatch = html.match(/1\s*公克.*?<\/tr>/s);
            if (gramRowMatch) {
                const rowHtml = gramRowMatch[0];
                const prices = rowHtml.match(/>([0-9,]+)<\/td>/g);
                if (prices && prices.length >= 2) {
                    const rawPrice = prices[1].replace(/<[^>]+>/g, '').replace(/,/g, '');
                    currentPrice = parseFloat(rawPrice);
                    if (currentPrice) priceSource = 'bot';
                }
            }
        }
    } catch (e) {
        console.warn("HTML Scraping failed:", e.message);
    }

    // --- 階段二：無論階段一是否成功，都嘗試抓取 CSV 歷史紀錄 ---
    // (修正：之前的版本如果 currentPrice 是 0 就不會進來這裡，導致週末無法取得歷史價格)
    try {
        const csvResponse = await fetch('https://rate.bot.com.tw/gold/csv/0', { headers });
        if (csvResponse.ok) {
            const csvText = await csvResponse.text();
            const rows = csvText.split('\n').filter(row => row.trim() !== '');
            // CSV 格式：日期, 本行買入, 本行賣出...
            const dataRows = rows.slice(1); 
            const parsedHistory = dataRows.map(row => {
                const columns = row.split(',');
                if (columns.length < 4) return null;
                const dateStr = columns[0].trim(); 
                const price = parseFloat(columns[3]); // 賣出價
                if (!dateStr || isNaN(price) || dateStr.length < 8) return null;
                
                // 格式化日期 YYYY-MM-DD
                const formattedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
                return {
                    date: formattedDate,
                    price: price,
                    label: `${dateStr.substring(4, 6)}/${dateStr.substring(6, 8)}`
                };
            }).filter(item => item !== null);

            if (parsedHistory.length > 0) {
                historySource = 'bot-csv';
                history = parsedHistory.reverse(); // 最舊的在前，最新的在後 (通常 CSV 下載是倒序，需確認)
                // 台銀 CSV 通常是日期新的在上面，所以 parse 後 index 0 是最新的。
                // 我們希望 history 是 [舊 -> 新] 供圖表使用，所以 reverse。
                // 但是！如果是直接從陣列 map 下來，順序通常是 [新 -> 舊]。
                // 讓我們確保最後一筆是 "最新" 的日期。
                if (new Date(history[0].date) > new Date(history[history.length-1].date)) {
                    history.reverse();
                }
            }
        }
    } catch (e) {
        console.warn("CSV Fetch failed:", e.message);
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
            fetch(yahooGoldUrl, { headers }),
            fetch(yahooTwdUrl, { headers })
        ]);

        if (gRes.ok && tRes.ok) {
            const gData = await gRes.json();
            const tData = await tRes.json();
            
            const quote = gData.chart.result[0];
            const timestamps = quote.timestamp;
            const prices = quote.indicators.quote[0].close;
            const twdRate = tData.chart.result[0].meta.regularMarketPrice;
            const ozToGram = 31.1034768; 
            
            if (timestamps && prices) {
                 // 計算校正參數 (Scaler)
                 let scaler = 1.02; // 預設溢價
                 
                 const validPrices = prices.filter(p => p);
                 const lastRawPrice = validPrices.length > 0 ? validPrices[validPrices.length-1] : 0;
                 const lastYahooPriceTwd = (lastRawPrice * twdRate) / ozToGram;
                 
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
            }
        }
    } catch (e) {
        console.error("Intraday fetch failed", e);
    }

    // --- 備援機制：如果歷史資料還是空的，嘗試用 Yahoo 補歷史日線 ---
    if (history.length < 5) {
         try {
            const yHistRes = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=3mo', { headers });
            if (yHistRes.ok) {
                const yData = await yHistRes.json();
                const quotes = yData.chart.result[0];
                const estTwdRate = 32.5; // 估計匯率
                const premium = 1.02;
                
                if (quotes.timestamp && quotes.indicators.quote[0].close) {
                    // 注意：這裡的匯率是估計值，只用來畫走勢形狀，不是精確台幣牌價
                    historySource = 'yahoo-estimated';
                    history = quotes.timestamp.map((ts, i) => {
                        const p = quotes.indicators.quote[0].close[i];
                        if (!p) return null;
                        const priceTwd = Math.floor(((p * estTwdRate) / 31.1034768) * premium);
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
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
    res.status(200).json({
      success: true,
      currentPrice: currentPrice || null,
      priceSource,
      historySource,
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
