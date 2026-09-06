import React from 'react';
import { Plus, Coffee, ArrowUpDown, RefreshCw, ChevronRight } from 'lucide-react';
import { Card, Figure, DeltaFigure, EmptyState, Button, Rule } from '../ui/primitives.jsx';
import SortableDayGroup from './SortableDayGroup.jsx';

export default function ExpenseView({
    monthStats, dailyExpenses, categories,
    subscriptionStats,
    formatMoney, formatDate,
    onAdd, onSwap, onOpenSubscriptions,
    setEditingExpense, setShowExpenseAdd, setExpenseToDelete,
}) {
    const subsMonthly = Math.round(subscriptionStats?.monthly || 0);
    const subsActive = subscriptionStats?.activeCount || 0;
    return (
        <div className="h-full flex flex-col">
            {/* 本月摘要固定在上方，滑動清單時仍看得到結餘 */}
            <div className="shrink-0 px-4 pt-2 pb-3">
                <Card className="p-4">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-ink-3 mb-1.5">
                                {new Date().getMonth() + 1}月結餘
                            </p>
                            <DeltaFigure value={monthStats.balance} format={formatMoney} size="lg" />
                        </div>
                        <Button icon={Plus} onClick={onAdd} size="md">記一筆</Button>
                    </div>

                    <Rule className="my-3.5" />

                    <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-gain" />
                            <span className="text-ink-3">收入</span>
                            <span className="tnum font-semibold text-ink-2">{formatMoney(monthStats.income)}</span>
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-loss" />
                            <span className="text-ink-3">支出</span>
                            <span className="tnum font-semibold text-ink-2">{formatMoney(monthStats.expense)}</span>
                        </span>
                    </div>
                </Card>

                {/* 訂閱是「已經決定好、每個月自己會跑」的支出，跟手動記的一筆一筆不同，
                    所以入口放在記帳頁但獨立成一列；實際扣款仍會寫成一般記帳紀錄，
                    月支出才算得準。 */}
                <button
                    onClick={onOpenSubscriptions}
                    className="w-full mt-2.5 flex items-center gap-3 px-4 py-3 rounded-2xl
                        bg-surface border border-line text-left transition-colors
                        hover:bg-surface-2 active:bg-surface-2"
                >
                    <span className="w-8 h-8 rounded-xl bg-surface-3 text-ink-2 grid place-items-center shrink-0">
                        <RefreshCw size={15} />
                    </span>
                    <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-ink">訂閱管理</span>
                        <span className="block text-[11px] text-ink-3 mt-0.5 truncate">
                            {subsActive > 0 ? `${subsActive} 個訂閱中` : '把每月固定扣款的服務加進來'}
                        </span>
                    </span>
                    {subsActive > 0 && (
                        <span className="text-right shrink-0">
                            <span className="block text-[10px] text-ink-3">每月</span>
                            <Figure size="xs" tone="muted">{formatMoney(subsMonthly)}</Figure>
                        </span>
                    )}
                    <ChevronRight size={16} className="text-ink-3 shrink-0" />
                </button>
            </div>

            <div id="expense-scroll-container" className="flex-1 overflow-y-auto hide-scrollbar px-4 pb-28 space-y-5">
                {dailyExpenses.length === 0 ? (
                    <EmptyState
                        icon={Coffee}
                        title="這個月還沒有記帳"
                        hint="記下今天的第一筆，月結餘與分類分析就會自動長出來。"
                        action={<Button icon={Plus} onClick={onAdd}>記一筆</Button>}
                    />
                ) : (
                    dailyExpenses.map((group) => (
                        <section key={group.date}>
                            <div className="flex items-baseline justify-between px-1 mb-2">
                                <h3 className="text-xs font-semibold text-ink-2 flex items-center gap-2">
                                    {formatDate(group.date)}
                                    {group.list.length > 1 && (
                                        <span className="flex items-center gap-1 text-[10px] font-medium text-ink-3">
                                            <ArrowUpDown size={9} /> 長按可排序
                                        </span>
                                    )}
                                </h3>
                                <span className="text-[11px] text-ink-3">
                                    日支 <Figure size="xs" tone="muted">{formatMoney(Math.abs(group.total))}</Figure>
                                </span>
                            </div>

                            <SortableDayGroup
                                list={group.list}
                                categories={categories}
                                onSwap={onSwap}
                                setEditingExpense={setEditingExpense}
                                setShowExpenseAdd={setShowExpenseAdd}
                                setExpenseToDelete={setExpenseToDelete}
                                scrollContainerId="expense-scroll-container"
                            />
                        </section>
                    ))
                )}
            </div>
        </div>
    );
}
