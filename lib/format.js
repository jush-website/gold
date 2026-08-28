// 格式化與日期工具。
// 這些是純函式（同樣的輸入永遠得到同樣的輸出、不碰外部狀態），
// 從 App.jsx 抽出來才能單獨測試 —— App.jsx 一被 import 就會初始化 Firebase。

export const formatMoney = (amount, currency = 'TWD') => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(num);
};

// 金額可能是 null（例如尚未取得金價），這時顯示破折號而不是 $0
export const formatMoneyOrDash = (amount, currency = 'TWD') =>
    amount == null ? '—' : formatMoney(amount, currency);

export const GRAMS_PER_QIAN = 3.75;
export const GRAMS_PER_LIANG = 37.5;

export const formatWeight = (grams, unit = 'tw_qian') => {
    const num = Number(grams) || 0;
    if (unit === 'tw_qian') return new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num / GRAMS_PER_QIAN) + '錢';
    if (unit === 'tw_liang') return new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(num / GRAMS_PER_LIANG) + '兩';
    return new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + '克';
};

export const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    return `${d.getMonth() + 1}/${d.getDate()} ${days[d.getDay()]}`;
};

export const formatMonth = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return `${d.getFullYear()}年 ${d.getMonth() + 1}月`;
};

// 取得「當地時間」的 YYYY-MM-DD。
// 不可以用 toISOString()（那是 UTC）：台灣時間早上 8 點前會得到前一天。
export const getLocalYMD = (date = new Date()) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Firestore 的 serverTimestamp 在寫入後、伺服器回應前會是 null，
// 也可能是 Timestamp 物件或 { seconds } 形式，這裡統一成毫秒數以供排序。
export const getSortTime = (t) => {
    if (!t) return Date.now();
    if (typeof t.toMillis === 'function') return t.toMillis();
    if (t.seconds) return t.seconds * 1000;
    return Date.now();
};

export const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
