import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  deleteDoc, doc, updateDoc, serverTimestamp,
  query, orderBy, where
} from 'firebase/firestore';
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged 
} from 'firebase/auth';
import { 
  Coins, TrendingUp, TrendingDown, RefreshCcw, Scale, 
  Calculator, ChevronDown, ChevronUp, Moon, Coffee, 
  Loader2, LogOut, Plus, Trash2, Tag, Calendar,
  BarChart3, Pencil, X, AlertCircle, RefreshCw, Camera,
  ArrowRight, ShieldCheck, Lock
} from 'lucide-react';

// --- Firebase Configuration (User Provided) ---
const firebaseConfig = {
  apiKey: "AIzaSyBip2EuLTtwf_L5d_J3mS4XxW5RFfUDEJs",
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

const formatWeight = (grams, unit = 'g') => {
    const num = Number(grams);
    if (isNaN(num)) return '0.00';
    if (unit === 'tw_qian') {
        // 1 台錢 = 3.75 克
        return new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num / 3.75) + '錢';
    }
    if (unit === 'tw_liang') {
        // 1 台兩 = 10 台錢 = 37.5 克
        return new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(num / 37.5) + '兩';
    }
    return new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + '克';
};

// Image Compression
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
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  // Ignore re-init errors
}
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// IMPORTANT: Firestore Path Constants
// Using specific path for personal data: artifacts/{appId}/users/{userId}/gold_transactions
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'gold-tracker-v1';
const appId = rawAppId.replace(/\//g, '_').replace(/\./g, '_');

// --- COMPONENTS ---

// 1. Loading Screen
const AppLoading = () => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900 text-white">
    <div className="relative">
        <div className="w-16 h-16 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <Coins size={24} className="text-yellow-500" />
        </div>
    </div>
    <h2 className="mt-4 text-xl font-bold tracking-wider text-yellow-500">GOLD TRACKER</h2>
    <p className="text-gray-400 text-sm mt-2">正在同步即時金價...</p>
  </div>
);

// 2. Login Screen
const LoginView = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (err) {
            console.error(err);
            setError('登入失敗，請稍後再試');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-orange-500/10 rounded-full blur-3xl"></div>

            <div className="relative z-10 w-full max-w-md bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 p-8 rounded-3xl shadow-2xl text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/20 transform rotate-3">
                    <Coins size={40} className="text-white" />
                </div>
                <h1 className="text-3xl font-black text-white mb-2">黃金存摺</h1>
                <p className="text-gray-400 mb-8">追蹤您的黃金資產，掌握即時損益</p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-4 text-sm flex items-center justify-center gap-2">
                        <AlertCircle size={16}/> {error}
                    </div>
                )}

                <button 
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-4 px-6 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg"
                >
                    {loading ? <Loader2 className="animate-spin" /> : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                    )}
                    使用 Google 帳號登入
                </button>
                
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
                    <ShieldCheck size={14} />
                    <span>資料加密儲存，安全有保障</span>
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
                    <Calculator size={18} className="text-yellow-600"/>
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
                                className="w-full bg-gray-50 text-2xl font-black text-gray-800 p-3 rounded-xl border-2 border-transparent focus:border-yellow-400 outline-none transition-colors"
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
                        <div className={`p-3 rounded-xl border ${unit === 'twd' ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="text-[10px] text-gray-400 mb-1">價值 (TWD)</div>
                            <div className="font-black text-gray-800 text-lg">{formatMoney(displayValues.twd)}</div>
                        </div>
                        <div className={`p-3 rounded-xl border ${unit === 'tw_liang' ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="text-[10px] text-gray-400 mb-1">台兩</div>
                            <div className="font-bold text-gray-800 text-lg">{new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 3 }).format(displayValues.tw_liang)} <span className="text-xs font-normal text-gray-400">兩</span></div>
                        </div>
                        <div className={`p-3 rounded-xl border ${unit === 'tw_qian' ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="text-[10px] text-gray-400 mb-1">台錢</div>
                            <div className="font-bold text-gray-800 text-lg">{new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(displayValues.tw_qian)} <span className="text-xs font-normal text-gray-400">錢</span></div>
                        </div>
                        <div className={`p-3 rounded-xl border ${unit === 'g' ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="text-[10px] text-gray-400 mb-1">公克 (g)</div>
                            <div className="font-bold text-gray-800 text-lg">{new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(displayValues.g)} <span className="text-xs font-normal text-gray-400">克</span></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// 4. Gold Chart (Bezier Curve)
const svgPath = (points, command) => {
  return points.reduce((acc, point, i, a) => i === 0 ? `M ${point[0]},${point[1]}` : `${acc} ${command(point, i, a)}`, '');
}
const line = (pointA, pointB) => {
  const lengthX = pointB[0] - pointA[0];
  const lengthY = pointB[1] - pointA[1];
  return { length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)), angle: Math.atan2(lengthY, lengthX) };
}
const controlPoint = (current, previous, next, reverse) => {
  const p = previous || current;
  const n = next || current;
  const o = line(p, n);
  const angle = o.angle + (reverse ? Math.PI : 0);
  const length = o.length * 0.15;
  const x = current[0] + Math.cos(angle) * length;
  const y = current[1] + Math.sin(angle) * length;
  return [x, y];
}
const bezierCommand = (point, i, a) => {
  const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point);
  const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true);
  return `C ${cpsX.toFixed(2)},${cpsY.toFixed(2)} ${cpeX.toFixed(2)},${cpeY.toFixed(2)} ${point[0]},${point[1]}`;
}

