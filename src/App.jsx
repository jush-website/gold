import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  deleteDoc, doc, updateDoc, serverTimestamp,
  query, orderBy
} from 'firebase/firestore';
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from 'firebase/auth';
import { 
  Coins, TrendingUp, TrendingDown, RefreshCcw, Scale, 
  Calculator, ChevronDown, ChevronUp, Moon, Coffee, 
  Loader2, LogOut, Plus, Trash2, Tag, Calendar,
  BarChart3, Pencil, X, AlertCircle, RefreshCw, Camera,
  ShieldCheck, User, Store, Menu, Wallet, Book,
  ArrowRight, ArrowLeft, MoreVertical, CreditCard,
  ShoppingBag, ShoppingCart, Truck, Home, Utensils,
  Smartphone, Plane, Gift, Divide, Equal, Minus, Settings, Key,
  History, Edit2, Bus, Car, Train, Music, Film, Dumbbell, 
  Heart, Zap, Scissors, Briefcase, LayoutGrid, Check
} from 'lucide-react';

// --- Icon Mapping for Categories ---
const ICON_MAP = {
    'tag': Tag, 'coffee': Coffee, 'utensils': Utensils, 'shopping-bag': ShoppingBag,
    'shopping-cart': ShoppingCart, 'truck': Truck, 'home': Home, 'plane': Plane,
    'wallet': Wallet, 'gift': Gift, 'smartphone': Smartphone, 'bus': Bus,
    'car': Car, 'train': Train, 'music': Music, 'film': Film,
    'dumbbell': Dumbbell, 'heart': Heart, 'zap': Zap, 'scissors': Scissors,
    'briefcase': Briefcase
};

// --- Firebase Configuration Management ---
const STORAGE_KEY = 'firebase_config_v1';
const defaultConfig = {
  apiKey: "", 
  authDomain: "gold-29c1b.firebaseapp.com",
  projectId: "gold-29c1b",
  storageBucket: "gold-29c1b.firebasestorage.app",
  messagingSenderId: "867971422713",
  appId: "1:867971422713:web:f85ecab4f9374cdbc7c528",
  measurementId: "G-BNBRLYFBCX"
};

let firebaseConfig = { ...defaultConfig };
let isEnvConfigured = false;
try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FIREBASE_API_KEY) {
        firebaseConfig.apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
        isEnvConfigured = true;
    }
} catch (e) {}

if (!isEnvConfigured) {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.apiKey) firebaseConfig = parsed;
        }
    } catch (e) {}
}

// --- Helper Functions ---
const formatMoney = (amount, currency = 'TWD') => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(num);
};

const formatWeight = (grams, unit = 'tw_qian') => { 
    const num = Number(grams) || 0;
    if (unit === 'tw_qian') return new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num / 3.75) + '錢';
    if (unit === 'tw_liang') return new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(num / 37.5) + '兩';
    return new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + '克';
};

const compressImage = (base64Str, maxWidth = 800, quality = 0.6) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width, height = img.height;
            if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64Str);
    });
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    return `${d.getMonth() + 1}/${d.getDate()} ${days[d.getDay()]}`;
};

const formatMonth = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return `${d.getFullYear()}年 ${d.getMonth() + 1}月`;
};

// --- Firebase Init ---
let app, auth, db, googleProvider;
const isConfigured = !!firebaseConfig.apiKey; 

if (isConfigured) {
    try { 
        app = initializeApp(firebaseConfig); 
        auth = getAuth(app);
        db = getFirestore(app);
        googleProvider = new GoogleAuthProvider();
    } catch (e) {
        console.error("Firebase Init Error:", e);
        if (!isEnvConfigured) localStorage.removeItem(STORAGE_KEY);
    }
}

const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'gold-tracker-v1';
const appId = rawAppId.replace(/\//g, '_').replace(/\./g, '_');

// --- SHARED UI COMPONENTS ---
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-[slideUp_0.2s_ease-out]">
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4 mx-auto">
                    <AlertCircle size={24} />
                </div>
                <h3 className="text-xl font-bold text-center text-gray-800 mb-2">{title}</h3>
                <p className="text-center text-gray-500 mb-6 text-sm">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">取消</button>
                    <button onClick={onConfirm} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-colors">確定刪除</button>
                </div>
            </div>
        </div>
    );
};

// --- SYSTEM COMPONENTS ---
const AppLoading = () => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827', color: 'white' }}>
    <div className="relative"><div className="w-16 h-16 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div><div className="absolute inset-0 flex items-center justify-center"><Coins size={24} className="text-yellow-500" /></div></div>
    <h2 className="mt-4 text-xl font-bold tracking-wider text-yellow-500" style={{fontFamily: 'sans-serif'}}>ASSET MASTER</h2>
    <p className="text-gray-400 text-sm mt-2">載入您的資產數據...</p>
  </div>
);

const ConfigScreen = () => {
    const [key, setKey] = useState('');
    const [saving, setSaving] = useState(false);
    const handleSave = () => {
        if (!key.trim()) return;
        setSaving(true);
        const newConfig = { ...defaultConfig, apiKey: key.trim() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
        setTimeout(() => window.location.reload(), 500);
    };
    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-white">
            <div className="w-full max-w-md bg-gray-800 p-8 rounded-3xl border border-gray-700 shadow-2xl">
                <div className="flex items-center gap-3 mb-6 text-yellow-500"><div className="p-3 bg-yellow-500/10 rounded-xl"><Settings size={24}/></div><h1 className="text-xl font-bold">系統設定</h1></div>
                <p className="text-gray-400 mb-6 text-sm leading-relaxed">在您的本地環境中，系統會自動讀取 <code>.env</code> 變數。<br/><br/>但在目前的預覽環境中無法讀取環境變數，請手動輸入 Firebase API Key 以啟動系統。</p>
                <div className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Project ID</label><div className="bg-gray-900/50 p-3 rounded-xl text-gray-400 font-mono text-sm border border-gray-700">{defaultConfig.projectId}</div></div>
                    <div><label className="text-xs font-bold text-blue-400 uppercase mb-2 block flex items-center gap-1"><Key size={12}/> Firebase API Key</label><input type="text" value={key} onChange={(e) => setKey(e.target.value)} placeholder="貼上您的 API Key" className="w-full bg-gray-900 p-3 rounded-xl border border-gray-600 focus:border-blue-500 outline-none font-mono text-sm transition-colors"/></div>
                </div>
                <button onClick={handleSave} disabled={!key || saving} className="w-full mt-8 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2">{saving ? <Loader2 className="animate-spin" size={20}/> : '儲存並啟動'}</button>
            </div>
        </div>
    );
};

const LoginView = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const handleGoogleLogin = async () => {
        setLoading(true); setError('');
        try { await signInWithPopup(auth, googleProvider); } 
        catch (err) { setError(`登入失敗: ${err.message}`); setLoading(false); }
    };
    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{backgroundColor: '#111827'}}>
             <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
             <div className="relative z-10 w-full max-w-md bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 p-8 rounded-3xl shadow-2xl text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20 transform rotate-3"><Wallet size={40} className="text-white" /></div>
                <h1 className="text-3xl font-black text-white mb-2">資產管家</h1><p className="text-gray-400 mb-8">黃金投資 • 生活記帳 • 財務自由</p>
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-4 text-xs text-left flex items-start gap-2"><AlertCircle size={16} className="shrink-0 mt-0.5"/><span>{error}</span></div>}
                <button onClick={handleGoogleLogin} disabled={loading} className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-4 px-6 rounded-xl mb-3 flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-lg">{loading ? <Loader2 className="animate-spin"/> : <User size={20}/>} 使用 Google 登入</button>
                <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-500"><ShieldCheck size={14} /><span>Google 安全驗證 • 資料加密儲存</span></div>
                {!isEnvConfigured && <button onClick={() => { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }} className="mt-4 text-[10px] text-gray-600 hover:text-gray-400 underline">重設預覽 API Key</button>}
            </div>
        </div>
    );
};

