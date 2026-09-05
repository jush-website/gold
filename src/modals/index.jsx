import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, Wallet, Calculator, Delete } from 'lucide-react';
import { getLocalYMD } from '../../lib/format.js';
import { computeFactor, describeFactor } from '../../lib/calibration.js';
import { Sheet, Field, Button, Figure, Rule, Toggle, inputClass, AmountInput, EmptyState } from '../ui/primitives.jsx';
import { CYCLES, CYCLE_KEYS, monthlyCost } from '../../lib/subscriptions.js';
import { iconFor, ICON_MAP } from '../ui/icons.js';

// ── 通用確認視窗 ────────────────────────────────────────────

export const ConfirmModal = ({ isOpen, title, message, confirmLabel = '確定刪除', onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 backdrop-blur-sm p-6 animate-[fadeIn_0.15s]">
            <div className="bg-surface-2 border border-line-strong rounded-3xl shadow-lift w-full max-w-xs p-6 text-center">
                <h2 className="text-base font-bold text-ink mb-2">{title}</h2>
                <p className="text-sm text-ink-2 leading-relaxed mb-6">{message}</p>
                <div className="flex gap-2">
                    <Button variant="secondary" className="flex-1" onClick={onCancel}>取消</Button>
                    <Button variant="danger" className="flex-1" onClick={onConfirm}>{confirmLabel}</Button>
                </div>
            </div>
        </div>
    );
};

export const Toast = ({ message, type }) => {
    if (!message) return null;
    const error = type === 'error';
    return (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 rounded-2xl
            bg-surface-2 border border-line-strong shadow-lift flex items-center gap-2 animate-[fadeIn_0.2s] max-w-[90vw]">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${error ? 'bg-loss' : 'bg-gain'}`} />
            <span className="text-sm font-medium text-ink truncate">{message}</span>
        </div>
    );
};

// ── 計算機鍵盤 ──────────────────────────────────────────────

const KEYS = [
    ['7', '8', '9', '÷'], ['4', '5', '6', '×'],
    ['1', '2', '3', '−'], ['C', '0', '.', '+'],
];
const OPS = { '÷': '/', '×': '*', '−': '-', '+': '+' };

export const CalculatorKeypad = ({ onResult, initialValue = '' }) => {
    const [expr, setExpr] = useState(initialValue ? String(initialValue) : '');

    const press = (key) => {
        if (key === 'C') return setExpr('');
        if (key === 'DEL') return setExpr((e) => e.slice(0, -1));
        if (key === '=') {
            try {
                // 先過濾成只剩數字與四則運算符號，再求值
                const safe = expr.replace(/[^0-9+\-*/.]/g, '');
                if (!safe) return;
                const result = new Function(`return ${safe}`)();
                const final = Number(result);
                if (!Number.isFinite(final)) return setExpr('');
                onResult(String(Math.round(final)));
            } catch (e) {
                console.warn('計算式無法解析:', expr, e?.message || e);
                setExpr('');
            }
            return;
        }
        const op = OPS[key];
        if (op) {
            setExpr((e) => (e === '' ? e : /[+\-*/]$/.test(e) ? e.slice(0, -1) + op : e + op));
        } else {
            setExpr((e) => e + key);
        }
    };

    const display = expr.replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−') || '0';

    return (
        <div className="bg-surface-2 border-t border-line p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <div className="px-3 py-2.5 mb-2 rounded-xl bg-surface-3 text-right figure text-2xl font-semibold text-ink truncate">
                {display}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
                {KEYS.flat().map((k) => (
                    <button
                        key={k}
                        onClick={() => press(k)}
                        className={`h-12 rounded-xl text-base font-semibold transition-colors active:scale-95
                            ${OPS[k] ? 'bg-surface-3 text-gold' : k === 'C' ? 'bg-surface-3 text-loss' : 'bg-surface-3 text-ink'}`}
                    >
                        {k}
                    </button>
                ))}
                <button onClick={() => press('DEL')} aria-label="退格"
                    className="h-12 rounded-xl bg-surface-3 text-ink-2 grid place-items-center active:scale-95">
                    <Delete size={18} />
                </button>
                <button onClick={() => press('=')}
                    className="h-12 row-span-1 col-span-1 rounded-xl bg-gold text-ground font-semibold active:scale-95">
                    =
                </button>
            </div>
        </div>
    );
};

