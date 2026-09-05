import React from 'react';
import { Plus, RefreshCw, Pause, Edit2, Trash2 } from 'lucide-react';
import { Card, Figure, SectionLabel, EmptyState, Button, Rule } from '../ui/primitives.jsx';
import { iconFor } from '../ui/icons.js';
import {
    CYCLES, monthlyCost, summarizeSubscriptions, sortByMonthlyCost, daysUntil,
} from '../../lib/subscriptions.js';

// 距離扣款的說明。近期的用金色點出來，其餘保持安靜。
const dueLabel = (days) => {
    if (days == null) return { text: '', urgent: false };
    if (days < 0) return { text: '待處理', urgent: true };
    if (days === 0) return { text: '今天扣款', urgent: true };
    if (days === 1) return { text: '明天扣款', urgent: true };
    if (days <= 7) return { text: `${days} 天後扣款`, urgent: true };
    return { text: `${days} 天後`, urgent: false };
};

export default function SubscriptionView({
    subscriptions, categories, todayYMD,
    formatMoney,
    onAdd, onEdit, onDelete,
}) {
    const stats = summarizeSubscriptions(subscriptions);
    const sorted = sortByMonthlyCost(subscriptions);

    return (
        <div className="h-full overflow-y-auto hide-scrollbar px-4 pt-2 pb-28 space-y-6">
            <section>
                <SectionLabel>訂閱花費</SectionLabel>
                <Card className="p-5">
                    <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-ink-3 mb-1.5">
                        每月平均
                    </p>
                    <Figure size="xl">{formatMoney(Math.round(stats.monthly))}</Figure>

                    <Rule className="my-4" />

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] text-ink-3 mb-1">一年下來</p>
                            <Figure size="sm" tone="muted">{formatMoney(Math.round(stats.yearly))}</Figure>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-ink-3 mb-1">啟用中</p>
                            <Figure size="sm" tone="muted">
                                {stats.activeCount}
                                {stats.pausedCount > 0 && (
                                    <span className="text-ink-3 font-normal"> · {stats.pausedCount} 暫停</span>
                                )}
                            </Figure>
                        </div>
                    </div>
                </Card>
            </section>

            <Button icon={Plus} size="lg" className="w-full" onClick={onAdd}>新增訂閱</Button>

            <section>
                <SectionLabel>
                    {sorted.length > 0 ? '依每月花費排序' : '清單'}
                </SectionLabel>

                {sorted.length === 0 ? (
                    <Card>
                        <EmptyState
                            icon={RefreshCw}
                            title="還沒有記錄任何訂閱"
                            hint="把每月扣款的服務加進來，就看得出這些「小錢」加起來一年是多少。"
                            action={<Button icon={Plus} onClick={onAdd}>新增訂閱</Button>}
                        />
                    </Card>
                ) : (
                    <Card className="overflow-hidden">
                        {sorted.map((sub, i) => {
                            const cat = categories.find((c) => c.id === sub.categoryId);
                            const Icon = iconFor(cat?.icon);
                            const paused = sub.active === false;
                            const due = dueLabel(paused ? null : daysUntil(sub.nextBillingDate, todayYMD));

                            return (
                                <React.Fragment key={sub.id}>
                                    {i > 0 && <Rule className="mx-4" />}
                                    <div className={`flex items-center gap-3 px-4 py-3.5 ${paused ? 'opacity-50' : ''}`}>
                                        <span className="w-10 h-10 rounded-xl bg-surface-3 text-ink-2 grid place-items-center shrink-0">
                                            {paused ? <Pause size={16} /> : <Icon size={16} />}
                                        </span>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-ink truncate">{sub.name}</p>
                                            <p className="text-[11px] text-ink-3 mt-0.5 truncate">
                                                {paused ? '已暫停' : (
                                                    <>
                                                        {CYCLES[sub.cycle]?.label} {formatMoney(sub.amount)}
                                                        {due.text && (
                                                            <span className={due.urgent ? 'text-gold' : ''}> · {due.text}</span>
                                                        )}
                                                        {sub.autoLog && <span> · 自動記帳</span>}
                                                    </>
                                                )}
                                            </p>
                                        </div>

                                        <div className="text-right shrink-0">
                                            {/* 暫停的訂閱不算進總額，右邊就不該顯示金額，
                                                否則看起來像是有在計算 */}
                                            {paused ? (
                                                <Figure size="sm" tone="muted">—</Figure>
                                            ) : (
                                                <>
                                                    <Figure size="sm">{formatMoney(Math.round(monthlyCost(sub)))}</Figure>
                                                    <p className="text-[10px] text-ink-3 mt-0.5">/ 月</p>
                                                </>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-0.5 pl-2 border-l border-line shrink-0">
                                            <button aria-label="編輯" onClick={() => onEdit(sub)}
                                                className="p-1.5 rounded-lg text-ink-3 hover:text-gold hover:bg-surface-3 transition-colors">
                                                <Edit2 size={14} />
                                            </button>
                                            <button aria-label="刪除" onClick={() => onDelete(sub)}
                                                className="p-1.5 rounded-lg text-ink-3 hover:text-loss hover:bg-loss/10 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </Card>
                )}
            </section>
        </div>
    );
}
