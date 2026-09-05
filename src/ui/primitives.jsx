import React from 'react';
import { X, Loader2, ChevronRight } from 'lucide-react';

// ── 版面 ────────────────────────────────────────────────────

// 卡片：所有內容區塊的容器。深色下靠極淡的邊線分層，而不是靠陰影。
export const Card = ({ className = '', children, ...rest }) => (
    <div
        className={`bg-surface border border-line rounded-2xl shadow-card ${className}`}
        {...rest}
    >
        {children}
    </div>
);

// 區塊標題：小尺寸、寬字距、次要色。用來分隔頁面上的資訊群組。
export const SectionLabel = ({ children, action, className = '' }) => (
    <div className={`flex items-baseline justify-between px-1 mb-2.5 ${className}`}>
        <h2 className="text-[11px] font-semibold tracking-[0.14em] uppercase text-ink-3">
            {children}
        </h2>
        {action}
    </div>
);

// 帳本橫線：清單列之間的細分隔
export const Rule = ({ className = '' }) => (
    <div className={`h-px bg-line ${className}`} />
);

// ── 數字 ────────────────────────────────────────────────────

// 金額。大尺寸時用襯線體，像對帳單上刻印的數字。
// tone 決定顏色：損益用 gain / loss，其餘用 default。
const TONE = {
    default: 'text-ink',
    muted: 'text-ink-2',
    gold: 'text-gold',
    gain: 'text-gain',
    loss: 'text-loss',
};

export const Figure = ({ children, size = 'md', tone = 'default', className = '' }) => {
    const sizes = {
        xs: 'text-sm',
        sm: 'text-base',
        md: 'text-xl',
        lg: 'text-3xl',
        xl: 'text-[2.75rem] leading-[1.05]',
    };
    const serif = size === 'lg' || size === 'xl';
    return (
        <span className={`${serif ? 'figure font-semibold' : 'tnum font-semibold'} ${sizes[size]} ${TONE[tone]} ${className}`}>
            {children}
        </span>
    );
};

// 依正負自動決定顏色與正號的損益數字
export const DeltaFigure = ({ value, format, size = 'md', className = '' }) => {
    if (value == null) return <Figure size={size} tone="muted" className={className}>—</Figure>;
    const positive = value >= 0;
    return (
        <Figure size={size} tone={positive ? 'gain' : 'loss'} className={className}>
            {positive ? '+' : ''}{format(value)}
        </Figure>
    );
};

// ── 互動 ────────────────────────────────────────────────────

const BUTTON_VARIANTS = {
    // 主要動作：金色。整個 App 同一時間只該有一個。
    primary: 'bg-gold text-ground font-semibold hover:brightness-110 active:brightness-95',
    // 次要動作
    secondary: 'bg-surface-3 text-ink font-semibold hover:bg-surface-2 border border-line',
    // 破壞性動作
    danger: 'bg-loss/12 text-loss font-semibold border border-loss/25 hover:bg-loss/20',
    ghost: 'text-ink-2 font-medium hover:text-ink hover:bg-surface-3',
};

export const Button = ({
    variant = 'primary', size = 'md', className = '', loading = false,
    icon: Icon, children, disabled, ...rest
}) => {
    const sizes = {
        sm: 'px-3 py-2 text-xs rounded-xl gap-1.5',
        md: 'px-4 py-3 text-sm rounded-2xl gap-2',
        lg: 'px-5 py-4 text-[15px] rounded-2xl gap-2',
    };
    return (
        <button
            disabled={disabled || loading}
            className={`inline-flex items-center justify-center transition-all duration-150
                active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none
                ${BUTTON_VARIANTS[variant]} ${sizes[size]} ${className}`}
            {...rest}
        >
            {loading ? <Loader2 size={16} className="animate-spin" /> : Icon ? <Icon size={size === 'sm' ? 14 : 18} /> : null}
            {children}
        </button>
    );
};

// 可點擊的清單列（設定選單、管理頁）
export const Row = ({ icon: Icon, title, subtitle, right, onClick, tone = 'default', className = '' }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors
            hover:bg-surface-3 active:bg-surface-3 ${className}`}
    >
        {Icon && (
            <span className={`shrink-0 w-9 h-9 rounded-xl grid place-items-center
                ${tone === 'danger' ? 'bg-loss/12 text-loss' : 'bg-surface-3 text-ink-2'}`}>
                <Icon size={17} />
            </span>
        )}
        <span className="flex-1 min-w-0">
            <span className={`block text-sm font-semibold truncate ${tone === 'danger' ? 'text-loss' : 'text-ink'}`}>
                {title}
            </span>
            {subtitle && <span className="block text-xs text-ink-3 truncate mt-0.5">{subtitle}</span>}
        </span>
        {right ?? <ChevronRight size={16} className="text-ink-3 shrink-0" />}
    </button>
);

// 分段控制器（收入／支出、未結清／已結清、圖表區間）
export const Segmented = ({ options, value, onChange, className = '' }) => (
    <div className={`inline-flex p-1 bg-surface-3 rounded-xl gap-1 ${className}`}>
        {options.map((opt) => {
            const active = opt.value === value;
            return (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150
                        ${active
                            ? 'bg-surface text-ink shadow-card'
                            : 'text-ink-3 hover:text-ink-2'}`}
                >
                    {opt.label}
                </button>
            );
        })}
    </div>
);

