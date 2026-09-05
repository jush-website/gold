import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, addDoc, onSnapshot,
  deleteDoc, doc, updateDoc, serverTimestamp,
  query, orderBy, setDoc, arrayUnion, arrayRemove
} from 'firebase/firestore';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
  getRedirectResult, signInWithRedirect
} from 'firebase/auth';
import { Key, AlertCircle } from 'lucide-react';

import {
  formatMoney, formatMoneyOrDash, formatWeight, formatDate, formatMonth,
  getLocalYMD, getSortTime, generateId
} from '../lib/format.js';
import { splitDebtsBySettlement, summarizeDebts, summarizeGold } from '../lib/finance.js';
import { summarizeSubscriptions, collectDueBillings } from '../lib/subscriptions.js';

import { useTheme } from './ui/useTheme.js';
import { useCalibration } from './ui/useCalibration.js';
import { applyFactor, applyFactorToSeries } from '../lib/calibration.js';
import { TopBar, SettingsMenu, BottomNav } from './ui/AppShell.jsx';
import { Button, Field, inputClass } from './ui/primitives.jsx';

import HomeView from './views/HomeView.jsx';
import ExpenseView from './views/ExpenseView.jsx';
import GoldView from './views/GoldView.jsx';
import DebtView from './views/DebtView.jsx';
import HistoryView from './views/HistoryView.jsx';
import CalendarView from './views/CalendarView.jsx';
import CategoryManagerView from './views/CategoryManagerView.jsx';
import BackupView from './views/BackupView.jsx';
import SubscriptionView from './views/SubscriptionView.jsx';
import LoginView, { AppLoading } from './views/LoginView.jsx';

import {
  Toast, ConfirmModal, InstallPrompt, CalibrationModal,
  AddExpenseModal, AddGoldModal, AddDebtModal, AddRepaymentModal,
  DebtDetailsModal, BookManager, AddSubscriptionModal,
} from './modals/index.jsx';

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
} catch (e) {
    console.warn("讀取環境變數失敗，改用本機儲存的設定:", e?.message || e);
}

if (!isEnvConfigured) {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.apiKey) firebaseConfig = parsed;
        }
    } catch (e) {
        console.warn("本機儲存的 Firebase 設定無法解析:", e?.message || e);
    }
}

// --- Firebase Init ---
let app, auth, db, googleProvider;
const isConfigured = !!firebaseConfig.apiKey; 

if (isConfigured) {
    try { 
        app = initializeApp(firebaseConfig); 
        auth = getAuth(app);
        // 離線持久化：資料存在 IndexedDB，沒網路時 App 仍可開啟與記帳，
        // 恢復連線後 Firestore 會自動把待寫入的變更送出。
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        });
        googleProvider = new GoogleAuthProvider();
    } catch (e) {
        console.error("Firebase Init Error:", e);
        if (!isEnvConfigured) localStorage.removeItem(STORAGE_KEY);
    }
}

// 舊版執行環境會注入 __app_id；一般部署沒有這個全域變數，就用固定值。
// 注意：這個字串決定 Firestore 的資料路徑，改動會讀不到既有資料。
const rawAppId = globalThis.__app_id ?? 'gold-tracker-v1';
const appId = rawAppId.replace(/\//g, '_').replace(/\./g, '_');

// --- SHARED UI COMPONENTS ---
// 匯入檔的基本檢查：只接受「物件陣列，且每筆都有 id」，
// 避免把壞掉或不相干的 JSON 直接 setDoc 寫進 Firestore。
const isValidCollection = (items) =>
    items === undefined || items === null ||
    (Array.isArray(items) && items.every(
        it => it && typeof it === 'object' && !Array.isArray(it) &&
              (typeof it.id === 'string' || typeof it.id === 'number')
    ));

// 沒有提供環境變數時的設定畫面（自行部署預覽版用）
const ConfigScreen = () => {
    const [key, setKey] = useState('');
    const [saving, setSaving] = useState(false);

    const save = () => {
        if (!key.trim()) return;
        setSaving(true);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...defaultConfig, apiKey: key.trim() }));
        window.location.reload();
    };

    return (
        <div className="min-h-[100dvh] bg-ground grid place-items-center px-6">
            <div className="w-full max-w-xs">
                <span className="w-14 h-14 rounded-2xl bg-gold/12 border border-gold/25 text-gold grid place-items-center mx-auto mb-6">
                    <Key size={22} />
                </span>
                <h1 className="text-lg font-bold text-ink text-center mb-2">尚未設定 Firebase</h1>
                <p className="text-xs text-ink-3 text-center leading-relaxed mb-6">
                    這個部署沒有帶入 VITE_FIREBASE_API_KEY。
                    你可以在這裡貼上 Web API Key，它只會存在這台裝置的瀏覽器裡。
                </p>

                <Field label="Firebase Web API Key">
                    <input
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="AIza..."
                        className={inputClass}
                        autoFocus
                    />
                </Field>

                <Button className="w-full mt-5" disabled={!key.trim()} loading={saving} onClick={save}>
                    儲存並重新載入
                </Button>

                <p className="mt-5 flex items-start gap-2 text-[11px] text-ink-3 leading-relaxed">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    正式部署請改在 Vercel 的環境變數設定，不要每台裝置手動輸入。
                </p>
            </div>
        </div>
    );
};

