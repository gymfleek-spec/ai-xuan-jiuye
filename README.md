# 玄與九爺 v0.18.0｜九爺判詞與早鳥通知

[公開預覽](https://xuan-jiuye-preview.pages.dev/)｜今次整合分支 `feat/v0.18-growth-share`，基準 v0.17.2（`0e9cf58`）。

```sh
cd project
npm run build && npm test
python3 -m http.server 4187 --bind 127.0.0.1 --directory public-preview
```

Node.js 24+、原生 ES Modules、固定 iztro 2.6.5，毋須安裝 npm 依賴。**唯一發布目錄是 `project/public-preview/`**。根目錄舊 `public-preview/` 已從工作樹退役，仍可在 Git 歷史還原；歷史 ZIP 不是發布來源。

- 原選題可本機合成 720×1280 判詞卡；包含盤面格局、金句及指向茶室首頁的 QR。稱呼可留空或選預設稱呼；不讀入排盤化名、生辰、時辰或性別，也不自動發帖。
- 早鳥窗顯示 HK$88／HK$148 方案。未接收集服務時，電郵只經本人按掣後暫存目前分頁，沒有送出、留位、通知或收款。
- 9 個匿名事件只留當頁記憶體，沒有外傳。遇安全、不聯絡、投資、彩票或醫療分流時，照常停止推介，不顯示判詞卡或早鳥入口。

390×844 瀏覽器截圖：[判詞卡](docs/screenshots-v0.18.0/01-share-card.png)｜[早鳥窗](docs/screenshots-v0.18.0/02-waitlist.png)｜[工程說明](project/README.md)
