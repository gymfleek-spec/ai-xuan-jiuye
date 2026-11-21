# 玄與九爺 v0.16.1｜可重建備份

對應現行已公開的黑金命書版：全盤 HK$148、單題 HK$88，以及年份、月份、緣分等局部模糊顯示。這次只新增備份分支，不改網站、不改原有分支或分享權限。

## 呢一版喺邊

- [原始碼及所需素材、測試（ZIP）](xuan-jiuye-v0.16.1-source.zip)：36 個逐檔原樣備份，解壓後在 `project/`。包含本版建置、現行 `npm test` 所需全部內容與固定 iztro 2.6.5 引擎及授權。
- [原裝發布 ZIP](xuan-jiuye-v0.16.1-public.zip)：10 個已上站檔案，與 v0.16.1 公開版一致。
- [逐檔 SHA-256 清單及備份範圍](backup-v0.16.1.json)：可核對兩個 ZIP、來源檔、發布檔及重建後單檔。

**本分支承接歷史備份，根目錄的舊 `project/`、`public-preview/`、`BACKUP.md`、其他舊 ZIP 及清單仍屬歷史版本，不是 v0.16.1。請用上面指定的兩個 ZIP，並在新空目錄還原，不要疊入舊 `project/`。**

## 還原及核對

需要 Git、Node.js 24 或以上、npm、Python 3。現行前端毋須安裝 npm 套件或啟動後台。

```sh
git clone --depth 1 --single-branch --branch baseline-v0.16.1 https://github.com/gymfleek-spec/ai-xuan-jiuye.git backup-v0.16.1
mkdir restored-v0.16.1
cd restored-v0.16.1
unzip ../backup-v0.16.1/xuan-jiuye-v0.16.1-source.zip
cd project
npm run build
npm test
python3 -m http.server 4186 --bind 127.0.0.1 --directory public-preview
```

在瀏覽器開 http://127.0.0.1:4186/，用化名及虛構例盤。入口是重建後的 `public-preview/index.html`；也可開重建後的單檔 `玄與九爺-港島夜話.html`。完成後用 Ctrl+C 停止本機預覽。

`玄與九爺-網頁初稿.html` 是既有兩項排盤測試讀取的歷史檔，為保持原測試不變而保留；不是現版入口。未備份無關舊媒體、研究檔、客戶／帳戶資料、運行資料庫、登入憑證、.env、快取或日誌。這是現行網站的可重建來源備份，不是整部電腦或歷史後台資料備份。

## 本版界線

- 保留同盤五題、十二宮、免費五章、出生驗證、返回清除及既有角色／動畫。
- 解鎖按鈕只顯示方案及價格，明示付款服務暫未開通；未有真收款、訂單、Email、帳戶保存或完整付費權限。
- 本版交付已有局部獨立覆核及公開實走；備份還原另以此固定提交實測，不把歷史測試當本次還原結果。
- 真機、Safari／WhatsApp、讀屏、弱網及原生選單箭頭操作仍未全面確證；備份不代表這些產品限制已解決。
