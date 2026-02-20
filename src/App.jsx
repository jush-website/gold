import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  deleteDoc, doc, updateDoc, serverTimestamp,
  query, orderBy, setDoc
} from 'firebase/firestore';
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
  getRedirectResult, signInWithRedirect
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
  Heart, Zap, Scissors, Briefcase, LayoutGrid, Check,
  ChevronLeft, ChevronRight, PieChart, Undo2, Download, Share,
  Database, UploadCloud, DownloadCloud
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

const Toast = ({ message, type }) => {
    if (!message) return null;
    return (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[200] animate-[fadeIn_0.3s]">
            <div className={`px-5 py-3 rounded-full shadow-xl flex items-center gap-2 text-sm font-bold text-white transition-all ${type === 'error' ? 'bg-red-500 shadow-red-500/30' : 'bg-gray-800 shadow-gray-800/30'}`}>
                {type === 'error' ? <AlertCircle size={18} /> : <Check size={18} className="text-green-400" />}
                {message}
            </div>
        </div>
    );
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-[slideUp_0.2s_ease-out]">
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4 mx-auto">
                    <AlertCircle size={24} />
                </div>
                <h3 className="text-xl font-bold text-center text-gray-800 mb-2">{title}</h3>
                <p className="text-center text-gray-500 mb-6 text-sm">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">取消</button>
                    <button onClick={onConfirm} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-colors">確定</button>
                </div>
            </div>
        </div>
    );
};

