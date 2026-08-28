import React from 'react';

// React 目前只有 class 元件能攔截子樹的 render 錯誤。
// 沒有這層保護的話，任何一個 render 例外都會讓整個畫面變成空白，
// 使用者在手機上連退回上一頁都做不到，只能關掉 App。
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error('畫面發生未預期的錯誤:', error, info?.componentStack);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center p-6">
                <div className="bg-white w-full max-w-sm rounded-3xl shadow-sm border border-gray-100 p-6 text-center">
                    <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    </div>

                    <h1 className="text-lg font-black text-gray-800 mb-2">畫面發生問題</h1>
                    <p className="text-sm text-gray-500 leading-relaxed mb-6">
                        你的資料都好好地存在雲端，沒有遺失。
                        重新載入通常就能恢復。
                    </p>

                    <button
                        onClick={this.handleReload}
                        className="w-full py-3.5 bg-gray-900 text-white rounded-2xl font-bold shadow-lg shadow-gray-900/20 active:scale-95 transition-transform"
                    >
                        重新載入
                    </button>

                    <details className="mt-5 text-left">
                        <summary className="text-[11px] font-bold text-gray-400 cursor-pointer hover:text-gray-600">
                            錯誤細節（回報問題時附上）
                        </summary>
                        <pre className="mt-2 text-[10px] text-gray-500 bg-gray-50 border border-gray-100 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-words">
                            {String(this.state.error?.stack || this.state.error)}
                        </pre>
                    </details>
                </div>
            </div>
        );
    }
}
