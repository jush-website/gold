import React, { useState } from 'react';
import { Coins, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '../ui/primitives.jsx';

export default function LoginView({ onSignIn, onRedirectSignIn, onResetKey, showResetKey }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const run = async (fn) => {
        setLoading(true); setError('');
        try {
            await fn();
        } catch (e) {
            setError(e?.code === 'auth/popup-blocked'
                ? '瀏覽器擋下了登入視窗，請改用下方的重新導向登入。'
                : e?.message || '登入失敗，請稍後再試。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] bg-ground grain relative flex flex-col items-center justify-center px-6">
            {/* 頂端一圈金色光暈，呼應金庫的主題 */}
            <div
                className="absolute inset-x-0 top-0 h-80 pointer-events-none"
                style={{ background: 'radial-gradient(80% 100% at 50% 0%, rgb(var(--c-gold) / 0.14) 0%, transparent 70%)' }}
            />

            <div className="relative z-10 w-full max-w-xs text-center animate-rise">
                <span className="w-16 h-16 rounded-3xl bg-gold/12 border border-gold/25 text-gold grid place-items-center mx-auto mb-6 shadow-gold">
                    <Coins size={28} />
                </span>

                <h1 className="figure text-4xl font-semibold text-ink mb-2.5">我的記帳本</h1>
                <p className="text-sm text-ink-3 mb-10 leading-relaxed">
                    黃金存摺 · 生活記帳 · 借貸管理
                </p>

                {error && (
                    <div className="mb-4 px-3.5 py-3 rounded-xl bg-loss/10 border border-loss/25 flex items-start gap-2 text-left">
                        <AlertCircle size={14} className="text-loss shrink-0 mt-0.5" />
                        <p className="text-[11px] text-loss leading-relaxed">{error}</p>
                    </div>
                )}

                <Button size="lg" className="w-full" loading={loading} onClick={() => run(onSignIn)}>
                    {loading ? '登入中…' : '使用 Google 登入'}
                </Button>

                <button
                    onClick={() => run(onRedirectSignIn)}
                    className="mt-4 text-[11px] text-ink-3 hover:text-ink-2 underline underline-offset-4 transition-colors"
                >
                    登入沒反應？改用重新導向登入
                </button>

                <p className="mt-12 flex items-center justify-center gap-1.5 text-[11px] text-ink-3">
                    <ShieldCheck size={12} /> Google 安全驗證 · 資料加密儲存
                </p>

                {showResetKey && (
                    <button onClick={onResetKey}
                        className="mt-4 text-[10px] text-ink-3/60 hover:text-ink-3 underline underline-offset-4">
                        重設 API Key
                    </button>
                )}
            </div>
        </div>
    );
}

export const AppLoading = () => (
    <div className="min-h-[100dvh] bg-ground grid place-items-center">
        <span className="flex flex-col items-center gap-4">
            <Loader2 size={26} className="animate-spin text-gold" />
            <span className="text-xs text-ink-3">載入中…</span>
        </span>
    </div>
);
