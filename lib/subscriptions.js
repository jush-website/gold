// 訂閱管理的計算邏輯。純函式，不碰 Firebase 也不碰 DOM。

export const CYCLES = {
    weekly: { label: '每週', perYear: 52 },
    monthly: { label: '每月', perYear: 12 },
    quarterly: { label: '每季', perYear: 4 },
    yearly: { label: '每年', perYear: 1 },
};

export const CYCLE_KEYS = Object.keys(CYCLES);

const toNumber = (v) => Number(v) || 0;

// 一次扣款金額換算成「每月平均」。
// 這是整個功能的重點：年繳 1200 其實是每月 100，
// 不換算就看不出真實的每月負擔，也沒辦法比較哪個訂閱比較貴。
export const monthlyCost = (sub) => {
    const cycle = CYCLES[sub?.cycle];
    if (!cycle) return 0;
    return (toNumber(sub.amount) * cycle.perYear) / 12;
};

export const yearlyCost = (sub) => {
    const cycle = CYCLES[sub?.cycle];
    if (!cycle) return 0;
    return toNumber(sub.amount) * cycle.perYear;
};

// 只計入啟用中的訂閱；暫停的保留在清單裡但不算錢
export const summarizeSubscriptions = (subs = []) => {
    const active = subs.filter((s) => s?.active !== false);
    return {
        monthly: active.reduce((sum, s) => sum + monthlyCost(s), 0),
        yearly: active.reduce((sum, s) => sum + yearlyCost(s), 0),
        activeCount: active.length,
        pausedCount: subs.length - active.length,
    };
};

// 依月均由大到小排序 —— 想砍訂閱時第一眼就看到最貴的
export const sortByMonthlyCost = (subs = []) =>
    [...subs].sort((a, b) => monthlyCost(b) - monthlyCost(a));

// ── 日期 ────────────────────────────────────────────────────

const parseYMD = (ymd) => {
    if (typeof ymd !== 'string') return null;
    const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const [, y, mo, d] = m.map(Number);
    const date = new Date(y, mo - 1, d);
    // 擋掉 2026-02-31 這種看起來合法但不存在的日期
    return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d
        ? date : null;
};

const toYMD = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const lastDayOfMonth = (year, month) => new Date(year, month + 1, 0).getDate();

// 推進一個週期。
// 月/季/年要處理月底：1/31 的下個月是 2/28（或閏年 2/29），
// 不能讓它溢位成 3/3。
export const advanceDate = (ymd, cycle) => {
    const date = parseYMD(ymd);
    if (!date || !CYCLES[cycle]) return null;

    if (cycle === 'weekly') {
        const next = new Date(date);
        next.setDate(next.getDate() + 7);
        return toYMD(next);
    }

    const monthsToAdd = { monthly: 1, quarterly: 3, yearly: 12 }[cycle];
    const targetMonth = date.getMonth() + monthsToAdd;
    const year = date.getFullYear() + Math.floor(targetMonth / 12);
    const month = ((targetMonth % 12) + 12) % 12;
    const day = Math.min(date.getDate(), lastDayOfMonth(year, month));

    return toYMD(new Date(year, month, day));
};

export const daysUntil = (ymd, todayYMD) => {
    const target = parseYMD(ymd);
    const today = parseYMD(todayYMD);
    if (!target || !today) return null;
    return Math.round((target - today) / 86400000);
};

// ── 自動記帳 ────────────────────────────────────────────────

// 一次最多補記幾期。
// 防的是使用者把「下次扣款日」填成很久以前，
// 或很久沒開 App，一次灌進幾十筆紀錄。
export const MAX_CATCH_UP = 12;

// 算出這個訂閱有哪幾期該記帳，以及記完之後的下次扣款日。
//
// 每一期的 id 是由「訂閱 ID + 扣款日」組成的固定值，
// 寫入時用 setDoc 而不是 addDoc —— 就算重複執行（兩個分頁、
// 中途重整、多台裝置同時開），寫進去的也是同一份文件，不會變兩筆。
export const collectDueBillings = (sub, todayYMD) => {
    const empty = { billings: [], nextBillingDate: sub?.nextBillingDate ?? null };

    if (!sub || sub.active === false || !sub.autoLog) return empty;
    if (!CYCLES[sub.cycle]) return empty;
    if (!parseYMD(todayYMD)) return empty;

    let cursor = sub.nextBillingDate;
    if (!parseYMD(cursor)) return empty;

    const billings = [];
    let guard = 0;

    while (cursor <= todayYMD && guard < MAX_CATCH_UP) {
        // 不補記訂閱建立之前的期數，否則把下次扣款日填成去年
        // 會一次生出一整年的帳
        if (!sub.autoLogFrom || cursor >= sub.autoLogFrom) {
            billings.push({
                id: `sub-${sub.id}-${cursor}`,
                date: cursor,
                amount: toNumber(sub.amount),
                name: sub.name,
            });
        }
        const next = advanceDate(cursor, sub.cycle);
        if (!next || next === cursor) break;
        cursor = next;
        guard += 1;
    }

    return { billings, nextBillingDate: cursor };
};