// 開關。用在「自動記帳」「啟用／暫停」這類是非設定。
export const Toggle = ({ checked, onChange, label, hint }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="w-full flex items-center gap-3 text-left"
    >
        <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-ink">{label}</span>
            {hint && <span className="block text-[11px] text-ink-3 mt-0.5 leading-relaxed">{hint}</span>}
        </span>
        <span className={`shrink-0 w-11 h-6 rounded-full p-0.5 transition-colors duration-200
            ${checked ? 'bg-gold' : 'bg-surface-3 border border-line'}`}>
            <span className={`block w-5 h-5 rounded-full transition-transform duration-200
                ${checked ? 'translate-x-5 bg-ground' : 'translate-x-0 bg-ink-3'}`} />
        </span>
    </button>
);

// ── 空狀態 ──────────────────────────────────────────────────

export const EmptyState = ({ icon: Icon, title, hint, action }) => (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
        {Icon && (
            <span className="w-14 h-14 rounded-2xl bg-surface-3 grid place-items-center text-ink-3 mb-4">
                <Icon size={24} />
            </span>
        )}
        <p className="text-sm font-semibold text-ink-2">{title}</p>
        {hint && <p className="text-xs text-ink-3 mt-1.5 leading-relaxed max-w-[15rem]">{hint}</p>}
        {action && <div className="mt-5">{action}</div>}
    </div>
);

// ── 彈出層 ──────────────────────────────────────────────────

// 手機從底部升起、桌機置中的表單容器
export const Sheet = ({ title, subtitle, onClose, children, footer, maxWidth = 'sm:max-w-md' }) => (
    <div
        className="fixed inset-0 z-[70] flex flex-col justify-end sm:justify-center items-center bg-black/70 backdrop-blur-sm sm:p-4 animate-[fadeIn_0.2s]"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
        <div className={`bg-surface-2 w-full ${maxWidth} sm:rounded-3xl rounded-t-3xl border border-line
            shadow-lift overflow-hidden flex flex-col max-h-[92vh] animate-[slideUp_0.24s_cubic-bezier(0.22,1,0.36,1)]`}>
            <div className="px-5 py-4 flex items-start justify-between gap-4 border-b border-line shrink-0">
                <div className="min-w-0">
                    <h2 className="text-base font-bold text-ink truncate">{title}</h2>
                    {subtitle && <p className="text-[11px] text-ink-3 mt-0.5 truncate">{subtitle}</p>}
                </div>
                <button
                    onClick={onClose}
                    aria-label="關閉"
                    className="shrink-0 w-8 h-8 rounded-full bg-surface-3 text-ink-2 grid place-items-center hover:text-ink transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            <div className="px-5 py-5 space-y-4 overflow-y-auto hide-scrollbar">{children}</div>

            {footer && <div className="px-5 py-4 border-t border-line shrink-0">{footer}</div>}
        </div>
    </div>
);

// ── 表單 ────────────────────────────────────────────────────

export const Field = ({ label, hint, children, className = '' }) => (
    <label className={`block ${className}`}>
        <span className="block text-[11px] font-semibold tracking-wider uppercase text-ink-3 mb-1.5">{label}</span>
        {children}
        {hint && <span className="block text-[11px] text-ink-3 mt-1.5">{hint}</span>}
    </label>
);

export const inputClass =
    `w-full bg-surface-3 border border-line rounded-xl px-3.5 py-3 text-sm font-medium text-ink
     placeholder:text-ink-3 outline-none transition-colors
     focus:border-gold/50 focus:ring-2 focus:ring-gold/15`;

// 大金額輸入（新增記帳、新增還款的主要欄位）
export const AmountInput = ({ value, onChange, tone = 'gold', prefix = '$', ...rest }) => {
    const toneRing = {
        gold: 'focus-within:border-gold/50 focus-within:ring-gold/15 text-gold',
        gain: 'focus-within:border-gain/50 focus-within:ring-gain/15 text-gain',
        loss: 'focus-within:border-loss/50 focus-within:ring-loss/15 text-loss',
    }[tone];
    return (
        <div className={`flex items-baseline gap-2 bg-surface-3 border border-line rounded-2xl px-4 py-3.5
            transition-colors focus-within:ring-2 ${toneRing}`}>
            <span className="text-lg font-semibold opacity-50">{prefix}</span>
            <input
                value={value}
                onChange={onChange}
                inputMode="decimal"
                placeholder="0"
                className="flex-1 min-w-0 bg-transparent outline-none figure text-3xl font-semibold placeholder:opacity-30"
                {...rest}
            />
        </div>
    );
};
