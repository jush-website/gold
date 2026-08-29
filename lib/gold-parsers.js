// 台灣銀行黃金牌價與 Yahoo Finance 的解析／換算工具。
// 抽出來的原因：這是整個系統最脆弱的地方 —— 台銀網頁改版就會壞，
// 而且壞掉時不會噴錯，只會安靜地回傳空值。有測試才擋得住。

export const GRAMS_PER_TROY_OUNCE = 31.1034768;

// 從台銀黃金牌價頁面的 HTML 取出「1 公克」那一列的本行賣出價。
// 頁面結構：<tr>...1公克...<td>買入</td><td>賣出</td>...</tr>
export const parseBotGramPrice = (html) => {
    if (typeof html !== 'string') return null;
    const gramRowMatch = html.match(/1\s*公克.*?<\/tr>/s);
    if (!gramRowMatch) return null;

    // 必須用 matchAll 才拿得到括號群組：
    // String.match(/.../g) 回傳的是完整比對字串（">3,110</td>"），
    // 直接 parseFloat 會因為開頭那個 ">" 而得到 NaN。
    const prices = [...gramRowMatch[0].matchAll(/>([0-9,]+)<\/td>/g)].map((m) => m[1]);
    if (prices.length < 2) return null;

    // 第 0 欄是本行買入、第 1 欄是本行賣出
    const price = parseFloat(prices[1].replace(/,/g, ''));
    return Number.isFinite(price) && price > 0 ? price : null;
};

// 解析台銀的歷史牌價 CSV。
// 欄位：日期(YYYYMMDD), 本行買入, ..., 本行賣出
// 回傳一律是「舊 → 新」的順序，供圖表由左至右繪製。
export const parseBotCsv = (csvText) => {
    if (typeof csvText !== 'string') return [];

    const rows = csvText.split('\n').filter((row) => row.trim() !== '');
    const parsed = rows.slice(1).map((row) => {
        const columns = row.split(',');
        if (columns.length < 4) return null;

        const dateStr = columns[0].trim();
        const price = parseFloat(columns[3]);
        // 必須 > 0：Number.isFinite(0) 是 true，價格 0 的列會混進來，
        // 在圖表上變成一個把 Y 軸整個拉開的懸崖。
        if (!dateStr || !Number.isFinite(price) || price <= 0 || dateStr.length < 8) return null;

        return {
            date: `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`,
            price,
            label: `${dateStr.substring(4, 6)}/${dateStr.substring(6, 8)}`,
        };
    }).filter(Boolean);

    if (parsed.length > 1 && parsed[0].date > parsed[parsed.length - 1].date) {
        parsed.reverse();
    }
    return parsed;
};

// 國際金價（美元／盎司）換算成台幣／公克。
// scaler 是台銀牌價相對國際金價的溢價倍率。
export const usdOunceToTwdGram = (usdPerOunce, twdRate, scaler = 1) => {
    if (!Number.isFinite(usdPerOunce) || !Number.isFinite(twdRate)) return null;
    if (usdPerOunce <= 0 || twdRate <= 0) return null;
    return ((usdPerOunce * twdRate) / GRAMS_PER_TROY_OUNCE) * scaler;
};
