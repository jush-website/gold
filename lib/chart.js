// 走勢圖的資料整理與路徑計算。純函式，可單獨測試。

// 資料來源是爬來的，偶爾會出現 0 元或明顯錯誤的數字。
// 一個異常點會把 Y 軸整個拉開，讓其餘真實波動被壓成一條直線，
// 所以畫圖之前先用中位數擋掉離譜的值。
// 金價不會在相鄰兩天腰斬或翻倍，這個範圍很安全。
export const sanitizeSeries = (data, { lowRatio = 0.5, highRatio = 2 } = {}) => {
    if (!Array.isArray(data)) return [];

    const valid = data.filter((d) => d && Number.isFinite(Number(d.price)) && Number(d.price) > 0);
    if (valid.length < 3) return valid;

    const sorted = valid.map((d) => Number(d.price)).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    return valid.filter((d) => {
        const price = Number(d.price);
        return price >= median * lowRatio && price <= median * highRatio;
    });
};

// Y 軸範圍。原本用 ±0.1% 的邊距，線幾乎貼著上下緣；
// 改成依實際波動幅度留白，波動小的時候至少留一點空間。
export const priceBounds = (prices) => {
    if (!prices.length) return { min: 0, max: 100 };
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    const span = hi - lo;
    const pad = span > 0 ? span * 0.18 : Math.max(hi * 0.002, 1);
    return { min: lo - pad, max: hi + pad };
};

// 單調三次插值（Fritsch–Carlson）。
// 相較於直接連直線比較耐看，而且保證不會在兩點之間衝過實際的最高／最低值 ——
// 一般的平滑曲線會 overshoot，在價格圖上等於畫出從沒發生過的價格。
export const smoothPath = (points) => {
    const n = points.length;
    if (n === 0) return '';
    if (n === 1) return `M ${points[0][0]},${points[0][1]}`;
    if (n === 2) return `M ${points[0][0]},${points[0][1]} L ${points[1][0]},${points[1][1]}`;

    // 各段斜率
    const dx = [];
    const dy = [];
    const slope = [];
    for (let i = 0; i < n - 1; i++) {
        dx[i] = points[i + 1][0] - points[i][0];
        dy[i] = points[i + 1][1] - points[i][1];
        slope[i] = dx[i] === 0 ? 0 : dy[i] / dx[i];
    }

    // 各點切線，遇到轉折就歸零，避免超出資料範圍
    const tangent = [slope[0]];
    for (let i = 1; i < n - 1; i++) {
        if (slope[i - 1] * slope[i] <= 0) {
            tangent[i] = 0;
        } else {
            const w1 = 2 * dx[i] + dx[i - 1];
            const w2 = dx[i] + 2 * dx[i - 1];
            tangent[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]);
        }
    }
    tangent[n - 1] = slope[n - 2];

    let d = `M ${points[0][0]},${points[0][1]}`;
    for (let i = 0; i < n - 1; i++) {
        const third = dx[i] / 3;
        const c1x = points[i][0] + third;
        const c1y = points[i][1] + tangent[i] * third;
        const c2x = points[i + 1][0] - third;
        const c2y = points[i + 1][1] - tangent[i + 1] * third;
        d += ` C ${c1x},${c1y} ${c2x},${c2y} ${points[i + 1][0]},${points[i + 1][1]}`;
    }
    return d;
};