const AppLoading = () => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827', color: 'white' }}>
    <div className="relative"><div className="w-16 h-16 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div><div className="absolute inset-0 flex items-center justify-center"><Coins size={24} className="text-yellow-500" /></div></div>
    <h2 className="mt-4 text-xl font-bold tracking-wider text-yellow-500" style={{fontFamily: 'sans-serif'}}>我的記帳本</h2>
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
    const isInAppBrowser = /Line|FBAN|FBAV|Instagram|WeChat/i.test(navigator.userAgent);

    const handleGoogleLogin = async () => {
        if (isInAppBrowser) {
            setError('請點擊右上角或右下角選單，選擇「以 Safari / Chrome 開啟」後再登入。');
            return;
        }
        setLoading(true); setError('');
        try { 
            await signInWithPopup(auth, googleProvider); 
        } catch (err) { 
            if (err.code === 'auth/popup-closed-by-user') {
                setError('您取消了登入，請再試一次。');
            } else if (err.code === 'auth/missing-initial-state' || err.message.includes('missing initial state')) {
                setError('瀏覽器安全限制阻擋了登入。請點擊下方的「重新導向模式」登入，或將網頁加入主畫面。');
            } else {
                setError(`登入失敗: ${err.message}`); 
            }
            setLoading(false); 
        }
    };

    const handleRedirectLogin = async () => {
        setLoading(true); setError('');
        try { await signInWithRedirect(auth, googleProvider); } 
        catch (err) { setError(`導向登入失敗: ${err.message}`); setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{backgroundColor: '#111827'}}>
             <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
             <div className="relative z-10 w-full max-w-md bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 p-8 rounded-3xl shadow-2xl text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20 transform rotate-3"><Wallet size={40} className="text-white" /></div>
                <h1 className="text-3xl font-black text-white mb-2">我的記帳本</h1><p className="text-gray-400 mb-8">黃金投資 • 生活記帳 • 財務自由</p>
                
                {isInAppBrowser && (
                    <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 p-3 rounded-xl mb-4 text-xs text-left flex items-start gap-2">
                        <AlertCircle size={16} className="shrink-0 mt-0.5"/>
                        <span>偵測到您使用社群軟體內建瀏覽器，這會阻擋登入。請點擊選單選擇<strong>「以 Safari / Chrome 開啟」</strong>。</span>
                    </div>
                )}

                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-4 text-xs text-left flex items-start gap-2"><AlertCircle size={16} className="shrink-0 mt-0.5"/><span>{error}</span></div>}
                
                <button onClick={handleGoogleLogin} disabled={loading} className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-4 px-6 rounded-xl mb-3 flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-lg">{loading ? <Loader2 className="animate-spin"/> : <User size={20}/>} 使用 Google 登入</button>
                <button onClick={handleRedirectLogin} disabled={loading} className="mt-2 mb-6 text-[11px] text-gray-400 hover:text-gray-200 underline py-2 transition-colors">登入沒反應？改用「重新導向」模式登入</button>
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500"><ShieldCheck size={14} /><span>Google 安全驗證 • 資料加密儲存</span></div>
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

const AddGoldModal = ({ onClose, onSave, initialData, showToast }) => {
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [unit, setUnit] = useState(initialData?.weight ? 'g' : 'g'); 
    const [weightInput, setWeightInput] = useState(initialData?.weight ? initialData.weight.toString() : '');
    const [totalCost, setTotalCost] = useState(initialData?.totalCost?.toString() ?? '');
    const [location, setLocation] = useState(initialData?.location || '');
    const [note, setNote] = useState(initialData?.note || '');
    
    const handleSubmit = () => {
        let w = parseFloat(weightInput);
        if (isNaN(w) || w <= 0) {
            showToast("請輸入正確的重量", "error");
            return;
        }
        if (unit === 'tw_qian') w = w * 3.75;
        if (unit === 'tw_liang') w = w * 37.5;
        onSave({ id: initialData?.id, date, weight: w, totalCost: parseFloat(totalCost) || 0, location, note });
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
                    <button onClick={handleSubmit} className="w-full py-4 bg-yellow-500 text-white rounded-2xl font-bold shadow-lg shadow-yellow-200 active:scale-95 transition-transform">儲存紀錄</button>
                </div>
            </div>
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
    const [isNewInput, setIsNewInput] = useState(!!initialValue);

    const handlePress = (key) => {
        if (key === 'AC') { 
            setExpression(''); 
            setDisplay('0'); 
            setIsNewInput(false);
        } 
        else if (key === 'DEL') { 
            setIsNewInput(false);
            const newExp = expression.slice(0, -1); 
            setExpression(newExp); 
            setDisplay(newExp || '0'); 
        } 
        else if (key === '=') {
            try {
                // eslint-disable-next-line no-new-func
                const result = new Function('return ' + expression.replace(/[^0-9+\-*/.]/g, ''))();
                const final = Number(result).toFixed(0); 
                setDisplay(final); 
                setExpression(final); 
                onResult(final);
            } catch (e) { setDisplay('Error'); }
        } else {
            const lastChar = expression.slice(-1);
            const isOperator = ['+','-','*','/'].includes(key);

            if (isOperator) {
                 setIsNewInput(false);
                 if (['+','-','*','/'].includes(lastChar)) {
                     const newExp = expression.slice(0, -1) + key;
                     setExpression(newExp); setDisplay(newExp); return;
                 }
                 const newExp = expression + key;
                 setExpression(newExp); setDisplay(newExp);
            } else {
                 if (isNewInput) {
                     setExpression(key);
                     setDisplay(key);
                     setIsNewInput(false);
                 } else {
                     const newExp = expression + key;
                     setExpression(newExp); setDisplay(newExp);
                 }
            }
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

const AddExpenseModal = ({ onClose, onSave, initialData, categories, bookId, showToast }) => {
    const [amount, setAmount] = useState(initialData?.amount || '');
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [type, setType] = useState(initialData?.type || 'expense');
    
    const availableCats = categories.filter(c => c.type === type);
    const [category, setCategory] = useState(initialData?.category || (availableCats[0]?.id || ''));
    
    useEffect(() => {
        if (!availableCats.find(c => c.id === category)) {
            setCategory(availableCats[0]?.id || '');
        }
    }, [type, categories]);

    // 新增：明細名稱狀態
    const [itemName, setItemName] = useState(initialData?.itemName || '');
    const [note, setNote] = useState(initialData?.note || '');
    const [showKeypad, setShowKeypad] = useState(false);

    const handleSubmit = () => {
        if (!amount || parseFloat(amount) === 0) {
            showToast("請輸入金額", "error");
            return;
        }
        if (!category) {
            showToast("請選擇分類", "error");
            return;
        }
        // 修正：將 itemName 一併送出儲存
        onSave({ id: initialData?.id, amount: parseFloat(amount), date, category, itemName, note, type, bookId });
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end sm:justify-center items-center bg-black/60 backdrop-blur-sm sm:p-4 animate-[fadeIn_0.2s]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
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
                    {/* 新增：明細名稱輸入框 */}
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><label className="text-xs font-bold text-gray-400 mb-1 block">明細名稱</label><input type="text" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="填入明細" className="bg-transparent w-full text-sm font-bold outline-none"/></div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><label className="text-xs font-bold text-gray-400 mb-1 block">備註</label><input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="寫點什麼..." className="bg-transparent w-full text-sm font-bold outline-none"/></div>
                    {!showKeypad && (<div className="pt-2 space-y-3"><button onClick={handleSubmit} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform text-lg">{initialData ? '儲存修改' : '確認記帳'}</button></div>)}
                </div>
             </div>
             {showKeypad && (<div className="w-full sm:max-w-md absolute bottom-0 z-[70]"><CalculatorKeypad initialValue={amount} onResult={(val) => { setAmount(val); setShowKeypad(false); }} onClose={() => setShowKeypad(false)} /></div>)}
        </div>
    );
};

const BookManager = ({ isOpen, onClose, books, onSaveBook, onDeleteBook, currentBookId, setCurrentBookId, showToast }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newBookName, setNewBookName] = useState('');
    const [editingBook, setEditingBook] = useState(null); 
    const [bookToDelete, setBookToDelete] = useState(null);
    
    if (!isOpen) return null;

    const handleCreate = () => {
        if(!newBookName.trim()) {
            showToast("請輸入帳本名稱", "error");
            return;
        }
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
                    {books.length === 0 && <div className="text-center py-6 text-gray-400 font-bold text-sm">目前無帳本</div>}
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
                                <div className="flex gap-1 transition-opacity">
                                    <button onClick={(e)=>{e.stopPropagation(); setEditingBook(book);}} className="p-2 text-gray-400 hover:text-blue-600 bg-white rounded-lg shadow-sm hover:shadow transition-all"><Edit2 size={16}/></button>
                                    <button onClick={(e)=>{e.stopPropagation(); setBookToDelete(book);}} className="p-2 text-gray-400 hover:text-red-600 bg-white rounded-lg shadow-sm hover:shadow transition-all"><Trash2 size={16}/></button>
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

// --- NEW CATEGORY MODAL ---
const CategoryModal = ({ onClose, onSave, initialData, defaultType, showToast }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [type, setType] = useState(initialData?.type || defaultType);
    const [icon, setIcon] = useState(initialData?.icon || (type === 'expense' ? 'shopping-bag' : 'wallet'));

    useEffect(() => {
        if (initialData) {
            setName(initialData.name || '');
            setType(initialData.type || defaultType);
            setIcon(initialData.icon || (initialData.type === 'expense' ? 'shopping-bag' : 'wallet'));
        } else {
            setName('');
            setType(defaultType);
            setIcon(defaultType === 'expense' ? 'shopping-bag' : 'wallet');
        }
    }, [initialData, defaultType]);

    const handleSubmit = () => {
        if (!name.trim()) {
            showToast("請輸入分類名稱", "error");
            return;
        }
        onSave({ id: initialData?.id, name: name.trim(), icon, type });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[90] flex flex-col justify-end sm:justify-center items-center bg-black/60 backdrop-blur-sm sm:p-4 animate-[fadeIn_0.2s]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
             <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button onClick={() => { setType('expense'); if (!initialData) setIcon('shopping-bag'); }} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${type === 'expense' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400'}`}>支出分類</button>
                        <button onClick={() => { setType('income'); if (!initialData) setIcon('wallet'); }} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${type === 'income' ? 'bg-white text-green-500 shadow-sm' : 'text-gray-400'}`}>收入分類</button>
                    </div>
                    <button onClick={onClose} className="bg-gray-50 p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"><X size={20} /></button>
                </div>

                <div className="p-5 space-y-5 overflow-y-auto pb-8">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">分類名稱</label>
                        <input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="例如：早餐、投資..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"/>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">選擇圖示</label>
                        <div className="grid grid-cols-6 gap-2 bg-gray-50 p-4 rounded-2xl border border-gray-200 max-h-48 overflow-y-auto hide-scrollbar">
                            {Object.keys(ICON_MAP).map(iconKey => {
                                const IconComp = ICON_MAP[iconKey];
                                return (
                                    <button key={iconKey} onClick={()=>setIcon(iconKey)} className={`aspect-square rounded-xl flex items-center justify-center transition-all ${icon === iconKey ? (type==='expense'?'bg-red-500 text-white shadow-md':'bg-green-500 text-white shadow-md') : 'bg-white text-gray-400 hover:bg-gray-100 shadow-sm border border-gray-100'}`}>
                                        <IconComp size={20}/>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="pt-2">
                        <button onClick={handleSubmit} className={`w-full py-4 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-transform text-lg ${type==='expense'?'bg-red-500 shadow-red-200 hover:bg-red-600':'bg-green-500 shadow-green-200 hover:bg-green-600'}`}>
                            {initialData ? '儲存修改' : '確認新增'}
                        </button>
                    </div>
                </div>
             </div>
        </div>
    );
};

const CategoryManager = ({ onClose, categories, onSave, onDelete, showToast }) => {
    const [activeTab, setActiveTab] = useState('expense');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCat, setEditingCat] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

    const filteredCategories = categories.filter(c => c.type === activeTab);

    const handleAddNew = () => {
        setEditingCat(null);
        setIsModalOpen(true);
    };

    const handleEdit = (cat) => {
        setEditingCat(cat);
        setIsModalOpen(true);
    };

    return (
        <div className="p-4 space-y-4 animate-[fadeIn_0.3s]">
            <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
                <button onClick={() => setActiveTab('expense')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'expense' ? 'bg-purple-50 text-purple-600 shadow-sm border border-purple-100' : 'text-gray-400 hover:bg-gray-50'}`}>支出分類</button>
                <button onClick={() => setActiveTab('income')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'income' ? 'bg-purple-50 text-purple-600 shadow-sm border border-purple-100' : 'text-gray-400 hover:bg-gray-50'}`}>收入分類</button>
            </div>

            <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-gray-800 text-base flex items-center gap-2">
                        <LayoutGrid size={18} className="text-purple-500"/>
                        現有{activeTab === 'expense' ? '支出' : '收入'}分類
                    </h4>
                </div>

                <div className="max-h-[55vh] overflow-y-auto hide-scrollbar pr-1 pb-2">
                    {filteredCategories.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 font-bold text-sm bg-gray-50 rounded-2xl border border-dashed border-gray-200">目前尚無分類</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 content-start">
                            {filteredCategories.map(cat => {
                                const IconComp = ICON_MAP[cat.icon] || Tag;
                                return (
                                    <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-2xl hover:border-purple-200 hover:bg-purple-50/30 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-sm transition-colors ${activeTab === 'expense' ? 'text-red-500 group-hover:text-red-600' : 'text-green-500 group-hover:text-green-600'}`}>
                                                <IconComp size={20}/>
                                            </div>
                                            <span className="font-black text-base text-gray-700">{cat.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleEdit(cat)} className="p-2.5 text-gray-400 hover:text-blue-600 bg-white border border-gray-100 hover:border-blue-200 rounded-xl shadow-sm transition-all active:scale-95"><Edit2 size={16}/></button>
                                            <button onClick={() => setShowDeleteConfirm(cat)} className="p-2.5 text-gray-400 hover:text-red-500 bg-white border border-gray-100 hover:border-red-200 rounded-xl shadow-sm transition-all active:scale-95"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            <button onClick={handleAddNew} className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-200 active:scale-95 transition-transform">
                <Plus size={20}/> 新增{activeTab === 'expense' ? '支出' : '收入'}分類
            </button>

            {isModalOpen && <CategoryModal onClose={() => setIsModalOpen(false)} onSave={onSave} initialData={editingCat} defaultType={activeTab} showToast={showToast} />}
            <ConfirmModal isOpen={!!showDeleteConfirm} title="刪除分類" message={`確定要刪除「${showDeleteConfirm?.name}」分類嗎？`} onConfirm={() => { onDelete(showDeleteConfirm.id); setShowDeleteConfirm(null); }} onCancel={() => setShowDeleteConfirm(null)} />
        </div>
    );
};

// --- NEW BACKUP / RESTORE COMPONENT ---
const BackupRestoreView = ({ goldTransactions, books, allExpenses, categories, user, appId, db, showToast }) => {
    const [isLoading, setIsLoading] = useState(false);
    
    const handleExport = () => {
        const data = { goldTransactions, books, allExpenses, categories };
        const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); 
        a.href = url; 
        a.download = `我的記帳本_備份_${new Date().toISOString().split('T')[0]}.json`; 
        a.click();
        URL.revokeObjectURL(url);
        showToast("資料已成功匯出");
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!window.confirm("還原將會覆寫/合併現有資料，建議先備份當前資料。確定要繼續嗎？")) {
            e.target.value = ''; 
            return;
        }
        
        setIsLoading(true);
        const reader = new FileReader();
        
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (!data.books && !data.allExpenses && !data.goldTransactions) {
                    throw new Error("無效的備份檔案格式");
                }

                const importCollection = async (collectionName, items) => {
                    if (!items || !Array.isArray(items)) return; 
                    const promises = items.map(async (item) => {
                        if (!item || !item.id) return; 
                        const { id, ...payload } = item;
                        try {
                            const docRef = doc(db, 'artifacts', appId, 'users', user.uid, collectionName, String(id));
                            await setDoc(docRef, payload);
                        } catch (err) {
                            console.warn(`寫入 ${collectionName} 的紀錄 ${id} 時發生錯誤:`, err);
                        }
                    });
                    await Promise.all(promises);
                };

                await importCollection('gold_transactions', data.goldTransactions);
                await importCollection('account_books', data.books);
                await importCollection('expense_transactions', data.allExpenses);
                await importCollection('expense_categories', data.categories);

                showToast("資料還原成功！正在重新載入...");
                setTimeout(() => window.location.reload(), 1500); 

            } catch (error) {
                console.error("還原錯誤:", error);
                showToast(`還原失敗: ${error.message}`, "error");
            } finally {
                setIsLoading(false);
                e.target.value = ''; 
            }
        };
        
        reader.onerror = () => {
            showToast("讀取檔案失敗，請檢查檔案是否損毀。", "error");
            setIsLoading(false);
            e.target.value = '';
        };
        
        reader.readAsText(file);
    };

    return (
        <div className="p-4 space-y-6 animate-[fadeIn_0.3s]">
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center mb-4">
                    <Database size={24} />
                </div>
                <h2 className="text-xl font-black text-gray-800 mb-2">備份與還原</h2>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                    您可以將所有的記帳、黃金存摺、帳本與分類資料匯出為一個檔案保存在手機或電腦中，以便更換設備或需要時進行還原。
                </p>

                <div className="space-y-4">
                    <button onClick={handleExport} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-md shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                        <DownloadCloud size={20} /> 匯出資料 (備份下載)
                    </button>

                    <div className="relative">
                        <input 
                            type="file" 
                            accept=".json"
                            onClick={(e) => { e.target.value = null; }} 
                            onChange={handleImport}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={isLoading}
                        />
                        <button disabled={isLoading} className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><UploadCloud size={20} /> 匯入資料 (選擇檔案還原)</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Sidebar = ({ isOpen, onClose, currentView, navigateTo, user, onLogout }) => {
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
                        <button onClick={() => { navigateTo('home'); onClose(); }} className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-4 transition-all duration-200 ${currentView === 'home' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}><LayoutGrid size={20} /> <span className="font-bold">首頁總覽</span></button>
                        <button onClick={() => { navigateTo('gold'); onClose(); }} className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-4 transition-all duration-200 ${currentView === 'gold' ? 'bg-yellow-500/20 text-yellow-400 shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}><Coins size={20} /> <span className="font-bold">黃金存摺</span></button>
                        <button onClick={() => { navigateTo('expense'); onClose(); }} className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-4 transition-all duration-200 ${currentView === 'expense' ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}><CreditCard size={20} /> <span className="font-bold">生活記帳</span></button>
                    </div>

                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 ml-2">資料與設定</div>
                    <div className="space-y-2">
                        <button onClick={() => { navigateTo('history'); onClose(); }} className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-4 transition-all duration-200 ${currentView === 'history' ? 'bg-purple-500/20 text-purple-400 shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}><History size={20} /> <span className="font-bold">歷史紀錄</span></button>
                        <button onClick={() => { navigateTo('categories'); onClose(); }} className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-4 transition-all duration-200 ${currentView === 'categories' ? 'bg-pink-500/20 text-pink-400 shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}><Tag size={20} /> <span className="font-bold">分類管理</span></button>
                        <button onClick={() => { navigateTo('backup'); onClose(); }} className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-4 transition-all duration-200 ${currentView === 'backup' ? 'bg-indigo-500/20 text-indigo-400 shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}><Database size={20} /> <span className="font-bold">備份與還原</span></button>
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
    
    // 全域 Toast 狀態
    const [toast, setToast] = useState({ message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
    };

    // 全域歷史導覽堆疊
    const [historyStack, setHistoryStack] = useState(['home']);
    const currentView = historyStack[historyStack.length - 1];

    const navigateTo = (view) => {
        setHistoryStack(prev => {
            const existingIndex = prev.indexOf(view);
            if (existingIndex !== -1) return prev.slice(0, existingIndex + 1);
            return [...prev, view];
        });
    };

    const goBack = () => {
        setHistoryStack(prev => prev.length > 1 ? prev.slice(0, -1) : ['home']);
    };

    // PWA & Install state
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallBtn, setShowInstallBtn] = useState(false);
    const [showIOSPrompt, setShowIOSPrompt] = useState(false);
    const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

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
    
    // History specific state
    const [currentHistoryDate, setCurrentHistoryDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [historyTab, setHistoryTab] = useState('stats'); 
    const [touchStartX, setTouchStartX] = useState(null);
    const [touchStartY, setTouchStartY] = useState(null);

    // UI State
    const [showExpenseAdd, setShowExpenseAdd] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [expenseToDelete, setExpenseToDelete] = useState(null);
    const [goldToDelete, setGoldToDelete] = useState(null);
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

    // --- PWA (Progressive Web App) App 安裝設定與偵測 ---
    useEffect(() => {
        const metaTags = [
            { name: 'theme-color', content: '#f9fafb' }, 
            { name: 'apple-mobile-web-app-capable', content: 'yes' }, 
            { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }, 
            { name: 'apple-mobile-web-app-title', content: '我的記帳本' }, 
            { name: 'mobile-web-app-capable', content: 'yes' } 
        ];

        metaTags.forEach(({ name, content }) => {
            let meta = document.querySelector(`meta[name="${name}"]`);
            if (!meta) {
                meta = document.createElement('meta');
                meta.name = name;
                document.head.appendChild(meta);
            }
            meta.content = content;
        });

        const absoluteIconUrl = window.location.origin + "/gold.png";

        const manifest = {
            name: "我的記帳本", short_name: "我的記帳本", description: "您的專屬黃金與記帳管理工具",
            start_url: window.location.origin, display: "standalone", background_color: "#f9fafb", theme_color: "#f9fafb",
            icons: [{
                src: absoluteIconUrl,
                sizes: "192x192 512x512", type: "image/png", purpose: "any maskable"
            }]
        };
        const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
        const manifestUrl = URL.createObjectURL(manifestBlob);
        
        let link = document.querySelector('link[rel="manifest"]');
        if (!link) { link = document.createElement('link'); link.rel = 'manifest'; document.head.appendChild(link); }
        link.href = manifestUrl;

        let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
        if (!appleIcon) { 
            appleIcon = document.createElement('link'); 
            appleIcon.rel = 'apple-touch-icon'; 
            appleIcon.href = absoluteIconUrl; 
            document.head.appendChild(appleIcon); 
        }

        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
        const isAndroidDevice = /android/.test(userAgent);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone || document.referrer.includes('android-app://');
        
        setIsIOS(isIOSDevice);

        if (!isStandalone && (isIOSDevice || isAndroidDevice)) {
            setShowInstallBtn(true);
        }

        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            if (!isStandalone) setShowInstallBtn(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            URL.revokeObjectURL(manifestUrl);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSPrompt(true);
        } else if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                setShowInstallBtn(false);
            }
        } else {
            setShowAndroidPrompt(true);
        }
    };

    useEffect(() => {
        if (!isConfigured) return; 
        
        getRedirectResult(auth).catch((error) => {
            console.error("Redirect login error:", error);
        });

        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            if(u) fetchGoldPrice();
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

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
            } else if (currentBookId) {
                setCurrentBookId(null);
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

    useEffect(() => {
        if (!user || !isConfigured) return;
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'expense_transactions'), orderBy('date', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setAllExpenses(snap.docs.map(d => ({id:d.id, ...d.data()})));
        });
        return () => unsub();
    }, [user, isConfigured]);

    // 所有跟隨特定帳本的資料
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

    // --- 嚴格的 Firebase CRUD 函數 ---
    const handleGoldSave = async (data) => {
        try {
            if (data.id) {
                const { id, ...payload } = data;
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'gold_transactions', String(id)), { ...payload, updatedAt: serverTimestamp() });
                showToast("修改黃金紀錄成功");
            } else {
                const { id, ...payload } = data;
                await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'gold_transactions'), { ...payload, createdAt: serverTimestamp() });
                showToast("新增黃金紀錄成功");
            }
            setShowGoldAdd(false); setEditingGold(null);
        } catch (e) { showToast(`儲存失敗: ${e.message}`, "error"); }
    };

    const handleGoldDelete = async (id) => { 
        if (!id) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'gold_transactions', String(id))); 
            setShowGoldAdd(false);
            showToast("已刪除黃金紀錄");
        } catch (e) { showToast(`刪除失敗: ${e.message}`, "error"); }
    };

    const handleBookSave = async (data) => {
        try {
            if (data.id) {
                const { id, ...payload } = data;
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'account_books', String(id)), { ...payload, updatedAt: serverTimestamp() });
                showToast("帳本名稱已更新");
            } else {
                const { id, ...payload } = data;
                await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'account_books'), { ...payload, createdAt: serverTimestamp() });
                showToast("新增帳本成功");
            }
        } catch (e) { showToast(`儲存帳本失敗: ${e.message}`, "error"); }
    };

    const handleBookDelete = async (id) => {
        if (!id) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'account_books', String(id)));
            showToast("已刪除帳本");
            if(currentBookId === id) {
                const remainingBooks = books.filter(b => b.id !== id);
                setCurrentBookId(remainingBooks.length > 0 ? remainingBooks[0].id : null);
            }
        } catch (e) { showToast(`刪除帳本失敗: ${e.message}`, "error"); }
    };

    const handleExpenseSave = async (data) => {
        if (!data.bookId) return showToast("未選擇帳本", "error");
        try {
            if (data.id) {
                const { id, ...payload } = data;
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expense_transactions', String(id)), { ...payload, updatedAt: serverTimestamp() });
                showToast("修改記帳紀錄成功");
            } else {
                const { id, ...payload } = data;
                await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expense_transactions'), { ...payload, createdAt: serverTimestamp() });
                showToast("新增記帳成功");
            }
            setShowExpenseAdd(false); setEditingExpense(null);
        } catch (e) { showToast(`儲存紀錄失敗: ${e.message}`, "error"); }
    };

    const handleExpenseDelete = async (id) => {
        if (!id) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expense_transactions', String(id)));
            setShowExpenseAdd(false);
            showToast("已刪除記帳紀錄");
        } catch (e) { showToast(`刪除失敗: ${e.message}`, "error"); }
    };

    const handleCategorySave = async (data) => {
        try {
            if (data.id) {
                const { id, ...payload } = data;
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expense_categories', String(id)), { ...payload, updatedAt: serverTimestamp() });
                showToast("分類修改成功");
            } else { 
                const { id, ...payload } = data;
                await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expense_categories'), { ...payload, createdAt: serverTimestamp() }); 
                showToast("新增分類成功");
            }
        } catch(e) { showToast(`儲存分類失敗: ${e.message}`, "error"); }
    };

    const handleCategoryDelete = async (id) => { 
        if (!id) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expense_categories', String(id))); 
            showToast("已刪除分類");
        } catch (e) { showToast(`刪除分類失敗: ${e.message}`, "error"); }
    };

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
        Object.values(groups).forEach(g => g.list.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0)));
        return Object.values(groups).sort((a,b) => new Date(b.date) - new Date(a.date));
    }, [expenses]);

    // 歷史紀錄篩選
    const historyCurrentMonthKey = `${currentHistoryDate.getFullYear()}-${(currentHistoryDate.getMonth() + 1).toString().padStart(2, '0')}`;
    
    const currentHistoryRecords = useMemo(() => {
        return expenses.filter(e => {
            const safeDate = e.date || new Date().toISOString().split('T')[0];
            return safeDate.startsWith(historyCurrentMonthKey);
        }).sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
    }, [expenses, historyCurrentMonthKey]);

    const historyTotalIncome = currentHistoryRecords.filter(e => e.type === 'income').reduce((a,b) => a + (Number(b.amount) || 0), 0);
    const historyTotalExpense = currentHistoryRecords.filter(e => e.type === 'expense').reduce((a,b) => a + (Number(b.amount) || 0), 0);

    const handleTouchStart = (e) => {
        setTouchStartX(e.touches[0].clientX);
        setTouchStartY(e.touches[0].clientY);
    };

    const handleTouchEnd = (e) => {
        if (touchStartX === null || touchStartY === null) return;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const diffX = touchStartX - touchEndX;
        const diffY = Math.abs(touchStartY - touchEndY);

        if (Math.abs(diffX) > 50 && diffY < 50) {
            if (diffX > 0) {
                setCurrentHistoryDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
            } else if (diffX < 0) {
                setCurrentHistoryDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
            }
        }
        setTouchStartX(null);
        setTouchStartY(null);
    };

    if (!isConfigured) return <ConfigScreen />;
    if (loading) return <AppLoading />;
    if (!user) return <LoginView />;

    const currentBook = books.find(b => b.id === currentBookId);
    const viewTitles = { 'home':'資產總覽', 'gold':'黃金存摺', 'expense': '生活記帳', 'history':'歷史紀錄', 'categories':'分類管理', 'backup':'備份與還原' };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 pb-20 font-sans touch-pan-y">
             <style>{`
                 html, body { overscroll-behavior-x: none; touch-action: pan-y; }
                 .hide-scrollbar::-webkit-scrollbar { display: none; } 
                 @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } } 
                 @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
             `}</style>
             
             {/* 全域 Toast 提示 */}
             <Toast message={toast.message} type={toast.type} />

             <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} currentView={currentView} navigateTo={navigateTo} user={user} onLogout={() => signOut(auth)} />

             {/* TOP NAVIGATION BAR */}
             <div className="bg-white sticky top-0 z-40 px-4 py-3 flex justify-between items-center shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border-b border-gray-100">
                <div className="w-[80px] flex items-center">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors">
                        <Menu size={24} className="text-gray-700"/>
                    </button>
                </div>
                
                <div className="font-black text-lg text-gray-800 flex justify-center items-center gap-2 flex-1">
                    {['expense', 'history'].includes(currentView) ? (
                        <div onClick={() => setShowBookManager(true)} className="flex flex-col items-center cursor-pointer hover:bg-gray-50 px-3 py-1 rounded-xl transition-colors border border-transparent hover:border-gray-200">
                            <div className="flex items-center gap-1.5">
                                <Wallet size={16} className={currentView === 'history' ? 'text-purple-500' : 'text-blue-500'}/>
                                <span className="max-w-[120px] truncate text-base leading-none">{viewTitles[currentView]}</span>
                                <ChevronDown size={14} className="text-gray-400"/>
                            </div>
                            <div className="text-[10px] text-gray-500 font-bold mt-1 tracking-wider">{currentBook?.name || '請選擇帳本'}</div>
                        </div>
                    ) : (
                        <span>{viewTitles[currentView]}</span>
                    )}
                </div>

                <div className="w-[80px] flex justify-end gap-1 items-center">
                    {showInstallBtn && (
                        <button onClick={handleInstallClick} className="flex items-center justify-center bg-blue-50 text-blue-600 w-8 h-8 rounded-full shadow-sm border border-blue-100 active:scale-95 transition-transform mr-1" title="下載 APP">
                            <Download size={16}/>
                        </button>
                    )}
                    {/* 右側返回按鈕 */}
                    {historyStack.length > 1 && (
                        <button onClick={goBack} className="p-2 -mr-2 rounded-full hover:bg-gray-50 transition-colors text-gray-700 flex items-center justify-center">
                            <Undo2 size={24}/>
                        </button>
                    )}
                </div>
             </div>

             {showAndroidPrompt && <AndroidInstallPrompt onClose={() => setShowAndroidPrompt(false)} />}
             {showIOSPrompt && <IOSInstallPrompt onClose={() => setShowIOSPrompt(false)} />}

             {/* === HOME DASHBOARD VIEW === */}
             {currentView === 'home' && (
                 <div className="p-4 space-y-5 animate-[fadeIn_0.3s]">
                     <div onClick={() => navigateTo('expense')} className="bg-gradient-to-b from-white to-gray-50/50 rounded-[2rem] p-6 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.1)] border border-gray-200/80 cursor-pointer transform active:scale-[0.98] transition-all relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Wallet size={18}/></div>
                                <span className="font-bold tracking-wide text-gray-800">{currentBook?.name || (books.length === 0 ? '目前無帳本' : '生活記帳')}</span>
                            </div>
                            <span className="text-xs font-bold text-gray-500 bg-white shadow-sm border border-gray-100 px-3 py-1.5 rounded-full">{new Date().getMonth()+1}月概況 <ArrowRight size={12} className="inline ml-1 mb-0.5"/></span>
                        </div>

                        <div className="relative w-48 h-48 mx-auto mb-6 relative z-10">
                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90 drop-shadow-md">
                                <circle r="15.9155" cx="18" cy="18" fill="transparent" stroke="#f3f4f6" strokeWidth="3" />
                                {pieChartData.map(slice => (
                                    <circle 
                                        key={slice.id}
                                        r="15.9155" cx="18" cy="18" fill="transparent" 
                                        stroke={slice.color} strokeWidth="3.5" 
                                        strokeDasharray={slice.dashArray} strokeDashoffset={slice.offset}
                                        className="transition-all duration-1000 ease-out"
                                    />
                                ))}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-white/30 rounded-full blur-[0.5px]"></div>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <div className="text-xs font-bold text-gray-400 mb-1.5 tracking-widest drop-shadow-sm">本月收支</div>
                                <div className="text-sm font-black text-emerald-500 mb-0.5 drop-shadow-sm">+{formatMoney(currentMonthStats.income).replace(/[^0-9,.]/g, '')}</div>
                                <div className="text-sm font-black text-rose-500 drop-shadow-sm">-{formatMoney(currentMonthStats.expense).replace(/[^0-9,.]/g, '')}</div>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center gap-2.5 relative z-10">
                            {pieChartData.length === 0 ? (
                                <div className="text-xs text-gray-400 font-bold bg-white border border-gray-100 px-4 py-2 rounded-xl w-full text-center">本月尚無支出紀錄</div>
                            ) : pieChartData.map(slice => (
                                <div key={slice.id} className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-gray-100 shadow-sm hover:shadow transition-shadow">
                                    <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{backgroundColor: slice.color}}></span>
                                    <span className="text-[10px] text-gray-600 font-bold">{slice.name}</span>
                                    <span className="text-[10px] text-gray-800 font-black">{slice.percent.toFixed(0)}%</span>
                                </div>
                            ))}
                        </div>
                     </div>

                     <div onClick={() => navigateTo('gold')} className="bg-gradient-to-br from-amber-400 to-orange-600 rounded-[2rem] p-6 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden cursor-pointer transform active:scale-[0.98] transition-all border border-orange-400/30">
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
                             <div key={t.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm transition-all">
                                 <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 font-bold"><Scale size={18}/></div>
                                     <div>
                                         <div className="font-bold text-gray-800">{formatWeight(t.weight)}</div>
                                         <div className="text-[10px] text-gray-400 mt-0.5">{t.date} · 成本 {formatMoney(t.totalCost)}</div>
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <div className="font-bold text-gray-800">{formatMoney(t.weight * goldPrice)}</div>
                                        <div className={`text-[10px] font-bold mt-0.5 inline-block ${(t.weight*goldPrice - t.totalCost) >=0 ? 'text-green-500 bg-green-50 px-1.5 rounded':'text-red-500 bg-red-50 px-1.5 rounded'}`}>{(t.weight*goldPrice - t.totalCost) >=0 ? '賺 ':''}{formatMoney(t.weight*goldPrice - t.totalCost)}</div>
                                    </div>
                                    <div className="flex flex-col gap-1 border-l border-gray-100 pl-3">
                                        <button onClick={() => { setEditingGold(t); setShowGoldAdd(true); }} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"><Edit2 size={16}/></button>
                                        <button onClick={() => setGoldToDelete(t)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                 </div>
                             </div>
                         ))
                        }
                    </div>
                    {showGoldAdd && <AddGoldModal onClose={()=>setShowGoldAdd(false)} onSave={handleGoldSave} initialData={editingGold} showToast={showToast} />}
                    <ConfirmModal isOpen={!!goldToDelete} title="刪除黃金紀錄" message="確定要刪除這筆黃金紀錄嗎？此動作無法復原。" onConfirm={() => { handleGoldDelete(goldToDelete?.id); setGoldToDelete(null); }} onCancel={() => setGoldToDelete(null)} />
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
                    <button onClick={() => { 
                        if(books.length === 0) return showToast('請先新增帳本', 'error');
                        setEditingExpense(null); 
                        setShowExpenseAdd(true); 
                    }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 active:scale-95 transition-transform"><Plus size={20}/> 記一筆</button>
                    
                    <div className="space-y-6 pb-10 mt-2">
                        {dailyExpenses.length === 0 ? <div className="text-center py-10 flex flex-col items-center"><div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4"><Coffee size={30} className="text-gray-300"/></div><div className="text-gray-400 font-bold">這個月還沒有記帳喔</div></div> : dailyExpenses.map((group, idx) => (
                            <div key={idx} className="animate-[fadeIn_0.3s]">
                                <div className="flex justify-between items-end px-2 mb-3"><div className="font-bold text-gray-500 text-sm">{formatDate(group.date)}</div><div className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-lg font-bold border border-gray-200">日支 {formatMoney(Math.abs(group.total))}</div></div>
                                <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] overflow-hidden">
                                    {group.list.map((item, i) => {
                                        const cat = categories.find(c=>c.id===item.category);
                                        const IconComp = ICON_MAP[cat?.icon] || Tag;
                                        return (
                                            <div key={item.id} className={`p-4 flex justify-between items-center transition-colors ${i !== group.list.length-1 ? 'border-b border-gray-50' : ''}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${item.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
                                                        <IconComp size={20}/>
                                                    </div>
                                                    <div>
                                                        {/* 修正：優先顯示明細名稱，若無則顯示分類 */}
                                                        <div className="font-black text-gray-800 text-base">{item.itemName || cat?.name || '其他'}</div>
                                                        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                                                            {/* 若有填寫明細名稱，則顯示分類小標籤 */}
                                                            {item.itemName && <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">{cat?.name || '其他'}</span>}
                                                            <span className="max-w-[120px] truncate">{item.note || '無備註'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className={`font-black text-lg text-right ${item.type === 'income' ? 'text-emerald-500' : 'text-gray-800'}`}>
                                                        {item.type==='income'?'+':''}{formatMoney(item.amount)}
                                                    </div>
                                                    <div className="flex flex-col gap-1 border-l border-gray-100 pl-3">
                                                        <button onClick={() => { setEditingExpense(item); setShowExpenseAdd(true); }} className="text-gray-400 hover:text-blue-500 transition-colors"><Edit2 size={14}/></button>
                                                        <button onClick={() => setExpenseToDelete(item)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                    {showExpenseAdd && <AddExpenseModal onClose={() => setShowExpenseAdd(false)} onSave={handleExpenseSave} initialData={editingExpense} categories={categories} bookId={currentBookId} showToast={showToast} />}
                    <BookManager isOpen={showBookManager} onClose={() => setShowBookManager(false)} books={books} onSaveBook={handleBookSave} onDeleteBook={handleBookDelete} currentBookId={currentBookId} setCurrentBookId={setCurrentBookId} showToast={showToast} />
                    <ConfirmModal isOpen={!!expenseToDelete} title="刪除記帳紀錄" message="確定要刪除這筆花費紀錄嗎？此動作無法復原。" onConfirm={() => { handleExpenseDelete(expenseToDelete?.id); setExpenseToDelete(null); }} onCancel={() => setExpenseToDelete(null)} />
                </div>
             )}

             {/* === HISTORY VIEW (Swipeable & Tabs) === */}
             {currentView === 'history' && (
                 <div 
                     className="p-4 space-y-5 animate-[fadeIn_0.3s]"
                     onTouchStart={handleTouchStart}
                     onTouchEnd={handleTouchEnd}
                 >
                     <div className="flex justify-between items-center bg-white p-3 rounded-3xl shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-100">
                         <button onClick={() => setCurrentHistoryDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="p-3 rounded-2xl text-purple-600 hover:bg-purple-50 hover:shadow-sm transition-all"><ChevronLeft size={24}/></button>
                         <div className="text-center select-none">
                             <h3 className="text-xl font-black text-gray-800 tracking-wide">{formatMonth(currentHistoryDate.toISOString())}</h3>
                             <div className="text-[10px] font-bold text-gray-400 mt-1 flex items-center justify-center gap-1">左右滑動切換 <ArrowLeft size={10}/><ArrowRight size={10}/></div>
                         </div>
                         <button onClick={() => setCurrentHistoryDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="p-3 rounded-2xl text-purple-600 hover:bg-purple-50 hover:shadow-sm transition-all"><ChevronRight size={24}/></button>
                     </div>

                     <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
                         <button onClick={() => setHistoryTab('stats')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${historyTab === 'stats' ? 'bg-purple-50 text-purple-600 shadow-sm border border-purple-100' : 'text-gray-400 hover:bg-gray-50'}`}>統計分析</button>
                         <button onClick={() => setHistoryTab('list')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${historyTab === 'list' ? 'bg-purple-50 text-purple-600 shadow-sm border border-purple-100' : 'text-gray-400 hover:bg-gray-50'}`}>交易明細</button>
                     </div>

                     {currentHistoryRecords.length === 0 ? (
                         <div className="text-center py-20 text-gray-400 font-bold flex flex-col items-center">
                             <History size={40} className="mb-4 opacity-20"/>
                             當月無紀錄
                         </div>
                     ) : (
                         <>
                             {historyTab === 'stats' && (
                                 <div className="space-y-4 animate-[fadeIn_0.3s]">
                                     <div className="grid grid-cols-2 gap-3">
                                         <div className="bg-emerald-50 rounded-[1.5rem] p-5 border border-emerald-100 shadow-sm">
                                             <div className="text-xs font-bold text-emerald-600/70 mb-1">當月總收入</div>
                                             <div className="text-2xl font-black text-emerald-700">{formatMoney(historyTotalIncome)}</div>
                                         </div>
                                         <div className="bg-rose-50 rounded-[1.5rem] p-5 border border-rose-100 shadow-sm">
                                             <div className="text-xs font-bold text-rose-600/70 mb-1">當月總支出</div>
                                             <div className="text-2xl font-black text-rose-700">{formatMoney(historyTotalExpense)}</div>
                                         </div>
                                     </div>

                                     <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
                                         <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                                             <PieChart size={16} className="text-purple-400"/> 分類支出排名
                                         </h4>
                                         <div className="space-y-4">
                                             {(() => {
                                                 const catTotals = {};
                                                 currentHistoryRecords.forEach(item => {
                                                     if (item.type === 'expense') {
                                                         const catId = item.category || 'other';
                                                         catTotals[catId] = (catTotals[catId] || 0) + (Number(item.amount) || 0);
                                                     }
                                                 });
                                                 const sortedCats = Object.entries(catTotals).sort((a,b) => b[1] - a[1]);
                                                 
                                                 if (sortedCats.length === 0) return <div className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-2xl font-bold">本月無支出</div>;
                                                 
                                                 return sortedCats.map(([catId, amount]) => {
                                                     const cat = categories.find(c => c.id === catId);
                                                     const IconComp = ICON_MAP[cat?.icon] || Tag;
                                                     const percent = historyTotalExpense > 0 ? ((amount / historyTotalExpense) * 100).toFixed(1) : 0;
                                                     
                                                     return (
                                                         <div key={catId} className="flex justify-between items-center group">
                                                             <div className="flex items-center gap-3">
                                                                 <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 shadow-inner group-hover:bg-purple-50 group-hover:text-purple-500 group-hover:border-purple-100 transition-colors">
                                                                     <IconComp size={20}/>
                                                                 </div>
                                                                 <div>
                                                                     <div className="text-sm font-black text-gray-700">{cat?.name || '其他'}</div>
                                                                     <div className="text-[11px] text-gray-400 font-bold mt-0.5">{percent}%</div>
                                                                 </div>
                                                             </div>
                                                             <span className="font-black text-lg text-gray-800">{formatMoney(amount)}</span>
                                                         </div>
                                                     )
                                                 });
                                             })()}
                                         </div>
                                     </div>
                                 </div>
                             )}

                             {historyTab === 'list' && (
                                 <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_15px_rgba(0,0,0,0.03)] overflow-hidden animate-[fadeIn_0.3s]">
                                     {currentHistoryRecords.map((item, i) => {
                                          const cat = categories.find(c=>c.id===item.category);
                                          const IconComp = ICON_MAP[cat?.icon] || Tag;
                                          return (
                                             <div key={item.id} className={`p-4 flex justify-between items-center transition-colors ${i !== currentHistoryRecords.length-1 ? 'border-b border-gray-50' : ''}`}>
                                                 <div className="flex items-center gap-4">
                                                     <div className="text-xs font-bold text-gray-400 w-11 text-center flex flex-col items-center justify-center bg-gray-50 rounded-2xl py-2 border border-gray-100 shadow-inner">
                                                         <div className="text-xl text-gray-800 leading-none mb-0.5 font-black">{new Date(item.date).getDate()}</div>
                                                         <div className="text-[8px] uppercase">Day</div>
                                                     </div>
                                                     <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-xl shadow-sm ${item.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}><IconComp size={18}/></div>
                                                        <div>
                                                            {/* 修正：在歷史紀錄也同步新的明細顯示邏輯 */}
                                                            <div className="font-black text-gray-800 text-sm">{item.itemName || cat?.name || '其他'}</div>
                                                            <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                                                                {item.itemName && <span className="bg-gray-100 text-gray-500 px-1 rounded font-bold">{cat?.name || '其他'}</span>}
                                                                <span className="max-w-[100px] truncate">{item.note || '無備註'}</span>
                                                            </div>
                                                        </div>
                                                     </div>
                                                 </div>
                                                 <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <div className={`font-black text-lg ${item.type === 'income' ? 'text-emerald-500' : 'text-gray-800'}`}>{item.type==='income'?'+':'-'}{formatMoney(item.amount)}</div>
                                                    </div>
                                                    <div className="flex flex-col gap-1 border-l border-gray-100 pl-3">
                                                        <button onClick={() => { setEditingExpense(item); setShowExpenseAdd(true); }} className="text-gray-400 hover:text-blue-500 transition-colors"><Edit2 size={14}/></button>
                                                        <button onClick={() => setExpenseToDelete(item)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                                    </div>
                                                 </div>
                                             </div>
                                         )
                                     })}
                                 </div>
                             )}
                         </>
                     )}
                     {showExpenseAdd && <AddExpenseModal onClose={() => setShowExpenseAdd(false)} onSave={handleExpenseSave} initialData={editingExpense} categories={categories} bookId={currentBookId} showToast={showToast} />}
                     <ConfirmModal isOpen={!!expenseToDelete} title="刪除記帳紀錄" message="確定要刪除這筆花費紀錄嗎？此動作無法復原。" onConfirm={() => { handleExpenseDelete(expenseToDelete?.id); setExpenseToDelete(null); }} onCancel={() => setExpenseToDelete(null)} />
                 </div>
             )}

             {/* === CATEGORY MANAGER VIEW === */}
             {currentView === 'categories' && (
                 <CategoryManager onClose={goBack} categories={categories} onSave={handleCategorySave} onDelete={handleCategoryDelete} showToast={showToast} />
             )}

             {/* === BACKUP & RESTORE VIEW === */}
             {currentView === 'backup' && (
                 <BackupRestoreView 
                     goldTransactions={goldTransactions} 
                     books={books} 
                     allExpenses={allExpenses} 
                     categories={categories} 
                     user={user} 
                     appId={appId} 
                     db={db} 
                     showToast={showToast}
                 />
             )}
        </div>
    );
}
