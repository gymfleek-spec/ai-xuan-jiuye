# 玄與九爺 v0.11.0｜五篇手記還原點
呢份備份對應已公開嘅事業、愛情、家庭、財運同未來方向五篇手記。只用虛構資料，唔需要登入或啟動後台。建立備份唔會重新部署網站。

- [可重建專案](project/)同[逐檔清單](project/release-manifest.json)：連清單共 142 檔。
- [呢一版嘅 17 個站檔](project/public-preview/)；[原裝發布 ZIP](xuan-jiuye-v0.11.0-public.zip) 解壓後就係呢 17 檔。
- 根目錄嘅 public-preview/、BACKUP.md、MIGRATION.md 同其他版本嘅檔案屬歷史記錄，唔係呢次交付。

## 本機還原
需要 Git、Node.js 24、npm、Python 3。前端毋須另裝套件。

```sh
git clone --depth 1 --single-branch --branch baseline-v0.11.0 https://github.com/gymfleek-spec/ai-xuan-jiuye.git
cd ai-xuan-jiuye/project
npm run build
npm test
python3 -m http.server 4186 --bind 127.0.0.1 --directory public-preview
```

喺瀏覽器開 http://127.0.0.1:4186/，用化名同「代入虛構例盤」試其中一篇。用完按 Ctrl+C 結束本機預覽。唔需要真實生辰。

SHA-256：
- project/release-manifest.json：`c0dc883e76057a29f03b5da168af29207bbd98203523f3781e645de6f518f9e6`
- xuan-jiuye-v0.11.0-public.zip：`d8f649e46b1af3486e881f2625b49a1e5e21d2d7f9b12d19d2849ba68c72d0e9`
