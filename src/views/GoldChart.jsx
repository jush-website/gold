import React, { useMemo, useRef, useState } from 'react';
import { RefreshCw, Loader2, ChevronDown } from 'lucide-react';
import { formatMoneyOrDash } from '../../lib/format.js';
import { sanitizeSeries, priceBounds, smoothPath } from '../../lib/chart.js';
import { describePriceSource, describeSeriesSource, describePriceTitle } from '../../lib/gold-source.js';
import { describeFactor } from '../../lib/calibration.js';
import { Card, Figure, Segmented } from '../ui/primitives.jsx';

const PERIODS = [
    { value: '1d', label: '今日' },
    { value: '10d', label: '10 日' },
    { value: '90d', label: '3 個月' },
];

export default function GoldChart({
    data, intraday, period, setPeriod, loading, isVisible, toggleVisibility,
    goldPrice, priceError, priceMeta = {}, calibration, onRetry, onCalibrate,
}) {
    const plotRef = useRef(null);
    const [hoverIndex, setHoverIndex] = useState(null);

    const series = useMemo(() => {
        const raw = period === '1d'
            ? (intraday?.length > 0 ? intraday : [])
            : period === '10d' ? (data || []).slice(-10) : (data || []).slice(-90);
        // 先擋掉 0 元與離譜的值，否則一筆壞資料會把整張圖壓扁
        return sanitizeSeries(raw);
    }, [data, intraday, period]);

    const geom = useMemo(() => {
        if (series.length < 2) return null;
        const prices = series.map((d) => Number(d.price));
        const { min, max } = priceBounds(prices);
        const range = max - min || 1;

        const x = (i) => (i / (series.length - 1)) * 100;
        const y = (p) => 100 - ((p - min) / range) * 100;
        const points = prices.map((p, i) => [x(i), y(p)]);

        const hi = prices.indexOf(Math.max(...prices));
        const lo = prices.indexOf(Math.min(...prices));

        return {
            points, x, y, min, max,
            line: smoothPath(points),
            area: `${smoothPath(points)} L 100,100 L 0,100 Z`,
            hiIndex: hi, loIndex: lo,
            hiPrice: prices[hi], loPrice: prices[lo],
        };
    }, [series]);

    const priceNote = describePriceSource(priceMeta.priceSource);
    const factorNote = describeFactor(calibration?.factor);
    const seriesNote = describeSeriesSource(period, priceMeta);

    const change = series.length > 1 ? series[series.length - 1].price - series[0].price : 0;
    const up = change >= 0;
    const stroke = up ? 'rgb(var(--c-gain))' : 'rgb(var(--c-loss))';

    const track = (clientX) => {
        if (!plotRef.current || series.length < 2) return;
        const rect = plotRef.current.getBoundingClientRect();
        const ratio = (clientX - rect.left) / rect.width;
        setHoverIndex(Math.max(0, Math.min(Math.round(ratio * (series.length - 1)), series.length - 1)));
    };

    const active = hoverIndex ?? (series.length - 1);
    const shown = series[active];

    return (
        <Card className="overflow-hidden">
            <button
                onClick={toggleVisibility}
                className="w-full px-5 py-4 flex items-start justify-between text-left hover:bg-surface-3/40 transition-colors"
            >
                <div className="min-w-0">
                    <span className="flex items-center gap-1.5 mb-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${priceError ? 'bg-loss' : 'bg-gain animate-pulse'}`} />
                        <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-ink-3">
                            {describePriceTitle(priceMeta.priceSource)}
                        </span>
                    </span>
                    <span className="flex items-baseline gap-1.5">
                        <Figure size="lg">{formatMoneyOrDash(goldPrice)}</Figure>
                        <span className="text-xs text-ink-3">/ 克</span>
                    </span>

                    {(priceNote || onCalibrate) && (
                        <span className="mt-1 flex items-center gap-2 flex-wrap">
                            {priceNote && (
                                <span className={`text-[11px] ${priceNote.tone === 'warn' ? 'text-gold' : 'text-ink-3'}`}>
                                    {priceNote.text}
                                </span>
                            )}
                            {factorNote && (
                                <span className="text-[11px] text-ink-3">已校準 {factorNote}</span>
                            )}
                            {onCalibrate && (
                                <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => { e.stopPropagation(); onCalibrate(); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onCalibrate(); } }}
                                    className="text-[11px] font-semibold text-ink-3 hover:text-gold underline underline-offset-2"
                                >
                                    校準
                                </span>
                            )}
                        </span>
                    )}

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
                    <div className="flex items-center justify-between mb-4">
                        <Segmented options={PERIODS} value={period} onChange={setPeriod} />
                        {series.length > 1 && (
                            <span className={`text-xs tnum font-semibold ${up ? 'text-gain' : 'text-loss'}`}>
                                {up ? '+' : '−'}{Math.abs(change).toFixed(0)}
                                <span className="text-ink-3 font-normal ml-1.5">
                                    ({up ? '+' : '−'}{Math.abs((change / (series[0].price || 1)) * 100).toFixed(1)}%)
                                </span>
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="h-40 grid place-items-center text-ink-3 text-xs">
                            <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> 載入數據…</span>
                        </div>
                    ) : !geom ? (
                        <div className="h-40 grid place-items-center text-ink-3 text-xs">此區間沒有足夠的資料</div>
                    ) : (
                        <>
                            <div
                                ref={plotRef}
                                className="relative h-40 w-full touch-pan-y select-none"
                                onMouseMove={(e) => track(e.clientX)}
                                onMouseLeave={() => setHoverIndex(null)}
                                onTouchStart={(e) => track(e.touches[0].clientX)}
                                onTouchMove={(e) => track(e.touches[0].clientX)}
                                onTouchEnd={() => setHoverIndex(null)}
                            >
                                {/* 三條水平參考線，讓高低落差有個尺度 */}
                                {[0, 50, 100].map((pct) => (
                                    <span
                                        key={pct}
                                        className="absolute inset-x-0 h-px bg-line pointer-events-none"
                                        style={{ top: `${pct}%` }}
                                    />
                                ))}

                                <svg
                                    viewBox="0 0 100 100"
                                    preserveAspectRatio="none"
                                    className="absolute inset-0 w-full h-full"
                                    aria-hidden="true"
                                >
                                    <defs>
                                        <linearGradient id="goldChartFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
                                            <stop offset="55%" stopColor={stroke} stopOpacity="0.07" />
                                            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
                                        </linearGradient>
                                    </defs>

                                    <path d={geom.area} fill="url(#goldChartFill)" />
                                    <path
                                        d={geom.line}
                                        fill="none"
                                        stroke={stroke}
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        vectorEffect="non-scaling-stroke"
                                    />

                                    {hoverIndex !== null && (
                                        <line
                                            x1={geom.points[active][0]} y1="0"
                                            x2={geom.points[active][0]} y2="100"
                                            stroke="rgb(var(--c-text) / 0.28)"
                                            strokeWidth="1"
                                            strokeDasharray="2 3"
                                            vectorEffect="non-scaling-stroke"
                                        />
                                    )}
                                </svg>

                                {/* 圓點與標籤用 HTML 疊在上面。
                                    畫在 SVG 裡會被 preserveAspectRatio="none" 的非等比縮放壓成橢圓。 */}
                                {[
                                    { i: geom.hiIndex, label: '高' },
                                    { i: geom.loIndex, label: '低' },
                                ].map(({ i, label }) => (
                                    <span
                                        key={label}
                                        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                        style={{ left: `${geom.points[i][0]}%`, top: `${geom.points[i][1]}%` }}
                                    >
                                        <span className="block w-1.5 h-1.5 rounded-full bg-ink-3" />
                                    </span>
                                ))}

                                <span
                                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-100"
                                    style={{ left: `${geom.points[active][0]}%`, top: `${geom.points[active][1]}%` }}
                                >
                                    <span className="block w-2.5 h-2.5 rounded-full border-2 bg-surface"
                                        style={{ borderColor: stroke }} />
                                    {hoverIndex === null && (
                                        <span className="absolute inset-0 rounded-full animate-ping opacity-40"
                                            style={{ backgroundColor: stroke }} />
                                    )}
                                </span>

                                {/* 區間高低標在右上／右下，取代看不懂的座標軸 */}
                                <span className="absolute right-0 top-0 -translate-y-1 text-[10px] tnum text-ink-3 pointer-events-none bg-surface/80 px-1 rounded">
                                    {Math.round(geom.hiPrice)}
                                </span>
                                <span className="absolute right-0 bottom-0 translate-y-1 text-[10px] tnum text-ink-3 pointer-events-none bg-surface/80 px-1 rounded">
                                    {Math.round(geom.loPrice)}
                                </span>
                            </div>

                            {seriesNote && (
                                <p className={`mt-3 text-[11px] leading-relaxed ${seriesNote.tone === 'warn' ? 'text-gold/80' : 'text-ink-3'}`}>
                                    {seriesNote.tone === 'warn' ? '註：' : ''}{seriesNote.text}
                                </p>
                            )}

                            <div className="flex items-baseline justify-between mt-3 pt-3 border-t border-line">
                                <span className="text-[11px] text-ink-3">
                                    {hoverIndex === null ? '最新' : shown?.label}
                                </span>
                                <span className="flex items-baseline gap-2">
                                    {hoverIndex !== null && (
                                        <span className="text-[11px] text-ink-3">{shown?.date?.slice(0, 10)}</span>
                                    )}
                                    <Figure size="sm" tone="gold">{formatMoneyOrDash(shown?.price)}</Figure>
                                </span>
                            </div>
                        </>
                    )}
                </div>
            )}
        </Card>
    );
}
