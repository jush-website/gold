import React from 'react';
import { ChevronLeft, ChevronRight, History, Edit2, Trash2 } from 'lucide-react';
import { Card, Figure, DeltaFigure, EmptyState, Segmented, Rule } from '../ui/primitives.jsx';
import { iconFor, colorForIndex } from '../ui/icons.js';

export default function HistoryView({
    monthLabel, records, stats, ranking, categories,
    tab, setTab, onPrevMonth, onNextMonth,
    formatMoney,
    onEdit, onDelete,
    onTouchStart, onTouchEnd,
}) {
    return (
        <div className="h-full flex flex-col" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className="shrink-0 px-4 pt-2 pb-3 space-y-3">
                <div className="flex items-center justify-between">
                    <button onClick={onPrevMonth} aria-label="上個月"
                        className="w-9 h-9 grid place-items-center rounded-xl text-ink-2 hover:text-ink hover:bg-surface transition-colors">
                        <ChevronLeft size={18} />
                    </button>
                    <div className="text-center">
                        <p className="text-sm font-bold text-ink">{monthLabel}</p>
                        <p className="text-[10px] text-ink-3 mt-0.5">左右滑動切換月份</p>
                    </div>
                    <button onClick={onNextMonth} aria-label="下個月"
                        className="w-9 h-9 grid place-items-center rounded-xl text-ink-2 hover:text-ink hover:bg-surface transition-colors">
                        <ChevronRight size={18} />
                    </button>
                </div>

                <Segmented
                    className="w-full"
                    value={tab}
                    onChange={setTab}
                    options={[{ value: 'stats', label: '統計分析' }, { value: 'list', label: '交易明細' }]}
                />
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar px-4 pb-28">
                {records.length === 0 ? (
                    <Card>
                        <EmptyState icon={History} title="這個月沒有紀錄" hint="可以左右滑動切換到其他月份看看。" />
                    </Card>
                ) : tab === 'stats' ? (
                    <div className="space-y-5">
                        <Card className="p-5">
                            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-ink-3 mb-1.5">當月結餘</p>
                            <DeltaFigure value={stats.income - stats.expense} format={formatMoney} size="lg" />

                            <Rule className="my-4" />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] text-ink-3 mb-1">總收入</p>
                                    <Figure size="sm" tone="gain">{formatMoney(stats.income)}</Figure>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-ink-3 mb-1">總支出</p>
                                    <Figure size="sm" tone="loss">{formatMoney(stats.expense)}</Figure>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-5">
                            <h3 className="text-[11px] font-semibold tracking-[0.14em] uppercase text-ink-3 mb-4">分類支出排名</h3>
                            {ranking.length === 0 ? (
                                <p className="text-xs text-ink-3">本月沒有支出</p>
                            ) : (
                                <div className="space-y-3">
                                    {ranking.map((row, i) => {
                                        const Icon = iconFor(categories.find((c) => c.id === row.id)?.icon);
                                        return (
                                            <div key={row.id}>
                                                <div className="flex items-center gap-2.5 mb-1.5">
                                                    <Icon size={14} className="text-ink-3 shrink-0" />
                                                    <span className="flex-1 text-xs font-medium text-ink-2 truncate">{row.name}</span>
                                                    <span className="text-[11px] tnum text-ink-3">{row.percent.toFixed(0)}%</span>
                                                    <Figure size="xs">{formatMoney(row.amount)}</Figure>
                                                </div>
                                                <span className="block h-1.5 rounded-full bg-surface-3 overflow-hidden">
                                                    <span className="block h-full rounded-full transition-[width] duration-700"
                                                        style={{ width: `${Math.max(row.percent, 2)}%`, backgroundColor: colorForIndex(i) }} />
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    </div>
                ) : (
                    <Card className="overflow-hidden">
                        {records.map((item, i) => {
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
                                            <p className="text-[11px] text-ink-3 mt-0.5 truncate">
                                                {item.date?.slice(5).replace('-', '/')} · {cat?.name || '未分類'}
                                                {item.note ? ` · ${item.note}` : ''}
                                            </p>
                                        </div>
                                        <Figure size="sm" tone={income ? 'gain' : 'default'}>
                                            {income ? '+' : '−'}{formatMoney(item.amount)}
                                        </Figure>
                                        <div className="flex flex-col gap-0.5 pl-2 border-l border-line shrink-0">
                                            <button aria-label="編輯" onClick={() => onEdit(item)}
                                                className="p-1.5 rounded-lg text-ink-3 hover:text-gold hover:bg-surface-3 transition-colors">
                                                <Edit2 size={13} />
                                            </button>
                                            <button aria-label="刪除" onClick={() => onDelete(item)}
                                                className="p-1.5 rounded-lg text-ink-3 hover:text-loss hover:bg-loss/10 transition-colors">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </Card>
                )}
            </div>
        </div>
    );
}
