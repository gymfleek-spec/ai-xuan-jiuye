# 玄與九爺 · v0.6.12 還原點

這是 [玄與九爺公開站](https://xuan-jiuye-preview.pages.dev/) 的軟件及必要素材備份。可重建的是 [project/](project/)，可直接在本機預覽的是 [project/public-preview/](project/public-preview/)。此分支 `baseline-v0.6.12` 保留作還原點；下一階段另開分支，不覆寫基線。

這一版按「開始」後會一口氣播到玄收扇，片中沒有 ×、略過或暫停掣。到枱前可揀事業、愛情、家庭、財運、未來方向。只用虛構出生資料，不登入、不儲存。

## 由零還原

需要 Git、Node.js（此版用 24 測試）、npm 及 Python 3；前端不用安裝 npm 套件。

```sh
git clone --branch baseline-v0.6.12 --single-branch https://github.com/gymfleek-spec/ai-xuan-jiuye.git
cd ai-xuan-jiuye/project
npm run build
npm test
python3 -m http.server 4186 --bind 127.0.0.1 --directory public-preview
```

瀏覽器開 `http://127.0.0.1:4186/`。這只在本機預覽，不會部署。要比對原件，用 [release-manifest.json](project/release-manifest.json) 的 SHA-256 逐檔核對；清單本身的 SHA-256 是 `bc676ed698a68918368ccf1a972d8b122660c6dbaa3b50e45c56ba47c2a8682b`。軟件目錄共有 141 個清單項目，加清單本身共 142 個檔案；當中 17 個是公開站實際使用的檔案。

## 哪些不會還原

不包含真實客戶／帳戶紀錄、線上資料庫、私鑰、權杖、登入狀態或部署憑證。`project/customer/` 是過往本機原型的源碼，不是公開站服務；如需測試，只用全新的臨時資料目錄。不要把開發機的整個資料夾上傳。

根目錄的 `public-preview/`、[BACKUP.md](BACKUP.md) 與舊版清單是歷史備份，不是今版上站來源。舊歷史與 `main` 獲保留。
