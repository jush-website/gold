import React from 'react';
import { Coins, ArrowUpRight, Landmark, TrendingUp, TrendingDown, Wallet, Plus } from 'lucide-react';
import { Card, Figure, DeltaFigure, SectionLabel, EmptyState, Button, Rule } from '../ui/primitives.jsx';
import { iconFor, colorForIndex } from '../ui/icons.js';

// 迷你走勢線。只畫形狀，不畫座標軸 —— 這裡要的是「趨勢感」，
// 精確數字在黃金頁的完整圖表裡看。
const Sparkline = ({ data, positive }) => {
    if (!data || data.length < 2) return null;
    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const span = max - min || 1;
    const points = prices.map((p, i) => `${(i / (prices.length - 1)) * 100},${28 - ((p - min) / span) * 26}`);
    const stroke = positive ? 'rgb(var(--c-gain))' : 'rgb(var(--c-loss))';

    return (
        <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="w-full h-7 overflow-visible" aria-hidden="true">
            <polyline points={points.join(' ')} fill="none" stroke={stroke} strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity="0.9" />
        </svg>
    );
};

// 分類支出：橫向排名長條。
// 換掉原本的甜甜圈圖 —— 圓餅在手機上很難比較大小，
// 排序過的長條一眼就看得出「錢花到哪去了」。
const CategoryBars = ({ slices, categories, formatMoney }) => {
    if (slices.length === 0) {
        return <p className="text-xs text-ink-3 py-3">本月還沒有支出紀錄</p>;
    }
    const top = slices.slice(0, 5);
    return (
        <div className="space-y-2.5">
            {top.map((slice, i) => {
                const Icon = iconFor(categories.find((c) => c.id === slice.id)?.icon);
                const color = colorForIndex(i);
                return (
                    <div key={slice.id} className="flex items-center gap-3">
                        <Icon size={14} className="shrink-0 text-ink-3" />
                        <span className="w-14 shrink-0 text-xs font-medium text-ink-2 truncate">{slice.name}</span>
                        <span className="flex-1 h-1.5 rounded-full bg-surface-3 overflow-hidden">
                            <span
                                className="block h-full rounded-full transition-[width] duration-700 ease-out"
                                style={{ width: `${Math.max(slice.percent, 2)}%`, backgroundColor: color }}
                            />
                        </span>
                        <span className="w-8 shrink-0 text-right text-[11px] tnum font-semibold text-ink-3">
                            {slice.percent.toFixed(0)}%
                        </span>
                        <span className="w-16 shrink-0 text-right text-xs tnum font-semibold text-ink">
                            {formatMoney(slice.amount)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export default function HomeView({
    goldStats, goldPrice, goldHistory, hasGoldPrice,
    monthStats, pieChartData, categories,
    debtStats, activeDebtCount,
    recentExpenses,
    currentBookName,
    formatMoney, formatMoneyOrDash, formatWeight,
    onNavigate, onAddExpense,
}) {
    const priceChange = goldHistory.length > 1
        ? goldHistory[goldHistory.length - 1].price - goldHistory[0].price
        : 0;

    return (
        <div className="h-full overflow-y-auto hide-scrollbar px-4 pt-2 pb-28 space-y-6">

            {/* 金庫：最重要的資產，給它最大的視覺重量 */}
            <section className="animate-rise" style={{ animationDelay: '0ms' }}>
                <SectionLabel>資產</SectionLabel>
                <Card
                    onClick={() => onNavigate('gold')}
                    className="vault-glow grain relative overflow-hidden p-5 cursor-pointer
                        border-gold/20 shadow-gold transition-transform active:scale-[0.99]"
                >
                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-xl bg-gold/12 text-gold grid place-items-center">
                                    <Coins size={16} />
                                </span>
                                <span className="text-sm font-semibold text-ink">我的金庫</span>
                            </div>
                            <ArrowUpRight size={18} className="text-ink-3" />
                        </div>

                        <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-ink-3 mb-1">
                            總市值
                        </p>
                        <div className="flex items-end justify-between gap-4 mb-4">
                            <Figure size="xl" tone="default">{formatMoneyOrDash(goldStats.currentValue)}</Figure>
                            <div className="w-24 shrink-0 pb-1.5">
                                <Sparkline data={goldHistory.slice(-30)} positive={priceChange >= 0} />
                            </div>
                        </div>

                        <Rule className="mb-3.5" />

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <p className="text-[10px] text-ink-3 mb-1">持有</p>
                                <Figure size="sm">{formatWeight(goldStats.totalWeight, 'tw_qian')}</Figure>
                            </div>
                            <div>
                                <p className="text-[10px] text-ink-3 mb-1">未實現損益</p>
                                <DeltaFigure value={goldStats.profit} format={formatMoney} size="sm" />
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-ink-3 mb-1">現價 / 克</p>
                                <Figure size="sm" tone={hasGoldPrice ? 'gold' : 'muted'}>
                                    {formatMoneyOrDash(goldPrice)}
                                </Figure>
                            </div>
                        </div>
                    </div>
                </Card>
            </section>

            {/* 本月現金流 */}
            <section className="animate-rise" style={{ animationDelay: '60ms' }}>
                <SectionLabel
                    action={
                        <button onClick={() => onNavigate('history')} className="text-[11px] font-semibold text-ink-3 hover:text-gold transition-colors">
                            看歷史
                        </button>
                    }
                >
                    {new Date().getMonth() + 1}月 · {currentBookName}
                </SectionLabel>

                <Card className="p-5">
                    <div className="flex items-baseline justify-between mb-4">
                        <div>
                            <p className="text-[10px] text-ink-3 mb-1">本月結餘</p>
                            <DeltaFigure value={monthStats.balance} format={formatMoney} size="lg" />
                        </div>
                        <div className="text-right space-y-1.5">
                            <p className="flex items-center justify-end gap-1.5 text-xs">
                                <TrendingUp size={12} className="text-gain" />
                                <span className="tnum font-semibold text-ink-2">{formatMoney(monthStats.income)}</span>
                            </p>
                            <p className="flex items-center justify-end gap-1.5 text-xs">
                                <TrendingDown size={12} className="text-loss" />
                                <span className="tnum font-semibold text-ink-2">{formatMoney(monthStats.expense)}</span>
                            </p>
                        </div>
                    </div>

                    <Rule className="mb-4" />
                    <CategoryBars slices={pieChartData} categories={categories} formatMoney={formatMoney} />
                </Card>
            </section>

            {/* 待收借款：只有真的有未結清的時候才佔版面 */}
            {debtStats.remaining > 0 && (
                <section className="animate-rise" style={{ animationDelay: '120ms' }}>
                    <SectionLabel>借貸</SectionLabel>
                    <Card
                        onClick={() => onNavigate('debt')}
                        className="p-4 flex items-center gap-3 cursor-pointer transition-transform active:scale-[0.99]"
                    >
                        <span className="w-9 h-9 rounded-xl bg-loss/12 text-loss grid place-items-center shrink-0">
                            <Landmark size={16} />
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-ink">待還款</p>
                            <p className="text-[11px] text-ink-3 mt-0.5">{activeDebtCount} 筆未結清</p>
                        </div>
                        <Figure size="md" tone="loss">{formatMoney(debtStats.remaining)}</Figure>
                        <ArrowUpRight size={16} className="text-ink-3 shrink-0" />
                    </Card>
                </section>
            )}

            {/* 最近紀錄 */}
            <section className="animate-rise" style={{ animationDelay: '180ms' }}>
                <SectionLabel
                    action={
                        <button onClick={() => onNavigate('expense')} className="text-[11px] font-semibold text-ink-3 hover:text-gold transition-colors">
                            全部
                        </button>
                    }
                >
                    最近
                </SectionLabel>

                <Card className="overflow-hidden">
                    {recentExpenses.length === 0 ? (
                        <EmptyState
                            icon={Wallet}
                            title="還沒有任何紀錄"
                            hint="記下第一筆開銷，這裡就會開始長出你的收支樣貌。"
                            action={<Button icon={Plus} onClick={onAddExpense}>記一筆</Button>}
                        />
                    ) : (
                        recentExpenses.map((item, i) => {
                            const cat = categories.find((c) => c.id === item.category);
                            const Icon = iconFor(cat?.icon);
                            const income = item.type === 'income';
                            return (
                                <React.Fragment key={item.id}>
                                    {i > 0 && <Rule className="mx-4" />}
                                    <div className="flex items-center gap-3 px-4 py-3">
                                        <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0
                                            ${income ? 'bg-gain/12 text-gain' : 'bg-surface-3 text-ink-2'}`}>
                                            <Icon size={16} />
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-ink truncate">
                                                {item.itemName || cat?.name || '未分類'}
                                            </p>
                                            <p className="text-[11px] text-ink-3 mt-0.5">
                                                {cat?.name || '未分類'} · {item.date?.slice(5).replace('-', '/')}
                                            </p>
                                        </div>
                                        <Figure size="sm" tone={income ? 'gain' : 'default'}>
                                            {income ? '+' : '−'}{formatMoney(item.amount)}
                                        </Figure>
                                    </div>
                                </React.Fragment>
                            );
                        })
                    )}
                </Card>
            </section>
        </div>
    );
}
