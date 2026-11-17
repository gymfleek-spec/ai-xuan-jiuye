# 玄與九爺｜私人主版本備份

## 最新快照：v0.6.2 本機候選，2026-11-17

完整可重建來源在 [project/](project/)，還原步驟及限制見 [BACKUP.md](BACKUP.md)，逐檔摘要見 [backup-manifest-v062.json](backup-manifest-v062.json)。

本次包含前後台源碼、資料結構／遷移、固定排盤引擎與內容資料、素材、建置與測試所需檔案。不是只備份公開預覽，也不是部署。

**不包含**真實客戶／帳戶資料、登入憑證、現用資料庫、密鑰、API key、token、.env 或其他私人運行狀態。測試用虛構帳戶常數不是真實登入憑證。還原後需以全新資料目錄建立新金鑰與空白資料庫，舊帳戶／客戶紀錄不會被還原。

舊根目錄 [public-preview/](public-preview/) 及 [backup-manifest.json](backup-manifest.json) 保留為 v0.3.1 預覽備份；最新版本請使用 project/，不要混用。舊 Git 歷史保留。

現行候選原 README／已知限制均在 project/README.md；完整流暢度、真機及正式帳戶保存未獲驗收。此次沒有發布或改動線上網站。
