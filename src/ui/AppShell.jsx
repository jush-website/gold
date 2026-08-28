import React from 'react';
import {
    Settings, ChevronDown, Undo2, Download, Sun, Moon, LogOut, Tag, Database, Wallet,
} from 'lucide-react';
import { NAV_ITEMS, VIEW_TITLES } from './navigation.js';

// 需要顯示「目前帳本」並可切換的頁面
const BOOK_VIEWS = ['expense', 'history', 'calendar', 'debt'];

export const TopBar = ({
    currentView, bookName, onOpenBookManager,
    canGoBack, onBack, showInstallBtn, onInstall,
    settingsOpen, onToggleSettings, settingsMenu,
}) => {
    const showBook = BOOK_VIEWS.includes(currentView);

    return (
        <header className="shrink-0 z-40 bg-ground/85 backdrop-blur-xl border-b border-line">
            <div className="h-14 px-3 flex items-center gap-2">
                <div className="w-20 shrink-0 flex items-center relative">
                    <button
                        onClick={onToggleSettings}
                        aria-label="設定"
                        className="w-9 h-9 grid place-items-center rounded-xl text-ink-2 hover:text-ink hover:bg-surface transition-colors"
                    >
                        <Settings size={19} />
                    </button>
                    {settingsOpen && settingsMenu}
                </div>

                <div className="flex-1 min-w-0 flex justify-center">
                    {showBook ? (
                        <button
                            onClick={onOpenBookManager}
                            className="flex flex-col items-center px-3 py-1 rounded-xl hover:bg-surface transition-colors max-w-full"
                        >
                            <span className="flex items-center gap-1.5 max-w-full">
                                <span className="text-[15px] font-bold text-ink truncate">{VIEW_TITLES[currentView]}</span>
                                <ChevronDown size={13} className="text-ink-3 shrink-0" />
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-medium text-ink-3 mt-0.5 max-w-full">
                                <Wallet size={9} className="shrink-0" />
                                <span className="truncate">{bookName || '請選擇帳本'}</span>
                            </span>
                        </button>
                    ) : (
                        <span className="text-[15px] font-bold text-ink truncate">{VIEW_TITLES[currentView]}</span>
                    )}
                </div>

                <div className="w-20 shrink-0 flex items-center justify-end gap-1">
                    {showInstallBtn && (
                        <button
                            onClick={onInstall}
                            aria-label="安裝 App"
                            className="w-9 h-9 grid place-items-center rounded-xl text-gold hover:bg-gold/10 transition-colors"
                        >
                            <Download size={18} />
                        </button>
                    )}
                    {canGoBack && (
                        <button
                            onClick={onBack}
                            aria-label="返回"
                            className="w-9 h-9 grid place-items-center rounded-xl text-ink-2 hover:text-ink hover:bg-surface transition-colors"
                        >
                            <Undo2 size={19} />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};

export const SettingsMenu = ({ userName, isLight, onToggleTheme, onNavigate, onSignOut, onClose }) => (
    <>
        <div className="fixed inset-0 z-[90]" onClick={onClose} />
        <div className="absolute left-0 top-11 w-56 z-[100] bg-surface-2 border border-line-strong
            rounded-2xl shadow-lift overflow-hidden animate-[fadeIn_0.15s]">
            <div className="px-4 py-3 flex items-center gap-2.5 border-b border-line">
                <span className="w-8 h-8 rounded-full bg-gold/15 text-gold grid place-items-center text-xs font-bold shrink-0">
                    {userName?.[0] || 'U'}
                </span>
                <span className="text-sm font-semibold text-ink truncate">{userName || '使用者'}</span>
            </div>

            <button
                onClick={onToggleTheme}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-ink-2 hover:text-ink hover:bg-surface-3 transition-colors"
            >
                {isLight ? <Moon size={16} /> : <Sun size={16} />}
                {isLight ? '深色模式' : '淺色模式'}
            </button>

            <button
                onClick={() => { onNavigate('categories'); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-ink-2 hover:text-ink hover:bg-surface-3 border-t border-line transition-colors"
            >
                <Tag size={16} /> 分類管理
            </button>

            <button
                onClick={() => { onNavigate('backup'); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-ink-2 hover:text-ink hover:bg-surface-3 border-t border-line transition-colors"
            >
                <Database size={16} /> 備份與還原
            </button>

            <button
                onClick={onSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-loss hover:bg-loss/10 border-t border-line transition-colors"
            >
                <LogOut size={16} /> 安全登出
            </button>
        </div>
    </>
);

export const BottomNav = ({ currentView, onNavigate }) => (
    <nav className="shrink-0 z-40 bg-ground/85 backdrop-blur-xl border-t border-line pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
            {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
                const active = currentView === id;
                return (
                    <button
                        key={id}
                        onClick={() => onNavigate(id)}
                        aria-current={active ? 'page' : undefined}
                        className="flex-1 relative flex flex-col items-center gap-1 pt-2.5 pb-2 transition-colors"
                    >
                        {/* 目前頁面：頂端一道金色細線，比整顆變色安靜得多 */}
                        <span className={`absolute top-0 h-0.5 rounded-b-full transition-all duration-300
                            ${active ? 'w-7 bg-gold' : 'w-0 bg-transparent'}`} />
                        <Icon size={19} className={active ? 'text-gold' : 'text-ink-3'} strokeWidth={active ? 2.2 : 1.8} />
                        <span className={`text-[10px] font-semibold ${active ? 'text-ink' : 'text-ink-3'}`}>{label}</span>
                    </button>
                );
            })}
        </div>
    </nav>
);
