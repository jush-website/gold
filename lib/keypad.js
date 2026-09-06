// App 內建數字鍵盤的純邏輯。
//
// 抽出來的理由有二：一是 react-refresh 要求元件檔案只 export 元件，
// 二是「按下某個鍵之後算式變成什麼」正是最該寫測試的部分。

export const KEYPAD_KEYS = [
    ['7', '8', '9', '÷'],
    ['4', '5', '6', '×'],
    ['1', '2', '3', '−'],
    ['C', '0', '.', '+'],
];

// 顯示用符號 → 實際運算符號
export const OPS = { '÷': '/', '×': '*', '−': '-', '+': '+' };
const OP_CHARS = ['+', '-', '*', '/'];

// 只留數字與四則運算符號再求值；任何解析不出來的東西一律回 null，
// 呼叫端才不會拿到 NaN 當成金額寫進資料庫。
export const evaluateExpression = (expr) => {
    const safe = String(expr ?? '').replace(/[^0-9+\-*/.]/g, '');
    if (!safe) return null;
    try {
        const result = new Function(`return ${safe}`)();
        return Number.isFinite(result) ? result : null;
    } catch {
        return null;
    }
};

export const toDisplay = (expr) =>
    String(expr ?? '').replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−');

// 算式裡有沒有運算符號（開頭的負號不算）
export const hasOperator = (expr) =>
    OP_CHARS.some((op) => String(expr ?? '').slice(1).includes(op));

// 按下一個鍵之後，算式應該變成什麼
export const pressKey = (expr, key, { allowDecimal = true } = {}) => {
    const current = String(expr ?? '');

    if (key === 'C') return '';
    if (key === 'DEL') return current.slice(0, -1);

    const op = OPS[key];
    if (op) {
        // 開頭不接運算符號；連按運算符號時取代前一個，不會疊成 "1++"
        if (current === '') return current;
        if (OP_CHARS.includes(current.slice(-1))) return current.slice(0, -1) + op;
        return current + op;
    }

    if (key === '.') {
        if (!allowDecimal) return current;
        // 同一段數字裡只能有一個小數點
        const lastSegment = current.split(/[+\-*/]/).pop();
        if (lastSegment.includes('.')) return current;
        return current === '' ? '0.' : current + '.';
    }

    if (/^[0-9]$/.test(key)) return current + key;
    return current;
};

// 收工時把算式結算成單一數字字串；沒有運算符號就原樣保留，
// 避免使用者打的 "0080" 被無謂改寫。
export const resolveExpression = (expr, { allowDecimal = true } = {}) => {
    // 沒打完的算式（結尾停在運算符號）先把尾巴去掉再算，
    // 不然存檔時 parseFloat('390+') 會默默只取 390。
    const current = String(expr ?? '').replace(/[+\-*/]+$/, '');
    if (!hasOperator(current)) return current;
    const result = evaluateExpression(current);
    if (result == null) return current;
    const rounded = allowDecimal ? Math.round(result * 100) / 100 : Math.round(result);
    return String(rounded);
};
