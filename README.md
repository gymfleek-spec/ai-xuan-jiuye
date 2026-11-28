# 玄與九爺 v0.18.6｜線上版源碼備份

[公開預覽](https://xuan-jiuye-preview.pages.dev/)｜本備份包括完整入座插畫同命書過渡、焦點框修正，以及移除結果頁右上話題選單。

```sh
cd project
npm run build && npm test
python3 -m http.server 4187 --bind 127.0.0.1 --directory public-preview
```

Node.js 24+、原生 ES Modules、固定 iztro 2.6.5，毋須安裝 npm 依賴。**唯一發布目錄是 `project/public-preview/`**。根目錄舊 `public-preview/` 已從工作樹退役，仍可在 Git 歷史還原；歷史 ZIP 不是發布來源。

- 原選題可本機合成 720×1280 判詞卡；包含盤面格局、金句及指向茶室首頁的 QR。稱呼可留空或選預設稱呼；不讀入排盤化名、生辰、時辰或性別，也不自動發帖。
- 早鳥窗顯示 HK$88／HK$148 方案。目前未有登記服務，表單停用，不收電郵、不留位、不收款。啟用後只以實際收錄回應為準。
- 9 個匿名事件鉤子不帶名稱、生辰、問題或電郵；目前沒有外傳。遇安全、不聯絡、投資、彩票或醫療分流時，照常停止推介，不顯示判詞卡或早鳥入口。

- 開卷約 1.2 秒；有減少動態偏好時直接打開命盤。依出生地鐘錶時間排盤，未校正真太陽時。

[實際導出判詞 PNG](docs/screenshots-v0.18.0/01-share-card-9x16.png)｜390×844 瀏覽器截圖：[分享區](docs/screenshots-v0.18.0/02-mobile-share-section.png)・[早鳥窗](docs/screenshots-v0.18.0/03-mobile-waitlist-modal.png)｜[工程說明](project/README.md)
