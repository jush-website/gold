// 預覽用的假資料。只給 preview.html 使用，不會進入正式建置。
// 目的是讓沒有 Google 登入也能看到每一頁的實際樣子。

const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const ts = (n) => ({ seconds: Math.floor(Date.now() / 1000) - n * 3600 });

export const categories = [
    { id: 'c1', name: '餐飲', icon: 'utensils', type: 'expense' },
    { id: 'c2', name: '日常', icon: 'home', type: 'expense' },
    { id: 'c3', name: '網購', icon: 'shopping-cart', type: 'expense' },
    { id: 'c4', name: '交通', icon: 'bus', type: 'expense' },
    { id: 'c5', name: '娛樂', icon: 'film', type: 'expense' },
    { id: 'c6', name: '薪水', icon: 'wallet', type: 'income' },
    { id: 'c7', name: '獎金', icon: 'gift', type: 'income' },
];

export const books = [
    { id: 'b1', name: '日常開銷', createdAt: ts(900) },
    { id: 'b2', name: '旅遊基金', createdAt: ts(1200) },
];

export const debtBooks = [
    { id: 'db1', name: '朋友往來', createdAt: ts(800) },
];

export const expenses = [
    { id: 'e1', bookId: 'b1', type: 'expense', amount: 185, category: 'c1', itemName: '午餐 便當', date: daysAgo(0), createdAt: ts(3) },
    { id: 'e2', bookId: 'b1', type: 'expense', amount: 65, category: 'c1', itemName: '手搖飲', date: daysAgo(0), createdAt: ts(5) },
    { id: 'e3', bookId: 'b1', type: 'expense', amount: 1280, category: 'c3', itemName: '藍牙耳機', note: '換掉壞掉的那副', date: daysAgo(0), createdAt: ts(8) },
    { id: 'e4', bookId: 'b1', type: 'expense', amount: 60, category: 'c4', itemName: '公車', date: daysAgo(1), createdAt: ts(26) },
    { id: 'e5', bookId: 'b1', type: 'expense', amount: 420, category: 'c1', itemName: '晚餐 火鍋', date: daysAgo(1), createdAt: ts(28) },
    { id: 'e6', bookId: 'b1', type: 'income', amount: 52000, category: 'c6', itemName: '八月薪資', date: daysAgo(2), createdAt: ts(50) },
    { id: 'e7', bookId: 'b1', type: 'expense', amount: 2350, category: 'c2', itemName: '電費', date: daysAgo(2), createdAt: ts(52) },
    { id: 'e8', bookId: 'b1', type: 'expense', amount: 330, category: 'c5', itemName: '電影票', date: daysAgo(3), createdAt: ts(74) },
    { id: 'e9', bookId: 'b1', type: 'expense', amount: 890, category: 'c3', itemName: '生活用品補貨', date: daysAgo(4), createdAt: ts(98) },
    { id: 'e10', bookId: 'b1', type: 'expense', amount: 155, category: 'c1', itemName: '早餐', date: daysAgo(5), createdAt: ts(122) },
    { id: 'e11', bookId: 'b1', type: 'income', amount: 8000, category: 'c7', itemName: '專案獎金', date: daysAgo(6), createdAt: ts(146) },
    { id: 'e12', bookId: 'b1', type: 'expense', amount: 640, category: 'c4', itemName: '加油', date: daysAgo(7), createdAt: ts(170) },
];

export const goldTransactions = [
    { id: 'g1', weight: 7.5, totalCost: 21800, date: daysAgo(210), location: '台銀 信義分行', createdAt: ts(5040) },
    { id: 'g2', weight: 3.75, totalCost: 11250, date: daysAgo(120), location: '銀樓', note: '生日買的', createdAt: ts(2880) },
    { id: 'g3', weight: 11.25, totalCost: 34500, date: daysAgo(45), location: '台銀 信義分行', createdAt: ts(1080) },
    { id: 'g4', weight: 3.75, totalCost: 11900, date: daysAgo(12), location: '台銀 信義分行', createdAt: ts(288) },
];

export const debts = [
    { id: 'd1', bookId: 'db1', person: '阿哲', amount: 12000, date: daysAgo(60), note: '幫忙墊機票', createdAt: ts(1440), repayments: [{ id: 'r1', amount: 5000, date: daysAgo(30), note: '第一次還', createdAt: Date.now() - 2.6e9 }] },
    { id: 'd2', bookId: 'db1', person: '小美', amount: 3000, date: daysAgo(20), createdAt: ts(480), repayments: [] },
    { id: 'd3', bookId: 'db1', person: '老王', amount: 8000, date: daysAgo(150), note: '搬家借的', createdAt: ts(3600), repayments: [{ id: 'r2', amount: 4000, date: daysAgo(100), createdAt: Date.now() - 8.6e9 }, { id: 'r3', amount: 4000, date: daysAgo(40), createdAt: Date.now() - 3.4e9 }] },
];

export const goldPrice = 3182;

// 一段有起伏的走勢，看得出圖表在真實資料下的樣子
export const goldHistory = Array.from({ length: 60 }, (_, i) => {
    const base = 2950 + i * 4;
    const wave = Math.sin(i / 5) * 55 + Math.sin(i / 1.7) * 18;
    const d = new Date();
    d.setDate(d.getDate() - (59 - i));
    return {
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        price: Math.round(base + wave),
        label: `${d.getMonth() + 1}/${d.getDate()}`,
    };
});

export const goldIntraday = Array.from({ length: 32 }, (_, i) => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    d.setMinutes(i * 15);
    return {
        date: d.toISOString(),
        price: Math.round(3182 + Math.sin(i / 3) * 12 + Math.cos(i / 1.3) * 5),
        label: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    };
});

export const user = { uid: 'preview-user', displayName: '預覽帳號', email: 'preview@example.com' };
