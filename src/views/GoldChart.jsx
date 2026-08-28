import React, { useMemo, useRef, useState } from 'react';
import { RefreshCw, Loader2, ChevronDown } from 'lucide-react';
import { formatMoneyOrDash } from '../../lib/format.js';
import { Card, Figure, Segmented } from '../ui/primitives.jsx';

const PERIODS = [
    { value: '1d', label: '今日' },
    { value: '10d', label: '10 日' },
    { value: '90d', label: '3 個月' },
];

export default function GoldChart({
    data, intraday, period, setPeriod, loading, isVisible, toggleVisibility,
    goldPrice, priceError, onRetry,
}) {
    const containerRef = useRef(null);
    const [hover, setHover] = useState(null);

    const chartData = useMemo(() => {
        if (period === '1d') return intraday?.length > 0 ? intraday : [];
        if (!data || data.length === 0) return [];
        return period === '10d' ? data.slice(-10) : data.slice(-90);
    }, [data, intraday, period]);

    const prices = chartData.map((d) => Number(d.price) || 0);
    const min = prices.length ? Math.min(...prices) * 0.999 : 0;
    const max = prices.length ? Math.max(...prices) * 1.001 : 100;
    const range = max - min || 100;

    const getY = (p) => 100 - (((Number(p) || 0) - min) / range) * 100;
    const getX = (i) => (i / Math.max(1, chartData.length - 1)) * 100;
    const points = chartData.map((d, i) => [getX(i), getY(d.price)]);
    const pathD = points.length > 1
        ? points.reduce((acc, pt, i) => (i === 0 ? `M ${pt[0]},${pt[1]}` : `${acc} L ${pt[0]},${pt[1]}`), '')
        : '';
    const fillD = points.length > 1 ? `${pathD} L 100,100 L 0,100 Z` : '';

    // 期間內的漲跌，決定線條顏色
    const change = chartData.length > 1 ? chartData[chartData.length - 1].price - chartData[0].price : 0;
    const up = change >= 0;
    const lineColor = up ? 'rgb(var(--c-gain))' : 'rgb(var(--c-loss))';

    const track = (clientX) => {
        if (!containerRef.current || chartData.length === 0) return;
        const rect = containerRef.current.getBoundingClientRect();
        const i = Math.max(0, Math.min(
            Math.round(((clientX - rect.left) / rect.width) * (chartData.length - 1)),
            chartData.length - 1,
        ));
        setHover({ item: chartData[i], xPos: getX(i), yPos: getY(chartData[i].price) });
    };

    const shown = hover?.item ?? chartData[chartData.length - 1];

    return (
        <Card className="overflow-hidden">
            <button
                onClick={toggleVisibility}
                className="w-full px-5 py-4 flex items-start justify-between text-left hover:bg-surface-3/40 transition-colors"
            >
                <div className="min-w-0">
                    <span className="flex items-center gap-1.5 mb-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${priceError ? 'bg-loss' : 'bg-gain animate-pulse'}`} />
                        <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-ink-3">台銀賣出金價</span>
                    </span>
                    <span className="flex items-baseline gap-1.5">
                        <Figure size="lg">{formatMoneyOrDash(goldPrice)}</Figure>
                        <span className="text-xs text-ink-3">/ 克</span>
                    </span>

                    {priceError && (
                        <span className="mt-2 flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-loss">金價暫時無法取得</span>
                            <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => { e.stopPropagation(); onRetry?.(); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onRetry?.(); } }}
                                className="text-[11px] font-semibold text-gold hover:brightness-125 flex items-center gap-1"
                            >
                                {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} 重試
                            </span>
                        </span>
                    )}
                </div>
                <ChevronDown
                    size={18}
                    className={`text-ink-3 shrink-0 mt-1 transition-transform duration-300 ${isVisible ? 'rotate-180' : ''}`}
                />
            </button>

            {isVisible && (
                <div className="px-5 pb-5 animate-[fadeIn_0.3s]">
                    <div className="flex items-center justify-between mb-3">
                        <Segmented options={PERIODS} value={period} onChange={setPeriod} />
                        {chartData.length > 1 && (
                            <span className={`text-xs tnum font-semibold ${up ? 'text-gain' : 'text-loss'}`}>
                                {up ? '+' : ''}{change.toFixed(0)}
                                <span className="text-ink-3 font-normal ml-1">
                                    ({((change / (chartData[0].price || 1)) * 100).toFixed(1)}%)
                                </span>
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="h-36 grid place-items-center text-ink-3 text-xs">
                            <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> 載入數據…</span>
                        </div>
                    ) : chartData.length === 0 ? (
                        <div className="h-36 grid place-items-center text-ink-3 text-xs">此區間沒有資料</div>
                    ) : (
                        <>
                            <div
                                ref={containerRef}
                                className="h-36 w-full relative touch-pan-y"
                                onMouseMove={(e) => track(e.clientX)}
                                onMouseLeave={() => setHover(null)}
                                onTouchMove={(e) => track(e.touches[0].clientX)}
                                onTouchEnd={() => setHover(null)}
                            >
                                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                                    <defs>
                                        <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={lineColor} stopOpacity="0.22" />
                                            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    <path d={fillD} fill="url(#goldFill)" />
                                    <path
                                        d={pathD} fill="none" stroke={lineColor} strokeWidth="1.75"
                                        strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
                                    />
                                    {hover && (
                                        <>
                                            <line
                                                x1={hover.xPos} y1="0" x2={hover.xPos} y2="100"
                                                stroke="rgb(var(--c-text) / 0.25)" strokeWidth="1"
                                                strokeDasharray="3 3" vectorEffect="non-scaling-stroke"
                                            />
                                            <circle
                                                cx={hover.xPos} cy={hover.yPos} r="3.5"
                                                fill="rgb(var(--c-surface))" stroke={lineColor} strokeWidth="2"
                                                vectorEffect="non-scaling-stroke"
                                            />
                                        </>
                                    )}
                                </svg>
                            </div>

                            <div className="flex items-baseline justify-between mt-3 pt-3 border-t border-line">
                                <span className="text-[11px] text-ink-3">{shown?.label}</span>
                                <Figure size="sm" tone="gold">{formatMoneyOrDash(shown?.price)}</Figure>
                            </div>
                        </>
                    )}
                </div>
            )}
        </Card>
    );
}
