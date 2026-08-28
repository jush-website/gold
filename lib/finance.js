// 帳務計算。純函式，不碰 Firebase 也不碰 DOM。

const toNumber = (v) => Number(v) || 0;

// 單筆借款的還款狀況。
// 注意：金額一律走 toNumber，缺值或髒資料會被當成 0 而不是 NaN
// —— NaN <= 0 是 false，會讓一筆已還清的借款永遠留在「未結清」。
export const summarizeDebt = (debt) => {
    const amount = toNumber(debt?.amount);
    const repaid = (debt?.repayments || []).reduce((sum, r) => sum + toNumber(r?.amount), 0);
    const remaining = amount - repaid;
    return { ...debt, amount, repaid, remaining, isSettled: remaining <= 0 };
};

// 分成「未結清」與「已結清」兩組，各自帶上計算結果
export const splitDebtsBySettlement = (debts = []) => {
    const active = [];
    const settled = [];
    debts.forEach((debt) => {
        const enriched = summarizeDebt(debt);
        (enriched.isSettled ? settled : active).push(enriched);
    });
    return { activeDebtsList: active, settledDebtsList: settled };
};

// 整本借貸帳本的合計
export const summarizeDebts = (debts = []) => {
    let totalBorrowed = 0;
    let totalRepaid = 0;
    debts.forEach((d) => {
        totalBorrowed += toNumber(d?.amount);
        totalRepaid += (d?.repayments || []).reduce((sum, r) => sum + toNumber(r?.amount), 0);
    });
    return { totalBorrowed, totalRepaid, remaining: totalBorrowed - totalRepaid };
};

// 黃金持倉。pricePerGram 為 null（尚未取得金價）時，
// 市值與損益回 null，讓畫面顯示「—」而不是算出一個假的數字。
export const summarizeGold = (transactions = [], pricePerGram = null) => {
    const totalWeight = transactions.reduce((acc, t) => acc + toNumber(t?.weight), 0);
    const totalCost = transactions.reduce((acc, t) => acc + toNumber(t?.totalCost), 0);
    const hasPrice = pricePerGram != null;
    const currentValue = hasPrice ? totalWeight * pricePerGram : null;
    return {
        totalWeight,
        totalCost,
        avgCost: totalWeight > 0 ? totalCost / totalWeight : 0,
        currentValue,
        profit: hasPrice ? currentValue - totalCost : null,
    };
};
