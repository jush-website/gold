import React from 'react';
import { Plus, Landmark, User, Trash2, Edit2, Check } from 'lucide-react';
import { Card, Figure, SectionLabel, EmptyState, Button, Segmented, Rule } from '../ui/primitives.jsx';

// 還款進度條：一眼看出這筆借款還了多少
const Progress = ({ ratio, settled }) => (
    <span className="block h-1.5 rounded-full bg-surface-3 overflow-hidden">
        <span
            className={`block h-full rounded-full transition-[width] duration-700 ease-out ${settled ? 'bg-gain' : 'bg-gold'}`}
            style={{ width: `${Math.min(Math.max(ratio * 100, 0), 100)}%` }}
        />
    </span>
);

export default function DebtView({
    debtStats, displayDebts, debtTab, setDebtTab, hasBook,
    formatMoney,
    onAdd, onAddRepayment, onViewDetails, onEdit, onDelete, showToast,
}) {
    const settledTab = debtTab === 'settled';

    return (
        <div className="h-full overflow-y-auto hide-scrollbar px-4 pt-2 pb-28 space-y-6">
            <section>
                <SectionLabel>借貸總覽</SectionLabel>
                <Card className="p-5">
                    <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-ink-3 mb-1.5">待還總額</p>
                    <Figure size="xl" tone={debtStats.remaining > 0 ? 'loss' : 'default'}>
                        {formatMoney(debtStats.remaining)}
                    </Figure>

                    <Rule className="my-4" />

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] text-ink-3 mb-1">總借入</p>
                            <Figure size="sm" tone="muted">{formatMoney(debtStats.totalBorrowed)}</Figure>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-ink-3 mb-1">已還款</p>
                            <Figure size="sm" tone="gain">{formatMoney(debtStats.totalRepaid)}</Figure>
                        </div>
                    </div>
                </Card>
            </section>

            <Button
                icon={Plus}
                size="lg"
                className="w-full"
                onClick={() => (hasBook ? onAdd() : showToast('請先建立借貸帳本', 'error'))}
            >
                新增借款紀錄
            </Button>

            <section>
                <div className="flex items-center justify-between mb-3">
                    <Segmented
                        value={debtTab}
                        onChange={setDebtTab}
                        options={[{ value: 'active', label: '未結清' }, { value: 'settled', label: '已結清' }]}
                    />
                    <span className="text-[11px] text-ink-3">{displayDebts.length} 筆</span>
                </div>

                {displayDebts.length === 0 ? (
                    <Card>
                        <EmptyState
                            icon={Landmark}
                            title={settledTab ? '目前沒有已結清的紀錄' : '目前沒有待還借款'}
                            hint={settledTab ? undefined : '有跟人借錢時記一筆，還款進度就一目了然。'}
                        />
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {displayDebts.map((debt) => {
                            const ratio = debt.amount > 0 ? debt.repaid / debt.amount : 0;
                            return (
                                <Card key={debt.id} className="p-4">
                                    <div className="flex items-start gap-3 mb-3">
                                        <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0
                                            ${debt.isSettled ? 'bg-gain/12 text-gain' : 'bg-surface-3 text-ink-2'}`}>
                                            {debt.isSettled ? <Check size={16} /> : <User size={16} />}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-ink truncate">{debt.person}</p>
                                            <p className="text-[11px] text-ink-3 mt-0.5 truncate">
                                                {debt.date?.slice(5).replace('-', '/')}{debt.note ? ` · ${debt.note}` : ''}
                                            </p>
                                        </div>
                                        <button
                                            aria-label="刪除"
                                            onClick={() => onDelete(debt)}
                                            className="p-1.5 -mr-1 rounded-lg text-ink-3 hover:text-loss hover:bg-loss/10 transition-colors shrink-0"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    <div className="flex items-baseline justify-between mb-2">
                                        <span className="text-[11px] text-ink-3">
                                            {debt.isSettled ? '已結清' : '尚欠'}
                                        </span>
                                        <span className="flex items-baseline gap-1.5">
                                            <Figure size="md" tone={debt.isSettled ? 'gain' : 'loss'}>
                                                {formatMoney(debt.isSettled ? debt.amount : debt.remaining)}
                                            </Figure>
                                            <span className="text-[11px] text-ink-3">/ {formatMoney(debt.amount)}</span>
                                        </span>
                                    </div>

                                    <Progress ratio={ratio} settled={debt.isSettled} />

                                    <div className="flex gap-2 mt-3.5">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            disabled={debt.isSettled}
                                            onClick={() => onAddRepayment(debt)}
                                            className="flex-1"
                                        >
                                            新增還款
                                        </Button>
                                        <Button size="sm" variant="secondary" onClick={() => onViewDetails(debt)} className="flex-1">
                                            查看明細
                                        </Button>
                                        <Button size="sm" variant="ghost" icon={Edit2} onClick={() => onEdit(debt)} aria-label="編輯" />
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
