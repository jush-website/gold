import React, { useState } from 'react';
import { Plus, Scale, Edit2, Trash2, Coins, ChevronDown } from 'lucide-react';
import { Card, Figure, DeltaFigure, SectionLabel, EmptyState, Button, Rule, Segmented, inputClass } from '../ui/primitives.jsx';
import GoldChart from './GoldChart.jsx';

const UNITS = [
    { value: 'g', label: '克' },
    { value: 'tw_qian', label: '錢' },
    { value: 'tw_liang', label: '兩' },
    { value: 'twd', label: '台幣' },
];

// 單位換算器：輸入任一種單位，其他三種即時換算
function Converter({ goldPrice, formatMoneyOrDash, isOpen, onToggle }) {
    const [amount, setAmount] = useState('');
    const [unit, setUnit] = useState('g');

    const val = parseFloat(amount) || 0;
    const grams = {
        g: val,
        tw_qian: val * 3.75,
        tw_liang: val * 37.5,
        twd: goldPrice ? val / goldPrice : 0,
    }[unit];

    const rows = [
        ['公克', grams.toFixed(2)],
        ['台錢', (grams / 3.75).toFixed(2)],
        ['台兩', (grams / 37.5).toFixed(3)],
        ['價值', goldPrice == null ? '—' : formatMoneyOrDash(Math.round(grams * goldPrice))],
    ];

    return (
        <Card className="overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-surface-3/40 transition-colors"
            >
                <span className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-surface-3 text-ink-2 grid place-items-center"><Scale size={15} /></span>
                    <span className="text-sm font-semibold text-ink">單位換算</span>
                </span>
                <ChevronDown size={18} className={`text-ink-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="px-5 pb-5 space-y-3 animate-[fadeIn_0.3s]">
                    <Segmented options={UNITS} value={unit} onChange={setUnit} className="w-full" />
                    <input
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        inputMode="decimal"
                        placeholder="輸入數量"
                        className={inputClass}
                    />
                    <div className="grid grid-cols-2 gap-2">
                        {rows.map(([label, value]) => (
                            <div key={label} className="bg-surface-3 border border-line rounded-xl px-3 py-2.5">
                                <p className="text-[10px] text-ink-3 mb-0.5">{label}</p>
                                <p className="tnum text-sm font-semibold text-ink truncate">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
}

export default function GoldView({
    goldStats, goldPrice, hasGoldPrice, goldHistory, goldIntraday,
    goldPeriod, setGoldPeriod, priceLoading, priceError, priceMeta, onRetryPrice,
    transactions,
    formatMoney, formatMoneyOrDash, formatWeight,
    onAdd, onEdit, onDelete,
}) {
    const [showChart, setShowChart] = useState(true);
    const [showConverter, setShowConverter] = useState(false);

    return (
        <div className="h-full overflow-y-auto hide-scrollbar px-4 pt-2 pb-28 space-y-6">
            <section>
                <SectionLabel>金庫</SectionLabel>
                <Card className="vault-glow grain relative overflow-hidden p-5 border-gold/20 shadow-gold">
                    <div className="relative z-10">
                        <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-ink-3 mb-1.5">總市值</p>
                        <Figure size="xl">{formatMoneyOrDash(goldStats.currentValue)}</Figure>

                        <Rule className="my-4" />

                        <div className="grid grid-cols-2 gap-y-4 gap-x-3">
                            <div>
                                <p className="text-[10px] text-ink-3 mb-1">持有重量</p>
                                <Figure size="sm">{formatWeight(goldStats.totalWeight, 'tw_qian')}</Figure>
                                <p className="text-[10px] text-ink-3 mt-0.5">{formatWeight(goldStats.totalWeight, 'g')}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-ink-3 mb-1">未實現損益</p>
                                <DeltaFigure value={goldStats.profit} format={formatMoney} size="sm" />
                            </div>
                            <div>
                                <p className="text-[10px] text-ink-3 mb-1">購入總成本</p>
                                <Figure size="sm" tone="muted">{formatMoney(goldStats.totalCost)}</Figure>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-ink-3 mb-1">平均成本 / 克</p>
                                <Figure size="sm" tone="muted">{formatMoney(goldStats.avgCost)}</Figure>
                            </div>
                        </div>
                    </div>
                </Card>
            </section>

            <GoldChart
                data={goldHistory}
                intraday={goldIntraday}
                period={goldPeriod}
                setPeriod={setGoldPeriod}
                loading={priceLoading}
                priceError={priceError}
                priceMeta={priceMeta}
                onRetry={onRetryPrice}
                goldPrice={goldPrice}
                isVisible={showChart}
                toggleVisibility={() => setShowChart((v) => !v)}
            />

            <Converter
                goldPrice={hasGoldPrice ? goldPrice : null}
                formatMoneyOrDash={formatMoneyOrDash}
                isOpen={showConverter}
                onToggle={() => setShowConverter((v) => !v)}
            />

            <Button icon={Plus} size="lg" className="w-full" onClick={onAdd}>紀錄一筆黃金</Button>

            <section>
                <SectionLabel>買入紀錄</SectionLabel>
                {transactions.length === 0 ? (
                    <Card>
                        <EmptyState
                            icon={Coins}
                            title="金庫還是空的"
                            hint="記下每一次買入的重量與成本，就能持續追蹤均價與損益。"
                        />
                    </Card>
                ) : (
                    <Card className="overflow-hidden">
                        {transactions.map((t, i) => {
                            const rowValue = hasGoldPrice ? t.weight * goldPrice : null;
                            const rowProfit = rowValue == null ? null : rowValue - t.totalCost;
                            return (
                                <React.Fragment key={t.id}>
                                    {i > 0 && <Rule className="mx-4" />}
                                    <div className="flex items-center gap-3 px-4 py-3.5">
                                        <span className="w-10 h-10 rounded-xl bg-gold/10 text-gold grid place-items-center shrink-0">
                                            <Scale size={16} />
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-ink">{formatWeight(t.weight, 'g')}</p>
                                            <p className="text-[11px] text-ink-3 mt-0.5 truncate">
                                                {t.date} · 成本 {formatMoney(t.totalCost)}
                                                {t.location ? ` · ${t.location}` : ''}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <Figure size="sm">{formatMoneyOrDash(rowValue)}</Figure>
                                            {rowProfit != null && (
                                                <p className={`text-[11px] tnum font-semibold mt-0.5 ${rowProfit >= 0 ? 'text-gain' : 'text-loss'}`}>
                                                    {rowProfit >= 0 ? '+' : ''}{formatMoney(rowProfit)}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-0.5 pl-2 border-l border-line shrink-0">
                                            <button aria-label="編輯" onClick={() => onEdit(t)}
                                                className="p-1.5 rounded-lg text-ink-3 hover:text-gold hover:bg-surface-3 transition-colors">
                                                <Edit2 size={14} />
                                            </button>
                                            <button aria-label="刪除" onClick={() => onDelete(t)}
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
