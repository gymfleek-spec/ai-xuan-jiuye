# 玄與九爺 v0.18.0｜九爺判詞與早鳥登記

[公開預覽](https://xuan-jiuye-preview.pages.dev/)｜整合分支 `feat/v0.18-growth-validation`，以 v0.17.2 的 `0e9cf58` 為基準。

```sh
cd project
npm run build && npm test
python3 -m http.server 4187 --bind 127.0.0.1 --directory public-preview
```

Node.js 24+、原生 ES Modules、固定 iztro 2.6.5，毋須安裝 npm 依賴。**唯一發布目錄是 `project/public-preview/`**，只部署本次建置的檔案。根目錄舊 `public-preview/` 已退出工作樹，仍可從 Git 歷史還原；歷史 ZIP 不是發布來源。

- `scroll/shareCard.mjs`／`share-art.mjs`：只在入室原選的一題合成 720×1280 判詞卡；同一副本命盤的五行局及本宮／借星、定稿判詞、選填署名及固定首頁 QR。只預填可刪改的化名；不讀出生資料、不外傳。可下載、長按高清圖或複製金句，不自動發帖。
- `scroll/waitlist.mjs`：HK$88／HK$148 方案及早鳥視窗，不收款；未配置收集端點時只在頁內核對電郵格式，不送出、不作登記。非聯絡同意、危險、投資／彩票等分流同時停用判詞卡、推介及登記。
- `scroll/analytics.mjs`：九個動作只輸出白名單欄位；預設只在本頁觸發，不儲存、不傳出去。詳見[工程說明](project/README.md)。下載及長按事件代表操作意圖，不能判定相簿已儲存。

舊版對照：[v0.17.1 三盤](docs/CAPTIONS-v0.17.1.md)｜[v0.17.0 交付留檔](DELIVERY-v0.17.0.md)。
