// 介面預覽：用假資料把每一頁畫出來，不需要登入 Google。
// 只在開發時使用，正式建置（index.html）不會包含這支檔案。
import { useState } from 'react';
import { formatMoney, formatMoneyOrDash, formatWeight, formatDate, formatMonth, getLocalYMD } from '../../lib/format.js';
import { summarizeGold, summarizeDebts, splitDebtsBySettlement } from '../../lib/finance.js';
import { useTheme } from '../ui/useTheme.js';
import { TopBar, SettingsMenu, BottomNav } from '../ui/AppShell.jsx';
import HomeView from '../views/HomeView.jsx';
import ExpenseView from '../views/ExpenseView.jsx';
import GoldView from '../views/GoldView.jsx';
import DebtView from '../views/DebtView.jsx';
import HistoryView from '../views/HistoryView.jsx';
import CalendarView from '../views/CalendarView.jsx';
import CategoryManagerView from '../views/CategoryManagerView.jsx';
import BackupView from '../views/BackupView.jsx';
import * as mock from './mockData.js';

const monthKey = getLocalYMD().slice(0, 7);
const thisMonth = mock.expenses.filter((e) => e.date.startsWith(monthKey));
const sum = (list) => list.reduce((a, b) => a + b.amount, 0);
const income = sum(thisMonth.filter((e) => e.type === 'income'));
const expense = sum(thisMonth.filter((e) => e.type === 'expense'));
const monthStats = { income, expense, balance: income - expense };

const rank = (records) => {
    const groups = {};
    records.filter((e) => e.type === 'expense').forEach((e) => {
        groups[e.category] = (groups[e.category] || 0) + e.amount;
    });
    const total = sum(records.filter((e) => e.type === 'expense'));
    return Object.entries(groups).sort((a, b) => b[1] - a[1]).map(([id, amount]) => ({
        id,
        name: mock.categories.find((c) => c.id === id)?.name || '未分類',
        amount,
        percent: total > 0 ? (amount / total) * 100 : 0,
    }));
};

const dailyExpenses = Object.values(
    thisMonth.reduce((acc, e) => {
        acc[e.date] = acc[e.date] || { date: e.date, list: [], total: 0 };
        acc[e.date].list.push(e);
        if (e.type === 'expense') acc[e.date].total -= e.amount;
        return acc;
    }, {}),
).sort((a, b) => b.date.localeCompare(a.date));

const calendarDailyData = mock.expenses.reduce((acc, e) => {
    acc[e.date] = acc[e.date] || { list: [] };
    acc[e.date].list.push(e);
    return acc;
}, {});

const goldStats = summarizeGold(mock.goldTransactions, mock.goldPrice);
const debtStats = summarizeDebts(mock.debts);
const { activeDebtsList, settledDebtsList } = splitDebtsBySettlement(mock.debts);

const now = new Date();
const calYear = now.getFullYear();
const calMonth = now.getMonth();
const calDays = Array.from({ length: new Date(calYear, calMonth, 1).getDay() }, () => null)
    .concat(Array.from({ length: new Date(calYear, calMonth + 1, 0).getDate() }, (_, i) => i + 1));

const noop = () => {};