export default function App() {
    const { isLight, toggleTheme } = useTheme();
    const { calibration, saveCalibration, resetCalibration } = useCalibration();
    // fetchGoldPrice 透過 ref 讀取最新的校準值，
    // 這樣它本身就不必隨校準改變而重建，登入時掛上的監聽也不會被重複拆裝。
    const calibrationRef = useRef(calibration);
    useEffect(() => { calibrationRef.current = calibration; }, [calibration]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    
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
    const [goldPrice, setGoldPrice] = useState(null); // null = 尚未取得，不可用假價格頂替
    const [priceError, setPriceError] = useState(false);
    // 資料來源：讓畫面標示得出這是台銀牌價、上一交易日收盤，還是國際金價換算
    const [priceMeta, setPriceMeta] = useState({});
    const [showCalibration, setShowCalibration] = useState(false);
    const [goldHistory, setGoldHistory] = useState([]);
    const [goldIntraday, setGoldIntraday] = useState([]);
    const [goldPeriod, setGoldPeriod] = useState('1d');
    const [priceLoading, setPriceLoading] = useState(false);
    const [showGoldAdd, setShowGoldAdd] = useState(false);
    const [editingGold, setEditingGold] = useState(null);

    // Expense & Debt Data
    const [books, setBooks] = useState([]);
    const [currentBookId, setCurrentBookId] = useState(null);
    const [debtBooks, setDebtBooks] = useState([]);
    const [currentDebtBookId, setCurrentDebtBookId] = useState(null);
    
    const [allExpenses, setAllExpenses] = useState([]);
    const [allDebts, setAllDebts] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [categories, setCategories] = useState([]);
    
    // History specific state
    const [currentHistoryDate, setCurrentHistoryDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [historyTab, setHistoryTab] = useState('stats'); 
    
    // Calendar specific state
    const [calendarDate, setCalendarDate] = useState(() => new Date());
    const [calendarSelectedDate, setCalendarSelectedDate] = useState(() => getLocalYMD());
    
    const [touchStartX, setTouchStartX] = useState(null);
    const [touchStartY, setTouchStartY] = useState(null);

    // UI State
    const [showExpenseAdd, setShowExpenseAdd] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [expenseToDelete, setExpenseToDelete] = useState(null);
    const [goldToDelete, setGoldToDelete] = useState(null);
    const [showBookManager, setShowBookManager] = useState(false);
    const [showDebtBookManager, setShowDebtBookManager] = useState(false);
    const [showSubscriptionAdd, setShowSubscriptionAdd] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState(null);
    const [subscriptionToDelete, setSubscriptionToDelete] = useState(null);

    // Debt UI State
    const [showDebtAdd, setShowDebtAdd] = useState(false);
    const [editingDebt, setEditingDebt] = useState(null);
    const [debtToDelete, setDebtToDelete] = useState(null);
    const [showRepaymentAdd, setShowRepaymentAdd] = useState(false);
    const [showDebtDetails, setShowDebtDetails] = useState(false);
    const [activeDebt, setActiveDebt] = useState(null);
    const [debtTab, setDebtTab] = useState('active');

    // Bottom Navigation Setup
    // --- PWA (Progressive Web App) 安裝偵測 ---
    // manifest / meta / icon 皆已改為 index.html 的靜態宣告 +
    // vite-plugin-pwa 產生的 service worker，這裡只負責偵測安裝狀態。
    useEffect(() => {
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

        const handleAppInstalled = () => {
            setDeferredPrompt(null);
            setShowInstallBtn(false);
        };
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
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
            setCurrentBookId(prev => {
                if (b.length > 0) {
                    if (!prev || !b.find(book => book.id === prev)) return b[0].id;
                    return prev;
                }
                return null;
            });
        });

        const debtBooksRef = collection(db, 'artifacts', appId, 'users', user.uid, 'debt_books');
        const unsubDebtBooks = onSnapshot(query(debtBooksRef, orderBy('createdAt', 'desc')), (snap) => {
            const b = snap.docs.map(d => ({id:d.id, ...d.data()}));
            setDebtBooks(b);
            setCurrentDebtBookId(prev => {
                if (b.length > 0) {
                    if (!prev || !b.find(book => book.id === prev)) return b[0].id;
                    return prev;
                }
                return null;
            });
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

        const subsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'subscriptions');
        const unsubSubs = onSnapshot(query(subsRef, orderBy('createdAt', 'desc')), (snap) => {
            setSubscriptions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const debtsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'debts');
        const unsubDebts = onSnapshot(query(debtsRef, orderBy('createdAt', 'desc')), (snap) => {
            setAllDebts(snap.docs.map(d => ({id:d.id, ...d.data()})));
        });

        return () => { unsubGold(); unsubBooks(); unsubDebtBooks(); unsubCat(); unsubDebts(); unsubSubs(); };
    }, [user]);

    useEffect(() => {
        if (!user || !isConfigured) return;
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'expense_transactions'), orderBy('date', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setAllExpenses(snap.docs.map(d => ({id:d.id, ...d.data()})));
        });
        return () => unsub();
    }, [user]);

    // 所有跟隨特定帳本的資料
    const expenses = useMemo(() => {
        if (!currentBookId) return [];
        return allExpenses.filter(e => e.bookId === currentBookId);
    }, [allExpenses, currentBookId]);

    const debts = useMemo(() => {
        if (!currentDebtBookId) return [];
        return allDebts.filter(d => d.bookId === currentDebtBookId);
    }, [allDebts, currentDebtBookId]);

    // 計算借款的已還款與待還款狀態，並分成「未結清」與「已結清」兩組
    const { activeDebtsList, settledDebtsList } = useMemo(() => splitDebtsBySettlement(debts), [debts]);

    const displayDebts = debtTab === 'active' ? activeDebtsList : settledDebtsList;

    const fetchGoldPrice = async () => {
        setPriceLoading(true);
        setPriceError(false);
        try {
            const response = await fetch('/api/gold').catch(() => null);
            if (response && response.ok) {
                const data = await response.json();
                if (data.success && data.currentPrice) {
                    // 校準在這裡一次套用，後面的圖表與市值就不必各自處理
                    setGoldPrice(applyFactor(data.currentPrice, calibrationRef.current.factor));
                    setGoldHistory(applyFactorToSeries(data.history || [], calibrationRef.current.factor));
                    setGoldIntraday(applyFactorToSeries(data.intraday || [], calibrationRef.current.factor));
                    setPriceMeta({
                        priceSource: data.priceSource,
                        historySource: data.historySource,
                        intradaySource: data.intradaySource,
                        updatedAt: data.updatedAt,
                    });
                    setPriceLoading(false); return;
                }
            }
            const yahooGold = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=3mo')).then(r => r.json());
            const yahooTwd = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://query1.finance.yahoo.com/v8/finance/chart/TWD=X?interval=1d&range=1d')).then(r => r.json());
            if (yahooGold.chart.result && yahooTwd.chart.result) {
                const gQuote = yahooGold.chart.result[0], tQuote = yahooTwd.chart.result[0];
                const twdRate = tQuote.meta.regularMarketPrice, currentGoldUsd = gQuote.meta.regularMarketPrice;
                const priceTwd = Math.floor((currentGoldUsd * twdRate / 31.1035) * 1.005);
                setGoldPrice(applyFactor(priceTwd, calibrationRef.current.factor));
                const timestamps = gQuote.timestamp, closePrices = gQuote.indicators.quote[0].close;
                const historyData = timestamps.map((ts, i) => (!closePrices[i] ? null : { date: new Date(ts * 1000).toISOString().split('T')[0], price: Math.floor((closePrices[i] * twdRate / 31.1035) * 1.005) })).filter(x => x).slice(-30);
                setGoldHistory(applyFactorToSeries(historyData, calibrationRef.current.factor));
                setGoldIntraday([]);
                // 這條路徑完全靠 Yahoo 換算，不是台銀牌價
                setPriceMeta({ priceSource: 'yahoo', historySource: 'yahoo-estimated', intradaySource: null });
            } else { throw new Error("Client fetch failed"); }
        } catch (e) { 
            // 以前這裡會塞入 2950 與兩筆 2023 年的假歷史資料，
            // 使用者看到的損益是錯的卻毫無提示。現在保留上一次成功取得的價格
            // （沒有就顯示「—」），並在畫面上標示無法更新。
            console.warn("金價取得失敗:", e?.message || e);
            setPriceError(true);
        } finally { setPriceLoading(false); }
    };

    const handleExpenseSwap = async (item1, item2) => {
        try {
            const fallbackTime = new Date();
            const time1 = item1.createdAt || fallbackTime;
            const time2 = item2.createdAt || fallbackTime;
            
            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expense_transactions', String(item1.id)), { createdAt: time2 });
            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expense_transactions', String(item2.id)), { createdAt: time1 });
        } catch (e) {
            showToast(`排序失敗: ${e.message}`, "error");
        }
    };

    // --- Firebase CRUD Handlers ---
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

    const handleDebtBookSave = async (data) => {
        try {
            if (data.id) {
                const { id, ...payload } = data;
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'debt_books', String(id)), { ...payload, updatedAt: serverTimestamp() });
                showToast("借貸帳本已更新");
            } else {
                const { id, ...payload } = data;
                await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'debt_books'), { ...payload, createdAt: serverTimestamp() });
                showToast("新增借貸帳本成功");
            }
        } catch (e) { showToast(`儲存帳本失敗: ${e.message}`, "error"); }
    };

    const handleDebtBookDelete = async (id) => {
        if (!id) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'debt_books', String(id)));
            showToast("已刪除借貸帳本");
            if(currentDebtBookId === id) {
                const remainingBooks = debtBooks.filter(b => b.id !== id);
                setCurrentDebtBookId(remainingBooks.length > 0 ? remainingBooks[0].id : null);
            }
        } catch (e) { showToast(`刪除失敗: ${e.message}`, "error"); }
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

    // --- 訂閱 CRUD ---
    const handleSubscriptionSave = async (data) => {
        try {
            const { id, ...payload } = data;
            if (id) {
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'subscriptions', String(id)),
                    { ...payload, updatedAt: serverTimestamp() });
                showToast("訂閱已更新");
            } else {
                await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'subscriptions'),
                    { ...payload, createdAt: serverTimestamp() });
                showToast("新增訂閱成功");
            }
            setShowSubscriptionAdd(false); setEditingSubscription(null);
        } catch (e) { showToast(`儲存訂閱失敗: ${e.message}`, "error"); }
    };

    const handleSubscriptionDelete = async (id) => {
        if (!id) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'subscriptions', String(id)));
            setShowSubscriptionAdd(false); setEditingSubscription(null);
            showToast("已刪除訂閱");
        } catch (e) { showToast(`刪除失敗: ${e.message}`, "error"); }
    };

    // --- DEBT specific CRUD ---
    const handleDebtSave = async (data) => {
        if (!data.bookId) return showToast("未選擇借貸帳本", "error");
        try {
            if (data.id) {
                const { id, ...payload } = data;
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'debts', String(id)), { ...payload, updatedAt: serverTimestamp() });
                showToast("更新借款成功");
            } else {
                const { id, ...payload } = data;
                await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'debts'), { ...payload, createdAt: serverTimestamp() });
                showToast("新增借款成功");
            }
            setShowDebtAdd(false); setEditingDebt(null);
        } catch (e) { showToast(`儲存借款失敗: ${e.message}`, "error"); }
    };

    const handleDebtDelete = async (id) => {
        if (!id) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'debts', String(id)));
            setShowDebtAdd(false); setEditingDebt(null);
            showToast("已刪除整筆借款紀錄");
        } catch (e) { showToast(`刪除失敗: ${e.message}`, "error"); }
    };

    const handleRepaymentSave = async (debtId, repaymentData) => {
        const targetDebt = allDebts.find(d => d.id === debtId);
        if (!targetDebt) return;
        const newRepayment = { ...repaymentData, id: generateId(), createdAt: Date.now() };

        try {
            // 用 arrayUnion 由伺服器端追加，不是「整包讀出來改完再寫回」。
            // 兩台裝置同時記還款時才不會互相覆蓋；離線時也能排入佇列稍後同步。
            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'debts', String(debtId)), {
                repayments: arrayUnion(newRepayment),
                updatedAt: serverTimestamp()
            });
            showToast("已紀錄還款");
            setShowRepaymentAdd(false);
        } catch (e) { showToast(`還款失敗: ${e.message}`, "error"); }
    };

    const handleRepaymentDelete = async (debtId, repaymentId) => {
        const targetDebt = allDebts.find(d => d.id === debtId);
        if (!targetDebt) return;
        const target = (targetDebt.repayments || []).find(r => r.id === repaymentId);
        if (!target) return showToast("找不到該筆還款明細", "error");

        try {
            // 同樣交給伺服器端比對移除，避免覆蓋掉其他裝置剛新增的還款
            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'debts', String(debtId)), {
                repayments: arrayRemove(target),
                updatedAt: serverTimestamp()
            });
            showToast("已移除該筆還款明細");
        } catch (e) { showToast(`移除失敗: ${e.message}`, "error"); }
    };


    const hasGoldPrice = goldPrice != null;
    const goldStats = useMemo(
        () => summarizeGold(goldTransactions, goldPrice),
        [goldTransactions, goldPrice],
    );

    // 優化：使用 localeCompare 安全比對日期字串，避免舊資料 Date 解析錯誤導致崩潰
    const sortedGoldTransactions = useMemo(() => {
        return [...goldTransactions].sort((a,b) => {
            const dateDiff = String(b.date || '').localeCompare(String(a.date || ''));
            if (dateDiff !== 0) return dateDiff;
            return getSortTime(b.createdAt) - getSortTime(a.createdAt);
        });
    }, [goldTransactions]);

    const currentMonthStats = useMemo(() => {
        const now = new Date();
        const thisMonth = expenses.filter(e => {
            const safeDate = e.date || getLocalYMD();
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
            const safeDate = e.date || getLocalYMD();
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
        const currentRealMonth = getLocalYMD().substring(0, 7);

        expenses.forEach(e => {
            const safeDate = e.date || getLocalYMD();
            // 優化：生活記帳主頁面只顯示與現實時間同月份的紀錄，避免清單無限增長
            if (!safeDate.startsWith(currentRealMonth)) return; 

            if(!groups[safeDate]) groups[safeDate] = { date: safeDate, list: [], total: 0 };
            groups[safeDate].list.push(e);
            if(e.type === 'expense') groups[safeDate].total -= (Number(e.amount) || 0);
        });
        
        Object.values(groups).forEach(g => g.list.sort((a,b) => getSortTime(b.createdAt) - getSortTime(a.createdAt)));
        return Object.values(groups).sort((a,b) => String(b.date).localeCompare(String(a.date)));
    }, [expenses]);

    const debtStats = useMemo(() => summarizeDebts(debts), [debts]);

    const historyCurrentMonthKey = `${currentHistoryDate.getFullYear()}-${String(currentHistoryDate.getMonth() + 1).padStart(2, '0')}`;
    const currentHistoryRecords = useMemo(() => {
        return expenses.filter(e => {
            const safeDate = e.date || getLocalYMD();
            return safeDate.startsWith(historyCurrentMonthKey);
        }).sort((a,b) => {
            const dateDiff = String(b.date || '').localeCompare(String(a.date || ''));
            if (dateDiff !== 0) return dateDiff;
            return getSortTime(b.createdAt) - getSortTime(a.createdAt);
        });
    }, [expenses, historyCurrentMonthKey]);


    const calendarYear = calendarDate.getFullYear();
    const calendarMonth = calendarDate.getMonth();
    const daysInCalendarMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const firstDayOfCalendarMonth = new Date(calendarYear, calendarMonth, 1).getDay();

    const calendarDailyData = useMemo(() => {
        const data = {};
        expenses.forEach(e => {
            const d = e.date || getLocalYMD(); 
            if (!data[d]) data[d] = { hasIncome: false, hasExpense: false, list: [] };
            if (e.type === 'income') data[d].hasIncome = true;
            if (e.type === 'expense') data[d].hasExpense = true;
            data[d].list.push(e);
        });
        Object.values(data).forEach(g => g.list.sort((a,b) => getSortTime(b.createdAt) - getSortTime(a.createdAt)));
        return data;
    }, [expenses]);

    const calendarDays = Array.from({ length: firstDayOfCalendarMonth }, () => null).concat(
        Array.from({ length: daysInCalendarMonth }, (_, i) => i + 1)
    );


    const handleTouchStart = (e) => {
        setTouchStartX(e.touches[0].clientX);
        setTouchStartY(e.touches[0].clientY);
    };

    const handleTouchEnd = (e, callbackFn) => {
        if (touchStartX === null || touchStartY === null) return;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const diffX = touchStartX - touchEndX;
        const diffY = Math.abs(touchStartY - touchEndY);

        if (Math.abs(diffX) > 50 && diffY < 50) {
            if (diffX > 0) callbackFn(1); // Next
            else if (diffX < 0) callbackFn(-1); // Prev
        }
        setTouchStartX(null);
        setTouchStartY(null);
    };

    const subscriptionStats = useMemo(() => summarizeSubscriptions(subscriptions), [subscriptions]);

    // 訂閱到期自動記帳。
    //
    // 每一期的 document id 是「sub-{訂閱ID}-{扣款日}」這個固定值，
    // 用 setDoc 而不是 addDoc —— 兩個分頁同時開、中途重整、多台裝置一起跑，
    // 寫進去的都是同一份文件，不可能變成兩筆。這比事後檢查重複可靠得多。
    //
    // 寫完才推進 nextBillingDate；推進失敗的話下次進來會再寫一次同樣的 id，
    // 結果一樣，不會多記。
    const subscriptionsRef = useRef(subscriptions);
    useEffect(() => { subscriptionsRef.current = subscriptions; }, [subscriptions]);

    useEffect(() => {
        if (!user || !isConfigured || subscriptions.length === 0) return;

        let cancelled = false;
        const run = async () => {
            const today = getLocalYMD();

            for (const sub of subscriptionsRef.current) {
                if (cancelled) return;
                const { billings, nextBillingDate } = collectDueBillings(sub, today);
                if (billings.length === 0) continue;

                try {
                    for (const billing of billings) {
                        await setDoc(
                            doc(db, 'artifacts', appId, 'users', user.uid, 'expense_transactions', billing.id),
                            {
                                amount: billing.amount,
                                date: billing.date,
                                type: 'expense',
                                category: sub.categoryId || '',
                                bookId: sub.bookId || '',
                                itemName: sub.name,
                                note: '訂閱自動記帳',
                                subscriptionId: sub.id,
                                createdAt: serverTimestamp(),
                            },
                        );
                    }

                    await updateDoc(
                        doc(db, 'artifacts', appId, 'users', user.uid, 'subscriptions', String(sub.id)),
                        { nextBillingDate, lastAutoLogAt: getLocalYMD() },
                    );

                    if (!cancelled) {
                        showToast(`已為「${sub.name}」自動記帳 ${billings.length} 筆`);
                    }
                } catch (e) {
                    console.warn(`訂閱「${sub.name}」自動記帳失敗:`, e?.message || e);
                }
            }
        };

        run();
        return () => { cancelled = true; };
        // 只在登入後與訂閱數量變動時檢查；清單內容的變動由 ref 讀取最新值
    }, [user, subscriptions.length]);

    // 歷史頁的當月統計與分類排名
    const historyStats = useMemo(() => {
        const income = currentHistoryRecords.filter(e => e.type === 'income')
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const expenseTotal = currentHistoryRecords.filter(e => e.type === 'expense')
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        return { income, expense: expenseTotal };
    }, [currentHistoryRecords]);

    const historyRanking = useMemo(() => {
        const groups = {};
        currentHistoryRecords.filter(e => e.type === 'expense').forEach(e => {
            const cat = e.category || 'other';
            groups[cat] = (groups[cat] || 0) + (Number(e.amount) || 0);
        });
        const total = historyStats.expense;
        return Object.entries(groups)
            .sort((a, b) => b[1] - a[1])
            .map(([id, amount]) => ({
                id,
                name: categories.find(c => c.id === id)?.name || '未分類',
                amount,
                percent: total > 0 ? (amount / total) * 100 : 0,
            }));
    }, [currentHistoryRecords, categories, historyStats.expense]);

    // 備份匯出／還原
    const [backupLoading, setBackupLoading] = useState(false);

    if (!isConfigured) return <ConfigScreen />;
    if (loading) return <AppLoading />;
    if (!user) {
        return (
            <LoginView
                onSignIn={() => signInWithPopup(auth, googleProvider)}
                onRedirectSignIn={() => signInWithRedirect(auth, googleProvider)}
                showResetKey={!isEnvConfigured}
                onResetKey={() => { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }}
            />
        );
    }

    const currentBook = books.find(b => b.id === currentBookId);
    const currentDebtBook = debtBooks.find(b => b.id === currentDebtBookId);

    const handleExport = () => {
        const data = {
            goldTransactions, books, debtBooks,
            allExpenses, categories, debts: allDebts,
        };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `我的記帳本_備份_${getLocalYMD()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // 有些瀏覽器會在點擊後才真正讀取 blob，延後釋放比較保險
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast('資料已匯出');
    };

    const handleImport = (file) => {
        if (!file) return;
        setBackupLoading(true);
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('無效的備份檔案格式');
                if (!data.books && !data.allExpenses && !data.goldTransactions && !data.debts && !data.debtBooks) {
                    throw new Error('無效的備份檔案格式');
                }

                const sections = {
                    goldTransactions: '黃金紀錄', books: '記帳帳本', debtBooks: '借貸帳本',
                    allExpenses: '收支紀錄', categories: '分類', debts: '借款',
                };
                const broken = Object.entries(sections)
                    .filter(([key]) => !isValidCollection(data[key]))
                    .map(([, label]) => label);
                if (broken.length > 0) throw new Error(`備份檔內容格式不正確：${broken.join('、')}`);

                const importCollection = async (name, items) => {
                    if (!Array.isArray(items)) return;
                    await Promise.all(items.map(async (item) => {
                        if (!item?.id) return;
                        const { id, ...payload } = item;
                        try {
                            await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, name, String(id)), payload);
                        } catch (err) {
                            console.warn(`寫入 ${name} 的紀錄 ${id} 失敗:`, err);
                        }
                    }));
                };

                await importCollection('gold_transactions', data.goldTransactions);
                await importCollection('account_books', data.books);
                await importCollection('debt_books', data.debtBooks);
                await importCollection('expense_transactions', data.allExpenses);
                await importCollection('expense_categories', data.categories);
                await importCollection('debts', data.debts);

                showToast('資料還原成功，正在重新載入…');
                setTimeout(() => window.location.reload(), 1200);
            } catch (error) {
                console.error('還原錯誤:', error);
                showToast(`還原失敗: ${error.message}`, 'error');
            } finally {
                setBackupLoading(false);
            }
        };

        reader.onerror = () => {
            showToast('讀取檔案失敗，請確認檔案是否損毀。', 'error');
            setBackupLoading(false);
        };

        reader.readAsText(file);
    };

    const bookView = currentView === 'debt' ? currentDebtBook : currentBook;

    return (
        <div className="h-[100dvh] bg-ground text-ink flex flex-col overflow-hidden">
            <Toast message={toast.message} type={toast.type} />

            <TopBar
                currentView={currentView}
                bookName={bookView?.name}
                onOpenBookManager={() => (currentView === 'debt' ? setShowDebtBookManager(true) : setShowBookManager(true))}
                canGoBack={historyStack.length > 1}
                onBack={goBack}
                showInstallBtn={showInstallBtn}
                onInstall={handleInstallClick}
                settingsOpen={showSettingsMenu}
                onToggleSettings={() => setShowSettingsMenu(v => !v)}
                settingsMenu={
                    <SettingsMenu
                        userName={user?.displayName}
                        isLight={isLight}
                        onToggleTheme={toggleTheme}
                        onNavigate={navigateTo}
                        onSignOut={() => signOut(auth)}
                        onClose={() => setShowSettingsMenu(false)}
                    />
                }
            />

            <main className="flex-1 overflow-hidden relative">
                {currentView === 'home' && (
                    <HomeView
                        goldStats={goldStats}
                        goldPrice={goldPrice}
                        goldHistory={goldHistory}
                        hasGoldPrice={hasGoldPrice}
                        monthStats={currentMonthStats}
                        pieChartData={pieChartData}
                        categories={categories}
                        debtStats={debtStats}
                        activeDebtCount={activeDebtsList.length}
                        subscriptionStats={subscriptionStats}
                        recentExpenses={expenses.slice(0, 5)}
                        currentBookName={currentBook?.name || '未選擇帳本'}
                        formatMoney={formatMoney}
                        formatMoneyOrDash={formatMoneyOrDash}
                        formatWeight={formatWeight}
                        onNavigate={navigateTo}
                        onAddExpense={() => {
                            if (books.length === 0) return showToast('請先新增帳本', 'error');
                            setEditingExpense(null);
                            setShowExpenseAdd(true);
                        }}
                    />
                )}

                {currentView === 'expense' && (
                    <ExpenseView
                        monthStats={currentMonthStats}
                        dailyExpenses={dailyExpenses}
                        categories={categories}
                        formatMoney={formatMoney}
                        formatDate={formatDate}
                        onAdd={() => {
                            if (books.length === 0) return showToast('請先新增帳本', 'error');
                            setEditingExpense(null);
                            setShowExpenseAdd(true);
                        }}
                        onSwap={handleExpenseSwap}
                        setEditingExpense={setEditingExpense}
                        setShowExpenseAdd={setShowExpenseAdd}
                        setExpenseToDelete={setExpenseToDelete}
                    />
                )}

                {currentView === 'gold' && (
                    <GoldView
                        goldStats={goldStats}
                        goldPrice={goldPrice}
                        hasGoldPrice={hasGoldPrice}
                        goldHistory={goldHistory}
                        goldIntraday={goldIntraday}
                        goldPeriod={goldPeriod}
                        setGoldPeriod={setGoldPeriod}
                        priceLoading={priceLoading}
                        priceError={priceError}
                        priceMeta={priceMeta}
                        calibration={calibration}
                        onRetryPrice={fetchGoldPrice}
                        onCalibrate={() => setShowCalibration(true)}
                        transactions={sortedGoldTransactions}
                        formatMoney={formatMoney}
                        formatMoneyOrDash={formatMoneyOrDash}
                        formatWeight={formatWeight}
                        onAdd={() => { setEditingGold(null); setShowGoldAdd(true); }}
                        onEdit={(t) => { setEditingGold(t); setShowGoldAdd(true); }}
                        onDelete={(t) => setGoldToDelete(t)}
                    />
                )}

                {currentView === 'debt' && (
                    <DebtView
                        debtStats={debtStats}
                        displayDebts={displayDebts}
                        debtTab={debtTab}
                        setDebtTab={setDebtTab}
                        hasBook={debtBooks.length > 0}
                        formatMoney={formatMoney}
                        showToast={showToast}
                        onAdd={() => { setEditingDebt(null); setShowDebtAdd(true); }}
                        onAddRepayment={(debt) => { setActiveDebt(debt); setShowRepaymentAdd(true); }}
                        onViewDetails={(debt) => { setActiveDebt(debt); setShowDebtDetails(true); }}
                        onEdit={(debt) => { setEditingDebt(debt); setShowDebtAdd(true); }}
                        onDelete={(debt) => setDebtToDelete(debt)}
                    />
                )}

                {currentView === 'history' && (
                    <HistoryView
                        monthLabel={formatMonth(`${historyCurrentMonthKey}-01`)}
                        records={currentHistoryRecords}
                        stats={historyStats}
                        ranking={historyRanking}
                        categories={categories}
                        tab={historyTab}
                        setTab={setHistoryTab}
                        formatMoney={formatMoney}
                        onPrevMonth={() => setCurrentHistoryDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                        onNextMonth={() => setCurrentHistoryDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                        onEdit={(item) => { setEditingExpense(item); setShowExpenseAdd(true); }}
                        onDelete={(item) => setExpenseToDelete(item)}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={(e) => handleTouchEnd(e, (dir) => setCurrentHistoryDate(prev =>
                            new Date(prev.getFullYear(), prev.getMonth() + dir, 1)))}
                    />
                )}

                {currentView === 'calendar' && (
                    <CalendarView
                        year={calendarYear}
                        month={calendarMonth}
                        days={calendarDays}
                        dailyData={calendarDailyData}
                        selectedDate={calendarSelectedDate}
                        onSelectDate={setCalendarSelectedDate}
                        todayYMD={getLocalYMD()}
                        onPrevMonth={() => setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1))}
                        onNextMonth={() => setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1))}
                        categories={categories}
                        formatMoney={formatMoney}
                        formatDate={formatDate}
                        onSwap={handleExpenseSwap}
                        setEditingExpense={setEditingExpense}
                        setShowExpenseAdd={setShowExpenseAdd}
                        setExpenseToDelete={setExpenseToDelete}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={(e) => handleTouchEnd(e, (dir) => setCalendarDate(prev =>
                            new Date(prev.getFullYear(), prev.getMonth() + dir, 1)))}
                    />
                )}

                {currentView === 'subscriptions' && (
                    <SubscriptionView
                        subscriptions={subscriptions}
                        categories={categories}
                        todayYMD={getLocalYMD()}
                        formatMoney={formatMoney}
                        onAdd={() => { setEditingSubscription(null); setShowSubscriptionAdd(true); }}
                        onEdit={(sub) => { setEditingSubscription(sub); setShowSubscriptionAdd(true); }}
                        onDelete={(sub) => setSubscriptionToDelete(sub)}
                    />
                )}

                {currentView === 'categories' && (
                    <CategoryManagerView
                        categories={categories}
                        onSave={handleCategorySave}
                        onDelete={handleCategoryDelete}
                        showToast={showToast}
                    />
                )}

                {currentView === 'backup' && (
                    <BackupView
                        onExport={handleExport}
                        onImport={handleImport}
                        isLoading={backupLoading}
                        counts={{
                            expenses: allExpenses.length,
                            gold: goldTransactions.length,
                            debts: allDebts.length,
                            categories: categories.length,
                        }}
                    />
                )}
            </main>

            <BottomNav currentView={currentView} onNavigate={navigateTo} />

            {/* ── 彈出層 ── */}
            {showExpenseAdd && (
                <AddExpenseModal
                    initialData={editingExpense}
                    categories={categories}
                    bookId={currentBookId}
                    showToast={showToast}
                    onClose={() => { setShowExpenseAdd(false); setEditingExpense(null); }}
                    onSave={handleExpenseSave}
                    onDelete={handleExpenseDelete}
                />
            )}

            {showGoldAdd && (
                <AddGoldModal
                    initialData={editingGold}
                    showToast={showToast}
                    onClose={() => { setShowGoldAdd(false); setEditingGold(null); }}
                    onSave={handleGoldSave}
                    onDelete={handleGoldDelete}
                />
            )}

            {showDebtAdd && (
                <AddDebtModal
                    initialData={editingDebt}
                    bookId={currentDebtBookId}
                    showToast={showToast}
                    onClose={() => { setShowDebtAdd(false); setEditingDebt(null); }}
                    onSave={handleDebtSave}
                    onDelete={handleDebtDelete}
                />
            )}

            {showRepaymentAdd && activeDebt && (
                <AddRepaymentModal
                    targetDebt={displayDebts.find(d => d.id === activeDebt.id) || activeDebt}
                    formatMoney={formatMoney}
                    showToast={showToast}
                    onClose={() => setShowRepaymentAdd(false)}
                    onSave={handleRepaymentSave}
                />
            )}

            {showDebtDetails && activeDebt && (
                <DebtDetailsModal
                    debt={[...activeDebtsList, ...settledDebtsList].find(d => d.id === activeDebt.id) || activeDebt}
                    formatMoney={formatMoney}
                    onClose={() => setShowDebtDetails(false)}
                    onDeleteRepayment={handleRepaymentDelete}
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
                showToast={showToast}
                label="記帳帳本"
            />

            <BookManager
                isOpen={showDebtBookManager}
                onClose={() => setShowDebtBookManager(false)}
                books={debtBooks}
                onSaveBook={handleDebtBookSave}
                onDeleteBook={handleDebtBookDelete}
                currentBookId={currentDebtBookId}
                setCurrentBookId={setCurrentDebtBookId}
                showToast={showToast}
                label="借貸帳本"
            />

            {showSubscriptionAdd && (
                <AddSubscriptionModal
                    initialData={editingSubscription}
                    categories={categories}
                    books={books}
                    defaultBookId={currentBookId}
                    showToast={showToast}
                    onClose={() => { setShowSubscriptionAdd(false); setEditingSubscription(null); }}
                    onSave={handleSubscriptionSave}
                    onDelete={handleSubscriptionDelete}
                />
            )}

            <ConfirmModal
                isOpen={!!subscriptionToDelete}
                title="刪除訂閱"
                message={`確定要刪除「${subscriptionToDelete?.name}」嗎？已經記錄的帳目不會一起刪除。`}
                onConfirm={() => { handleSubscriptionDelete(subscriptionToDelete.id); setSubscriptionToDelete(null); }}
                onCancel={() => setSubscriptionToDelete(null)}
            />

            {showCalibration && (
                <CalibrationModal
                    shownPrice={goldPrice}
                    calibration={calibration}
                    formatMoney={formatMoney}
                    showToast={showToast}
                    onClose={() => setShowCalibration(false)}
                    onSave={(factor, reference) => {
                        saveCalibration(factor, reference);
                        setShowCalibration(false);
                        showToast('已校準，重新取得金價中…');
                        // 用新的倍率重新換算一次
                        setTimeout(fetchGoldPrice, 100);
                    }}
                    onReset={() => {
                        resetCalibration();
                        setShowCalibration(false);
                        showToast('已清除校準');
                        setTimeout(fetchGoldPrice, 100);
                    }}
                />
            )}

            {showIOSPrompt && <InstallPrompt platform="ios" onClose={() => setShowIOSPrompt(false)} />}
            {showAndroidPrompt && <InstallPrompt platform="android" onClose={() => setShowAndroidPrompt(false)} />}

            <ConfirmModal
                isOpen={!!expenseToDelete}
                title="刪除記帳紀錄"
                message="確定要刪除這筆紀錄嗎？此動作無法復原。"
                onConfirm={() => { handleExpenseDelete(expenseToDelete.id); setExpenseToDelete(null); }}
                onCancel={() => setExpenseToDelete(null)}
            />

            <ConfirmModal
                isOpen={!!goldToDelete}
                title="刪除黃金紀錄"
                message="確定要刪除這筆黃金紀錄嗎？此動作無法復原。"
                onConfirm={() => { handleGoldDelete(goldToDelete.id); setGoldToDelete(null); }}
                onCancel={() => setGoldToDelete(null)}
            />

            <ConfirmModal
                isOpen={!!debtToDelete}
                title="刪除借款紀錄"
                message={`確定要刪除「${debtToDelete?.person}」這筆借款嗎？裡面的還款明細也會一併刪除。`}
                onConfirm={() => { handleDebtDelete(debtToDelete.id); setDebtToDelete(null); }}
                onCancel={() => setDebtToDelete(null)}
            />
        </div>
    );
}
