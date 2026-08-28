# 我的記帳本 (gold_app)

黃金存摺 + 生活記帳 + 借貸管理的個人財務 PWA。
React 19 + Vite (rolldown) + Firebase (Auth / Firestore)，部署於 Vercel。

## 功能

- **黃金存摺**：買入紀錄、成本均價、即時損益、價格走勢圖（日內 / 歷史）、單位換算（克 / 錢 / 兩）
- **生活記帳**：多帳本、自訂分類、日曆檢視、月度統計與圓餅圖、長按拖曳排序
- **借貸還款**：多帳本、分期還款紀錄、未結清 / 已結清分組
- **備份還原**：整份資料匯出 / 匯入 JSON
- **PWA**：可安裝到手機主畫面，離線仍可開啟與記帳

## 本機開發

```bash
npm install
cp .env.example .env      # 填入 Firebase Web API Key
npm run dev
```

其他指令：

```bash
npm run build     # 建置到 dist/
npm run preview   # 預覽建置結果（PWA 的 service worker 只在建置版本啟用）
npm run lint      # ESLint
```

## 環境變數

| 變數 | 用途 |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key |

其餘 Firebase 設定（authDomain、projectId 等）寫在 `src/App.jsx` 的 `defaultConfig`。
若未提供環境變數，App 會顯示設定畫面讓使用者手動輸入 Key 並存在 localStorage。

> Firebase Web API Key 本來就會隨前端程式一起送到瀏覽器，不算機密；
> 真正的存取控制來自 **Firestore 安全規則** 與 Firebase Console 的
> **Authorized domains** 設定，請確認兩者都只允許本人的資料與網域。

## 部署（Vercel）

- 前端：Vite 靜態建置
- `/api/gold`：Vercel Serverless Function，抓取台灣銀行黃金牌價（HTML + CSV），
  並以 Yahoo Finance 的 `GC=F` / `TWD=X` 換算當日盤中走勢；多層備援，
  回應帶 `s-maxage=300, stale-while-revalidate=1800` 由 CDN 快取
- `vercel.json` 將 `/api/*` 之外的路徑改寫到 `index.html`（SPA 路由）

部署前請在 Vercel 專案的 **Settings → Environment Variables** 設定
`VITE_FIREBASE_API_KEY`（建置期需要）。

## 資料結構（Firestore）

```
artifacts/{appId}/users/{uid}/
  gold_transactions/     黃金買入紀錄
  account_books/         記帳帳本
  expense_transactions/  收支紀錄
  expense_categories/    自訂分類
  debt_books/            借貸帳本
  debts/                 借款（含 repayments 陣列）
```

## 圖示

`public/` 下的各尺寸圖示由 `src/assets/gold-source.png` 產生。需要重新產生時：

```bash
npm i -D sharp
node -e "require('sharp')('src/assets/gold-source.png').resize(192,192).toFile('public/icon-192.png')"
npm un sharp
```
