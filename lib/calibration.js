// 金價校準。
// 資料來源是國際金價換算，與台銀實際牌價之間有一個大致固定的價差
// （銀行的買賣價差與手續費）。讓使用者輸入一次台銀的實際價格，
// 由這裡算出倍率，之後套用在所有價格上。

// 超出這個範圍的多半是打錯字，不是校準
export const MIN_FACTOR = 0.8;
export const MAX_FACTOR = 1.25;
export const DEFAULT_FACTOR = 1;

export const isValidFactor = (f) =>
    Number.isFinite(f) && f >= MIN_FACTOR && f <= MAX_FACTOR;

// 由「台銀實際價格」與「App 目前顯示的價格」推算倍率。
// 這樣使用者不必自己算除法，只要照抄台銀網站上的數字。
export const computeFactor = (actualPrice, shownPrice) => {
    const actual = Number(actualPrice);
    const shown = Number(shownPrice);
    if (!Number.isFinite(actual) || !Number.isFinite(shown)) return null;
    if (actual <= 0 || shown <= 0) return null;

    const factor = actual / shown;
    return isValidFactor(factor) ? factor : null;
};

export const applyFactor = (price, factor = DEFAULT_FACTOR) => {
    // null / undefined 必須原樣傳回：Number(null) 是 0，
    // 一旦轉成 0，「金價暫時無法取得」就會變成顯示 $0。
    if (price == null) return price;

    const value = Number(price);
    if (!Number.isFinite(value)) return price;
    const f = isValidFactor(Number(factor)) ? Number(factor) : DEFAULT_FACTOR;
    return Math.round(value * f);
};

// 整條走勢一起套用，圖表與市值才會落在同一個基準上
export const applyFactorToSeries = (series, factor = DEFAULT_FACTOR) => {
    if (!Array.isArray(series)) return [];
    if (!isValidFactor(Number(factor))) return series;
    return series.map((point) => ({ ...point, price: applyFactor(point.price, factor) }));
};

// 顯示用：1.0114 → "+1.14%"
export const describeFactor = (factor) => {
    const f = Number(factor);
    if (!isValidFactor(f) || f === DEFAULT_FACTOR) return null;
    const pct = (f - 1) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
};
