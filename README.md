# 我的記帳本 (gold_app)

黃金存摺 + 生活記帳 + 借貸管理的個人財務 PWA。
React 19 + Vite (rolldown) + Firebase (Auth / Firestore)，部署於 Vercel。

## 功能

- **黃金存摺**：買入紀錄、成本均價、即時損益、價格走勢圖（日內 / 歷史）、單位換算（克 / 錢 / 兩）
- **生活記帳**：多帳本、自訂分類、日曆檢視、月度統計與圓餅圖、長按拖曳排序
- **借貸還款**：多帳本、分期還款紀錄、未結清 / 已結清分組
- **訂閱管理**：把不同週期的訂閱換算成每月平均，看得出真實負擔；扣款日可自動記帳
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
npm run build       # 建置到 dist/
npm run preview     # 預覽建置結果（PWA 的 service worker 只在建置版本啟用）
npm run lint        # ESLint
npm test            # 單元測試（vitest）
npm run test:watch  # 測試 watch 模式
npm run check       # lint + test + build，送出前跑這個
```

每次 push 都會由 GitHub Actions 跑同一套 `check`（見 `.github/workflows/ci.yml`）。

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
- `/api/gold`：Vercel Serverless Function，多層備援取得金價，
  回應帶 `s-maxage=300, stale-while-revalidate=1800` 由 CDN 快取
- `vercel.json` 將 `/api/*` 之外的路徑改寫到 `index.html`（SPA 路由）

部署前請在 Vercel 專案的 **Settings → Environment Variables** 設定
`VITE_FIREBASE_API_KEY`（建置期需要）。

## 專案結構

```
lib/               純函式，不依賴 React / Firebase，因此能單獨測試
  format.js          金額、重量、日期格式化
  finance.js         借款結清、黃金持倉計算
  gold-parsers.js    台銀牌價 HTML / CSV 解析、國際金價換算
src/
  App.jsx            狀態、Firestore 存取與各頁面的組合
  ErrorBoundary.jsx  render 例外時的退路，避免整頁白畫面
  ui/                設計系統：primitives、AppShell、主題、圖示
  views/             各分頁（首頁、記帳、黃金、借貸、歷史、日曆…）
  modals/            所有彈出式表單與確認視窗
  preview/           介面預覽用的假資料（不會進入正式建置）
api/gold.js        Vercel Serverless Function：取得金價
tests/             vitest 測試
```

### 介面預覽

App 內頁在 Google 登入之後，開發時要看設計不必真的登入：

```bash
npm run dev
# 開啟 http://localhost:5173/preview.html
# 指定分頁：/preview.html?view=gold
```

預覽用假資料渲染每一頁，只有 `index.html` 會被打包，`preview.html` 不會進入 `dist`。

### 設計語彙

深色為預設，淺色可在設定選單手動切換。所有顏色都走 `src/index.css` 裡的
語意化 CSS 變數（`--c-surface`、`--c-gold`、`--c-gain`…），切換主題只是換掉
變數值，因此程式碼裡不需要任何 `dark:` 變體。

字型自架於 `public/fonts`（拉丁子集約 97KB）：數字與拉丁字用 Instrument Sans，
大金額用襯線的 Fraunces，中文交給系統字型。

測試只涵蓋 `lib/` 的純函式與 `/api/gold` 的行為 —— 這是最容易安靜壞掉的部分
（台銀改版、時區、除以零、金價取不到時的退路）。UI 沒有寫測試是刻意的取捨。

日期一律使用 `getLocalYMD()` 取當地時間，**不要用 `toISOString()`**：
那是 UTC，台灣時間早上 8 點前會得到前一天。

## 訂閱與自動記帳

訂閱的重點是**換算成每月平均**（`lib/subscriptions.js`）。年繳 3,588 其實是每月 299，
季繳 2,400 是每月 800 —— 不換算就沒辦法比較，也看不出哪個訂閱最貴。
清單依月均由大到小排序，想砍訂閱時第一眼就看到目標。

### 自動記帳的重複防護

扣款日到了會自動寫入一筆記帳。這種功能最大的風險是重複寫入
（兩個分頁、中途重整、多台裝置同時開），所以每一期的 document id
是由「訂閱 ID + 扣款日」組成的固定值：

```
sub-{subscriptionId}-{YYYY-MM-DD}
```

寫入用 `setDoc` 而不是 `addDoc`。重跑幾次寫進去的都是同一份文件，
不可能變成兩筆 —— 這比事後檢查有沒有重複可靠得多。

另外兩道防護：

- `autoLogFrom`（訂閱建立日）之前的期數不補記，
  避免把「下次扣款日」填成去年就灌進一整年的帳
- 一次最多補記 `MAX_CATCH_UP`（12）期

月底的日期推進有特別處理：1/31 的下個月是 2/28（閏年 2/29），
不會溢位成 3/3。

## 金價從哪裡來

實測台銀（rate.bot.com.tw）會擋掉 Vercel 的機房 IP：網頁與 CSV 都回 HTTP 200，
但內容是一個 1.8KB 的攔截頁，兩個不同的網址回傳長度一模一樣。改到香港節點
（`vercel.json` 的 `regions`）也一樣。

所以實際運作時，價格來自 **Yahoo Finance 的 `GC=F`（COMEX 黃金期貨）
搭配 `TWD=X` 即時匯率換算**，不是台銀牌價。程式沒有假裝它是：

- 卡片標題依 `priceSource` 顯示「黃金參考價」或「台銀賣出金價」
- 價格下方標示「國際金價換算」
- 「今日」走勢標明是國際金價的形狀，台銀一天只調整幾次牌價

### 校準

國際金價換算值與台銀牌價之間有大致固定的價差（銀行的買賣價差）。
黃金頁的「校準」讓使用者輸入一次台銀當下的「本行賣出／1 公克」，
由程式推算倍率（`lib/calibration.js`），之後套用在現價、歷史與盤中走勢上。

倍率存在 `localStorage`，不進 Firestore —— 它是顯示偏好而非帳務資料。
代價是換裝置要重設一次。

超出 0.8～1.25 的倍率會被拒絕，那多半是打錯字而不是校準。

診斷用：`/api/gold?debug=1` 會附上各階段的失敗原因與當下匯率。

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
