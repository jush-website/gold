import {
    Tag, Coffee, Utensils, ShoppingBag, ShoppingCart, Truck, Home, Plane,
    Wallet, Gift, Smartphone, Bus, Car, Train, Music, Film, Dumbbell,
    Heart, Zap, Scissors, Briefcase,
} from 'lucide-react';

export const ICON_MAP = {
    'tag': Tag, 'coffee': Coffee, 'utensils': Utensils, 'shopping-bag': ShoppingBag,
    'shopping-cart': ShoppingCart, 'truck': Truck, 'home': Home, 'plane': Plane,
    'wallet': Wallet, 'gift': Gift, 'smartphone': Smartphone, 'bus': Bus,
    'car': Car, 'train': Train, 'music': Music, 'film': Film,
    'dumbbell': Dumbbell, 'heart': Heart, 'zap': Zap, 'scissors': Scissors,
    'briefcase': Briefcase,
};

export const iconFor = (name) => ICON_MAP[name] || Tag;

// 分類配色：在深色與淺色底下都夠亮、彼此可分辨，
// 依序取用讓同一份分類清單每次都得到同樣的顏色。
export const CATEGORY_COLORS = [
    '#D9B26A', '#7AA2F7', '#5CCB8E', '#F0736B',
    '#C77DD8', '#5FC9C4', '#E8A05C', '#8FB55C',
    '#E87DA0',
];

export const colorForIndex = (i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length];
