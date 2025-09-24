# 快樂國小｜閱讀排行榜（雲端保存＋一鍵刷新）

這是最小可運作的 Vite + React + TypeScript + Tailwind 專案：
- 前端可上傳 Excel 立即出榜（學生／班級／書籍）
- 讀取 Google Apps Script（GAS）後端的 `leaderboards.json`
- 一鍵刷新：請 GAS 直接讀三份 Google 試算表並覆蓋 `leaderboards.json`

## 使用方式

1. 安裝依賴
```bash
npm install
```

2. 開發模式
```bash
npm run dev
```

3. 打包
```bash
npm run build
npm run preview
```

4. 設定後端 URL
- 檔案位置：`src/App.tsx`
- 變數：`BACKEND_URL`（已預填入你的 /exec 連結，可自行更改）

5. 部署後在 Google Sites 嵌入
- 先把打包產生的 `dist/` 發佈成靜態網站（GitHub Pages / Netlify / Vercel）
- 在 Google 協作平台（Sites）**嵌入 → 網址** 貼上你的網站網址即可
- all rights reserved by Su
