import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  deleteDoc, doc, updateDoc, serverTimestamp,
  query, orderBy, where, getDocs
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
  Smartphone, Plane, Gift, Divide, X as XIcon, Equal, Minus
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = {
  // 使用環境變數讀取 API Key (解決 GitHub 安全警告)
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "", 
  authDomain: "gold-29c1b.firebaseapp.com",
  projectId: "gold-29c1b",
  storageBucket: "gold-29c1b.firebasestorage.app",
  messagingSenderId: "867971422713",
  appId: "1:867971422713:web:f85ecab4f9374cdbc7c528",
  measurementId: "G-BNBRLYFBCX"
};

// --- Helper Functions ---
const formatMoney = (amount, currency = 'TWD') => {
  const num = Number(amount);
  if (isNaN(num)) return '$0';
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(num);
};

const formatWeight = (grams, unit = 'tw_qian') => { 
    const num = Number(grams);
    if (isNaN(num)) return '0.00';
    if (unit === 'tw_qian') {
        return new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num / 3.75) + '錢';
    }
    if (unit === 'tw_liang') {
        return new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(num / 37.5) + '兩';
    }
    return new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + '克';
};

const compressImage = (base64Str, maxWidth = 800, quality = 0.6) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64Str);
    });
};

const formatDate = (dateString) => {
    const d = new Date(dateString);
    const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    return `${d.getMonth() + 1}/${d.getDate()} ${days[d.getDay()]}`;
};

// --- Firebase Init ---
let app;
try { app = initializeApp(firebaseConfig); } catch (e) {}
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'gold-tracker-v2';
const appId = rawAppId.replace(/\//g, '_').replace(/\./g, '_');

// --- COMPONENTS ---

// 1. Loading Screen
const AppLoading = () => (
  <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827', color: 'white'
  }}>
    <div className="relative">
        <div className="w-16 h-16 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <Coins size={24} className="text-yellow-500" />
        </div>
    </div>
    <h2 className="mt-4 text-xl font-bold tracking-wider text-yellow-500" style={{fontFamily: 'sans-serif'}}>ASSET MASTER</h2>
    <p className="text-gray-400 text-sm mt-2">載入您的資產數據...</p>
  </div>
);

// 2. Login View
const LoginView = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (err) {
            setError(`登入失敗: ${err.message}`);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{backgroundColor: '#111827'}}>
             <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
             <div className="relative z-10 w-full max-w-md bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 p-8 rounded-3xl shadow-2xl text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20 transform rotate-3">
                    <Wallet size={40} className="text-white" />
                </div>
                <h1 className="text-3xl font-black text-white mb-2">資產管家</h1>
                <p className="text-gray-400 mb-8">黃金投資 • 生活記帳 • 財務自由</p>
                
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-4 text-xs text-left flex items-start gap-2">
                         <AlertCircle size={16} className="shrink-0 mt-0.5"/>
                         <span>{error}</span>
                    </div>
                )}
                
                <button onClick={handleGoogleLogin} disabled={loading} className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-4 px-6 rounded-xl mb-3 flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-lg">
                    {loading ? <Loader2 className="animate-spin"/> : <User size={20}/>} 
                    使用 Google 登入
                </button>
                
                <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-500">
                    <ShieldCheck size={14} />
                    <span>Google 安全驗證 • 資料加密儲存</span>
                </div>
            </div>
        </div>
    );
};

// --- GOLD TRACKER COMPONENTS ---
// ... (Preserving User's Original Gold Logic within components) ...