// --- GOLD COMPONENTS ---
const GoldChart = ({ data, intraday, period, loading, isVisible, toggleVisibility, goldPrice, setPeriod }) => {
    const containerRef = useRef(null);
    const [hoverData, setHoverData] = useState(null);
    const chartData = useMemo(() => {
        if (period === '1d') return intraday && intraday.length > 0 ? intraday : [];
        if (!data || data.length === 0) return [];
        return period === '10d' ? data.slice(-10) : data.slice(-90);
    }, [data, intraday, period]);

    const prices = chartData.map(d => Number(d.price) || 0);
    const minPrice = prices.length ? Math.min(...prices) * 0.999 : 0;
    const maxPrice = prices.length ? Math.max(...prices) * 1.001 : 100;
    const range = maxPrice - minPrice || 100;
    
    const getY = (price) => 100 - (((Number(price) || 0) - minPrice) / range) * 100;
    const getX = (index) => (index / (Math.max(1, chartData.length - 1))) * 100;
    const points = chartData.map((d, i) => [getX(i), getY(d.price)]);
    const svgPath = (points) => points.reduce((acc, point, i) => i === 0 ? `M ${point[0]},${point[1]}` : `${acc} L ${point[0]},${point[1]}`, '');
    const pathD = points.length > 1 ? svgPath(points) : '';
    const fillPathD = points.length > 1 ? `${pathD} L 100,100 L 0,100 Z` : '';

    const handleMouseMove = (e) => {
        if (!containerRef.current || chartData.length === 0) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left; 
        let index = Math.round((x / rect.width) * (chartData.length - 1));
        index = Math.max(0, Math.min(index, chartData.length - 1));
        setHoverData({ index, item: chartData[index], xPos: (index / (Math.max(1, chartData.length - 1))) * 100 });
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-4 relative z-0 transition-all duration-300">
            <div className="p-5 flex justify-between items-start cursor-pointer hover:bg-gray-50/50 transition-colors" onClick={toggleVisibility}>
                <div>
                    <div className="flex items-center gap-2 mb-1.5"><span className="text-sm font-bold text-gray-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>賣出金價</span></div>
                    <div className="text-3xl font-black text-gray-800 tracking-tight flex items-baseline gap-2">{formatMoney(goldPrice)} <span className="text-sm text-gray-400 font-normal">/克</span></div>
                </div>
                {isVisible ? <ChevronUp size={20} className="text-gray-300"/> : <ChevronDown size={20} className="text-gray-300"/>}
            </div>
            {isVisible && (
                <div className="px-5 pb-5 animate-[fadeIn_0.3s]">
                    {loading ? <div className="h-32 flex items-center justify-center text-gray-300 text-xs"><Loader2 className="animate-spin mr-2"/> 載入數據...</div> :
                     chartData.length === 0 ? <div className="h-32 flex items-center justify-center text-gray-300 text-xs">無數據</div> :
                    <div className="h-32 w-full relative" ref={containerRef} onMouseMove={handleMouseMove} onMouseLeave={() => setHoverData(null)} onTouchMove={(e)=>handleMouseMove(e.touches[0])}>
                         <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                            <defs><linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#eab308" stopOpacity="0.3" /><stop offset="100%" stopColor="#eab308" stopOpacity="0" /></linearGradient></defs>
                            <path d={fillPathD} fill="url(#goldGradient)" />
                            <path d={pathD} fill="none" stroke="#eab308" strokeWidth="1.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                            {hoverData && (<g><line x1={hoverData.xPos} y1="0" x2={hoverData.xPos} y2="100" stroke="#d1d5db" strokeWidth="0.5" strokeDasharray="2" vectorEffect="non-scaling-stroke"/><circle cx={hoverData.xPos} cy={getY(hoverData.item.price)} r="2.5" fill="#eab308" stroke="white" strokeWidth="1.5"/></g>)}
                        </svg>
                        {hoverData && (<div style={{ position: 'absolute', left: `${hoverData.xPos}%`, top: 0, transform: `translateX(${hoverData.xPos > 50 ? '-105%' : '5%'})`, pointerEvents: 'none' }} className="bg-gray-800/90 text-white p-2 rounded-lg shadow-xl text-xs z-10 backdrop-blur-sm border border-white/10"><div className="font-bold text-yellow-400 mb-0.5">{formatMoney(hoverData.item.price)}</div><div className="text-gray-300 text-[10px]">{hoverData.item.label || hoverData.item.date}</div></div>)}
                    </div>}
                    <div className="flex justify-end gap-2 mt-4 bg-gray-50 p-1 rounded-xl inline-flex ml-auto w-full">
                        {['1d', '10d', '3m'].map(p => (<button key={p} onClick={(e)=>{e.stopPropagation(); setPeriod(p);}} className={`flex-1 text-[10px] px-2 py-1.5 rounded-lg font-bold transition-all ${period===p ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>{p==='1d'?'即時':p==='10d'?'近10日':'近3月'}</button>))}
                    </div>
                </div>
            )}
        </div>
    );
};

const AddGoldModal = ({ onClose, onSave, onDelete, initialData }) => {
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [unit, setUnit] = useState(initialData?.weight ? 'g' : 'g'); 
    const [weightInput, setWeightInput] = useState(initialData?.weight ? initialData.weight.toString() : '');
    const [totalCost, setTotalCost] = useState(initialData?.totalCost?.toString() ?? '');
    const [location, setLocation] = useState(initialData?.location || '');
    const [note, setNote] = useState(initialData?.note || '');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    const handleSubmit = () => {
        let w = parseFloat(weightInput);
        if (isNaN(w) || w <= 0) return;
        if (unit === 'tw_qian') w = w * 3.75;
        if (unit === 'tw_liang') w = w * 37.5;
        onSave({ date, weight: w, totalCost: parseFloat(totalCost) || 0, location, note });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-white w-full sm:max-w-md max-h-[90vh] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-[slideUp_0.3s_ease-out]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                    <h2 className="text-lg font-bold text-gray-800">{initialData ? "編輯紀錄" : "新增黃金"}</h2>
                    <button onClick={onClose} className="bg-gray-50 p-2 rounded-full hover:bg-gray-100"><X size={20} /></button>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><label className="text-xs font-bold text-gray-400">購買日期</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full bg-transparent font-bold"/></div>
                    <div className="flex gap-2">
                         <div className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100"><label className="text-xs font-bold text-gray-400">重量 ({unit})</label><input type="number" value={weightInput} onChange={e=>setWeightInput(e.target.value)} className="w-full bg-transparent text-2xl font-black"/></div>
                         <select value={unit} onChange={e=>setUnit(e.target.value)} className="bg-gray-100 rounded-xl px-2 font-bold text-sm outline-none"><option value="g">克</option><option value="tw_qian">錢</option></select>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><label className="text-xs font-bold text-gray-400">總成本</label><input type="number" value={totalCost} onChange={e=>setTotalCost(e.target.value)} className="w-full bg-transparent text-2xl font-black"/></div>
                    <div className="flex gap-2"><input placeholder="地點" value={location} onChange={e=>setLocation(e.target.value)} className="flex-1 bg-gray-50 p-3 rounded-xl border-gray-100 text-sm font-bold"/><input placeholder="備註" value={note} onChange={e=>setNote(e.target.value)} className="flex-1 bg-gray-50 p-3 rounded-xl border-gray-100 text-sm font-bold"/></div>
                    <button onClick={handleSubmit} className="w-full py-4 bg-yellow-500 text-white rounded-2xl font-bold shadow-lg shadow-yellow-200 active:scale-95 transition-transform">儲存</button>
                    {initialData && <button onClick={()=>setShowDeleteConfirm(true)} className="w-full py-3 text-red-500 font-bold bg-red-50 hover:bg-red-100 rounded-2xl transition-colors">刪除紀錄</button>}
                </div>
            </div>
            <ConfirmModal isOpen={showDeleteConfirm} title="刪除黃金紀錄" message="確定要刪除這筆黃金紀錄嗎？此動作無法復原。" onConfirm={() => onDelete(initialData.id)} onCancel={() => setShowDeleteConfirm(false)} />
        </div>
    );
};

const GoldConverter = ({ goldPrice, isVisible, toggleVisibility }) => {
    const [amount, setAmount] = useState('');
    const [unit, setUnit] = useState('g'); 
    const getGrams = () => {
        const val = parseFloat(amount);
        if (isNaN(val)) return 0;
        switch(unit) {
            case 'g': return val; case 'tw_qian': return val * 3.75; case 'tw_liang': return val * 37.5;
            case 'kg': return val * 1000; case 'twd': return val / (goldPrice || 1); default: return 0;
        }
    };
    const displayValues = { twd: getGrams() * goldPrice, g: getGrams(), tw_qian: getGrams() / 3.75, tw_liang: getGrams() / 37.5 };
    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-4 transition-all duration-300">
            <button onClick={toggleVisibility} className="w-full p-4 flex items-center justify-between bg-gray-50/50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-2 font-bold text-gray-700"><Calculator size={18} className="text-blue-600"/>黃金計算機</div>
                {isVisible ? <ChevronUp size={18} className="text-gray-400"/> : <ChevronDown size={18} className="text-gray-400"/>}
            </button>
            {isVisible && (
                <div className="p-5 animate-[fadeIn_0.3s]">
                    <div className="flex gap-2 mb-4">
                        <div className="relative flex-1"><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full bg-gray-50 text-2xl font-black text-gray-800 p-3 rounded-xl border-2 border-transparent focus:border-blue-400 outline-none transition-colors"/></div>
                        <select value={unit} onChange={(e) => setUnit(e.target.value)} className="bg-gray-100 font-bold text-gray-600 rounded-xl px-2 outline-none border-r-[10px] border-transparent cursor-pointer">
                            <option value="g">公克 (g)</option><option value="tw_qian">台錢</option><option value="tw_liang">台兩</option><option value="twd">金額 (NTD)</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className={`p-3 rounded-xl border ${unit === 'twd' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}><div className="text-[10px] text-gray-400 mb-1">價值 (TWD)</div><div className="font-black text-gray-800 text-lg">{formatMoney(displayValues.twd)}</div></div>
                        <div className={`p-3 rounded-xl border ${unit === 'tw_liang' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}><div className="text-[10px] text-gray-400 mb-1">台兩</div><div className="font-bold text-gray-800 text-lg">{new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 3 }).format(displayValues.tw_liang)} <span className="text-xs font-normal text-gray-400">兩</span></div></div>
                        <div className={`p-3 rounded-xl border ${unit === 'tw_qian' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}><div className="text-[10px] text-gray-400 mb-1">台錢</div><div className="font-bold text-gray-800 text-lg">{new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(displayValues.tw_qian)} <span className="text-xs font-normal text-gray-400">錢</span></div></div>
                        <div className={`p-3 rounded-xl border ${unit === 'g' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}><div className="text-[10px] text-gray-400 mb-1">公克 (g)</div><div className="font-bold text-gray-800 text-lg">{new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(displayValues.g)} <span className="text-xs font-normal text-gray-400">克</span></div></div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- EXPENSE COMPONENTS ---
const CalculatorKeypad = ({ onResult, onClose, initialValue = '' }) => {
    const [expression, setExpression] = useState(initialValue ? initialValue.toString() : '');
    const [display, setDisplay] = useState(initialValue ? initialValue.toString() : '0');

    const handlePress = (key) => {
        if (key === 'AC') { setExpression(''); setDisplay('0'); } 
        else if (key === 'DEL') { const newExp = expression.slice(0, -1); setExpression(newExp); setDisplay(newExp || '0'); } 
        else if (key === '=') {
            try {
                // eslint-disable-next-line no-new-func
                const result = new Function('return ' + expression.replace(/[^0-9+\-*/.]/g, ''))();
                const final = Number(result).toFixed(0); 
                setDisplay(final); setExpression(final); onResult(final);
            } catch (e) { setDisplay('Error'); }
        } else {
            const lastChar = expression.slice(-1);
            if (['+','-','*','/'].includes(key) && ['+','-','*','/'].includes(lastChar)) {
                 const newExp = expression.slice(0, -1) + key;
                 setExpression(newExp); setDisplay(newExp); return;
            }
            const newExp = expression + key;
            setExpression(newExp); setDisplay(newExp);
        }
    };

    const keys = [
        { label: 'AC', type: 'action', val: 'AC', color: 'text-red-500' }, { label: '÷', type: 'op', val: '/', color: 'text-blue-500' },
        { label: '×', type: 'op', val: '*', color: 'text-blue-500' }, { label: '⌫', type: 'action', val: 'DEL', color: 'text-gray-600' },
        { label: '7', type: 'num', val: '7' }, { label: '8', type: 'num', val: '8' }, { label: '9', type: 'num', val: '9' }, { label: '-', type: 'op', val: '-', color: 'text-blue-500' },
        { label: '4', type: 'num', val: '4' }, { label: '5', type: 'num', val: '5' }, { label: '6', type: 'num', val: '6' }, { label: '+', type: 'op', val: '+', color: 'text-blue-500' },
        { label: '1', type: 'num', val: '1' }, { label: '2', type: 'num', val: '2' }, { label: '3', type: 'num', val: '3' }, { label: '=', type: 'submit', val: '=', rowSpan: 2 },
        { label: '0', type: 'num', val: '0', colSpan: 2 }, { label: '.', type: 'num', val: '.' },
    ];

    return (
        <div className="bg-gray-50 border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] rounded-t-3xl overflow-hidden pb-6 animate-[slideUp_0.2s_ease-out]">
            <div className="p-4 bg-white border-b border-gray-100 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400">計算金額</span>
                <div className="text-3xl font-black text-gray-800 tracking-wider truncate max-w-[250px] text-right">{display}</div>
            </div>
            <div className="grid grid-cols-4 gap-1 p-2 bg-gray-100">
                {keys.map((k, i) => (
                    <button key={i} onClick={() => handlePress(k.val)} className={`${k.colSpan===2?'col-span-2':''} ${k.rowSpan===2?'row-span-2 h-full':'h-14'} ${k.type==='submit'?'bg-blue-600 text-white':'bg-white text-gray-800'} ${k.color||''} rounded-xl font-bold text-xl shadow-sm active:scale-95 transition-transform flex items-center justify-center`}>
                        {k.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

const AddExpenseModal = ({ onClose, onSave, onDelete, initialData, categories, bookId }) => {
    const [amount, setAmount] = useState(initialData?.amount || '');
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [type, setType] = useState(initialData?.type || 'expense');
    
    // Auto-select first category of matching type if none selected
    const availableCats = categories.filter(c => c.type === type);
    const [category, setCategory] = useState(initialData?.category || (availableCats[0]?.id || ''));
    
    // Update selected category when type changes if current is invalid
    useEffect(() => {
        if (!availableCats.find(c => c.id === category)) {
            setCategory(availableCats[0]?.id || '');
        }
    }, [type, categories]);

    const [note, setNote] = useState(initialData?.note || '');
    const [showKeypad, setShowKeypad] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleSubmit = () => {
        if (!amount || parseFloat(amount) === 0) return alert("請輸入金額");
        if (!category) return alert("請選擇分類");
        onSave({ amount: parseFloat(amount), date, category, note, type, bookId });
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end sm:justify-center items-center bg-black/60 backdrop-blur-sm sm:p-4 animate-[fadeIn_0.2s]">
             <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button onClick={()=>setType('expense')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${type==='expense'?'bg-white text-red-500 shadow-sm':'text-gray-400'}`}>支出</button>
                        <button onClick={()=>setType('income')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${type==='income'?'bg-white text-green-500 shadow-sm':'text-gray-400'}`}>收入</button>
                    </div>
                    <button onClick={onClose} className="bg-gray-50 p-2 rounded-full hover:bg-gray-100"><X size={20}/></button>
                </div>
                <div className="p-5 space-y-5 overflow-y-auto pb-32 sm:pb-5">
                    <div onClick={() => setShowKeypad(!showKeypad)} className={`text-center py-6 rounded-2xl border-2 cursor-pointer transition-colors ${type === 'expense' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-600'}`}>
                         <div className="text-xs font-bold opacity-60 mb-1">金額</div>
                         <div className="text-4xl font-black flex items-center justify-center gap-1"><span>$</span><span>{amount || '0'}</span><Pencil size={16} className="opacity-30 ml-2"/></div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><label className="text-xs font-bold text-gray-400 mb-1 block">日期</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent w-full font-bold outline-none"/></div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 mb-2 block">分類</label>
                        <div className="grid grid-cols-4 gap-2">
                            {availableCats.map(c => {
                                const Icon = ICON_MAP[c.icon] || Tag;
                                return (
                                    <button key={c.id} onClick={()=>setCategory(c.id)} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${category===c.id ? (type==='expense'?'bg-red-50 border-red-200 text-red-600':'bg-green-50 border-green-200 text-green-600') : 'bg-white border-gray-100 text-gray-400 grayscale hover:grayscale-0 hover:bg-gray-50'}`}>
                                        <Icon size={24} className="mb-1.5"/><span className="text-[10px] font-bold">{c.name}</span>
                                    </button>
                                );
                            })}
                            {availableCats.length === 0 && <div className="col-span-4 text-center text-gray-400 text-xs py-4">尚無此類型分類，請至「分類管理」新增。</div>}
                        </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><label className="text-xs font-bold text-gray-400 mb-1 block">備註</label><input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="寫點什麼..." className="bg-transparent w-full text-sm font-bold outline-none"/></div>
                    {!showKeypad && (<div className="pt-2 space-y-3"><button onClick={handleSubmit} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform text-lg">{initialData ? '更新紀錄' : '確認記帳'}</button>{initialData && <button onClick={()=>setShowDeleteConfirm(true)} className="w-full py-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-2xl font-bold transition-colors">刪除紀錄</button>}</div>)}
                </div>
             </div>
             {showKeypad && (<div className="w-full sm:max-w-md absolute bottom-0 z-[70]"><CalculatorKeypad initialValue={amount} onResult={(val) => { setAmount(val); setShowKeypad(false); }} onClose={() => setShowKeypad(false)} /></div>)}
             <ConfirmModal isOpen={showDeleteConfirm} title="刪除記帳紀錄" message="確定要刪除這筆花費紀錄嗎？此動作無法復原。" onConfirm={() => onDelete(initialData.id)} onCancel={() => setShowDeleteConfirm(false)} />
        </div>
    );
};

const BookManager = ({ isOpen, onClose, books, onSaveBook, onDeleteBook, currentBookId, setCurrentBookId }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newBookName, setNewBookName] = useState('');
    const [editingBook, setEditingBook] = useState(null); 
    const [bookToDelete, setBookToDelete] = useState(null);
    
    if (!isOpen) return null;

    const handleCreate = () => {
        if(!newBookName.trim()) return;
        onSaveBook({ name: newBookName });
        setNewBookName('');
        setIsAdding(false);
    };

    const handleUpdate = () => {
        if(!editingBook || !editingBook.name.trim()) return;
        onSaveBook({ id: editingBook.id, name: editingBook.name });
        setEditingBook(null);
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" onClick={(e)=>{if(e.target===e.currentTarget) onClose()}}>
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-[slideUp_0.2s_ease-out]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-xl text-gray-800 flex items-center gap-2"><Book size={24} className="text-blue-600"/> 帳本管理</h3>
                    <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"><X size={20} className="text-gray-500"/></button>
                </div>

                <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-2">
                    {books.map(book => {
                        const isCurrent = book.id === currentBookId;
                        const isEditingThis = editingBook?.id === book.id;

                        if (isEditingThis) {
                            return (
                                <div key={book.id} className="flex gap-2 animate-[fadeIn_0.2s]">
                                    <input autoFocus value={editingBook.name} onChange={e=>setEditingBook({...editingBook, name: e.target.value})} className="flex-1 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm font-bold text-blue-800 outline-none focus:ring-2 focus:ring-blue-400"/>
                                    <button onClick={handleUpdate} className="bg-blue-600 text-white px-4 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-colors"><Check size={18}/></button>
                                </div>
                            );
                        }

                        return (
                            <div key={book.id} onClick={() => { setCurrentBookId(book.id); onClose(); }} className={`group flex justify-between items-center cursor-pointer p-4 rounded-2xl border-2 transition-all duration-200 ${isCurrent ? 'bg-blue-50/50 border-blue-400 shadow-sm' : 'bg-white border-gray-100 hover:border-blue-200 hover:bg-blue-50/30'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCurrent ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors'}`}>
                                        <Wallet size={20}/>
                                    </div>
                                    <div>
                                        <span className={`font-bold block ${isCurrent ? 'text-blue-800' : 'text-gray-700'}`}>{book.name}</span>
                                        {isCurrent && <span className="text-[10px] text-blue-500 font-bold bg-blue-100 px-2 py-0.5 rounded-full">目前使用中</span>}
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e)=>{e.stopPropagation(); setEditingBook(book);}} className="p-2 text-gray-400 hover:text-blue-600 bg-white rounded-lg shadow-sm hover:shadow transition-all"><Edit2 size={16}/></button>
                                    {!isCurrent && (<button onClick={(e)=>{e.stopPropagation(); setBookToDelete(book);}} className="p-2 text-gray-400 hover:text-red-600 bg-white rounded-lg shadow-sm hover:shadow transition-all"><Trash2 size={16}/></button>)}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {isAdding ? (
                    <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 animate-[fadeIn_0.2s]">
                        <label className="text-xs font-bold text-gray-500">建立新帳本</label>
                        <input autoFocus value={newBookName} onChange={e=>setNewBookName(e.target.value)} placeholder="輸入帳本名稱..." className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"/>
                        <div className="flex gap-2">
                            <button onClick={()=>setIsAdding(false)} className="flex-1 py-3 text-gray-500 font-bold bg-gray-200 rounded-xl hover:bg-gray-300 transition-colors">取消</button>
                            <button onClick={handleCreate} disabled={!newBookName.trim()} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all">新增</button>
                        </div>
                    </div>
                ) : (
                    <button onClick={() => setIsAdding(true)} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 font-bold hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center justify-center gap-2">
                        <Plus size={20}/> 建立新帳本
                    </button>
                )}
            </div>
            
            <ConfirmModal isOpen={!!bookToDelete} title="刪除帳本" message={`確定要刪除「${bookToDelete?.name}」嗎？裡面的所有記帳紀錄將會被一併刪除且無法復原。`} onConfirm={() => { onDeleteBook(bookToDelete.id); setBookToDelete(null); }} onCancel={() => setBookToDelete(null)} />
        </div>
    );
};

const CategoryManager = ({ isOpen, onClose, categories, onSave, onDelete }) => {
    const [editingId, setEditingId] = useState(null);
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('tag');
    const [type, setType] = useState('expense');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

    if (!isOpen) return null;

    const handleEdit = (cat) => {
        setEditingId(cat.id);
        setName(cat.name);
        setIcon(cat.icon);
        setType(cat.type);
    };

    const handleAddNew = () => {
        setEditingId(null);
        setName('');
        setIcon('tag');
    };

    const handleSave = () => {
        if (!name.trim()) return;
        onSave({ id: editingId, name, icon, type });
        handleAddNew();
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h3 className="font-black text-xl text-gray-800 flex items-center gap-2"><LayoutGrid size={24} className="text-purple-600"/> 分類管理</h3>
                    <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"><X size={20} className="text-gray-500"/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                    <div className="bg-gray-50 p-4 rounded-2xl mb-6 border border-gray-100">
                        <div className="flex bg-white rounded-xl p-1 mb-4 shadow-sm border border-gray-100">
                            <button onClick={()=>{setType('expense'); if(!editingId) setIcon('shopping-bag');}} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type==='expense'?'bg-red-50 text-red-600':'text-gray-400'}`}>支出分類</button>
                            <button onClick={()=>{setType('income'); if(!editingId) setIcon('wallet');}} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type==='income'?'bg-green-50 text-green-600':'text-gray-400'}`}>收入分類</button>
                        </div>
                        
                        <div className="mb-4">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">分類名稱</label>
                            <input value={name} onChange={e=>setName(e.target.value)} placeholder="例如：早餐、投資..." className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-bold outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"/>
                        </div>

                        <div className="mb-4">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">選擇圖示</label>
                            <div className="grid grid-cols-6 gap-2 bg-white p-3 rounded-xl border border-gray-200 h-40 overflow-y-auto">
                                {Object.keys(ICON_MAP).map(iconKey => {
                                    const IconComp = ICON_MAP[iconKey];
                                    return (
                                        <button key={iconKey} onClick={()=>setIcon(iconKey)} className={`aspect-square rounded-lg flex items-center justify-center transition-all ${icon === iconKey ? (type==='expense'?'bg-red-500 text-white shadow-md':'bg-green-500 text-white shadow-md') : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                                            <IconComp size={20}/>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {editingId && <button onClick={handleAddNew} className="py-3 px-4 font-bold text-gray-500 bg-gray-200 rounded-xl hover:bg-gray-300">取消</button>}
                            <button onClick={handleSave} disabled={!name.trim()} className={`flex-1 py-3 text-white rounded-xl font-bold shadow-md transition-all ${type==='expense'?'bg-red-500 hover:bg-red-600 shadow-red-200':'bg-green-500 hover:bg-green-600 shadow-green-200'} disabled:opacity-50`}>
                                {editingId ? '儲存修改' : '新增分類'}
                            </button>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-500 text-sm mb-3">現有{type==='expense'?'支出':'收入'}分類</h4>
                        <div className="grid grid-cols-2 gap-3">
                            {categories.filter(c=>c.type===type).map(cat => {
                                const IconComp = ICON_MAP[cat.icon] || Tag;
                                return (
                                    <div key={cat.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-purple-200 transition-colors group">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${type==='expense'?'bg-red-50 text-red-500':'bg-green-50 text-green-500'}`}>
                                                <IconComp size={16}/>
                                            </div>
                                            <span className="font-bold text-sm text-gray-700">{cat.name}</span>
                                        </div>
                                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={()=>handleEdit(cat)} className="p-1.5 text-gray-400 hover:text-blue-500"><Edit2 size={14}/></button>
                                            <button onClick={()=>setShowDeleteConfirm(cat)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
            <ConfirmModal isOpen={!!showDeleteConfirm} title="刪除分類" message={`確定要刪除「${showDeleteConfirm?.name}」分類嗎？`} onConfirm={() => { onDelete(showDeleteConfirm.id); setShowDeleteConfirm(null); }} onCancel={() => setShowDeleteConfirm(null)} />
        </div>
    );
};

const Sidebar = ({ isOpen, onClose, currentView, setCurrentView, user, onLogout }) => {
    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-black/50 z-[90] backdrop-blur-sm transition-opacity" onClick={onClose} />}
            <div className={`fixed top-0 left-0 bottom-0 w-64 bg-gray-900 text-white z-[100] transform transition-transform duration-300 shadow-2xl flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 flex-1">
                    <div className="flex items-center gap-3 mb-10 mt-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30 text-xl border border-white/10">{user?.displayName?.[0] || 'U'}</div>
                        <div><div className="font-bold text-sm tracking-wide">{user?.displayName}</div><div className="text-[10px] text-gray-400 flex items-center gap-1"><ShieldCheck size={10}/> 已驗證帳號</div></div>
                    </div>
                    
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 ml-2">主要功能</div>
                    <div className="space-y-2 mb-8">
                        <button onClick={() => { setCurrentView('home'); onClose(); }} className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-4 transition-all duration-200 ${currentView === 'home' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}><LayoutGrid size={20} /> <span className="font-bold">首頁總覽</span></button>
                        <button onClick={() => { setCurrentView('gold'); onClose(); }} className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-4 transition-all duration-200 ${currentView === 'gold' ? 'bg-yellow-500/20 text-yellow-400 shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}><Coins size={20} /> <span className="font-bold">黃金存摺</span></button>
                        <button onClick={() => { setCurrentView('expense'); onClose(); }} className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-4 transition-all duration-200 ${currentView === 'expense' ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}><CreditCard size={20} /> <span className="font-bold">生活記帳</span></button>
                    </div>

                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 ml-2">資料與設定</div>
                    <div className="space-y-2">
                        <button onClick={() => { setCurrentView('history'); onClose(); }} className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-4 transition-all duration-200 ${currentView === 'history' ? 'bg-purple-500/20 text-purple-400 shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}><History size={20} /> <span className="font-bold">歷史紀錄</span></button>
                        <button onClick={() => { setCurrentView('categories'); onClose(); }} className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-4 transition-all duration-200 ${currentView === 'categories' ? 'bg-pink-500/20 text-pink-400 shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}><Tag size={20} /> <span className="font-bold">分類管理</span></button>
                    </div>
                </div>
                <div className="p-6 border-t border-white/5">
                     <button onClick={onLogout} className="w-full p-4 rounded-2xl flex items-center justify-center gap-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 font-bold text-sm transition-colors"><LogOut size={18}/> 安全登出</button>
                </div>
            </div>
        </>
    );
};

// --- MAIN APPLICATION SHELL ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [currentView, setCurrentView] = useState('home');

    // Gold Data
    const [goldTransactions, setGoldTransactions] = useState([]);
    const [goldPrice, setGoldPrice] = useState(2880);
    const [goldHistory, setGoldHistory] = useState([]);
    const [goldIntraday, setGoldIntraday] = useState([]);
    const [goldPeriod, setGoldPeriod] = useState('1d');
    const [priceLoading, setPriceLoading] = useState(false);
    const [showGoldAdd, setShowGoldAdd] = useState(false);
    const [editingGold, setEditingGold] = useState(null);
    const [showChart, setShowChart] = useState(false);
    const [showConverter, setShowConverter] = useState(false);

    // Expense Data
    const [books, setBooks] = useState([]);
    const [currentBookId, setCurrentBookId] = useState(null);
    const [allExpenses, setAllExpenses] = useState([]);
    const [categories, setCategories] = useState([]);
    
    // UI State
    const [showExpenseAdd, setShowExpenseAdd] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [showBookManager, setShowBookManager] = useState(false);

    useEffect(() => {
        if (!document.getElementById('tailwind-script')) {
            const script = document.createElement('script');
            script.id = 'tailwind-script';
            script.src = "https://cdn.tailwindcss.com";
            script.async = true;
            document.head.appendChild(script);
        }
    }, []);

    useEffect(() => {
        if (!isConfigured) return; 
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            if(u) fetchGoldPrice();
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Load Gold, Books, Categories
    useEffect(() => {
        if (!user || !isConfigured) return;

        const goldQ = query(collection(db, 'artifacts', appId, 'users', user.uid, 'gold_transactions'), orderBy('date', 'desc'));
        const unsubGold = onSnapshot(goldQ, (snap) => setGoldTransactions(snap.docs.map(d => ({id:d.id, ...d.data()}))));

        const booksRef = collection(db, 'artifacts', appId, 'users', user.uid, 'account_books');
        const unsubBooks = onSnapshot(query(booksRef, orderBy('createdAt', 'desc')), (snap) => {
            const b = snap.docs.map(d => ({id:d.id, ...d.data()}));
            setBooks(b);
            if (b.length > 0) {
                if (!currentBookId || !b.find(book => book.id === currentBookId)) setCurrentBookId(b[0].id);
            }
            if (b.length === 0) {
                 addDoc(booksRef, { name: '日常帳本', createdAt: serverTimestamp() }).catch(e => console.error(e));
            }
        });

        const catRef = collection(db, 'artifacts', appId, 'users', user.uid, 'expense_categories');
        const unsubCat = onSnapshot(query(catRef, orderBy('createdAt', 'asc')), (snap) => {
            if (snap.empty) {
                const defaults = [
                    { name: '餐飲', icon: 'utensils', type: 'expense' }, { name: '日常', icon: 'home', type: 'expense' },
                    { name: '網購', icon: 'shopping-cart', type: 'expense' }, { name: '交通', icon: 'bus', type: 'expense' },
                    { name: '薪水', icon: 'wallet', type: 'income' }, { name: '獎金', icon: 'gift', type: 'income' }
                ];
                defaults.forEach(c => addDoc(catRef, { ...c, createdAt: serverTimestamp() }).catch(e=>console.error(e)));
            } else {
                setCategories(snap.docs.map(d => ({id:d.id, ...d.data()})));
            }
        });

        return () => { unsubGold(); unsubBooks(); unsubCat(); };
    }, [user]);

    // Load All Expenses securely
    useEffect(() => {
        if (!user || !isConfigured) return;
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'expense_transactions'), orderBy('date', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setAllExpenses(snap.docs.map(d => ({id:d.id, ...d.data()})));
        });
        return () => unsub();
    }, [user, isConfigured]);

    const expenses = useMemo(() => {
        if (!currentBookId) return [];
        return allExpenses.filter(e => e.bookId === currentBookId);
    }, [allExpenses, currentBookId]);

    const fetchGoldPrice = async () => {
        setPriceLoading(true);
        try {
            const response = await fetch('/api/gold').catch(e => null);
            if (response && response.ok) {
                const data = await response.json();
                if (data.success) {
                    setGoldPrice(data.currentPrice); setGoldHistory(data.history || []); setGoldIntraday(data.intraday || []);
                    setPriceLoading(false); return;
                }
            }
            const yahooGold = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=3mo')).then(r => r.json());
            const yahooTwd = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://query1.finance.yahoo.com/v8/finance/chart/TWD=X?interval=1d&range=1d')).then(r => r.json());
            if (yahooGold.chart.result && yahooTwd.chart.result) {
                const gQuote = yahooGold.chart.result[0], tQuote = yahooTwd.chart.result[0];
                const twdRate = tQuote.meta.regularMarketPrice, currentGoldUsd = gQuote.meta.regularMarketPrice;
                const priceTwd = Math.floor((currentGoldUsd * twdRate / 31.1035) * 1.005);
                setGoldPrice(priceTwd);
                const timestamps = gQuote.timestamp, closePrices = gQuote.indicators.quote[0].close;
                const historyData = timestamps.map((ts, i) => (!closePrices[i] ? null : { date: new Date(ts * 1000).toISOString().split('T')[0], price: Math.floor((closePrices[i] * twdRate / 31.1035) * 1.005) })).filter(x => x).slice(-30);
                setGoldHistory(historyData); setGoldIntraday([]); 
            } else { throw new Error("Client fetch failed"); }
        } catch (e) { 
            setGoldPrice(2950); setGoldHistory([{date:'2023-10-25', price:2900}, {date:'2023-10-26', price:2950}]); setGoldIntraday([]);
        } finally { setPriceLoading(false); }
    };

    // Actions
    const handleGoldSave = async (data) => {
        try {
            const ref = collection(db, 'artifacts', appId, 'users', user.uid, 'gold_transactions');
            if (editingGold) await updateDoc(doc(ref, editingGold.id), { ...data, updatedAt: serverTimestamp() });
            else await addDoc(ref, { ...data, createdAt: serverTimestamp() });
            setShowGoldAdd(false); setEditingGold(null);
        } catch (e) { alert("儲存失敗: " + e.message); }
    };
    const handleGoldDelete = async (id) => { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'gold_transactions', id)); setShowGoldAdd(false); };

    const handleBookSave = async (data) => {
        try {
            if (data.id) await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'account_books', data.id), { name: data.name, updatedAt: serverTimestamp() });
            else await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'account_books'), { ...data, createdAt: serverTimestamp() });
        } catch (e) { alert("儲存帳本失敗: " + e.message); }
    };
    const handleBookDelete = async (id) => {
        if(books.length <= 1) return alert("至少需保留一個帳本");
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'account_books', id));
        if(currentBookId === id) setCurrentBookId(books.find(b=>b.id!==id)?.id);
    };

    const handleExpenseSave = async (data) => {
        if (!data.bookId) return alert("未選擇帳本");
        try {
            const ref = collection(db, 'artifacts', appId, 'users', user.uid, 'expense_transactions');
            if (editingExpense) await updateDoc(doc(ref, editingExpense.id), { ...data, updatedAt: serverTimestamp() });
            else await addDoc(ref, { ...data, createdAt: serverTimestamp() });
            setShowExpenseAdd(false); setEditingExpense(null);
        } catch (e) { alert("儲存紀錄失敗: " + e.message); }
    };
    const handleExpenseDelete = async (id) => {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expense_transactions', id));
        setShowExpenseAdd(false);
    };

    const handleCategorySave = async (data) => {
        try {
            const ref = collection(db, 'artifacts', appId, 'users', user.uid, 'expense_categories');
            if (data.id) {
                const { id, ...payload } = data;
                await updateDoc(doc(ref, id), { ...payload, updatedAt: serverTimestamp() });
            } else { await addDoc(ref, { ...data, createdAt: serverTimestamp() }); }
        } catch(e) { alert("儲存分類失敗: " + e.message); }
    };
    const handleCategoryDelete = async (id) => { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expense_categories', id)); };

    // 高度安全防護的計算邏輯 (避免資料殘缺導致白畫面)
    const goldTotalWeight = goldTransactions.reduce((acc, t) => acc + (Number(t.weight) || 0), 0);
    const goldTotalCost = goldTransactions.reduce((acc, t) => acc + (Number(t.totalCost) || 0), 0);
    const goldCurrentVal = goldTotalWeight * goldPrice;
    const goldProfit = goldCurrentVal - goldTotalCost;
    const goldAvgCost = goldTotalWeight > 0 ? goldTotalCost / goldTotalWeight : 0;

    const currentMonthStats = useMemo(() => {
        const now = new Date();
        const thisMonth = expenses.filter(e => {
            const safeDate = e.date || new Date().toISOString().split('T')[0];
            const d = new Date(safeDate);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const income = thisMonth.filter(e => e.type === 'income').reduce((a,b) => a + (Number(b.amount) || 0), 0);
        const expense = thisMonth.filter(e => e.type === 'expense').reduce((a,b) => a + (Number(b.amount) || 0), 0);
        return { income, expense, balance: income - expense };
    }, [expenses]);

    const pieChartData = useMemo(() => {
        const now = new Date();
        const thisMonthExpenses = expenses.filter(e => {
            const safeDate = e.date || new Date().toISOString().split('T')[0];
            const d = new Date(safeDate);
            return e.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const total = thisMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        
        const groups = {};
        thisMonthExpenses.forEach(e => {
            const cat = e.category || 'other';
            groups[cat] = (groups[cat] || 0) + (Number(e.amount) || 0);
        });

        const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);
        const colors = ['#f43f5e', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#84cc16'];
        
        let accumulated = 0;
        return sorted.map(([catId, amount], index) => {
            const percent = total > 0 ? (amount / total) * 100 : 0;
            const offset = 100 - accumulated;
            accumulated += percent;
            return {
                id: catId,
                name: categories.find(c => c.id === catId)?.name || '其他',
                amount,
                percent,
                color: colors[index % colors.length],
                dashArray: `${percent} ${100 - percent}`,
                offset
            };
        });
    }, [expenses, categories]);

    const dailyExpenses = useMemo(() => {
        const groups = {};
        expenses.forEach(e => {
            const safeDate = e.date || new Date().toISOString().split('T')[0];
            if(!groups[safeDate]) groups[safeDate] = { date: safeDate, list: [], total: 0 };
            groups[safeDate].list.push(e);
            if(e.type === 'expense') groups[safeDate].total -= (Number(e.amount) || 0);
        });
        // 確保安全排序
        Object.values(groups).forEach(g => g.list.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0)));
        return Object.values(groups).sort((a,b) => new Date(b.date) - new Date(a.date));
    }, [expenses]);

    const historyGroups = useMemo(() => {
        const groups = {};
        allExpenses.forEach(e => {
            const safeDate = e.date || new Date().toISOString().split('T')[0];
            const monthKey = safeDate.substring(0, 7); 
            if(!groups[monthKey]) groups[monthKey] = { date: monthKey, list: [], totalIncome: 0, totalExpense: 0 };
            groups[monthKey].list.push(e);
            if(e.type === 'expense') groups[monthKey].totalExpense += (Number(e.amount) || 0);
            else groups[monthKey].totalIncome += (Number(e.amount) || 0);
        });
        Object.values(groups).forEach(g => g.list.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0)));
        return Object.values(groups).sort((a,b) => new Date(b.date + '-01') - new Date(a.date + '-01'));
    }, [allExpenses]);

    if (!isConfigured) return <ConfigScreen />;
    if (loading) return <AppLoading />;
    if (!user) return <LoginView />;

    const currentBook = books.find(b => b.id === currentBookId);
    const viewTitles = { 'home':'資產總覽', 'gold':'黃金存摺', 'expense': currentBook?.name || '生活記帳', 'history':'歷史紀錄', 'categories':'分類管理' };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 pb-20 font-sans">
             <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
             <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} currentView={currentView} setCurrentView={setCurrentView} user={user} onLogout={() => signOut(auth)} />

             {/* TOP NAVIGATION BAR */}
             <div className="bg-white sticky top-0 z-40 px-4 py-3 flex justify-between items-center shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border-b border-gray-100">
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors"><Menu size={24} className="text-gray-700"/></button>
                <div className="font-black text-lg text-gray-800 flex items-center gap-2">
                    {currentView === 'expense' ? (
                        <div onClick={() => setShowBookManager(true)} className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 px-3 py-1.5 rounded-xl transition-colors border border-transparent hover:border-gray-200">
                            <Wallet size={18} className="text-blue-500"/><span className="max-w-[120px] truncate">{viewTitles[currentView]}</span><ChevronDown size={16} className="text-gray-400"/>
                        </div>
                    ) : (
                        <span>{viewTitles[currentView]}</span>
                    )}
                </div>
                <div className="w-8"></div>
             </div>

             {/* === HOME DASHBOARD VIEW === */}
             {currentView === 'home' && (
                 <div className="p-4 space-y-5 animate-[fadeIn_0.3s]">
                     {/* Expense Dashboard Card (圓餅圖總覽) */}
                     <div onClick={() => setCurrentView('expense')} className="bg-white rounded-[2rem] p-6 shadow-xl shadow-gray-200/50 border border-gray-100 cursor-pointer transform active:scale-[0.98] transition-all">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Wallet size={18}/></div>
                                <span className="font-bold tracking-wide text-gray-800">{currentBook?.name || '生活記帳'}</span>
                            </div>
                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">{new Date().getMonth()+1}月概況 <ArrowRight size={12} className="inline ml-1 mb-0.5"/></span>
                        </div>

                        {/* Donut Chart Container */}
                        <div className="relative w-40 h-40 mx-auto mb-6">
                            <svg viewBox="0 0 32 32" className="w-full h-full transform -rotate-90 drop-shadow-sm">
                                <circle r="15.9155" cx="16" cy="16" fill="transparent" stroke="#f3f4f6" strokeWidth="4" />
                                {pieChartData.map(slice => (
                                    <circle 
                                        key={slice.id}
                                        r="15.9155" cx="16" cy="16" fill="transparent" 
                                        stroke={slice.color} strokeWidth="4" 
                                        strokeDasharray={slice.dashArray} strokeDashoffset={slice.offset}
                                        className="transition-all duration-1000 ease-out"
                                    />
                                ))}
                            </svg>
                            {/* Center Text (收支出) */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <div className="text-[10px] font-bold text-gray-400 mb-1 tracking-widest">本月收支</div>
                                <div className="text-[11px] font-black text-emerald-500 mb-0.5">+{formatMoney(currentMonthStats.income).replace(/[^0-9,.]/g, '')}</div>
                                <div className="text-[11px] font-black text-rose-500">-{formatMoney(currentMonthStats.expense).replace(/[^0-9,.]/g, '')}</div>
                            </div>
                        </div>

                        {/* Legend (各個分類花費區間小點) */}
                        <div className="flex flex-wrap justify-center gap-2.5">
                            {pieChartData.length === 0 ? (
                                <div className="text-xs text-gray-400 font-bold bg-gray-50 px-4 py-2 rounded-xl w-full text-center">本月尚無支出紀錄</div>
                            ) : pieChartData.map(slice => (
                                <div key={slice.id} className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                                    <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{backgroundColor: slice.color}}></span>
                                    <span className="text-[10px] text-gray-600 font-bold">{slice.name}</span>
                                    <span className="text-[10px] text-gray-800 font-black">{slice.percent.toFixed(0)}%</span>
                                </div>
                            ))}
                        </div>
                     </div>

                     {/* Gold Dashboard Card */}
                     <div onClick={() => setCurrentView('gold')} className="bg-gradient-to-br from-amber-400 to-orange-600 rounded-[2rem] p-6 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden cursor-pointer transform active:scale-[0.98] transition-all border border-orange-400/30">
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-10 -mb-10 blur-2xl pointer-events-none"></div>
                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <div className="flex items-center gap-2"><div className="p-2 bg-white/20 rounded-xl backdrop-blur-md"><Coins size={18}/></div><span className="font-bold tracking-wide">我的金庫</span></div>
                            <span className="text-xs font-bold bg-black/20 px-3 py-1 rounded-full backdrop-blur-md">查看詳情 <ArrowRight size={12} className="inline ml-1 mb-0.5"/></span>
                        </div>
                        <div className="text-orange-50 text-xs font-bold mb-1 relative z-10">總市值 (TWD)</div>
                        <div className="text-4xl font-black mb-6 tracking-tight relative z-10">{formatMoney(goldCurrentVal)}</div>
                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10"><div className="text-[10px] text-orange-100 mb-1">總重量</div><div className="font-bold text-lg flex items-end gap-1">{formatWeight(goldTotalWeight, 'tw_qian').replace('錢', '')}<span className="text-xs mb-0.5 opacity-80">錢</span></div></div>
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10"><div className="text-[10px] text-orange-100 mb-1">未實現損益</div><div className="font-bold text-lg">{goldProfit>=0?'+':''}{formatMoney(goldProfit)}</div></div>
                        </div>
                     </div>
                 </div>
             )}

             {/* === GOLD VIEW === */}
             {currentView === 'gold' && (
                <div className="p-4 space-y-4 animate-[fadeIn_0.3s]">
                    <div className="bg-gradient-to-br from-amber-400 to-orange-600 rounded-[2rem] p-6 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                         <div className="text-orange-100 text-xs font-bold mb-1">黃金總市值</div>
                         <div className="text-4xl font-black mb-6 tracking-tight">{formatMoney(goldCurrentVal)}</div>
                         <div className="grid grid-cols-2 gap-4">
                             <div className="bg-white/10 backdrop-blur rounded-xl p-3"><div className="text-xs text-orange-100 opacity-80">持有 (錢)</div><div className="font-bold text-lg">{formatWeight(goldTotalWeight, 'tw_qian').replace('錢', '')}</div></div>
                             <div className="bg-white/10 backdrop-blur rounded-xl p-3"><div className="text-xs text-orange-100 opacity-80">損益</div><div className="font-bold text-lg">{goldProfit>=0?'+':''}{formatMoney(goldProfit)}</div></div>
                         </div>
                         <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center text-sm">
                             <div className="flex flex-col"><span className="text-orange-100/80 text-[10px] font-bold">購入總成本</span><span className="font-black">{formatMoney(goldTotalCost)}</span></div>
                             <div className="flex flex-col text-right"><span className="text-orange-100/80 text-[10px] font-bold">平均成本</span><span className="font-black">{formatMoney(goldAvgCost)}<span className="text-[10px] font-normal"> /克</span></span></div>
                         </div>
                    </div>
                    <button onClick={() => { setEditingGold(null); setShowGoldAdd(true); }} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-gray-900/20 active:scale-95 transition-transform"><Plus size={20}/> 紀錄一筆黃金</button>
                    <GoldConverter goldPrice={goldPrice} isVisible={showConverter} toggleVisibility={() => setShowConverter(!showConverter)}/>
                    <GoldChart data={goldHistory} intraday={goldIntraday} period={goldPeriod} setPeriod={setGoldPeriod} goldPrice={goldPrice} loading={priceLoading} isVisible={showChart} toggleVisibility={()=>setShowChart(!showChart)}/>
                    <div className="space-y-3">
                        <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider ml-1">最近紀錄</h3>
                        {goldTransactions.length === 0 ? <div className="text-center text-gray-400 py-10">尚無紀錄</div> : 
                         goldTransactions.map(t => (
                             <div key={t.id} onClick={() => { setEditingGold(t); setShowGoldAdd(true); }} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm hover:border-orange-200 cursor-pointer active:scale-95 transition-all">
                                 <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 font-bold"><Scale size={18}/></div><div><div className="font-bold text-gray-800">{formatWeight(t.weight)}</div><div className="text-xs text-gray-400">{t.date}</div></div></div>
                                 <div className="text-right"><div className="font-bold text-gray-800">{formatMoney(t.weight * goldPrice)}</div><div className={`text-[10px] font-bold mt-0.5 ${(t.weight*goldPrice - t.totalCost) >=0 ? 'text-green-500 bg-green-50 px-1.5 rounded':'text-red-500 bg-red-50 px-1.5 rounded'}`}>{(t.weight*goldPrice - t.totalCost) >=0 ? '賺 ':''}{formatMoney(t.weight*goldPrice - t.totalCost)}</div></div>
                             </div>
                         ))
                        }
                    </div>
                    {showGoldAdd && <AddGoldModal onClose={()=>setShowGoldAdd(false)} onSave={handleGoldSave} onDelete={handleGoldDelete} initialData={editingGold} />}
                </div>
             )}

             {/* === EXPENSE VIEW === */}
             {currentView === 'expense' && (
                <div className="p-4 space-y-5 animate-[fadeIn_0.3s]">
                    <div className="bg-white rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                        <div className="text-center mb-8">
                             <div className="text-gray-400 text-xs font-bold mb-1 bg-gray-50 inline-block px-3 py-1 rounded-full">{new Date().getMonth()+1}月 總結餘</div>
                             <div className={`text-4xl mt-2 font-black tracking-tight ${currentMonthStats.balance >= 0 ? 'text-blue-600' : 'text-red-500'}`}>{formatMoney(currentMonthStats.balance)}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100/50"><div className="flex items-center gap-1 text-emerald-600 text-xs font-bold mb-1"><ArrowLeft size={14}/> 收入</div><div className="font-black text-gray-800 text-xl">{formatMoney(currentMonthStats.income)}</div></div>
                            <div className="bg-rose-50 p-4 rounded-3xl border border-rose-100/50"><div className="flex items-center gap-1 text-rose-500 text-xs font-bold mb-1">支出 <ArrowRight size={14}/></div><div className="font-black text-gray-800 text-xl">{formatMoney(currentMonthStats.expense)}</div></div>
                        </div>
                    </div>
                    <button onClick={() => { setEditingExpense(null); setShowExpenseAdd(true); }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 active:scale-95 transition-transform"><Plus size={20}/> 記一筆</button>
                    
                    <div className="space-y-6 pb-10 mt-2">
                        {dailyExpenses.length === 0 ? <div className="text-center py-10 flex flex-col items-center"><div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4"><Coffee size={30} className="text-gray-300"/></div><div className="text-gray-400 font-bold">這個月還沒有記帳喔</div></div> : dailyExpenses.map((group, idx) => (
                            <div key={idx} className="animate-[fadeIn_0.3s]">
                                <div className="flex justify-between items-end px-2 mb-3"><div className="font-bold text-gray-500 text-sm">{formatDate(group.date)}</div><div className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-lg font-bold border border-gray-200">日支 {formatMoney(Math.abs(group.total))}</div></div>
                                <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] overflow-hidden">
                                    {group.list.map((item, i) => {
                                        const cat = categories.find(c=>c.id===item.category);
                                        const IconComp = ICON_MAP[cat?.icon] || Tag;
                                        return (
                                            <div key={item.id} onClick={() => { setEditingExpense(item); setShowExpenseAdd(true); }} className={`p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors ${i !== group.list.length-1 ? 'border-b border-gray-50' : ''}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${item.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
                                                        <IconComp size={20}/>
                                                    </div>
                                                    <div><div className="font-black text-gray-800 text-base">{cat?.name || '其他'}</div><div className="text-xs text-gray-400 max-w-[150px] truncate mt-0.5">{item.note || '無備註'}</div></div>
                                                </div>
                                                <div className={`font-black text-lg ${item.type === 'income' ? 'text-emerald-500' : 'text-gray-800'}`}>{item.type==='income'?'+':''}{formatMoney(item.amount)}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                    {showExpenseAdd && <AddExpenseModal onClose={() => setShowExpenseAdd(false)} onSave={handleExpenseSave} onDelete={handleExpenseDelete} initialData={editingExpense} categories={categories} bookId={currentBookId} />}
                    <BookManager isOpen={showBookManager} onClose={() => setShowBookManager(false)} books={books} onSaveBook={handleBookSave} onDeleteBook={handleBookDelete} currentBookId={currentBookId} setCurrentBookId={setCurrentBookId} />
                </div>
             )}

             {/* === HISTORY VIEW === */}
             {currentView === 'history' && (
                 <div className="p-4 space-y-6 animate-[fadeIn_0.3s]">
                     {historyGroups.length === 0 ? (
                         <div className="text-center py-20 text-gray-400 font-bold flex flex-col items-center"><History size={40} className="mb-4 opacity-20"/>目前沒有任何歷史紀錄</div>
                     ) : historyGroups.map((group) => (
                         <div key={group.date}>
                             <div className="flex justify-between items-center mb-3 px-2">
                                 <h3 className="text-lg font-black text-gray-700">{formatMonth(group.date)}</h3>
                                 <div className="text-[10px] font-bold bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-xl shadow-sm">
                                     收: <span className="text-green-600">{formatMoney(group.totalIncome)}</span> | 支: <span className="text-red-500">{formatMoney(group.totalExpense)}</span>
                                 </div>
                             </div>
                             <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] overflow-hidden">
                                 {group.list.map((item, i) => {
                                      const cat = categories.find(c=>c.id===item.category);
                                      const IconComp = ICON_MAP[cat?.icon] || Tag;
                                      return (
                                         <div key={item.id} className={`p-4 flex justify-between items-center hover:bg-gray-50 transition-colors ${i !== group.list.length-1 ? 'border-b border-gray-50' : ''}`}>
                                             <div className="flex items-center gap-4">
                                                 <div className="text-xs font-bold text-gray-400 w-10 text-center flex flex-col items-center justify-center bg-gray-50 rounded-xl py-1.5 border border-gray-100">
                                                     <div className="text-lg text-gray-800 leading-none mb-0.5">{new Date(item.date).getDate()}</div>
                                                     <div className="text-[8px] uppercase">Day</div>
                                                 </div>
                                                 <div className="flex items-center gap-2">
                                                    <div className={`p-1.5 rounded-lg ${item.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}><IconComp size={14}/></div>
                                                    <div>
                                                        <div className="font-bold text-gray-800 text-sm">{cat?.name || '其他'}</div>
                                                        <div className="text-[10px] text-gray-400 max-w-[120px] truncate">{item.note || '無備註'}</div>
                                                    </div>
                                                 </div>
                                             </div>
                                             <div className="text-right">
                                                <div className={`font-black ${item.type === 'income' ? 'text-green-500' : 'text-gray-800'}`}>{item.type==='income'?'+':'-'}{formatMoney(item.amount)}</div>
                                                <div className="text-[9px] text-gray-400 bg-gray-100 inline-block px-1.5 rounded mt-0.5">{books.find(b=>b.id===item.bookId)?.name}</div>
                                             </div>
                                         </div>
                                     )
                                 })}
                             </div>
                         </div>
                     ))}
                 </div>
             )}

             {/* === CATEGORY MANAGER VIEW === */}
             {currentView === 'categories' && (
                 <CategoryManager isOpen={true} onClose={()=>setCurrentView('home')} categories={categories} onSave={handleCategorySave} onDelete={handleCategoryDelete} />
             )}
        </div>
    );
}
