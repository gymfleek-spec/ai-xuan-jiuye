# 玄與九爺 v0.9.0｜愛情篇還原點

這份備份保留愛情、事業六格，以及已移除「借個故事整理選擇」的首頁。只用虛構資料，沒有用戶紀錄或部署憑證。備份本身不會部署網站。

- [可重建的專案](project/)：[版本及逐檔清單](project/release-manifest.json)，連清單共 142 個檔。
- [這一版的 17 個站檔](project/public-preview/)；[原裝發布 ZIP](xuan-jiuye-v0.9.0-public.zip) 解壓後就是這 17 個檔。不必啟動後台。
- 根目錄的 `public-preview/`、`BACKUP.md`、`MIGRATION.md` 及舊版清單屬歷史版本，不能用作 v0.9.0 的發布檔。

## 本機還原

使用 Git、Node.js 24、npm 和 Python 3。前端不用安裝套件。

```sh
git clone --depth 1 --single-branch --branch baseline-v0.9.0 https://github.com/gymfleek-spec/ai-xuan-jiuye.git
cd ai-xuan-jiuye/project
npm run build
npm test
python3 -m http.server 4186 --bind 127.0.0.1 --directory public-preview
```

在瀏覽器開 `http://127.0.0.1:4186/`，入室揀「愛情」或「事業」，用化名和虛構例盤試用。要結束本機預覽，按 Ctrl+C。

**SHA-256 核對值：**
- `project/release-manifest.json`：`2d8bda32adcf47866ef80d2f1181f0fa501f19eb11d0de670841a970cc0f5724`
- `xuan-jiuye-v0.9.0-public.zip`：`6840f5ac28f875113ece2f34e05449949275358c0f70c41e42db769e42ef86f9`