const GoldChart = ({ data, intraday, period, loading, isVisible, toggleVisibility, goldPrice, setPeriod }) => {
    const [hoverData, setHoverData] = useState(null);
    const containerRef = useRef(null);

    const chartData = useMemo(() => {
        if (period === '1d') return intraday && intraday.length > 0 ? intraday : [];
        if (!data || data.length === 0) return [];
        if (period === '10d') return data.slice(-10);
        if (period === '3m') return data.slice(-90); 
        return data.slice(-10);
    }, [data, intraday, period]);

    const handleMouseMove = (e) => {
        if (!containerRef.current || chartData.length === 0) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left; 
        let index = Math.round((x / rect.width) * (chartData.length - 1));
        index = Math.max(0, Math.min(index, chartData.length - 1));
        setHoverData({ index, item: chartData[index], xPos: (index / (chartData.length - 1)) * 100 });
    };

    const prices = chartData.map(d => d.price);
    const minPrice = Math.min(...prices) * 0.999;
    const maxPrice = Math.max(...prices) * 1.001;
    const range = maxPrice - minPrice || 100;
    const getY = (price) => 100 - ((price - minPrice) / range) * 100;
    const getX = (index) => (index / (chartData.length - 1)) * 100;
    const points = chartData.map((d, i) => [getX(i), getY(d.price)]);
    const pathD = points.length > 1 ? svgPath(points, bezierCommand) : '';
    const fillPathD = points.length > 1 ? `${pathD} L 100,100 L 0,100 Z` : '';
    const isMarketClosed = period === '1d' && (new Date().getDay() === 0 || new Date().getDay() === 6);

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-4 relative group">
            <div className="p-5 flex justify-between items-start cursor-pointer hover:bg-gray-50/50 transition-colors" onClick={toggleVisibility}>
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        {isMarketClosed ? (
                            <>
                                <div className="w-2.5 h-2.5 rounded-full bg-orange-400"></div>
                                <span className="text-sm font-bold text-orange-500 flex items-center gap-1">休市中 <Moon size={12}/></span>
                            </>
                        ) : (
                            <>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></div>
                                <span className="text-sm font-bold text-gray-400">賣出金價</span>
                            </>
                        )}
                    </div>
                    <div className="text-3xl font-black text-gray-800 tracking-tight">
                        {formatMoney(goldPrice)} <span className="text-sm text-gray-400 font-normal">/克</span>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {['1d', '10d', '3m'].map(p => (
                            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${period === p ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                {p === '1d' ? '即時' : (p === '10d' ? '近十日' : '近三月')}
                            </button>
                        ))}
                    </div>
                    {isVisible ? <ChevronUp size={20} className="text-gray-300"/> : <ChevronDown size={20} className="text-gray-300"/>}
                </div>
            </div>

            {isVisible && (
                <div className="px-5 pb-5 animate-[fadeIn_0.3s]">
                    {loading ? (
                        <div className="w-full h-48 flex items-center justify-center text-gray-400 text-xs"><Loader2 className="animate-spin mr-2" size={16}/> 讀取中...</div>
                    ) : (isMarketClosed && period === '1d') ? (
                        <div className="w-full h-48 flex flex-col items-center justify-center text-gray-300 gap-3 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                            <Coffee size={24} className="text-orange-300"/>
                            <div className="text-[10px] text-gray-400">顯示最後收盤價格</div>
                        </div>
                    ) : (!chartData.length) ? (
                        <div className="w-full h-48 flex flex-col items-center justify-center text-gray-300 text-xs gap-2"><BarChart3 size={24} className="opacity-50"/> <span>無數據</span></div>
                    ) : (
                        <div className="w-full h-48 relative select-none mt-2" ref={containerRef} onMouseMove={handleMouseMove} onTouchMove={(e) => handleMouseMove(e.touches[0])} onMouseLeave={() => setHoverData(null)}>
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
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// 5. Add/Edit Gold Modal
const AddGoldModal = ({ onClose, onSave, onDelete, initialData }) => {
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [unit, setUnit] = useState('g'); 
    const [weightInput, setWeightInput] = useState('');
    const [totalCost, setTotalCost] = useState(initialData?.totalCost?.toString() ?? '');
    const [channel, setChannel] = useState(initialData?.channel || '');
    const [note, setNote] = useState(initialData?.note || '');
    const [photo, setPhoto] = useState(initialData?.photo || null);
    const [error, setError] = useState('');

    useEffect(() => {
        if(initialData?.weight) {
             // Attempt to guess unit based on magnitude? For now default to G to keep it simple, or calc
             setWeightInput(initialData.weight.toString()); 
             setUnit('g');
        }
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
            } catch(e) { setError('照片處理失敗'); }
        }
    };

    const handleSubmit = () => {
        const weightNum = parseFloat(weightInput);
        const costNum = parseFloat(totalCost);
        if (isNaN(weightNum) || weightNum <= 0) { setError('重量格式錯誤'); return; }
        if (isNaN(costNum) || costNum < 0) { setError('金額格式錯誤'); return; }

        let weightInGrams = weightNum;
        if (unit === 'tw_qian') weightInGrams = weightInGrams * 3.75;
        if (unit === 'tw_liang') weightInGrams = weightInGrams * 37.5;
        if (unit === 'kg') weightInGrams = weightInGrams * 1000;

        onSave({ date, weight: weightInGrams, totalCost: costNum, channel, note, photo });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-white w-full sm:max-w-md h-auto max-h-[90vh] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-[slideUp_0.3s_ease-out]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <h2 className="text-lg font-bold text-gray-800">{initialData ? "編輯紀錄" : "新增黃金"}</h2>
                    <button onClick={onClose} className="bg-gray-50 p-2 rounded-full text-gray-500 hover:bg-gray-100"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-bold flex items-center gap-2"><AlertCircle size={16}/> {error}</div>}
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <label className="text-xs font-bold text-gray-400 mb-1 block">購買日期</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent w-full text-sm font-bold outline-none" />
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border-2 border-transparent focus-within:border-yellow-400 transition-colors">
                        <div className="flex justify-between mb-2">
                            <label className="text-xs font-bold text-gray-400">重量</label>
                            <div className="flex bg-white rounded-lg p-0.5 shadow-sm">
                                {[{id:'tw_qian', label:'錢'}, {id:'tw_liang', label:'兩'}, {id:'g', label:'克'}].map(u => (
                                    <button key={u.id} onClick={()=>setUnit(u.id)} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${unit===u.id ? 'bg-yellow-500 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>{u.label}</button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <input type="number" inputMode="decimal" value={weightInput} onChange={e => setWeightInput(e.target.value)} placeholder="0.00" className="bg-transparent text-4xl font-black text-gray-800 w-full outline-none" />
                            <span className="text-sm font-bold text-gray-400 mb-1">{unit === 'tw_qian' ? '台錢' : (unit === 'tw_liang' ? '台兩' : '公克')}</span>
                        </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border-2 border-transparent focus-within:border-green-400 transition-colors">
                        <label className="text-xs font-bold text-gray-400 block mb-1">購入總成本 (台幣)</label>
                        <div className="flex items-center gap-1">
                            <span className="text-gray-400 text-lg font-bold">$</span>
                            <input type="number" inputMode="numeric" value={totalCost} onChange={e => setTotalCost(e.target.value)} placeholder="0" className="bg-transparent text-3xl font-black text-gray-800 w-full outline-none" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <input type="text" value={channel} onChange={e => setChannel(e.target.value)} placeholder="購買管道 (例: 銀樓)" className="bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none border border-gray-100 focus:border-gray-300" />
                        <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="備註 (例: 送禮)" className="bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none border border-gray-100 focus:border-gray-300" />
                    </div>
                    <label className="block w-full h-24 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 transition-all relative overflow-hidden group">
                        {photo ? (
                            <><img src={photo} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40" /><div className="relative z-10 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><RefreshCw size={12}/> 更換</div></>
                        ) : (
                            <><Camera size={24} className="mb-1 text-gray-300"/><span className="text-xs font-bold">上傳照片</span></>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                    </label>
                    <button onClick={handleSubmit} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-lg shadow-gray-300 active:scale-95 transition-all text-lg">{initialData ? '儲存變更' : '確認入庫'}</button>
                    {initialData && onDelete && <button onClick={() => onDelete(initialData.id)} className="w-full py-3 bg-red-50 text-red-500 rounded-2xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"><Trash2 size={18} /> 刪除紀錄</button>}
                </div>
            </div>
        </div>
    );
};

// --- MAIN APPLICATION ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const [goldPrice, setGoldPrice] = useState(0); 
    const [goldHistory, setGoldHistory] = useState([]);
    const [goldIntraday, setGoldIntraday] = useState([]); 
    const [goldPeriod, setGoldPeriod] = useState('1d'); 
    const [priceLoading, setPriceLoading] = useState(false);
    
    const [transactions, setTransactions] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [showConverter, setShowConverter] = useState(false);
    const [showChart, setShowChart] = useState(true);

    // 1. Authentication
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // 2. Fetch Gold Price (From your gold.js / api)
    const fetchGoldPrice = async () => {
        setPriceLoading(true);
        try {
            // Attempt to fetch from your backend Vercel function
            // Note: In this preview environment, this might fail if not deployed.
            // We implement a fallback for demo purposes.
            const response = await fetch('/api/gold').catch(() => null);
            
            if (response && response.ok) {
                const data = await response.json();
                if (data.success) {
                    let price = data.currentPrice;
                    if (!price && data.history?.length) price = data.history[data.history.length - 1].price;
                    setGoldPrice(price);
                    setGoldHistory(data.history || []);
                    setGoldIntraday(data.intraday || []);
                }
            } else {
                console.warn("API unavailable, using mock data for preview");
                // Mock data fallback so the UI works in preview
                setGoldPrice(2880);
                setGoldHistory([
                    {date:'2023-10-20', price: 2800}, {date:'2023-10-21', price: 2820},
                    {date:'2023-10-22', price: 2850}, {date:'2023-10-23', price: 2880}
                ]);
            }
        } catch (err) {
            console.error("Gold fetch error:", err);
            // Minimal Fallback
            setGoldPrice(2880);
        } finally {
            setPriceLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchGoldPrice();
    }, [user]);

    // 3. Firestore Listener (User Specific)
    useEffect(() => {
        if (!user) return;
        // Path: artifacts/{appId}/users/{uid}/gold_transactions
        const q = query(
            collection(db, 'artifacts', appId, 'users', user.uid, 'gold_transactions'),
            orderBy('date', 'desc'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTransactions(data);
        });
        return () => unsubscribe();
    }, [user]);

    // 4. Handlers
    const handleLogout = async () => {
        await signOut(auth);
    };

    const handleSave = async (data) => {
        if (!user) return;
        try {
            const payload = { ...data, updatedAt: serverTimestamp() };
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
        if (!user || !confirm("確定要刪除這筆紀錄嗎？無法復原。")) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'gold_transactions', id));
            setShowAddModal(false);
        } catch(e) { console.error(e); }
    };

    // 5. Statistics
    const totalWeight = transactions.reduce((acc, t) => acc + (Number(t.weight) || 0), 0);
    const totalCost = transactions.reduce((acc, t) => acc + (Number(t.totalCost) || 0), 0);
    const currentValue = totalWeight * goldPrice;
    const profit = currentValue - totalCost;
    const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    const avgCost = totalWeight > 0 ? totalCost / totalWeight : 0;

    if (loading) return <AppLoading />;
    if (!user) return <LoginView />;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 pb-20 font-sans">
            {/* Header */}
            <div className="bg-gray-900 text-white p-6 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden mb-6">
                <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                                <Coins size={20} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold">我的小金庫</h1>
                                <p className="text-xs text-gray-400">Welcome, {user.displayName}</p>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                            <LogOut size={18} className="text-gray-300" />
                        </button>
                    </div>

                    <div className="mb-2 text-gray-400 text-xs font-bold uppercase tracking-wider">總資產價值 (TWD)</div>
                    <div className="text-4xl font-black mb-6 tracking-tight text-white drop-shadow-sm">{formatMoney(currentValue)}</div>

                    <div className="grid grid-cols-2 gap-4">
                         <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/5">
                             <div className="text-gray-400 text-[10px] mb-1">總重量</div>
                             <div className="font-bold text-lg flex items-baseline gap-1">
                                 {formatWeight(totalWeight, 'tw_liang')}
                                 <span className="text-xs font-normal text-gray-500">({formatWeight(totalWeight)})</span>
                             </div>
                         </div>
                         <div className={`backdrop-blur-md rounded-2xl p-4 border border-white/5 ${profit >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                             <div className="text-gray-400 text-[10px] mb-1">未實現損益</div>
                             <div className={`font-bold text-lg flex items-center gap-1 ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                 {profit >= 0 ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
                                 {formatMoney(profit)}
                             </div>
                         </div>
                    </div>
                    
                    <div className="mt-4 flex justify-between text-xs text-gray-500 border-t border-white/10 pt-3">
                        <span>平均成本: {formatMoney(avgCost)}/g</span>
                        <span className={profit >= 0 ? 'text-green-400' : 'text-red-400'}>ROI: {roi.toFixed(2)}%</span>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 space-y-5">
                {/* Actions */}
                <div className="flex gap-3">
                    <button 
                        onClick={() => { setEditingItem(null); setShowAddModal(true); }}
                        className="flex-1 bg-gray-900 text-white py-3 rounded-2xl font-bold shadow-lg shadow-gray-300 active:scale-95 transition-transform flex items-center justify-center gap-2"
                    >
                        <Plus size={20}/> 記一筆
                    </button>
                    <button 
                        onClick={fetchGoldPrice}
                        className="bg-white text-gray-900 p-3 rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-transform"
                    >
                        <RefreshCcw size={20} className={priceLoading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Gold Price Chart */}
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

                {/* Converter */}
                <GoldConverter 
                    goldPrice={goldPrice}
                    isVisible={showConverter}
                    toggleVisibility={() => setShowConverter(!showConverter)}
                />

                {/* Transaction List */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                        <div className="font-bold text-gray-700 flex items-center gap-2">
                            <Calendar size={18} className="text-gray-400"/>
                            交易紀錄
                        </div>
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{transactions.length} 筆</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {transactions.length === 0 ? (
                            <div className="p-10 text-center text-gray-400 text-sm flex flex-col items-center gap-3">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                                    <Tag size={24} className="opacity-20"/>
                                </div>
                                尚無紀錄，開始累積您的第一桶金吧！
                            </div>
                        ) : (
                            transactions.map(t => {
                                const weightG = Number(t.weight) || 0;
                                const cost = Number(t.totalCost) || 0;
                                const itemValue = weightG * goldPrice;
                                const itemProfit = itemValue - cost;
                                const itemRoi = cost > 0 ? (itemProfit / cost) * 100 : 0;

                                return (
                                    <div key={t.id} onClick={() => { setEditingItem(t); setShowAddModal(true); }} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-3">
                                                {t.photo ? (
                                                    <img src={t.photo} alt="receipt" className="w-12 h-12 rounded-xl object-cover border border-gray-100 shadow-sm" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center border border-yellow-100">
                                                        <Scale size={20} />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-gray-800 text-base">{formatWeight(weightG, 'tw_qian')}</div>
                                                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                        {t.date}
                                                        {t.channel && <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">{t.channel}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`font-bold text-sm ${itemProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {itemProfit >= 0 ? '+' : ''}{formatMoney(itemProfit)}
                                                </div>
                                                <div className={`text-[10px] font-bold mt-1 inline-block px-1.5 py-0.5 rounded ${itemProfit >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                    {itemRoi.toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center pl-[3.75rem]">
                                             <div className="text-[10px] text-gray-400">成本: {formatMoney(t.totalCost)}</div>
                                             {t.note && <div className="text-xs text-gray-500 max-w-[150px] truncate bg-gray-50 px-2 py-1 rounded-lg">{t.note}</div>}
                                             <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                 <Pencil size={14} className="text-gray-300"/>
                                             </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {showAddModal && (
                <AddGoldModal 
                    onClose={() => setShowAddModal(false)} 
                    onSave={handleSave} 
                    onDelete={handleDelete}
                    initialData={editingItem} 
                />
            )}
        </div>
    );
}
