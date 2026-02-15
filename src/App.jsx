import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  deleteDoc, doc, updateDoc, serverTimestamp,
  query, orderBy, where, writeBatch
} from 'firebase/firestore';
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from 'firebase/auth'; // Removed signInAnonymously
import { 
  Coins, TrendingUp, TrendingDown, RefreshCcw, Scale, 
  Calculator, ChevronDown, ChevronUp, Moon, Coffee, 
  Loader2, LogOut, Plus, Trash2, Tag, Calendar,
  BarChart3, Pencil, X, AlertCircle, RefreshCw, Camera,
  ArrowRight, ShieldCheck, Lock, User, Folder, FolderPlus,
  ArrowLeft, LayoutGrid, MoreVertical
} from 'lucide-react';

// --- Firebase Configuration ---
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

const formatWeight = (grams, unit = 'tw_liang') => { 
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

// 1. Loading Screen (Updated with Inline Styles to prevent FOUC)
// 使用 style 屬性直接定義顏色，這樣在 Tailwind 載入前背景就是黑的，不會閃爍白畫面
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
    <h2 className="mt-4 text-xl font-bold tracking-wider text-yellow-500" style={{fontFamily: 'sans-serif'}}>GOLD BOOKS</h2>
    <p className="text-gray-400 text-sm mt-2" style={{color: '#9CA3AF'}}>正在啟動系統...</p>
  </div>
);

// 2. Login View (Guest Login Removed)
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
                setError('網域未授權：請至 Firebase Console > Authentication > Settings > Authorized domains 新增您的 Vercel 網址。');
            } else if (err.code === 'auth/popup-closed-by-user') {
                setError('登入視窗已關閉');
            } else {
                setError(`登入失敗 (${err.code}): ${err.message}`);
            }
            setLoading(false);
        }
    };

    // 使用 inline style 確保背景圖片載入前也是深色
    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{backgroundColor: '#111827'}}>
             <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl"></div>
             <div className="relative z-10 w-full max-w-md bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 p-8 rounded-3xl shadow-2xl text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/20 transform rotate-3">
                    <Folder size={40} className="text-white" />
                </div>
                <h1 className="text-3xl font-black text-white mb-2">黃金帳本</h1>
                <p className="text-gray-400 mb-8">管理您的多個黃金資產組合</p>
                
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