const GoldChart = ({ data, intraday, period, loading, isVisible, toggleVisibility, goldPrice, setPeriod }) => {
    const containerRef = useRef(null);
    const [hoverData, setHoverData] = useState(null);
    const chartData = useMemo(() => {
        if (period === '1d') return intraday && intraday.length > 0 ? intraday : [];
        if (!data || data.length === 0) return [];
        return period === '10d' ? data.slice(-10) : data.slice(-90);
    }, [data, intraday, period]);

    const prices = chartData.map(d => d.price);
    const minPrice = Math.min(...prices) * 0.999;
    const maxPrice = Math.max(...prices) * 1.001;
    const range = maxPrice - minPrice || 100;
    
    const getY = (price) => 100 - ((price - minPrice) / range) * 100;
    const getX = (index) => (index / (chartData.length - 1)) * 100;
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
        setHoverData({ index, item: chartData[index], xPos: (index / (chartData.length - 1)) * 100 });
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-4 relative z-0 transition-all duration-300">
            <div className="p-5 flex justify-between items-start cursor-pointer hover:bg-gray-50/50 transition-colors" onClick={toggleVisibility}>
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-bold text-gray-400 flex items-center gap-1">
                             <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>賣出金價
                        </span>
                    </div>
                    <div className="text-3xl font-black text-gray-800 tracking-tight flex items-baseline gap-2">
                        {formatMoney(goldPrice)} <span className="text-sm text-gray-400 font-normal">/克</span>
                    </div>
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
                        {hoverData && (
                            <div style={{ position: 'absolute', left: `${hoverData.xPos}%`, top: 0, transform: `translateX(${hoverData.xPos > 50 ? '-105%' : '5%'})`, pointerEvents: 'none' }} className="bg-gray-800/90 text-white p-2 rounded-lg shadow-xl text-xs z-10 backdrop-blur-sm border border-white/10">
                                <div className="font-bold text-yellow-400 mb-0.5">{formatMoney(hoverData.item.price)}</div>
                                <div className="text-gray-300 text-[10px]">{hoverData.item.label || hoverData.item.date}</div>
                            </div>
                        )}
                    </div>}
                    <div className="flex justify-end gap-2 mt-4 bg-gray-50 p-1 rounded-xl inline-flex ml-auto w-full">
                        {['1d', '10d', '3m'].map(p => (
                            <button key={p} onClick={(e)=>{e.stopPropagation(); setPeriod(p);}} className={`flex-1 text-[10px] px-2 py-1.5 rounded-lg font-bold transition-all ${period===p ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>{p==='1d'?'即時':p==='10d'?'近10日':'近3月'}</button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const AddGoldModal = ({ onClose, onSave, onDelete, initialData }) => {
    // ... (Use same logic as before, just simplified for this file)
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [unit, setUnit] = useState(initialData?.weight ? 'g' : 'g'); 
    const [weightInput, setWeightInput] = useState(initialData?.weight ? initialData.weight.toString() : '');
    const [totalCost, setTotalCost] = useState(initialData?.totalCost?.toString() ?? '');
    const [location, setLocation] = useState(initialData?.location || '');
    const [note, setNote] = useState(initialData?.note || '');
    
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
                    {/* Inputs Simplified for length */}
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><label className="text-xs font-bold text-gray-400">購買日期</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full bg-transparent font-bold"/></div>
                    <div className="flex gap-2">
                         <div className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100"><label className="text-xs font-bold text-gray-400">重量 ({unit})</label><input type="number" value={weightInput} onChange={e=>setWeightInput(e.target.value)} className="w-full bg-transparent text-2xl font-black"/></div>
                         <select value={unit} onChange={e=>setUnit(e.target.value)} className="bg-gray-100 rounded-xl px-2 font-bold text-sm"><option value="g">克</option><option value="tw_qian">錢</option></select>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><label className="text-xs font-bold text-gray-400">總成本</label><input type="number" value={totalCost} onChange={e=>setTotalCost(e.target.value)} className="w-full bg-transparent text-2xl font-black"/></div>
                    <div className="flex gap-2"><input placeholder="地點" value={location} onChange={e=>setLocation(e.target.value)} className="flex-1 bg-gray-50 p-3 rounded-xl border-gray-100 text-sm font-bold"/><input placeholder="備註" value={note} onChange={e=>setNote(e.target.value)} className="flex-1 bg-gray-50 p-3 rounded-xl border-gray-100 text-sm font-bold"/></div>
                    <button onClick={handleSubmit} className="w-full py-4 bg-yellow-500 text-white rounded-2xl font-bold shadow-lg shadow-yellow-200">儲存</button>
                    {initialData && <button onClick={()=>onDelete(initialData.id)} className="w-full py-3 text-red-500 font-bold bg-red-50 rounded-2xl">刪除</button>}
                </div>
            </div>
        </div>
    );
};

// --- EXPENSE TRACKER COMPONENTS ---

// 1. Calculator Keypad
const CalculatorKeypad = ({ onResult, onClose, initialValue = '' }) => {
    const [expression, setExpression] = useState(initialValue ? initialValue.toString() : '');
    const [display, setDisplay] = useState(initialValue ? initialValue.toString() : '0');

    const handlePress = (key) => {
        if (key === 'AC') {
            setExpression('');
            setDisplay('0');
        } else if (key === 'DEL') {
            const newExp = expression.slice(0, -1);
            setExpression(newExp);
            setDisplay(newExp || '0');
        } else if (key === '=') {
            try {
                // Safe evaluation for simple math
                // eslint-disable-next-line no-new-func
                const result = new Function('return ' + expression.replace(/[^0-9+\-*/.]/g, ''))();
                const final = Number(result).toFixed(0); // Assuming integer for currency usually
                setDisplay(final);
                setExpression(final);
                onResult(final);
            } catch (e) {
                setDisplay('Error');
            }
        } else {
            // Prevent multiple operators
            const lastChar = expression.slice(-1);
            if (['+','-','*','/'].includes(key) && ['+','-','*','/'].includes(lastChar)) {
                 const newExp = expression.slice(0, -1) + key;
                 setExpression(newExp);
                 setDisplay(newExp);
                 return;
            }
            const newExp = expression + key;
            setExpression(newExp);
            setDisplay(newExp);
        }
    };

    const keys = [
        { label: 'AC', type: 'action', val: 'AC', color: 'text-red-500' },
        { label: '÷', type: 'op', val: '/', color: 'text-blue-500' },
        { label: '×', type: 'op', val: '*', color: 'text-blue-500' },
        { label: '⌫', type: 'action', val: 'DEL', color: 'text-gray-600' },
        { label: '7', type: 'num', val: '7' },
        { label: '8', type: 'num', val: '8' },
        { label: '9', type: 'num', val: '9' },
        { label: '-', type: 'op', val: '-', color: 'text-blue-500' },
        { label: '4', type: 'num', val: '4' },
        { label: '5', type: 'num', val: '5' },
        { label: '6', type: 'num', val: '6' },
        { label: '+', type: 'op', val: '+', color: 'text-blue-500' },
        { label: '1', type: 'num', val: '1' },
        { label: '2', type: 'num', val: '2' },
        { label: '3', type: 'num', val: '3' },
        { label: '=', type: 'submit', val: '=', rowSpan: 2 },
        { label: '0', type: 'num', val: '0', colSpan: 2 },
        { label: '.', type: 'num', val: '.' },
    ];

    return (
        <div className="bg-gray-50 border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] rounded-t-3xl overflow-hidden pb-6">
            <div className="p-4 bg-white border-b border-gray-100 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400">計算金額</span>
                <div className="text-3xl font-black text-gray-800 tracking-wider truncate max-w-[250px] text-right">
                    {display}
                </div>
            </div>
            <div className="grid grid-cols-4 gap-1 p-2 bg-gray-100">
                {keys.map((k, i) => (
                    <button 
                        key={i}
                        onClick={() => handlePress(k.val)}
                        className={`
                            ${k.colSpan === 2 ? 'col-span-2' : ''}
                            ${k.rowSpan === 2 ? 'row-span-2 h-full' : 'h-14'}
                            ${k.type === 'submit' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'}
                            ${k.color || ''}
                            rounded-xl font-bold text-xl shadow-sm active:scale-95 transition-transform flex items-center justify-center
                        `}
                    >
                        {k.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

// 2. Add Transaction Modal
const AddExpenseModal = ({ onClose, onSave, onDelete, initialData, categories, bookId }) => {
    const [amount, setAmount] = useState(initialData?.amount || '');
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState(initialData?.category || categories[0]?.id);
    const [note, setNote] = useState(initialData?.note || '');
    const [type, setType] = useState(initialData?.type || 'expense'); // 'expense' or 'income'
    const [showKeypad, setShowKeypad] = useState(false);

    const handleSubmit = () => {
        if (!amount || parseFloat(amount) === 0) return;
        onSave({ 
            amount: parseFloat(amount), 
            date, 
            category, 
            note, 
            type,
            bookId 
        });
    };

    const categoryIcons = {
        'shopee': ShoppingBag,
        'taobao': Truck,
        'online': ShoppingCart,
        'daily': Home,
        'food': Utensils,
        'transport': Plane,
        'salary': Wallet,
        'bonus': Gift
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end sm:justify-center items-center bg-black/60 backdrop-blur-sm sm:p-4 animate-[fadeIn_0.2s]">
             {/* Main Modal Area */}
             <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button onClick={()=>setType('expense')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${type==='expense'?'bg-white text-red-500 shadow-sm':'text-gray-400'}`}>支出</button>
                        <button onClick={()=>setType('income')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${type==='income'?'bg-white text-green-500 shadow-sm':'text-gray-400'}`}>收入</button>
                    </div>
                    <button onClick={onClose} className="bg-gray-50 p-2 rounded-full hover:bg-gray-100"><X size={20}/></button>
                </div>
                
                <div className="p-5 space-y-5 overflow-y-auto pb-32 sm:pb-5">
                    {/* Amount Display / Trigger */}
                    <div onClick={() => setShowKeypad(!showKeypad)} className={`text-center py-6 rounded-2xl border-2 cursor-pointer transition-colors ${type === 'expense' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-600'}`}>
                         <div className="text-xs font-bold opacity-60 mb-1">金額</div>
                         <div className="text-4xl font-black flex items-center justify-center gap-1">
                             <span>$</span>
                             <span>{amount || '0'}</span>
                             <Pencil size={16} className="opacity-30 ml-2"/>
                         </div>
                    </div>

                    {/* Date */}
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <label className="text-xs font-bold text-gray-400 mb-1 block">日期</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent w-full font-bold outline-none"/>
                    </div>

                    {/* Categories */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 mb-2 block">分類</label>
                        <div className="grid grid-cols-4 gap-2">
                            {categories.map(c => {
                                const Icon = categoryIcons[c.icon] || Tag;
                                return (
                                    <button key={c.id} onClick={()=>setCategory(c.id)} className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${category===c.id ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-100 text-gray-400 grayscale hover:grayscale-0'}`}>
                                        <Icon size={20} className="mb-1"/>
                                        <span className="text-[10px] font-bold">{c.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Note */}
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <label className="text-xs font-bold text-gray-400 mb-1 block">備註</label>
                        <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="寫點什麼..." className="bg-transparent w-full text-sm font-bold outline-none"/>
                    </div>

                    {!showKeypad && (
                        <div className="pt-2 space-y-3">
                            <button onClick={handleSubmit} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform text-lg">
                                {initialData ? '更新紀錄' : '確認記帳'}
                            </button>
                            {initialData && <button onClick={()=>onDelete(initialData.id)} className="w-full py-3 text-red-500 bg-red-50 rounded-2xl font-bold">刪除紀錄</button>}
                        </div>
                    )}
                </div>
             </div>
             
             {/* Keypad Slide Up */}
             {showKeypad && (
                 <div className="w-full sm:max-w-md absolute bottom-0 z-[70] animate-[slideUp_0.2s_ease-out]">
                     <CalculatorKeypad 
                        initialValue={amount}
                        onResult={(val) => { setAmount(val); setShowKeypad(false); }} 
                        onClose={() => setShowKeypad(false)} 
                     />
                 </div>
             )}
        </div>
    );
};

// 3. Book Manager Modal
const BookManager = ({ isOpen, onClose, books, onSaveBook, onDeleteBook, currentBookId, setCurrentBookId }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newBookName, setNewBookName] = useState('');
    
    if (!isOpen) return null;

    const handleCreate = () => {
        if(!newBookName.trim()) return;
        onSaveBook({ name: newBookName });
        setNewBookName('');
        setIsEditing(false);
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e)=>{if(e.target===e.currentTarget) onClose()}}>
            <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-gray-800">切換/管理帳本</h3>
                    <button onClick={onClose}><X size={20} className="text-gray-400"/></button>
                </div>

                <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
                    {books.map(book => (
                        <div key={book.id} onClick={() => { setCurrentBookId(book.id); onClose(); }} className={`p-3 rounded-xl flex justify-between items-center cursor-pointer border ${book.id === currentBookId ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
                            <div className="flex items-center gap-3">
                                <Book size={18} className={book.id === currentBookId ? 'text-blue-500' : 'text-gray-400'}/>
                                <span className={`font-bold ${book.id === currentBookId ? 'text-blue-700' : 'text-gray-600'}`}>{book.name}</span>
                            </div>
                            {book.id !== currentBookId && (
                                <button onClick={(e)=>{e.stopPropagation(); if(confirm('刪除此帳本?')) onDeleteBook(book.id)}} className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                            )}
                        </div>
                    ))}
                </div>

                {isEditing ? (
                    <div className="flex gap-2">
                        <input autoFocus value={newBookName} onChange={e=>setNewBookName(e.target.value)} placeholder="新帳本名稱" className="flex-1 bg-gray-100 rounded-xl px-3 text-sm font-bold outline-none border border-transparent focus:border-blue-400"/>
                        <button onClick={handleCreate} className="bg-blue-600 text-white px-4 rounded-xl font-bold text-sm">新增</button>
                    </div>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold text-sm hover:bg-gray-50 flex items-center justify-center gap-2">
                        <Plus size={16}/> 新增帳本
                    </button>
                )}
            </div>
        </div>
    );
};

// 4. Sidebar Navigation
const Sidebar = ({ isOpen, onClose, currentView, setCurrentView, user, onLogout }) => {
    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-black/50 z-[90] backdrop-blur-sm transition-opacity" onClick={onClose} />}
            <div className={`fixed top-0 left-0 bottom-0 w-64 bg-gray-900 text-white z-[100] transform transition-transform duration-300 shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                            {user?.displayName?.[0] || 'U'}
                        </div>
                        <div>
                            <div className="font-bold text-sm">{user?.displayName}</div>
                            <div className="text-[10px] text-gray-400">Basic Plan</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <button onClick={() => { setCurrentView('gold'); onClose(); }} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${currentView === 'gold' ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-400 hover:bg-gray-800'}`}>
                            <Coins size={20} /> <span className="font-bold">黃金存摺</span>
                        </button>
                        <button onClick={() => { setCurrentView('expense'); onClose(); }} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${currentView === 'expense' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800'}`}>
                            <CreditCard size={20} /> <span className="font-bold">生活記帳</span>
                        </button>
                    </div>
                </div>

                <div className="absolute bottom-6 left-6 right-6">
                     <button onClick={onLogout} className="w-full p-3 rounded-xl flex items-center justify-center gap-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 font-bold text-sm transition-colors">
                        <LogOut size={16}/> 登出
                     </button>
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
    const [currentView, setCurrentView] = useState('expense'); // Default view

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

    // Expense Data
    const [books, setBooks] = useState([]);
    const [currentBookId, setCurrentBookId] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [showExpenseAdd, setShowExpenseAdd] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [showBookManager, setShowBookManager] = useState(false);

    // 0. Inject Styles
    useEffect(() => {
        if (!document.getElementById('tailwind-script')) {
            const script = document.createElement('script');
            script.id = 'tailwind-script';
            script.src = "https://cdn.tailwindcss.com";
            script.async = true;
            document.head.appendChild(script);
        }
    }, []);

    // 1. Auth Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            if(u) {
                fetchGoldPrice();
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // 2. Data Listeners
    useEffect(() => {
        if (!user) return;

        // Gold Listener
        const goldQ = query(collection(db, 'artifacts', appId, 'users', user.uid, 'gold_transactions'), orderBy('date', 'desc'));
        const unsubGold = onSnapshot(goldQ, (snap) => setGoldTransactions(snap.docs.map(d => ({id:d.id, ...d.data()}))));

        // Books Listener
        const booksRef = collection(db, 'artifacts', appId, 'users', user.uid, 'account_books');
        const unsubBooks = onSnapshot(query(booksRef, orderBy('createdAt', 'desc')), (snap) => {
            const b = snap.docs.map(d => ({id:d.id, ...d.data()}));
            setBooks(b);
            if (b.length > 0 && !currentBookId) setCurrentBookId(b[0].id);
            if (b.length === 0) {
                 // Create default book if none
                 addDoc(booksRef, { name: '日常帳本', createdAt: serverTimestamp(), color: 'blue' });
            }
        });

        return () => { unsubGold(); unsubBooks(); };
    }, [user]);

    // Expense Listener (Dependant on currentBookId)
    useEffect(() => {
        if (!user || !currentBookId) return;
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'account_books', currentBookId, 'transactions'), orderBy('date', 'desc'));
        const unsub = onSnapshot(q, (snap) => setExpenses(snap.docs.map(d => ({id:d.id, ...d.data()}))));
        return () => unsub();
    }, [user, currentBookId]);

    // 3. Actions
    const fetchGoldPrice = async () => {
        setPriceLoading(true);
        // Mock API call simulation
        setTimeout(() => {
             setGoldPrice(2950);
             setGoldHistory([{date:'10-25', price:2900}, {date:'10-26', price:2950}, {date:'10-27', price:2920}, {date:'10-28', price:2950}]);
             setGoldIntraday([{date:'09:00', price:2940}, {date:'12:00', price:2950}]);
             setPriceLoading(false);
        }, 1000);
    };

    const handleGoldSave = async (data) => {
        const ref = collection(db, 'artifacts', appId, 'users', user.uid, 'gold_transactions');
        if (editingGold) await updateDoc(doc(ref, editingGold.id), { ...data, updatedAt: serverTimestamp() });
        else await addDoc(ref, { ...data, createdAt: serverTimestamp() });
        setShowGoldAdd(false); setEditingGold(null);
    };

    const handleGoldDelete = async (id) => {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'gold_transactions', id));
        setShowGoldAdd(false);
    };

    const handleBookSave = async (data) => {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'account_books'), { ...data, createdAt: serverTimestamp() });
    };

    const handleBookDelete = async (id) => {
        if(books.length <= 1) return alert("至少需保留一個帳本");
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'account_books', id));
        if(currentBookId === id) setCurrentBookId(books[0].id);
    };

    const handleExpenseSave = async (data) => {
        const { bookId, ...payload } = data;
        const ref = collection(db, 'artifacts', appId, 'users', user.uid, 'account_books', bookId, 'transactions');
        if (editingExpense) await updateDoc(doc(ref, editingExpense.id), { ...payload, updatedAt: serverTimestamp() });
        else await addDoc(ref, { ...payload, createdAt: serverTimestamp() });
        setShowExpenseAdd(false); setEditingExpense(null);
    };

    const handleExpenseDelete = async (id) => {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'account_books', currentBookId, 'transactions', id));
        setShowExpenseAdd(false);
    };

    // --- Calculations ---
    const goldTotalWeight = goldTransactions.reduce((acc, t) => acc + (Number(t.weight) || 0), 0);
    const goldTotalCost = goldTransactions.reduce((acc, t) => acc + (Number(t.totalCost) || 0), 0);
    const goldCurrentVal = goldTotalWeight * goldPrice;
    const goldProfit = goldCurrentVal - goldTotalCost;

    // Expense Grouping
    const groupedExpenses = useMemo(() => {
        const groups = {};
        expenses.forEach(e => {
            if(!groups[e.date]) groups[e.date] = { date: e.date, list: [], total: 0 };
            groups[e.date].list.push(e);
            if(e.type === 'expense') groups[e.date].total -= e.amount;
            // else groups[e.date].total += e.amount; // Optional: Daily net
        });
        return Object.values(groups).sort((a,b) => new Date(b.date) - new Date(a.date));
    }, [expenses]);

    const currentMonthStats = useMemo(() => {
        const now = new Date();
        const thisMonth = expenses.filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const income = thisMonth.filter(e => e.type === 'income').reduce((a,b) => a + b.amount, 0);
        const expense = thisMonth.filter(e => e.type === 'expense').reduce((a,b) => a + b.amount, 0);
        return { income, expense, balance: income - expense };
    }, [expenses]);

    // --- Categories Definition ---
    const expenseCategories = [
        { id: 'shopee', name: '蝦皮', icon: 'shopee' },
        { id: 'taobao', name: '淘寶', icon: 'taobao' },
        { id: 'online', name: '網購', icon: 'online' },
        { id: 'daily', name: '日常', icon: 'daily' },
        { id: 'food', name: '餐飲', icon: 'food' },
        { id: 'transport', name: '交通', icon: 'transport' },
        { id: 'salary', name: '薪水', icon: 'salary' },
        { id: 'bonus', name: '獎金', icon: 'bonus' }
    ];

    if (loading) return <AppLoading />;
    if (!user) return <LoginView />;

    const currentBook = books.find(b => b.id === currentBookId);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 pb-20 font-sans">
             <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
             
             <Sidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
                currentView={currentView}
                setCurrentView={setCurrentView}
                user={user}
                onLogout={() => signOut(auth)}
             />

             {/* TOP NAVIGATION BAR (Shared) */}
             <div className="bg-white sticky top-0 z-40 px-4 py-3 flex justify-between items-center shadow-sm">
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 rounded-full hover:bg-gray-100"><Menu size={24} className="text-gray-700"/></button>
                <div className="font-black text-lg text-gray-800 flex items-center gap-2">
                    {currentView === 'gold' ? (
                        <><Coins size={20} className="text-yellow-500"/> 黃金存摺</>
                    ) : (
                        <div onClick={() => setShowBookManager(true)} className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded-lg transition-colors">
                            <span className="max-w-[120px] truncate">{currentBook?.name || '載入中...'}</span>
                            <ChevronDown size={16} className="text-gray-400"/>
                        </div>
                    )}
                </div>
                <div className="w-8"></div> {/* Spacer for balance */}
             </div>

             {currentView === 'gold' ? (
                // --- GOLD VIEW ---
                <div className="p-4 space-y-4 animate-[fadeIn_0.3s]">
                    {/* Dashboard Card */}
                    <div className="bg-gradient-to-br from-yellow-500 to-amber-600 rounded-[2rem] p-6 text-white shadow-xl shadow-yellow-500/20 relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                         <div className="text-yellow-100 text-xs font-bold mb-1">黃金總市值</div>
                         <div className="text-4xl font-black mb-6 tracking-tight">{formatMoney(goldCurrentVal)}</div>
                         <div className="grid grid-cols-2 gap-4">
                             <div className="bg-white/10 backdrop-blur rounded-xl p-3">
                                 <div className="text-xs text-yellow-100 opacity-80">持有 (錢)</div>
                                 <div className="font-bold text-lg">{formatWeight(goldTotalWeight, 'tw_qian').replace('錢', '')}</div>
                             </div>
                             <div className="bg-white/10 backdrop-blur rounded-xl p-3">
                                 <div className="text-xs text-yellow-100 opacity-80">損益</div>
                                 <div className="font-bold text-lg">{goldProfit>=0?'+':''}{formatMoney(goldProfit)}</div>
                             </div>
                         </div>
                    </div>
                    
                    <button onClick={() => { setEditingGold(null); setShowGoldAdd(true); }} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
                        <Plus size={20}/> 紀錄一筆黃金
                    </button>

                    <GoldChart 
                        data={goldHistory} 
                        intraday={goldIntraday} 
                        period={goldPeriod} 
                        setPeriod={setGoldPeriod}
                        goldPrice={goldPrice}
                        loading={priceLoading}
                        isVisible={showChart}
                        toggleVisibility={()=>setShowChart(!showChart)}
                    />

                    <div className="space-y-3">
                        <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider ml-1">最近紀錄</h3>
                        {goldTransactions.length === 0 ? <div className="text-center text-gray-400 py-10">尚無紀錄</div> : 
                         goldTransactions.map(t => (
                             <div key={t.id} onClick={() => { setEditingGold(t); setShowGoldAdd(true); }} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm active:scale-95 transition-transform">
                                 <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600 font-bold"><Scale size={18}/></div>
                                     <div>
                                         <div className="font-bold text-gray-800">{formatWeight(t.weight)}</div>
                                         <div className="text-xs text-gray-400">{t.date}</div>
                                     </div>
                                 </div>
                                 <div className="text-right">
                                     <div className="font-bold text-gray-800">{formatMoney(t.weight * goldPrice)}</div>
                                     <div className={`text-xs font-bold ${(t.weight*goldPrice - t.totalCost) >=0 ? 'text-green-500':'text-red-500'}`}>
                                         {(t.weight*goldPrice - t.totalCost) >=0 ? '+':''}{formatMoney(t.weight*goldPrice - t.totalCost)}
                                     </div>
                                 </div>
                             </div>
                         ))
                        }
                    </div>

                    {showGoldAdd && <AddGoldModal onClose={()=>setShowGoldAdd(false)} onSave={handleGoldSave} onDelete={handleGoldDelete} initialData={editingGold} />}
                </div>
             ) : (
                // --- EXPENSE VIEW ---
                <div className="p-4 space-y-5 animate-[fadeIn_0.3s]">
                    {/* Expense Dashboard */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-gray-200/50 border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">本月概況</span>
                            <span className="text-xs font-bold text-gray-400">{new Date().getMonth()+1}月</span>
                        </div>
                        <div className="text-center mb-8">
                             <div className="text-gray-400 text-xs font-bold mb-1">本月結餘</div>
                             <div className={`text-4xl font-black tracking-tight ${currentMonthStats.balance >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                {formatMoney(currentMonthStats.balance)}
                             </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-green-50 p-3 rounded-2xl border border-green-100">
                                <div className="flex items-center gap-1 text-green-600 text-xs font-bold mb-1"><ArrowLeft size={12}/> 收入</div>
                                <div className="font-black text-gray-800 text-lg">{formatMoney(currentMonthStats.income)}</div>
                            </div>
                            <div className="bg-red-50 p-3 rounded-2xl border border-red-100">
                                <div className="flex items-center gap-1 text-red-500 text-xs font-bold mb-1">支出 <ArrowRight size={12}/></div>
                                <div className="font-black text-gray-800 text-lg">{formatMoney(currentMonthStats.expense)}</div>
                            </div>
                        </div>
                    </div>

                    <button onClick={() => { setEditingExpense(null); setShowExpenseAdd(true); }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform">
                        <Plus size={20}/> 記一筆
                    </button>

                    {/* Transaction List Grouped */}
                    <div className="space-y-4 pb-10">
                        {groupedExpenses.length === 0 ? (
                            <div className="text-center py-10 flex flex-col items-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4"><Coffee size={30} className="text-gray-300"/></div>
                                <div className="text-gray-400 font-bold">這個月還沒有記帳喔</div>
                            </div>
                        ) : groupedExpenses.map((group, idx) => (
                            <div key={idx}>
                                <div className="flex justify-between items-end px-2 mb-2">
                                    <div className="font-bold text-gray-400 text-sm">{formatDate(group.date)}</div>
                                    <div className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-bold">日支 {formatMoney(Math.abs(group.total))}</div>
                                </div>
                                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                                    {group.list.map((item, i) => {
                                        const CatIcon = expenseCategories.find(c=>c.id===item.category)?.icon === 'shopee' ? ShoppingBag : Tag;
                                        return (
                                            <div key={item.id} onClick={() => { setEditingExpense(item); setShowExpenseAdd(true); }} className={`p-4 flex justify-between items-center active:bg-gray-50 transition-colors ${i !== group.list.length-1 ? 'border-b border-gray-50' : ''}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${item.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                                                        {item.type === 'income' ? <Plus size={18}/> : <Minus size={18}/>}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-800 text-sm">{expenseCategories.find(c=>c.id===item.category)?.name || '其他'}</div>
                                                        <div className="text-xs text-gray-400 max-w-[150px] truncate">{item.note || '無備註'}</div>
                                                    </div>
                                                </div>
                                                <div className={`font-bold ${item.type === 'income' ? 'text-green-600' : 'text-gray-800'}`}>
                                                    {formatMoney(item.amount)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {showExpenseAdd && (
                        <AddExpenseModal 
                            onClose={() => setShowExpenseAdd(false)} 
                            onSave={handleExpenseSave} 
                            onDelete={handleExpenseDelete}
                            initialData={editingExpense} 
                            categories={expenseCategories}
                            bookId={currentBookId}
                        />
                    )}

                    <BookManager 
                        isOpen={showBookManager} 
                        onClose={() => setShowBookManager(false)} 
                        books={books}
                        onSaveBook={handleBookSave}
                        onDeleteBook={handleBookDelete}
                        currentBookId={currentBookId}
                        setCurrentBookId={setCurrentBookId}
                    />
                </div>
             )}
        </div>
    );
}