// ── 新增／編輯記帳 ──────────────────────────────────────────

export const AddExpenseModal = ({ onClose, onSave, onDelete, initialData, categories, bookId, showToast }) => {
    const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
    const [date, setDate] = useState(initialData?.date || getLocalYMD());
    const [type, setType] = useState(initialData?.type || 'expense');
    const [itemName, setItemName] = useState(initialData?.itemName || '');
    const [note, setNote] = useState(initialData?.note || '');
    const [showKeypad, setShowKeypad] = useState(false);

    const availableCats = categories.filter((c) => c.type === type);
    const [category, setCategory] = useState(initialData?.category || (availableCats[0]?.id || ''));
    // 切換收入／支出後原本的分類可能不在清單裡，在 render 期推導出實際生效的值
    const effectiveCategory = availableCats.some((c) => c.id === category)
        ? category
        : (availableCats[0]?.id || '');

    const submit = () => {
        if (!amount || parseFloat(amount) === 0) return showToast('請輸入金額', 'error');
        if (!effectiveCategory) return showToast('請選擇分類', 'error');
        onSave({
            id: initialData?.id, amount: parseFloat(amount), date,
            category: effectiveCategory, itemName, note, type, bookId,
        });
    };

    const income = type === 'income';

    return (
        <Sheet
            title={initialData ? '編輯紀錄' : '記一筆'}
            onClose={onClose}
            footer={
                <div className="flex gap-2">
                    {initialData && (
                        <Button variant="danger" icon={Trash2} onClick={() => onDelete(initialData.id)} aria-label="刪除" />
                    )}
                    <Button className="flex-1" onClick={submit}>{initialData ? '儲存修改' : '新增紀錄'}</Button>
                </div>
            }
        >
            {/* 收入／支出：用整段色塊切換，比小分頁更難點錯 */}
            <div className="grid grid-cols-2 gap-2">
                {[['expense', '支出'], ['income', '收入']].map(([val, label]) => {
                    const active = type === val;
                    const isIncome = val === 'income';
                    return (
                        <button
                            key={val}
                            onClick={() => setType(val)}
                            className={`py-2.5 rounded-xl text-sm font-semibold border transition-all
                                ${active
                                    ? isIncome
                                        ? 'bg-gain/12 border-gain/40 text-gain'
                                        : 'bg-loss/12 border-loss/40 text-loss'
                                    : 'bg-surface-3 border-line text-ink-3'}`}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            <Field label="金額">
                <div className="flex gap-2">
                    <div className="flex-1 min-w-0">
                        <AmountInput
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            tone={income ? 'gain' : 'loss'}
                            autoFocus
                        />
                    </div>
                    <button
                        onClick={() => setShowKeypad((v) => !v)}
                        aria-label="計算機"
                        className={`w-14 shrink-0 rounded-2xl border transition-colors grid place-items-center
                            ${showKeypad ? 'bg-gold/15 border-gold/40 text-gold' : 'bg-surface-3 border-line text-ink-3'}`}
                    >
                        <Calculator size={18} />
                    </button>
                </div>
            </Field>

            {showKeypad && (
                <div className="-mx-5 -mb-1">
                    <CalculatorKeypad
                        initialValue={amount}
                        onResult={(val) => { setAmount(val); setShowKeypad(false); }}
                    />
                </div>
            )}

            <Field label="分類">
                {availableCats.length === 0 ? (
                    <p className="text-xs text-ink-3 py-2">尚無{income ? '收入' : '支出'}分類，請先到「分類管理」新增。</p>
                ) : (
                    <div className="grid grid-cols-4 gap-2">
                        {availableCats.map((c) => {
                            const Icon = iconFor(c.icon);
                            const active = effectiveCategory === c.id;
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => setCategory(c.id)}
                                    className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all
                                        ${active
                                            ? 'bg-gold/12 border-gold/40 text-gold'
                                            : 'bg-surface-3 border-line text-ink-3 hover:text-ink-2'}`}
                                >
                                    <Icon size={17} />
                                    <span className="text-[10px] font-semibold truncate max-w-full px-1">{c.name}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </Field>

            <Field label="項目">
                <input value={itemName} onChange={(e) => setItemName(e.target.value)}
                    placeholder="午餐、加油…" className={inputClass} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field label="日期">
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                </Field>
                <Field label="備註">
                    <input value={note} onChange={(e) => setNote(e.target.value)}
                        placeholder="選填" className={inputClass} />
                </Field>
            </div>
        </Sheet>
    );
};

// ── 新增／編輯黃金 ──────────────────────────────────────────

const GOLD_UNITS = [['g', '公克'], ['tw_qian', '台錢'], ['tw_liang', '台兩']];

export const AddGoldModal = ({ onClose, onSave, onDelete, initialData, showToast }) => {
    const [date, setDate] = useState(initialData?.date || getLocalYMD());
    const [unit, setUnit] = useState('g');
    const [weightInput, setWeightInput] = useState(initialData?.weight ? String(initialData.weight) : '');
    const [totalCost, setTotalCost] = useState(initialData?.totalCost?.toString() ?? '');
    const [location, setLocation] = useState(initialData?.location || '');
    const [note, setNote] = useState(initialData?.note || '');

    const submit = () => {
        let w = parseFloat(weightInput);
        if (isNaN(w) || w <= 0) return showToast('請輸入正確的重量', 'error');
        if (unit === 'tw_qian') w *= 3.75;
        if (unit === 'tw_liang') w *= 37.5;
        onSave({ id: initialData?.id, date, weight: w, totalCost: parseFloat(totalCost) || 0, location, note });
    };

    const grams = (() => {
        const w = parseFloat(weightInput) || 0;
        return unit === 'tw_qian' ? w * 3.75 : unit === 'tw_liang' ? w * 37.5 : w;
    })();

    return (
        <Sheet
            title={initialData ? '編輯黃金紀錄' : '紀錄一筆黃金'}
            onClose={onClose}
            footer={
                <div className="flex gap-2">
                    {initialData && (
                        <Button variant="danger" icon={Trash2} onClick={() => onDelete(initialData.id)} aria-label="刪除" />
                    )}
                    <Button className="flex-1" onClick={submit}>{initialData ? '儲存修改' : '加入金庫'}</Button>
                </div>
            }
        >
            <Field label="重量">
                <div className="grid grid-cols-3 gap-2 mb-2">
                    {GOLD_UNITS.map(([val, label]) => (
                        <button
                            key={val}
                            onClick={() => setUnit(val)}
                            className={`py-2 rounded-xl text-xs font-semibold border transition-all
                                ${unit === val ? 'bg-gold/12 border-gold/40 text-gold' : 'bg-surface-3 border-line text-ink-3'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <AmountInput
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    prefix=""
                    autoFocus
                />
                {grams > 0 && (
                    <p className="text-[11px] text-ink-3 mt-1.5 tnum">
                        = {grams.toFixed(2)} 克 · {(grams / 3.75).toFixed(2)} 錢 · {(grams / 37.5).toFixed(3)} 兩
                    </p>
                )}
            </Field>

            <Field label="購入總成本">
                <input value={totalCost} onChange={(e) => setTotalCost(e.target.value)}
                    inputMode="decimal" placeholder="0" className={inputClass} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field label="日期">
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                </Field>
                <Field label="購買地點">
                    <input value={location} onChange={(e) => setLocation(e.target.value)}
                        placeholder="選填" className={inputClass} />
                </Field>
            </div>

            <Field label="備註">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="選填" className={inputClass} />
            </Field>
        </Sheet>
    );
};

// ── 借貸相關 ────────────────────────────────────────────────

export const AddDebtModal = ({ onClose, onSave, onDelete, initialData, bookId, showToast }) => {
    const [person, setPerson] = useState(initialData?.person || '');
    const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
    const [date, setDate] = useState(initialData?.date || getLocalYMD());
    const [note, setNote] = useState(initialData?.note || '');

    const submit = () => {
        if (!person.trim()) return showToast('請輸入借款對象或項目', 'error');
        const value = parseFloat(amount);
        if (!value || value <= 0) return showToast('請輸入有效金額', 'error');
        onSave({ id: initialData?.id, person: person.trim(), amount: value, date, note, bookId });
    };

    return (
        <Sheet
            title={initialData ? '編輯借款' : '新增借款'}
            onClose={onClose}
            footer={
                <div className="flex gap-2">
                    {initialData && (
                        <Button variant="danger" icon={Trash2} onClick={() => onDelete(initialData.id)} aria-label="刪除" />
                    )}
                    <Button className="flex-1" onClick={submit}>{initialData ? '儲存修改' : '新增借款'}</Button>
                </div>
            }
        >
            <Field label="借款對象 / 項目">
                <input value={person} onChange={(e) => setPerson(e.target.value)}
                    placeholder="向誰借的？" className={inputClass} autoFocus />
            </Field>

            <Field label="借款總額">
                <AmountInput value={amount} onChange={(e) => setAmount(e.target.value)} tone="loss" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field label="日期">
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                </Field>
                <Field label="備註">
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="選填" className={inputClass} />
                </Field>
            </div>
        </Sheet>
    );
};

export const AddRepaymentModal = ({ onClose, onSave, targetDebt, formatMoney, showToast }) => {
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(getLocalYMD());
    const [note, setNote] = useState('');

    const submit = () => {
        const value = parseFloat(amount);
        if (!value || value <= 0) return showToast('請輸入有效還款金額', 'error');
        onSave(targetDebt.id, { amount: value, date, note });
    };

    return (
        <Sheet
            title="新增還款"
            subtitle={`對象：${targetDebt.person}`}
            onClose={onClose}
            footer={<Button className="w-full" onClick={submit}>確認還款</Button>}
        >
            <div className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-surface-3 border border-line">
                <span className="text-xs text-ink-3">尚欠</span>
                <Figure size="sm" tone="loss">{formatMoney(targetDebt.remaining)}</Figure>
            </div>

            <Field label="還款金額">
                <AmountInput value={amount} onChange={(e) => setAmount(e.target.value)} tone="gain" autoFocus />
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field label="日期">
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                </Field>
                <Field label="備註">
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="選填" className={inputClass} />
                </Field>
            </div>
        </Sheet>
    );
};

export const DebtDetailsModal = ({ onClose, debt, onDeleteRepayment, formatMoney }) => {
    const repayments = [...(debt.repayments || [])].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return (
        <Sheet title="還款明細" subtitle={`${debt.person} · 借款 ${formatMoney(debt.amount)}`} onClose={onClose}>
            <div className="grid grid-cols-2 gap-2">
                <div className="px-3.5 py-3 rounded-xl bg-surface-3 border border-line">
                    <p className="text-[10px] text-ink-3 mb-1">已還</p>
                    <Figure size="sm" tone="gain">{formatMoney(debt.repaid)}</Figure>
                </div>
                <div className="px-3.5 py-3 rounded-xl bg-surface-3 border border-line">
                    <p className="text-[10px] text-ink-3 mb-1">尚欠</p>
                    <Figure size="sm" tone={debt.isSettled ? 'gain' : 'loss'}>
                        {debt.isSettled ? '已結清' : formatMoney(debt.remaining)}
                    </Figure>
                </div>
            </div>

            {repayments.length === 0 ? (
                <EmptyState icon={Wallet} title="還沒有還款紀錄" />
            ) : (
                <div className="rounded-xl border border-line overflow-hidden">
                    {repayments.map((r, i) => (
                        <React.Fragment key={r.id}>
                            {i > 0 && <Rule />}
                            <div className="flex items-center gap-3 px-3.5 py-3 bg-surface">
                                <span className="w-8 h-8 rounded-lg bg-gain/12 text-gain grid place-items-center shrink-0">
                                    <Check size={14} />
                                </span>
                                <div className="flex-1 min-w-0">
                                    <Figure size="xs" tone="gain">{formatMoney(r.amount)}</Figure>
                                    <p className="text-[11px] text-ink-3 mt-0.5 truncate">
                                        {r.date}{r.note ? ` · ${r.note}` : ''}
                                    </p>
                                </div>
                                <button
                                    aria-label="刪除這筆還款"
                                    onClick={() => onDeleteRepayment(debt.id, r.id)}
                                    className="p-1.5 rounded-lg text-ink-3 hover:text-loss hover:bg-loss/10 transition-colors shrink-0"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            )}
        </Sheet>
    );
};

// ── 帳本管理（記帳與借貸共用） ──────────────────────────────

export const BookManager = ({
    isOpen, onClose, books, onSaveBook, onDeleteBook,
    currentBookId, setCurrentBookId, showToast, label = '帳本',
}) => {
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [editing, setEditing] = useState(null);
    const [toDelete, setToDelete] = useState(null);

    if (!isOpen) return null;

    const save = () => {
        const name = (editing ? editing.name : newName).trim();
        if (!name) return showToast(`請輸入${label}名稱`, 'error');
        onSaveBook(editing ? { id: editing.id, name } : { name });
        setAdding(false); setNewName(''); setEditing(null);
    };

    return (
        <>
            <Sheet
                title={`${label}管理`}
                onClose={onClose}
                footer={
                    adding || editing ? (
                        <div className="flex gap-2">
                            <Button variant="secondary" className="flex-1"
                                onClick={() => { setAdding(false); setEditing(null); setNewName(''); }}>取消</Button>
                            <Button className="flex-1" onClick={save}>儲存</Button>
                        </div>
                    ) : (
                        <Button icon={Plus} className="w-full" onClick={() => setAdding(true)}>新增{label}</Button>
                    )
                }
            >
                {(adding || editing) && (
                    <Field label={`${label}名稱`}>
                        <input
                            autoFocus
                            value={editing ? editing.name : newName}
                            onChange={(e) => (editing ? setEditing({ ...editing, name: e.target.value }) : setNewName(e.target.value))}
                            placeholder={`例如：日常開銷`}
                            className={inputClass}
                        />
                    </Field>
                )}

                {books.length === 0 ? (
                    <EmptyState icon={Wallet} title={`還沒有任何${label}`} hint={`先建立一個${label}才能開始記錄。`} />
                ) : (
                    <div className="rounded-xl border border-line overflow-hidden">
                        {books.map((b, i) => {
                            const active = b.id === currentBookId;
                            return (
                                <React.Fragment key={b.id}>
                                    {i > 0 && <Rule />}
                                    <div className={`flex items-center gap-3 px-3.5 py-3 ${active ? 'bg-gold/8' : 'bg-surface'}`}>
                                        <button
                                            onClick={() => { setCurrentBookId(b.id); onClose(); }}
                                            className="flex-1 flex items-center gap-3 min-w-0 text-left"
                                        >
                                            <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0
                                                ${active ? 'bg-gold/15 text-gold' : 'bg-surface-3 text-ink-3'}`}>
                                                {active ? <Check size={14} /> : <Wallet size={14} />}
                                            </span>
                                            <span className={`text-sm font-semibold truncate ${active ? 'text-gold' : 'text-ink'}`}>
                                                {b.name}
                                            </span>
                                        </button>
                                        <button aria-label="重新命名" onClick={() => setEditing({ id: b.id, name: b.name })}
                                            className="p-1.5 rounded-lg text-ink-3 hover:text-gold hover:bg-surface-3 transition-colors">
                                            <Edit2 size={13} />
                                        </button>
                                        <button aria-label="刪除" onClick={() => setToDelete(b)}
                                            className="p-1.5 rounded-lg text-ink-3 hover:text-loss hover:bg-loss/10 transition-colors">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}
            </Sheet>

            <ConfirmModal
                isOpen={!!toDelete}
                title={`刪除${label}`}
                message={`確定要刪除「${toDelete?.name}」嗎？${label}內的紀錄不會一起刪除，但會失去歸屬。`}
                onConfirm={() => { onDeleteBook(toDelete.id); setToDelete(null); }}
                onCancel={() => setToDelete(null)}
            />
        </>
    );
};

// ── 分類管理 ────────────────────────────────────────────────

export const CategoryModal = ({ onClose, onSave, initialData, defaultType, showToast }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [icon, setIcon] = useState(initialData?.icon || 'tag');
    const [type, setType] = useState(initialData?.type || defaultType || 'expense');

    const submit = () => {
        if (!name.trim()) return showToast('請輸入分類名稱', 'error');
        onSave({ id: initialData?.id, name: name.trim(), icon, type });
    };

    return (
        <Sheet
            title={initialData ? '編輯分類' : '新增分類'}
            onClose={onClose}
            footer={<Button className="w-full" onClick={submit}>儲存</Button>}
        >
            <div className="grid grid-cols-2 gap-2">
                {[['expense', '支出'], ['income', '收入']].map(([val, label]) => (
                    <button
                        key={val}
                        onClick={() => setType(val)}
                        className={`py-2.5 rounded-xl text-sm font-semibold border transition-all
                            ${type === val ? 'bg-gold/12 border-gold/40 text-gold' : 'bg-surface-3 border-line text-ink-3'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <Field label="名稱">
                <input value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="例如：餐飲" className={inputClass} autoFocus />
            </Field>

            <Field label="圖示">
                <div className="grid grid-cols-7 gap-1.5">
                    {Object.keys(ICON_MAP).map((key) => {
                        const Icon = ICON_MAP[key];
                        const active = icon === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setIcon(key)}
                                aria-label={key}
                                className={`aspect-square rounded-xl grid place-items-center border transition-all
                                    ${active ? 'bg-gold/12 border-gold/40 text-gold' : 'bg-surface-3 border-line text-ink-3'}`}
                            >
                                <Icon size={16} />
                            </button>
                        );
                    })}
                </div>
            </Field>
        </Sheet>
    );
};

// ── 金價校準 ────────────────────────────────────────────────

// 使用者只要照抄台銀網站上的數字，倍率由程式算。
// 要人自己算除法是很糟的設計。
export const CalibrationModal = ({ onClose, onSave, onReset, shownPrice, calibration, formatMoney, showToast }) => {
    const [input, setInput] = useState('');

    const submit = () => {
        const factor = computeFactor(input, shownPrice);
        if (factor === null) {
            return showToast('請輸入合理的台銀價格（與目前價差距過大）', 'error');
        }
        onSave(factor, Number(input));
    };

    const current = describeFactor(calibration?.factor);

    return (
        <Sheet
            title="校準金價"
            subtitle="讓顯示的價格貼近台銀牌價"
            onClose={onClose}
            footer={
                <div className="flex gap-2">
                    {current && (
                        <Button variant="secondary" onClick={onReset}>清除校準</Button>
                    )}
                    <Button className="flex-1" onClick={submit}>套用</Button>
                </div>
            }
        >
            <p className="text-sm text-ink-2 leading-relaxed">
                目前的價格是用國際金價換算的，與台銀實際牌價會有固定的價差。
                到台銀網站查一下現在的「本行賣出／1 公克」，填在下面，
                之後所有價格都會照這個比例調整。
            </p>

            <div className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-surface-3 border border-line">
                <span className="text-xs text-ink-3">App 目前顯示</span>
                <Figure size="sm">{formatMoney(shownPrice)}</Figure>
            </div>

            <Field label="台銀實際賣出價 / 公克">
                <AmountInput value={input} onChange={(e) => setInput(e.target.value)} autoFocus />
            </Field>

            {current && (
                <div className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-gold/8 border border-gold/25">
                    <span className="text-xs text-ink-2">目前校準</span>
                    <span className="text-xs tnum font-semibold text-gold">
                        {current}
                        {calibration.calibratedAt ? ` · ${calibration.calibratedAt}` : ''}
                    </span>
                </div>
            )}

            <p className="text-[11px] text-ink-3 leading-relaxed">
                校準只存在這台裝置。金價變動時價差比例大致固定，
                所以偶爾校準一次就夠，不需要每天調。
            </p>
        </Sheet>
    );
};

// ── 訂閱 ────────────────────────────────────────────────────

export const AddSubscriptionModal = ({
    onClose, onSave, onDelete, initialData,
    categories, books, defaultBookId, showToast,
}) => {
    const [name, setName] = useState(initialData?.name || '');
    const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
    const [cycle, setCycle] = useState(initialData?.cycle || 'monthly');
    const [nextBillingDate, setNextBillingDate] = useState(initialData?.nextBillingDate || getLocalYMD());
    const [note, setNote] = useState(initialData?.note || '');
    const [autoLog, setAutoLog] = useState(initialData?.autoLog ?? true);
    const [active, setActive] = useState(initialData?.active ?? true);

    const expenseCats = categories.filter((c) => c.type === 'expense');
    const [categoryId, setCategoryId] = useState(initialData?.categoryId || expenseCats[0]?.id || '');
    const [bookId, setBookId] = useState(initialData?.bookId || defaultBookId || books[0]?.id || '');

    const effectiveCategory = expenseCats.some((c) => c.id === categoryId)
        ? categoryId : (expenseCats[0]?.id || '');

    const submit = () => {
        if (!name.trim()) return showToast('請輸入訂閱名稱', 'error');
        const value = parseFloat(amount);
        if (!value || value <= 0) return showToast('請輸入有效金額', 'error');
        if (autoLog && !effectiveCategory) return showToast('自動記帳需要先有支出分類', 'error');
        if (autoLog && !bookId) return showToast('自動記帳需要先建立帳本', 'error');

        onSave({
            id: initialData?.id,
            name: name.trim(),
            amount: value,
            cycle,
            nextBillingDate,
            categoryId: effectiveCategory,
            bookId,
            note,
            autoLog,
            active,
            // 只在新增時設定：自動記帳不會補記訂閱建立之前的期數
            autoLogFrom: initialData?.autoLogFrom || getLocalYMD(),
        });
    };

    const preview = CYCLES[cycle] && parseFloat(amount) > 0
        ? monthlyCost({ amount: parseFloat(amount), cycle })
        : null;

    return (
        <Sheet
            title={initialData ? '編輯訂閱' : '新增訂閱'}
            onClose={onClose}
            footer={
                <div className="flex gap-2">
                    {initialData && (
                        <Button variant="danger" icon={Trash2} onClick={() => onDelete(initialData.id)} aria-label="刪除" />
                    )}
                    <Button className="flex-1" onClick={submit}>{initialData ? '儲存修改' : '新增訂閱'}</Button>
                </div>
            }
        >
            <Field label="名稱">
                <input value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Netflix、Spotify…" className={inputClass} autoFocus />
            </Field>

            <Field label="金額">
                <AmountInput value={amount} onChange={(e) => setAmount(e.target.value)} tone="loss" />
            </Field>

            <Field label="扣款週期">
                <div className="grid grid-cols-4 gap-2">
                    {CYCLE_KEYS.map((key) => (
                        <button
                            key={key}
                            onClick={() => setCycle(key)}
                            className={`py-2 rounded-xl text-xs font-semibold border transition-all
                                ${cycle === key ? 'bg-gold/12 border-gold/40 text-gold' : 'bg-surface-3 border-line text-ink-3'}`}
                        >
                            {CYCLES[key].label}
                        </button>
                    ))}
                </div>
                {preview != null && cycle !== 'monthly' && (
                    <p className="text-[11px] text-ink-3 mt-2 tnum">
                        換算成每月約 ${Math.round(preview).toLocaleString()}
                    </p>
                )}
            </Field>

            <Field label="下次扣款日">
                <input type="date" value={nextBillingDate}
                    onChange={(e) => setNextBillingDate(e.target.value)} className={inputClass} />
            </Field>

            <div className="px-3.5 py-3 rounded-xl bg-surface-3 border border-line space-y-4">
                <Toggle
                    checked={autoLog}
                    onChange={setAutoLog}
                    label="扣款日自動記一筆"
                    hint="到期時自動寫入記帳。同一期只會寫入一次，重複開啟 App 不會重複記帳。"
                />
                <Toggle
                    checked={active}
                    onChange={setActive}
                    label="啟用中"
                    hint={active ? '計入每月訂閱花費' : '保留在清單裡，但不計入花費、也不自動記帳'}
                />
            </div>

            {autoLog && (
                <>
                    <Field label="記到哪個分類">
                        {expenseCats.length === 0 ? (
                            <p className="text-xs text-ink-3 py-2">尚無支出分類，請先到「分類管理」新增。</p>
                        ) : (
                            <div className="grid grid-cols-4 gap-2">
                                {expenseCats.map((c) => {
                                    const Icon = iconFor(c.icon);
                                    const on = effectiveCategory === c.id;
                                    return (
                                        <button
                                            key={c.id}
                                            onClick={() => setCategoryId(c.id)}
                                            className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all
                                                ${on ? 'bg-gold/12 border-gold/40 text-gold' : 'bg-surface-3 border-line text-ink-3'}`}
                                        >
                                            <Icon size={17} />
                                            <span className="text-[10px] font-semibold truncate max-w-full px-1">{c.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </Field>

                    {books.length > 1 && (
                        <Field label="記到哪個帳本">
                            <select value={bookId} onChange={(e) => setBookId(e.target.value)} className={inputClass}>
                                {books.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </Field>
                    )}
                </>
            )}

            <Field label="備註">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="選填" className={inputClass} />
            </Field>
        </Sheet>
    );
};

// ── 安裝提示 ────────────────────────────────────────────────

export const InstallPrompt = ({ onClose, platform }) => (
    <Sheet title="加到主畫面" onClose={onClose} footer={<Button className="w-full" onClick={onClose}>知道了</Button>}>
        <p className="text-sm text-ink-2 leading-relaxed">
            把記帳本加到主畫面後，開啟速度更快，也能像一般 App 一樣全螢幕使用。
        </p>
        <ol className="space-y-3">
            {(platform === 'ios'
                ? ['點下方工具列中間的「分享」按鈕', '往下捲動，選擇「加入主畫面」', '右上角點「加入」就完成了']
                : ['點右上角的「⋮」選單', '選擇「安裝應用程式」或「加到主畫面」', '確認後就會出現在桌面上'])
                .map((step, i) => (
                    <li key={i} className="flex gap-3 items-start">
                        <span className="w-6 h-6 rounded-full bg-gold/15 text-gold text-xs font-bold grid place-items-center shrink-0">
                            {i + 1}
                        </span>
                        <span className="text-sm text-ink-2 leading-relaxed pt-0.5">{step}</span>
                    </li>
                ))}
        </ol>
    </Sheet>
);
