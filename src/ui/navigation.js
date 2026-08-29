import {
    LayoutGrid, CreditCard, History, Calendar, Landmark, Coins,
} from 'lucide-react';

export const NAV_ITEMS = [
    { id: 'home', icon: LayoutGrid, label: '總覽' },
    { id: 'expense', icon: CreditCard, label: '記帳' },
    { id: 'history', icon: History, label: '歷史' },
    { id: 'calendar', icon: Calendar, label: '日曆' },
    { id: 'debt', icon: Landmark, label: '借貸' },
    { id: 'gold', icon: Coins, label: '黃金' },
];

export const VIEW_TITLES = {
    home: '資產總覽', gold: '黃金存摺', expense: '生活記帳', debt: '借貸還款',
    history: '歷史紀錄', calendar: '收支日曆', categories: '分類管理', backup: '備份與還原',
};

