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
  ShieldCheck, User, Store
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = {
  // 使用環境變數讀取 API Key (解決 GitHub 安全警告)
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "gold-29c1b.firebaseapp.com",
  projectId: "gold-29c1b",
  storageBucket: "gold-29c1b.firebasestorage.app",
  messagingSenderId: "867971422713",
  appId: "1:867971422713:web:f85ecab4f9374cdbc7c528",
  measurementId: "G-BNBRLYFBCX"
};

// --- Helper Functions ---
const formatMoney = (amount) => {
  const num = Number(amount);
  if (isNaN(num)) return '$0';
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(num);
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

// --- Firebase Init ---
let app;
try { app = initializeApp(firebaseConfig); } catch (e) {}
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'gold-tracker-v1';
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
    <h2 className="mt-4 text-xl font-bold tracking-wider text-yellow-500" style={{fontFamily: 'sans-serif'}}>GOLD TRACKER</h2>
    <p className="text-gray-400 text-sm mt-2" style={{color: '#9CA3AF'}}>載入您的金庫中...</p>
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
            if (err.code === 'auth/unauthorized-domain') {
                setError('網域未授權：請至 Firebase Console > Authentication > Settings > Authorized domains 新增此網址。');
            } else if (err.code === 'auth/popup-closed-by-user') {
                setError('登入視窗已關閉');
            } else if (err.code === 'auth/invalid-api-key') {
                setError('API Key 無效：請檢查 .env 檔案設定是否正確。');
            } else {
                setError(`登入失敗 (${err.code}): ${err.message}`);
            }
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{backgroundColor: '#111827'}}>
             <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
             <div className="relative z-10 w-full max-w-md bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 p-8 rounded-3xl shadow-2xl text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20 transform rotate-3">
                    <Coins size={40} className="text-white" />
                </div>
                <h1 className="text-3xl font-black text-white mb-2">黃金存摺</h1>
                <p className="text-gray-400 mb-8">專屬於您的黃金資產管理</p>
                
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

// --- Sub-Components ---

// 1. Chart
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
    
    // Helper functions for Bezier Curve generation
    const line = (pointA, pointB) => {
        const lengthX = pointB[0] - pointA[0];
        const lengthY = pointB[1] - pointA[1];
        return { length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)), angle: Math.atan2(lengthY, lengthX) };
    }
    const controlPoint = (current, previous, next, reverse) => {
        const p = previous || current;
        const n = next || current;
        const smoothing = 0.15;
        const o = line(p, n);
        const angle = o.angle + (reverse ? Math.PI : 0);
        const length = o.length * smoothing;
        const x = current[0] + Math.cos(angle) * length;
        const y = current[1] + Math.sin(angle) * length;
        return [x, y];
    }
    const bezierCommand = (point, i, a) => {
        const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point);
        const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true);
        return `C ${cpsX.toFixed(2)},${cpsY.toFixed(2)} ${cpeX.toFixed(2)},${cpeY.toFixed(2)} ${point[0]},${point[1]}`;
    }
    const svgPath = (points, command) => {
        const d = points.reduce((acc, point, i, a) => i === 0 ? `M ${point[0]},${point[1]}` : `${acc} ${command(point, i, a)}`, '');
        return d;
    }

    const getY = (price) => 100 - ((price - minPrice) / range) * 100;
    const getX = (index) => (index / (chartData.length - 1)) * 100;
    const points = chartData.map((d, i) => [getX(i), getY(d.price)]);
    const pathD = points.length > 1 ? svgPath(points, bezierCommand) : '';
    const fillPathD = points.length > 1 ? `${pathD} L 100,100 L 0,100 Z` : '';

    const handleMouseMove = (e) => {
        if (!containerRef.current || chartData.length === 0) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left; 
        let index = Math.round((x / rect.width) * (chartData.length - 1));
        index = Math.max(0, Math.min(index, chartData.length - 1));
        setHoverData({ index, item: chartData[index], xPos: (index / (chartData.length - 1)) * 100 });
    };

    // 判斷週末休市
    const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
    const isMarketClosed = period === '1d' && isWeekend;

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-4 relative z-0 transition-all duration-300">
            <div className="p-5 flex justify-between items-start cursor-pointer hover:bg-gray-50/50 transition-colors" onClick={toggleVisibility}>
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-bold text-gray-400 flex items-center gap-1">
                            {isMarketClosed ? <><span className="w-2 h-2 rounded-full bg-orange-400"></span>休市中</> : <><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>賣出金價</>}
                        </span>
                    </div>
                    <div className="text-3xl font-black text-gray-800 tracking-tight flex items-baseline gap-2">
                        {formatMoney(goldPrice)} <span className="text-sm text-gray-400 font-normal">/克</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                         <span className="text-[10px] bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded border border-yellow-100 font-bold">{formatMoney(goldPrice * 3.75)} /錢</span>
                         <span className="text-[10px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded border border-gray-100 font-bold">{formatMoney(goldPrice * 1000)} /公斤</span>
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
                        <div className="absolute right-0 top-0 text-[8px] text-gray-300 font-bold -translate-y-1/2 bg-white px-1">{formatMoney(maxPrice)}</div>
                        <div className="absolute right-0 bottom-0 text-[8px] text-gray-300 font-bold translate-y-1/2 bg-white px-1">{formatMoney(minPrice)}</div>
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

