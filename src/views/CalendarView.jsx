import React from 'react';
import { ChevronLeft, ChevronRight, Coffee, ArrowUpDown } from 'lucide-react';
import { Card, Figure, EmptyState, Rule } from '../ui/primitives.jsx';
import SortableDayGroup from './SortableDayGroup.jsx';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

// 日期格子很窄，金額壓縮成 3~5 個字元。
// 1530 要顯示成 1.5k 而不是四捨五入成 2k —— 差一半就不叫摘要了。
const compact = (n) => {
    const sign = n > 0 ? '+' : n < 0 ? '−' : '';
    const abs = Math.abs(n);
    if (abs >= 10000) return `${sign}${Math.round(abs / 1000)}k`;
    if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}k`;
    return `${sign}${abs}`;
};

export default function CalendarView({
    year, month, days, dailyData, selectedDate, onSelectDate,
    onPrevMonth, onNextMonth,
    categories, formatMoney, formatDate,
    onSwap, setEditingExpense, setShowExpenseAdd, setExpenseToDelete,
    onTouchStart, onTouchEnd,
    todayYMD,
}) {
    const selected = dailyData[selectedDate];
    const records = selected?.list || [];

    const dayNet = (list = []) => list.reduce(
        (sum, e) => sum + (e.type === 'income' ? Number(e.amount) || 0 : -(Number(e.amount) || 0)),
        0,
    );

    return (
        <div className="h-full flex flex-col" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className="shrink-0 px-4 pt-2 pb-3">
                <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={onPrevMonth} aria-label="上個月"
                            className="w-8 h-8 grid place-items-center rounded-lg text-ink-2 hover:text-ink hover:bg-surface-3 transition-colors">
                            <ChevronLeft size={17} />
                        </button>
                        <p className="text-sm font-bold text-ink">{year} 年 {month + 1} 月</p>
                        <button onClick={onNextMonth} aria-label="下個月"
                            className="w-8 h-8 grid place-items-center rounded-lg text-ink-2 hover:text-ink hover:bg-surface-3 transition-colors">
                            <ChevronRight size={17} />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 mb-1">
                        {WEEKDAYS.map((d) => (
                            <span key={d} className="text-center text-[10px] font-semibold text-ink-3 py-1">{d}</span>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-y-0.5">
                        {days.map((day, idx) => {
                            if (day === null) return <span key={`empty-${idx}`} />;

                            const ymd = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const data = dailyData[ymd];
                            const net = data ? dayNet(data.list) : 0;
                            const isSelected = ymd === selectedDate;
                            const isToday = ymd === todayYMD;

                            return (
                                <button
                                    key={ymd}
                                    onClick={() => onSelectDate(ymd)}
                                    className={`h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors
                                        ${isSelected ? 'bg-gold text-ground' : isToday ? 'bg-surface-3' : 'hover:bg-surface-3'}`}
                                >
                                    <span className={`text-xs tnum font-semibold leading-none
                                        ${isSelected ? 'text-ground' : isToday ? 'text-gold' : 'text-ink-2'}`}>
                                        {day}
                                    </span>
                                    {/* 當日淨額直接寫出來，比只放一個點更有用 */}
                                    {data && (
                                        <span className={`text-[9px] tnum leading-none font-medium
                                            ${isSelected ? 'text-ground/70' : net >= 0 ? 'text-gain' : 'text-ink-3'}`}>
                                            {compact(net)}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </Card>
            </div>

            <div id="calendar-scroll-container" className="flex-1 overflow-y-auto hide-scrollbar px-4 pb-28">
                <div className="flex items-baseline justify-between px-1 mb-2">
                    <h3 className="text-xs font-semibold text-ink-2 flex items-center gap-2">
                        {formatDate(selectedDate)}
                        {records.length > 1 && (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-ink-3">
                                <ArrowUpDown size={9} /> 長按可排序
                            </span>
                        )}
                    </h3>
                    <span className="text-[11px] text-ink-3">{records.length} 筆</span>
                </div>

                {records.length === 0 ? (
                    <Card>
                        <EmptyState icon={Coffee} title="這天沒有收支紀錄" />
                    </Card>
                ) : (
                    <>
                        <SortableDayGroup
                            list={records}
                            categories={categories}
                            onSwap={onSwap}
                            setEditingExpense={setEditingExpense}
                            setShowExpenseAdd={setShowExpenseAdd}
                            setExpenseToDelete={setExpenseToDelete}
                            scrollContainerId="calendar-scroll-container"
                        />
                        <Card className="mt-3 px-4 py-3 flex items-center justify-between">
                            <span className="text-xs text-ink-3">當日淨額</span>
                            <Figure size="sm" tone={dayNet(records) >= 0 ? 'gain' : 'default'}>
                                {formatMoney(dayNet(records))}
                            </Figure>
                        </Card>
                    </>
                )}
                <Rule className="mt-4 opacity-0" />
            </div>
        </div>
    );
}