// 1. Chart (Same as before)
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
    
    const getPoints = () => {
        if (!chartData.length) return '';
        return chartData.map((d, i) => {
            const x = (i / (chartData.length - 1)) * 100;
            const y = 100 - ((d.price - minPrice) / range) * 100;
            return `${x},${y}`;
        }).join(' ');
    };

    const handleMouseMove = (e) => {
        if (!containerRef.current || chartData.length === 0) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left; 
        let index = Math.round((x / rect.width) * (chartData.length - 1));
        index = Math.max(0, Math.min(index, chartData.length - 1));
        setHoverData({ index, item: chartData[index], xPos: (index / (chartData.length - 1)) * 100 });
    };

    const isMarketClosed = period === '1d' && (new Date().getDay() === 0 || new Date().getDay() === 6);

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-4 relative z-0">
            <div className="p-5 flex justify-between items-start cursor-pointer hover:bg-gray-50/50 transition-colors" onClick={toggleVisibility}>
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-bold text-gray-400">目前金價</span>
                        {isMarketClosed && <Moon size={12} className="text-orange-400"/>}
                    </div>
                    <div className="text-3xl font-black text-gray-800">{formatMoney(goldPrice)}</div>
                </div>
                {isVisible ? <ChevronUp size={20} className="text-gray-300"/> : <ChevronDown size={20} className="text-gray-300"/>}
            </div>
            {isVisible && (
                <div className="px-5 pb-5">
                    {loading ? <div className="h-32 flex items-center justify-center text-gray-300"><Loader2 className="animate-spin"/></div> :
                     chartData.length === 0 ? <div className="h-32 flex items-center justify-center text-gray-300">無數據</div> :
                    <div className="h-32 w-full relative" ref={containerRef} onMouseMove={handleMouseMove} onMouseLeave={() => setHoverData(null)} onTouchMove={(e)=>handleMouseMove(e.touches[0])}>
                         <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                            <polyline fill="none" stroke="#eab308" strokeWidth="2" points={getPoints()} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                            {hoverData && <line x1={hoverData.xPos} y1="0" x2={hoverData.xPos} y2="100" stroke="#ccc" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="4"/>}
                        </svg>
                        {hoverData && (
                            <div className="absolute top-0 bg-gray-800 text-white text-[10px] p-1 rounded transform -translate-x-1/2 -translate-y-full pointer-events-none z-10" style={{left: `${hoverData.xPos}%`}}>
                                {formatMoney(hoverData.item.price)}
                            </div>
                        )}
                    </div>}
                    <div className="flex justify-end gap-2 mt-2">
                        {['1d', '10d', '3m'].map(p => (
                            <button key={p} onClick={(e)=>{e.stopPropagation(); setPeriod(p);}} className={`text-[10px] px-2 py-1 rounded-md font-bold ${period===p ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>{p==='1d'?'今日':p==='10d'?'10日':'3月'}</button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// 2. Add Book Modal
const AddBookModal = ({ onClose, onSave }) => {
    const [name, setName] = useState('');
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-[slideUp_0.3s_ease-out]">
                <h2 className="text-xl font-bold mb-4">新增帳本資料夾</h2>
                <input autoFocus type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="例如: 保險箱、小孩教育金" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 font-bold outline-none focus:border-yellow-400" />
                <button onClick={() => name && onSave(name)} disabled={!name} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold disabled:opacity-50">建立資料夾</button>
            </div>
        </div>
    );
};

// 3. Add Gold Modal
const AddGoldModal = ({ onClose, onSave, onDelete, initialData }) => {
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [unit, setUnit] = useState('g'); 
    const [weightInput, setWeightInput] = useState(initialData?.weight ? initialData.weight.toString() : '');
    const [totalCost, setTotalCost] = useState(initialData?.totalCost?.toString() ?? '');
    const [note, setNote] = useState(initialData?.note || '');
    const [photo, setPhoto] = useState(initialData?.photo || null);

    // Initial Unit Logic
    useEffect(() => {
        if(initialData?.weight) { setUnit('g'); setWeightInput(initialData.weight.toString()); }
    }, [initialData]);

    const handlePhoto = async (e) => {
        if (e.target.files[0]) {
            const compressed = await compressImage(await new Promise(r => { const rd = new FileReader(); rd.onload = () => r(rd.result); rd.readAsDataURL(e.target.files[0]); }));
            setPhoto(compressed);
        }
    };

    const handleSubmit = () => {
        let w = parseFloat(weightInput);
        if (isNaN(w) || w <= 0) return;
        if (unit === 'tw_qian') w = w * 3.75;
        if (unit === 'tw_liang') w = w * 37.5;
        onSave({ date, weight: w, totalCost: parseFloat(totalCost) || 0, note, photo });
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
                        <label className="text-xs font-bold text-gray-400 block mb-1">總成本 (台幣)</label>
                        <div className="flex items-center gap-1">
                            <span className="text-gray-400 text-lg font-bold">$</span>
                            <input type="number" inputMode="numeric" value={totalCost} onChange={e => setTotalCost(e.target.value)} placeholder="0" className="bg-transparent text-3xl font-black text-gray-800 w-full outline-none" />
                        </div>
                    </div>
                    <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="備註 (例: 送禮)" className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none border border-gray-100" />
                    <label className="block w-full h-24 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 relative overflow-hidden transition-colors">
                        {photo ? <><img src={photo} className="absolute inset-0 w-full h-full object-cover opacity-60" /><div className="relative z-10 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><RefreshCw size={12}/> 更換</div></> : <><Camera size={24} className="mb-1 text-gray-300"/><span className="text-xs font-bold">上傳照片</span></>}
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                    </label>
                    <button onClick={handleSubmit} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-lg shadow-gray-300 active:scale-95 transition-all text-lg">{initialData ? '儲存變更' : '確認入庫'}</button>
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

// --- MAIN APPLICATION ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Data
    const [books, setBooks] = useState([]);
    const [allTransactions, setAllTransactions] = useState([]);
    const [selectedBook, setSelectedBook] = useState(null); // null = List View, object = Detail View

    // Gold Price
    const [goldPrice, setGoldPrice] = useState(2880); 
    const [goldHistory, setGoldHistory] = useState([]);
    const [goldIntraday, setGoldIntraday] = useState([]); 
    const [goldPeriod, setGoldPeriod] = useState('1d'); 
    const [priceLoading, setPriceLoading] = useState(false);
    
    // UI State
    const [showAddBook, setShowAddBook] = useState(false);
    const [showAddGold, setShowAddGold] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [showConverter, setShowConverter] = useState(false);
    const [showChart, setShowChart] = useState(true);

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

    // 2. Data Listeners
    useEffect(() => {
        if (!user) return;
        // Fetch Books
        const qBooks = query(collection(db, 'artifacts', appId, 'users', user.uid, 'gold_books'), orderBy('createdAt', 'desc'));
        const unsubBooks = onSnapshot(qBooks, (snap) => {
            setBooks(snap.docs.map(d => ({id: d.id, ...d.data()})));
        });

        // Fetch All Transactions (We filter client side for smooth UX)
        const qTrans = query(collection(db, 'artifacts', appId, 'users', user.uid, 'gold_transactions'), orderBy('date', 'desc'));
        const unsubTrans = onSnapshot(qTrans, (snap) => {
            setAllTransactions(snap.docs.map(d => ({id: d.id, ...d.data()})));
        });

        return () => { unsubBooks(); unsubTrans(); };
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

    const handleCreateBook = async (name) => {
        if(!user) return;
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'gold_books'), {
            name, createdAt: serverTimestamp(), color: Math.floor(Math.random()*6)
        });
        setShowAddBook(false);
    };

    const handleDeleteBook = async (bookId, e) => {
        e.stopPropagation();
        if(!confirm("確定刪除此資料夾？裡面的紀錄也會一併刪除！")) return;
        
        const batch = writeBatch(db);
        const transToDelete = allTransactions.filter(t => t.bookId === bookId);
        transToDelete.forEach(t => {
            batch.delete(doc(db, 'artifacts', appId, 'users', user.uid, 'gold_transactions', t.id));
        });
        batch.delete(doc(db, 'artifacts', appId, 'users', user.uid, 'gold_books', bookId));
        await batch.commit();
        if(selectedBook?.id === bookId) setSelectedBook(null);
    };

    const handleSaveGold = async (data) => {
        if(!user || !selectedBook) return;
        const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'gold_transactions');
        const payload = { ...data, bookId: selectedBook.id, updatedAt: serverTimestamp() };
        
        if (editingItem) {
            await updateDoc(doc(colRef, editingItem.id), payload);
        } else {
            await addDoc(colRef, { ...payload, createdAt: serverTimestamp() });
        }
        setShowAddGold(false);
        setEditingItem(null);
    };

    const handleDeleteGold = async (id) => {
        if (!confirm("確定刪除？")) return;
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'gold_transactions', id));
        setShowAddGold(false);
    };

    // 4. Calculations
    const getBookStats = (bookId) => {
        const trans = bookId ? allTransactions.filter(t => t.bookId === bookId) : allTransactions;
        const totalWeight = trans.reduce((acc, t) => acc + (Number(t.weight) || 0), 0);
        const totalCost = trans.reduce((acc, t) => acc + (Number(t.totalCost) || 0), 0);
        const currentValue = totalWeight * goldPrice;
        const profit = currentValue - totalCost;
        const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
        return { totalWeight, totalCost, currentValue, profit, roi, count: trans.length };
    };

    const globalStats = getBookStats(null); // All assets
    const currentBookStats = selectedBook ? getBookStats(selectedBook.id) : null;
    const currentTransactions = selectedBook ? allTransactions.filter(t => t.bookId === selectedBook.id) : [];

    // --- Render ---
    if (loading) return <AppLoading />;
    if (!user) return <LoginView />;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 pb-20 font-sans">
            <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

            {/* HEADER - Dynamic based on view */}
            <div className="bg-gray-900 text-white p-6 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden mb-6 transition-all duration-500">
                <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                
                {/* Top Bar */}
                <div className="flex justify-between items-center mb-6 relative z-10">
                    {selectedBook ? (
                        <button onClick={() => setSelectedBook(null)} className="flex items-center gap-1 text-gray-300 hover:text-white transition-colors">
                            <ArrowLeft size={20} /> <span className="text-sm font-bold">返回列表</span>
                        </button>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                                <Folder size={20} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold">我的帳本</h1>
                                <p className="text-xs text-gray-400">{user.displayName}</p>
                            </div>
                        </div>
                    )}
                    <button onClick={() => signOut(auth)} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><LogOut size={18}/></button>
                </div>

                {/* Dashboard Stats */}
                <div className="relative z-10 animate-[fadeIn_0.5s]">
                    <div className="mb-2 text-gray-400 text-xs font-bold uppercase tracking-wider">
                        {selectedBook ? `${selectedBook.name} 總值` : '總資產價值 (TWD)'}
                    </div>
                    <div className="text-4xl font-black mb-6 tracking-tight text-white drop-shadow-sm">
                        {formatMoney(selectedBook ? currentBookStats.currentValue : globalStats.currentValue)}
                    </div>
                    
                    <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
                         <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/5 min-w-[120px] flex-1">
                             <div className="text-gray-400 text-[10px] mb-1">總重量</div>
                             <div className="font-bold text-lg">{formatWeight(selectedBook ? currentBookStats.totalWeight : globalStats.totalWeight)}</div>
                         </div>
                         <div className={`backdrop-blur-md rounded-2xl p-3 border border-white/5 min-w-[120px] flex-1 ${(selectedBook ? currentBookStats.profit : globalStats.profit) >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                             <div className="text-gray-400 text-[10px] mb-1">損益</div>
                             <div className={`font-bold text-lg ${(selectedBook ? currentBookStats.profit : globalStats.profit) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                 {formatMoney(selectedBook ? currentBookStats.profit : globalStats.profit)}
                             </div>
                         </div>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4">
                
                {/* VIEW 1: BOOK LIST */}
                {!selectedBook && (
                    <div className="space-y-4 animate-[fadeIn_0.3s]">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="font-bold text-gray-700 flex items-center gap-2"><LayoutGrid size={18}/> 資料夾列表</h2>
                            <button onClick={() => setShowAddBook(true)} className="bg-gray-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-lg shadow-gray-300 hover:scale-105 transition-transform"><FolderPlus size={14}/> 新增</button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {books.map((book, idx) => {
                                const stats = getBookStats(book.id);
                                const colors = ['bg-blue-50 text-blue-600', 'bg-purple-50 text-purple-600', 'bg-orange-50 text-orange-600', 'bg-teal-50 text-teal-600', 'bg-rose-50 text-rose-600'];
                                const theme = colors[book.color % colors.length] || colors[0];
                                
                                return (
                                    <div key={book.id} onClick={() => setSelectedBook(book)} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 relative group hover:shadow-md transition-all cursor-pointer active:scale-95">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${theme}`}>
                                                <Folder size={20} fill="currentColor" className="opacity-20"/>
                                                <Folder size={20} className="absolute"/>
                                            </div>
                                            <button onClick={(e) => handleDeleteBook(book.id, e)} className="p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                        <h3 className="font-bold text-lg text-gray-800 mb-1">{book.name}</h3>
                                        <div className="text-xs text-gray-400 mb-3">{stats.count} 筆交易</div>
                                        <div className="pt-3 border-t border-gray-50 flex justify-between items-end">
                                            <div>
                                                <div className="text-[10px] text-gray-400">現值</div>
                                                <div className="font-bold text-gray-700">{formatMoney(stats.currentValue)}</div>
                                            </div>
                                            <div className={`text-xs font-bold px-2 py-1 rounded-lg ${stats.profit >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                {stats.profit >= 0 ? '+' : ''}{Math.round(stats.roi)}%
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {/* Empty State for Books */}
                            {books.length === 0 && (
                                <button onClick={() => setShowAddBook(true)} className="col-span-full border-2 border-dashed border-gray-200 rounded-3xl p-8 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors gap-2">
                                    <FolderPlus size={32} className="opacity-50"/>
                                    <span className="font-bold text-sm">建立第一個資料夾</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* VIEW 2: BOOK DETAIL (Transactions) */}
                {selectedBook && (
                    <div className="space-y-4 animate-[slideUp_0.2s]">
                        
                        {/* Chart Component */}
                        <GoldChart 
                            data={goldHistory} intraday={goldIntraday} period={goldPeriod} 
                            setPeriod={setGoldPeriod} goldPrice={goldPrice} loading={priceLoading}
                            isVisible={showChart} toggleVisibility={() => setShowChart(!showChart)}
                        />

                        {/* Converter */}
                        <GoldConverter 
                            goldPrice={goldPrice}
                            isVisible={showConverter}
                            toggleVisibility={() => setShowConverter(!showConverter)}
                        />

                        {/* Transaction List */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[300px]">
                            <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10">
                                <div className="font-bold text-gray-700 flex items-center gap-2">
                                    <Calendar size={18} className="text-gray-400"/>
                                    交易明細
                                </div>
                                <button onClick={() => { setEditingItem(null); setShowAddGold(true); }} className="bg-gray-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-md active:scale-95 transition-transform">
                                    <Plus size={14}/> 記一筆
                                </button>
                            </div>
                            
                            <div className="divide-y divide-gray-50">
                                {currentTransactions.length === 0 ? (
                                    <div className="p-10 text-center text-gray-400 text-sm flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                                            <Tag size={24} className="opacity-20"/>
                                        </div>
                                        尚無紀錄，點擊右上方按鈕新增。
                                    </div>
                                ) : (
                                    currentTransactions.map(t => {
                                        const weightG = Number(t.weight) || 0;
                                        const cost = Number(t.totalCost) || 0;
                                        const itemVal = weightG * goldPrice;
                                        const itemProfit = itemVal - cost;
                                        return (
                                            <div key={t.id} onClick={() => { setEditingItem(t); setShowAddGold(true); }} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    {t.photo ? <img src={t.photo} className="w-10 h-10 rounded-xl object-cover border border-gray-100"/> : 
                                                    <div className="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center border border-yellow-100"><Scale size={18}/></div>}
                                                    <div>
                                                        <div className="font-bold text-gray-800">{formatWeight(weightG)}</div>
                                                        <div className="text-xs text-gray-400">{t.date} {t.note && `• ${t.note}`}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`font-bold text-sm ${itemProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {itemProfit >= 0 ? '+' : ''}{formatMoney(itemProfit)}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400">成本: {formatMoney(t.totalCost)}</div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Modals */}
            {showAddBook && <AddBookModal onClose={() => setShowAddBook(false)} onSave={handleCreateBook} />}
            {showAddGold && <AddGoldModal onClose={() => setShowAddGold(false)} onSave={handleSaveGold} onDelete={handleDeleteGold} initialData={editingItem} />}

        </div>
    );
}