// 2. Add Gold Modal (With Location)
const AddGoldModal = ({ onClose, onSave, onDelete, initialData }) => {
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [unit, setUnit] = useState('g'); 
    const [weightInput, setWeightInput] = useState(initialData?.weight ? initialData.weight.toString() : '');
    const [totalCost, setTotalCost] = useState(initialData?.totalCost?.toString() ?? '');
    const [location, setLocation] = useState(initialData?.location || '');
    const [note, setNote] = useState(initialData?.note || '');
    const [photo, setPhoto] = useState(initialData?.photo || null);

    // Initial Unit Logic
    useEffect(() => {
        if(initialData?.weight) { setUnit('g'); setWeightInput(initialData.weight.toString()); }
    }, [initialData]);

    const handlePhoto = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const compressed = await compressImage(reader.result);
                    setPhoto(compressed);
                };
                reader.readAsDataURL(file);
            } catch(e) { console.error(e); }
        }
    };

    const handleSubmit = () => {
        let w = parseFloat(weightInput);
        if (isNaN(w) || w <= 0) return;
        if (unit === 'tw_qian') w = w * 3.75;
        if (unit === 'tw_liang') w = w * 37.5;
        onSave({ date, weight: w, totalCost: parseFloat(totalCost) || 0, location, note, photo });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-white w-full sm:max-w-md max-h-[90vh] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-[slideUp_0.3s_ease-out]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <h2 className="text-lg font-bold text-gray-800">{initialData ? "編輯紀錄" : "新增黃金"}</h2>
                    <button onClick={onClose} className="bg-gray-50 p-2 rounded-full hover:bg-gray-100"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <label className="text-xs font-bold text-gray-400 mb-1 block">購買日期</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent w-full text-sm font-bold outline-none" />
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border-2 border-transparent focus-within:border-blue-400 transition-colors">
                        <div className="flex justify-between mb-2">
                            <label className="text-xs font-bold text-gray-400">重量</label>
                            <div className="flex bg-white rounded-lg p-0.5 shadow-sm">
                                {[{id:'tw_qian', label:'錢'}, {id:'tw_liang', label:'兩'}, {id:'g', label:'克'}].map(u => (
                                    <button key={u.id} onClick={()=>setUnit(u.id)} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${unit===u.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>{u.label}</button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <input type="number" inputMode="decimal" value={weightInput} onChange={e => setWeightInput(e.target.value)} placeholder="0.00" className="bg-transparent text-4xl font-black text-gray-800 w-full outline-none" />
                            <span className="text-sm font-bold text-gray-400 mb-1">{unit === 'tw_qian' ? '台錢' : (unit === 'tw_liang' ? '台兩' : '公克')}</span>
                        </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border-2 border-transparent focus-within:border-green-400 transition-colors">
                        <label className="text-xs font-bold text-gray-400 block mb-1">總成本 (台幣)</label>
                        <div className="flex items-center gap-1">
                            <span className="text-gray-400 text-lg font-bold">$</span>
                            <input type="number" inputMode="numeric" value={totalCost} onChange={e => setTotalCost(e.target.value)} placeholder="0" className="bg-transparent text-3xl font-black text-gray-800 w-full outline-none" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 focus-within:border-blue-300 transition-colors">
                            <label className="text-[10px] font-bold text-gray-400 mb-1 block">購買地點</label>
                            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="例: 台銀" className="bg-transparent w-full text-sm font-bold outline-none" />
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 focus-within:border-blue-300 transition-colors">
                            <label className="text-[10px] font-bold text-gray-400 mb-1 block">備註</label>
                            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="例: 送禮" className="bg-transparent w-full text-sm font-bold outline-none" />
                        </div>
                    </div>

                    <label className="block w-full h-24 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 relative overflow-hidden transition-colors">
                        {photo ? <><img src={photo} className="absolute inset-0 w-full h-full object-cover opacity-60" /><div className="relative z-10 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><RefreshCw size={12}/> 更換</div></> : <><Camera size={24} className="mb-1 text-gray-300"/><span className="text-xs font-bold">上傳照片</span></>}
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                    </label>
                    <button onClick={handleSubmit} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all text-lg hover:bg-blue-700">{initialData ? '儲存變更' : '確認入庫'}</button>
                    {initialData && onDelete && <button onClick={() => onDelete(initialData.id)} className="w-full py-3 bg-red-50 text-red-500 rounded-2xl font-bold hover:bg-red-100 flex items-center justify-center gap-2"><Trash2 size={18} /> 刪除紀錄</button>}
                </div>
            </div>
        </div>
    );
};

// 3. Gold Calculator/Converter
const GoldConverter = ({ goldPrice, isVisible, toggleVisibility }) => {
    const [amount, setAmount] = useState('');
    const [unit, setUnit] = useState('g'); 

    const getGrams = () => {
        const val = parseFloat(amount);
        if (isNaN(val)) return 0;
        
        switch(unit) {
            case 'g': return val;
            case 'tw_qian': return val * 3.75;
            case 'tw_liang': return val * 37.5;
            case 'kg': return val * 1000;
            case 'twd': return val / (goldPrice || 1); 
            default: return 0;
        }
    };

    const grams = getGrams();
    
    const displayValues = {
        twd: grams * goldPrice,
        g: grams,
        tw_qian: grams / 3.75,
        tw_liang: grams / 37.5,
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-4 transition-all duration-300">
            <button 
                onClick={toggleVisibility}
                className="w-full p-4 flex items-center justify-between bg-gray-50/50 hover:bg-gray-100 transition-colors"
            >
                <div className="flex items-center gap-2 font-bold text-gray-700">
                    <Calculator size={18} className="text-blue-600"/>
                    黃金計算機
                </div>
                {isVisible ? <ChevronUp size={18} className="text-gray-400"/> : <ChevronDown size={18} className="text-gray-400"/>}
            </button>

            {isVisible && (
                <div className="p-5 animate-[fadeIn_0.3s]">
                    <div className="flex gap-2 mb-4">
                        <div className="relative flex-1">
                            <input 
                                type="number" 
                                value={amount} 
                                onChange={(e) => setAmount(e.target.value)} 
                                placeholder="0" 
                                className="w-full bg-gray-50 text-2xl font-black text-gray-800 p-3 rounded-xl border-2 border-transparent focus:border-blue-400 outline-none transition-colors"
                            />
                        </div>
                        <select 
                            value={unit} 
                            onChange={(e) => setUnit(e.target.value)}
                            className="bg-gray-100 font-bold text-gray-600 rounded-xl px-2 outline-none border-r-[10px] border-transparent cursor-pointer"
                        >
                            <option value="g">公克 (g)</option>
                            <option value="tw_qian">台錢</option>
                            <option value="tw_liang">台兩</option>
                            <option value="twd">金額 (NTD)</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className={`p-3 rounded-xl border ${unit === 'twd' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="text-[10px] text-gray-400 mb-1">價值 (TWD)</div>
                            <div className="font-black text-gray-800 text-lg">{formatMoney(displayValues.twd)}</div>
                        </div>
                        <div className={`p-3 rounded-xl border ${unit === 'tw_liang' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="text-[10px] text-gray-400 mb-1">台兩</div>
                            <div className="font-bold text-gray-800 text-lg">{new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 3 }).format(displayValues.tw_liang)} <span className="text-xs font-normal text-gray-400">兩</span></div>
                        </div>
                        <div className={`p-3 rounded-xl border ${unit === 'tw_qian' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="text-[10px] text-gray-400 mb-1">台錢</div>
                            <div className="font-bold text-gray-800 text-lg">{new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(displayValues.tw_qian)} <span className="text-xs font-normal text-gray-400">錢</span></div>
                        </div>
                        <div className={`p-3 rounded-xl border ${unit === 'g' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="text-[10px] text-gray-400 mb-1">公克 (g)</div>
                            <div className="font-bold text-gray-800 text-lg">{new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(displayValues.g)} <span className="text-xs font-normal text-gray-400">克</span></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- MAIN APPLICATION ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Data
    const [transactions, setTransactions] = useState([]);
    
    // Gold Price
    const [goldPrice, setGoldPrice] = useState(2880); 
    const [goldHistory, setGoldHistory] = useState([]);
    const [goldIntraday, setGoldIntraday] = useState([]); 
    const [goldPeriod, setGoldPeriod] = useState('1d'); 
    const [priceLoading, setPriceLoading] = useState(false);
    
    // UI State
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [showConverter, setShowConverter] = useState(false);
    const [showChart, setShowChart] = useState(false); // Initial State: Collapsed

    // 0. Inject Tailwind CSS CDN
    useEffect(() => {
        if (!document.getElementById('tailwind-script')) {
            const script = document.createElement('script');
            script.id = 'tailwind-script';
            script.src = "https://cdn.tailwindcss.com";
            script.async = true;
            document.head.appendChild(script);
        }
    }, []);

    // 1. Auth & Initial Data
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            if(u) fetchGoldPrice();
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // 2. Data Listeners (Direct transactions under user)
    useEffect(() => {
        if (!user) return;
        // Path: artifacts/{appId}/users/{uid}/gold_transactions
        // Simplified Query: Only sort by date to avoid composite index requirement
        const q = query(
            collection(db, 'artifacts', appId, 'users', user.uid, 'gold_transactions'),
            orderBy('date', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTransactions(data);
        }, (error) => {
            console.error("Firestore Error:", error);
        });
        return () => unsubscribe();
    }, [user]);

    // 3. Actions
    const fetchGoldPrice = async () => {
        setPriceLoading(true);
        try {
            const response = await fetch('/api/gold').catch(() => null);
            if (response && response.ok) {
                const data = await response.json();
                if (data.success) {
                    setGoldPrice(data.currentPrice || 2880);
                    setGoldHistory(data.history || []);
                    setGoldIntraday(data.intraday || []);
                }
            } else {
                setGoldPrice(2950);
                setGoldHistory([{date:'2023-10-25', price:2900}, {date:'2023-10-26', price:2950}]);
            }
        } catch (e) { console.error(e); } finally { setPriceLoading(false); }
    };

    const handleLogout = async () => {
        await signOut(auth);
    };

    const handleSave = async (data) => {
        if (!user) return;
        try {
            const payload = { ...data, updatedAt: serverTimestamp() };
            // Path: artifacts/{appId}/users/{uid}/gold_transactions
            const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'gold_transactions');
            
            if (editingItem) {
                await updateDoc(doc(colRef, editingItem.id), payload);
            } else {
                await addDoc(colRef, { ...payload, createdAt: serverTimestamp() });
            }
            setShowAddModal(false);
            setEditingItem(null);
        } catch (e) {
            console.error("Save failed:", e);
            alert("儲存失敗，請檢查網路連線");
        }
    };

    const handleDelete = async (id) => {
        if (!user) return;
        // Use standard confirm window
        if (window.confirm("確定要刪除這筆紀錄嗎？")) {
            try {
                await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'gold_transactions', id));
                setShowAddModal(false); // Close modal if open
            } catch(e) { console.error("Delete error:", e); }
        }
    };

    // 4. Calculations
    const totalWeight = transactions.reduce((acc, t) => acc + (Number(t.weight) || 0), 0);
    const totalCost = transactions.reduce((acc, t) => acc + (Number(t.totalCost) || 0), 0);
    const currentValue = totalWeight * goldPrice;
    const profit = currentValue - totalCost;
    const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    const avgCost = totalWeight > 0 ? totalCost / totalWeight : 0;

    // --- Render ---
    if (loading) return <AppLoading />;
    if (!user) return <LoginView />;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 pb-20 font-sans">
            <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

            {/* HEADER - Blue Dashboard Card */}
            <div className="bg-white pb-6 rounded-b-[2.5rem] shadow-xl relative overflow-hidden mb-6">
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>
                
                <div className="relative z-10 px-6 pt-6">
                    {/* Top Bar */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/10">
                                <Coins size={20} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white">我的黃金存摺</h1>
                                <p className="text-xs text-blue-100 opacity-80">{user.displayName}</p>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white">
                            <LogOut size={18}/>
                        </button>
                    </div>

                    {/* Main Stats */}
                    <div className="mb-1 text-blue-100 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                        總資產價值 (TWD) <button onClick={fetchGoldPrice} className="p-1 hover:bg-white/10 rounded-full"><RefreshCcw size={10} className={priceLoading ? "animate-spin" : ""}/></button>
                    </div>
                    <div className="text-4xl font-black mb-6 tracking-tight text-white drop-shadow-sm">
                        {formatMoney(currentValue)}
                    </div>
                    
                    {/* Secondary Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                         <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/5">
                             <div className="text-blue-100 opacity-70 text-[10px] mb-1">持有重量 (台錢)</div>
                             <div className="font-bold text-xl text-white flex items-end gap-1">
                                 {formatWeight(totalWeight, 'tw_qian').replace('錢', '')}
                                 <span className="text-xs font-medium mb-1 opacity-70">錢</span>
                                 <span className="text-[10px] font-normal opacity-50 mb-1 ml-1">({formatWeight(totalWeight)})</span>
                             </div>
                         </div>
                         <div className={`backdrop-blur-md rounded-2xl p-4 border border-white/5 ${profit >= 0 ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                             <div className="text-blue-100 opacity-70 text-[10px] mb-1">預估損益</div>
                             <div className={`font-bold text-xl flex items-center gap-1 ${profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                                 {profit >= 0 ? '+' : ''}{formatMoney(profit)}
                             </div>
                         </div>
                    </div>

                    {/* Footer Stats */}
                    <div className="flex justify-between items-center text-xs font-medium text-blue-100/60 px-1">
                        <span>購入成本: {formatMoney(totalCost)}</span>
                        <span>均價: {formatMoney(avgCost)}/g</span>
                        <span className={`${profit >= 0 ? 'text-emerald-300' : 'text-rose-300'} font-bold`}>ROI: {roi.toFixed(2)}%</span>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 space-y-5">
                
                {/* 1. Add Button */}
                <button 
                    onClick={() => { setEditingItem(null); setShowAddModal(true); }}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2 text-lg hover:bg-blue-700"
                >
                    <Plus size={24}/> 記一筆黃金
                </button>

                {/* 2. Converter */}
                <GoldConverter 
                    goldPrice={goldPrice}
                    isVisible={showConverter}
                    toggleVisibility={() => setShowConverter(!showConverter)}
                />

                {/* 3. Gold Price Chart */}
                <GoldChart 
                    data={goldHistory} 
                    intraday={goldIntraday} 
                    period={goldPeriod} 
                    setPeriod={setGoldPeriod}
                    goldPrice={goldPrice}
                    loading={priceLoading} 
                    isVisible={showChart}
                    toggleVisibility={() => setShowChart(!showChart)}
                />

                {/* 4. Transaction List */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[200px]">
                    <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10">
                        <div className="font-bold text-gray-700 flex items-center gap-2">
                            <Calendar size={18} className="text-gray-400"/>
                            我的黃金存摺
                        </div>
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{transactions.length} 筆</span>
                    </div>
                    
                    <div className="divide-y divide-gray-50">
                        {transactions.length === 0 ? (
                            <div className="p-10 text-center text-gray-400 text-sm flex flex-col items-center gap-3">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                                    <Tag size={24} className="opacity-20"/>
                                </div>
                                尚無紀錄，點擊上方按鈕新增第一筆。
                            </div>
                        ) : (
                            transactions.map(t => {
                                const weightG = Number(t.weight) || 0;
                                const cost = Number(t.totalCost) || 0;
                                const itemVal = weightG * goldPrice;
                                const itemProfit = itemVal - cost;
                                return (
                                    <div key={t.id} onClick={() => { setEditingItem(t); setShowAddModal(true); }} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group flex justify-between items-center relative">
                                        <div className="flex items-center gap-3">
                                            {t.photo ? <img src={t.photo} className="w-10 h-10 rounded-xl object-cover border border-gray-100 shadow-sm"/> : 
                                            <div className="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center border border-yellow-100"><Scale size={18}/></div>}
                                            <div>
                                                <div className="font-bold text-gray-800 text-base">{formatWeight(weightG)}</div>
                                                <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                    {t.date} 
                                                    {t.location && <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] text-gray-500">{t.location}</span>}
                                                    {t.note && <span>• {t.note}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <div className={`font-bold text-sm ${itemProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {itemProfit >= 0 ? '+' : ''}{formatMoney(itemProfit)}
                                                </div>
                                                <div className="text-[10px] text-gray-400 mt-0.5">成本: {formatMoney(t.totalCost)}</div>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-10"
                                                title="刪除紀錄"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showAddModal && <AddGoldModal onClose={() => setShowAddModal(false)} onSave={handleSave} onDelete={handleDelete} initialData={editingItem} />}

        </div>
    );
}
