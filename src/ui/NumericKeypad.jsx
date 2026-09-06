import React, { useState, useEffect } from 'react';
import { Delete, Check } from 'lucide-react';
import { KEYPAD_KEYS, OPS, evaluateExpression, hasOperator, pressKey, resolveExpression, toDisplay } from '../../lib/keypad.js';

// App 自己的數字鍵盤。
//
// 存在的理由是手機系統鍵盤的數字鍵太小、容易誤觸 —— 記帳是每天要做好幾次的事，
// 按錯一個數字就是一筆錯帳。這裡的按鍵高 56px、間距也拉開。
//
// 觸發它的欄位不是 <input> 而是 <button>，所以系統鍵盤根本不會被喚起，
// 不需要靠 readOnly 或 inputMode="none" 這類間接手段。

export default function NumericKeypad({ value, onChange, onClose, title = '輸入金額', allowDecimal = true }) {
    const [expr, setExpr] = useState(value == null ? '' : String(value));

    const commit = (next) => {
        setExpr(next);
        onChange(next);
    };

    const press = (key) => commit(pressKey(expr, key, { allowDecimal }));

    const done = () => {
        commit(resolveExpression(expr, { allowDecimal }));
        onClose();
    };

    // 桌機上仍然可以用實體鍵盤打（沒有相依陣列是刻意的：
    // 處理函式閉包住 expr，每次 render 都要換成最新的那一份）
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape') return onClose();
            if (e.key === 'Enter') { e.preventDefault(); return done(); }
            if (e.key === 'Backspace') { e.preventDefault(); return press('DEL'); }
            if (/^[0-9]$/.test(e.key)) { e.preventDefault(); return press(e.key); }
            if (e.key === '.') { e.preventDefault(); return press('.'); }
            const opKey = { '+': '+', '-': '−', '*': '×', '/': '÷' }[e.key];
            if (opKey) { e.preventDefault(); return press(opKey); }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    });

    const preview = hasOperator(expr) ? evaluateExpression(expr) : null;

    return (
        <>
            <div className="fixed inset-0 z-[105] bg-black/40" onClick={onClose} />

            <div className="fixed inset-x-0 bottom-0 z-[110] bg-surface-2 border-t border-line-strong
                shadow-lift animate-[slideUp_0.22s_cubic-bezier(0.22,1,0.36,1)]
                pb-[calc(0.75rem+env(safe-area-inset-bottom))] px-3 pt-3">

                <div className="flex items-center justify-between gap-3 mb-3 px-1">
                    <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-ink-3 shrink-0">{title}</span>
                    <span className="flex items-baseline gap-2 min-w-0">
                        {preview != null && (
                            <span className="text-xs text-ink-3 tnum truncate">= {Math.round(preview).toLocaleString()}</span>
                        )}
                        <span className="figure text-2xl font-semibold text-ink tnum truncate">
                            {toDisplay(expr) || '0'}
                        </span>
                    </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    {KEYPAD_KEYS.flat().map((k) => (
                        <button
                            key={k}
                            onClick={() => press(k)}
                            className={`h-14 rounded-2xl text-xl font-semibold transition-transform active:scale-95
                                ${OPS[k] ? 'bg-surface-3 text-gold'
                                    : k === 'C' ? 'bg-surface-3 text-loss'
                                    : 'bg-surface-3 text-ink'}`}
                        >
                            {k}
                        </button>
                    ))}

                    <button
                        onClick={() => press('DEL')}
                        aria-label="退格"
                        className="h-14 rounded-2xl bg-surface-3 text-ink-2 grid place-items-center active:scale-95 transition-transform"
                    >
                        <Delete size={20} />
                    </button>

                    <button
                        onClick={done}
                        className="h-14 col-span-3 rounded-2xl bg-gold text-ground font-semibold text-base
                            flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                        <Check size={18} /> 完成
                    </button>
                </div>
            </div>
        </>
    );
}