export default function Preview() {
    const { isLight, toggleTheme } = useTheme();
    const [view, setView] = useState(new URLSearchParams(location.search).get('view') || 'home');
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [debtTab, setDebtTab] = useState('active');
    const [historyTab, setHistoryTab] = useState('stats');
    const [goldPeriod, setGoldPeriod] = useState('90d');
    const [selectedDate, setSelectedDate] = useState(getLocalYMD());

    const money = { formatMoney, formatMoneyOrDash, formatWeight };

    return (
        <div className="h-[100dvh] bg-ground text-ink flex flex-col overflow-hidden">
            <TopBar
                currentView={view}
                bookName={mock.books[0].name}
                onOpenBookManager={noop}
                canGoBack={view === 'categories' || view === 'backup'}
                onBack={() => setView('home')}
                showInstallBtn
                onInstall={noop}
                settingsOpen={settingsOpen}
                onToggleSettings={() => setSettingsOpen((v) => !v)}
                settingsMenu={
                    <SettingsMenu
                        userName={mock.user.displayName}
                        isLight={isLight}
                        onToggleTheme={toggleTheme}
                        onNavigate={setView}
                        onSignOut={noop}
                        onClose={() => setSettingsOpen(false)}
                    />
                }
            />

            <main className="flex-1 overflow-hidden relative">
                {view === 'home' && (
                    <HomeView
                        goldStats={goldStats} goldPrice={mock.goldPrice} goldHistory={mock.goldHistory} hasGoldPrice
                        monthStats={monthStats} pieChartData={rank(thisMonth)} categories={mock.categories}
                        debtStats={debtStats} activeDebtCount={activeDebtsList.length}
                        recentExpenses={mock.expenses.slice(0, 5)} currentBookName={mock.books[0].name}
                        {...money} onNavigate={setView} onAddExpense={noop}
                    />
                )}
                {view === 'expense' && (
                    <ExpenseView
                        monthStats={monthStats} dailyExpenses={dailyExpenses} categories={mock.categories}
                        formatMoney={formatMoney} formatDate={formatDate}
                        onAdd={noop} onSwap={noop}
                        setEditingExpense={noop} setShowExpenseAdd={noop} setExpenseToDelete={noop}
                    />
                )}
                {view === 'gold' && (
                    <GoldView
                        goldStats={goldStats} goldPrice={mock.goldPrice} hasGoldPrice
                        goldHistory={mock.goldHistory} goldIntraday={mock.goldIntraday}
                        goldPeriod={goldPeriod} setGoldPeriod={setGoldPeriod}
                        priceLoading={false} priceError={false} onRetryPrice={noop}
                        transactions={mock.goldTransactions}
                        {...money} onAdd={noop} onEdit={noop} onDelete={noop}
                    />
                )}
                {view === 'debt' && (
                    <DebtView
                        debtStats={debtStats}
                        displayDebts={debtTab === 'active' ? activeDebtsList : settledDebtsList}
                        debtTab={debtTab} setDebtTab={setDebtTab} hasBook
                        formatMoney={formatMoney} showToast={noop}
                        onAdd={noop} onAddRepayment={noop} onViewDetails={noop} onEdit={noop} onDelete={noop}
                    />
                )}
                {view === 'history' && (
                    <HistoryView
                        monthLabel={formatMonth(`${monthKey}-01`)} records={thisMonth}
                        stats={{ income, expense }} ranking={rank(thisMonth)} categories={mock.categories}
                        tab={historyTab} setTab={setHistoryTab}
                        formatMoney={formatMoney}
                        onPrevMonth={noop} onNextMonth={noop} onEdit={noop} onDelete={noop}
                        onTouchStart={noop} onTouchEnd={noop}
                    />
                )}
                {view === 'calendar' && (
                    <CalendarView
                        year={calYear} month={calMonth} days={calDays}
                        dailyData={calendarDailyData} selectedDate={selectedDate} onSelectDate={setSelectedDate}
                        todayYMD={getLocalYMD()} onPrevMonth={noop} onNextMonth={noop}
                        categories={mock.categories} formatMoney={formatMoney} formatDate={formatDate}
                        onSwap={noop} setEditingExpense={noop} setShowExpenseAdd={noop} setExpenseToDelete={noop}
                        onTouchStart={noop} onTouchEnd={noop}
                    />
                )}
                {view === 'categories' && (
                    <CategoryManagerView categories={mock.categories} onSave={noop} onDelete={noop} showToast={noop} />
                )}
                {view === 'backup' && (
                    <BackupView
                        onExport={noop} onImport={noop} isLoading={false}
                        counts={{
                            expenses: mock.expenses.length, gold: mock.goldTransactions.length,
                            debts: mock.debts.length, categories: mock.categories.length,
                        }}
                    />
                )}
            </main>

            <BottomNav currentView={view} onNavigate={setView} />
        </div>
    );
}
