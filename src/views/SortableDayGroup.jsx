import React, { useState, useEffect, useRef } from "react";
import { Edit2, Trash2 } from 'lucide-react';
import { formatMoney } from '../../lib/format.js';
import { iconFor } from '../ui/icons.js';
import { Figure } from '../ui/primitives.jsx';

// 長按拖曳排序。觸控與滑鼠的處理邏輯沿用原本的實作，只換了外觀。
export default function SortableDayGroup({ list, categories, onSwap, setEditingExpense, setShowExpenseAdd, setExpenseToDelete, scrollContainerId }) {
    const [draggingId, setDraggingId] = useState(null);
    const [currentList, setCurrentList] = useState(list);
    const startY = useRef(0);
    const pressTimer = useRef(null);
    const autoScrollRef = useRef(null);
    const lastTouch = useRef({ x: 0, y: 0 });
    const draggingIdRef = useRef(null);

    useEffect(() => { draggingIdRef.current = draggingId; }, [draggingId]);

    // 外部清單更新時同步本地拖曳用的副本（拖曳進行中先不動，免得畫面跳動）。
    // 用 React 官方的「render 期調整 state」寫法，比 useEffect + setState 少一次重繪。
    const [syncedList, setSyncedList] = useState(list);
    if (!draggingId && list !== syncedList) {
        setSyncedList(list);
        setCurrentList(list);
    }

    useEffect(() => {
        const preventScroll = (e) => { if (draggingId) e.preventDefault(); };
        if (draggingId) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('touchmove', preventScroll, { passive: false });
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('touchmove', preventScroll);
        };
    }, [draggingId]);

    const stopAutoScroll = () => {
        if (autoScrollRef.current) {
            clearInterval(autoScrollRef.current);
            autoScrollRef.current = null;
        }
    };

    const checkSwap = (clientX, clientY) => {
        const dragId = draggingIdRef.current;
        if (!dragId) return;
        const elem = document.elementFromPoint(clientX, clientY);
        const dropItem = elem?.closest('.sortable-item');

        if (dropItem) {
            const targetId = dropItem.getAttribute('data-id');
            if (targetId && targetId !== dragId) {
                setCurrentList(prev => {
                    const dragIdx = prev.findIndex(i => i.id === dragId);
                    const targetIdx = prev.findIndex(i => i.id === targetId);
                    if (dragIdx !== -1 && targetIdx !== -1 && dragIdx !== targetIdx) {
                        const newArr = [...prev];
                        const [moved] = newArr.splice(dragIdx, 1);
                        newArr.splice(targetIdx, 0, moved);
                        return newArr;
                    }
                    return prev;
                });
            }
        }
    };

    const handlePointerStart = (e, item) => {
        const y = e.touches ? e.touches[0].clientY : e.clientY;
        startY.current = y;
        pressTimer.current = setTimeout(() => {
            setDraggingId(item.id);
            if (navigator.vibrate) navigator.vibrate(50); 
        }, 400); 
    };

    const handlePointerMove = (e) => {
        if (!draggingId) {
            const y = e.touches ? e.touches[0].clientY : e.clientY;
            if (Math.abs(y - startY.current) > 10) clearTimeout(pressTimer.current);
            return;
        }

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        lastTouch.current = { x: clientX, y: clientY };
        checkSwap(clientX, clientY);

        if (scrollContainerId) {
            const scrollElem = document.getElementById(scrollContainerId);
            if (scrollElem) {
                const rect = scrollElem.getBoundingClientRect();
                const threshold = 100;
                if (clientY < rect.top + threshold) {
                    if (!autoScrollRef.current) {
                        autoScrollRef.current = setInterval(() => {
                            scrollElem.scrollTop -= 15;
                            checkSwap(lastTouch.current.x, lastTouch.current.y);
                        }, 16);
                    }
                } else if (clientY > rect.bottom - threshold) {
                    if (!autoScrollRef.current) {
                        autoScrollRef.current = setInterval(() => {
                            scrollElem.scrollTop += 15;
                            checkSwap(lastTouch.current.x, lastTouch.current.y);
                        }, 16);
                    }
                } else {
                    stopAutoScroll();
                }
            }
        }
    };

    const handlePointerEnd = () => {
        clearTimeout(pressTimer.current);
        stopAutoScroll();
        if (draggingId) {
            const originalIndex = list.findIndex(i => i.id === draggingId);
            const newIndex = currentList.findIndex(i => i.id === draggingId);
            if (originalIndex !== -1 && newIndex !== -1 && originalIndex !== newIndex) {
                const item1 = list[originalIndex];
                const item2 = list[newIndex];
                if (item1 && item2) onSwap(item1, item2);
            }
            setDraggingId(null);
        }
    };

    return (
        <div
            className="space-y-2 relative"
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerEnd}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerEnd}
            onMouseLeave={handlePointerEnd}
        >
            {currentList.map((item) => {
                const cat = categories.find((c) => c.id === item.category);
                const IconComp = iconFor(cat?.icon);
                const isDraggingThis = item.id === draggingId;
                const income = item.type === 'income';

                return (
                    <div
                        key={item.id}
                        data-id={item.id}
                        className={`sortable-item px-3.5 py-3 flex items-center gap-3 rounded-2xl border transition-all duration-200
                            ${isDraggingThis
                                ? 'relative z-20 scale-[1.02] bg-surface-2 border-gold/40 shadow-lift'
                                : 'bg-surface border-line shadow-card'}`}
                        onTouchStart={(e) => handlePointerStart(e, item)}
                        onMouseDown={(e) => handlePointerStart(e, item)}
                        style={{ userSelect: 'none', WebkitUserSelect: 'none', touchAction: draggingId ? 'none' : 'auto' }}
                    >
                        <div className="flex items-center gap-3 pointer-events-none flex-1 min-w-0">
                            <span className={`w-10 h-10 rounded-xl shrink-0 grid place-items-center
                                ${income ? 'bg-gain/12 text-gain' : 'bg-surface-3 text-ink-2'}`}>
                                <IconComp size={17} />
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-ink truncate">
                                    {item.itemName || cat?.name || '未分類'}
                                </p>
                                <p className="text-[11px] text-ink-3 mt-0.5 flex items-center gap-1.5 min-w-0">
                                    {item.itemName && (
                                        <span className="px-1.5 py-0.5 rounded bg-surface-3 text-ink-3 shrink-0 font-medium">
                                            {cat?.name || '未分類'}
                                        </span>
                                    )}
                                    <span className="truncate">{item.note || ''}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <Figure size="sm" tone={income ? 'gain' : 'default'} className="pointer-events-none">
                                {income ? '+' : '\u2212'}{formatMoney(item.amount)}
                            </Figure>
                            <div className="flex flex-col gap-0.5 pl-2 border-l border-line">
                                <button
                                    aria-label="編輯"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    onClick={() => { setEditingExpense(item); setShowExpenseAdd(true); }}
                                    className="p-1.5 rounded-lg text-ink-3 hover:text-gold hover:bg-surface-3 transition-colors"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    aria-label="刪除"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    onClick={() => setExpenseToDelete(item)}
                                    className="p-1.5 rounded-lg text-ink-3 hover:text-loss hover:bg-loss/10 transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
