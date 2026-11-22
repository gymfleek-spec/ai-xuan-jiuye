# 玄與九爺 v0.17.2｜四章引子與話題青玉鏡

審閱分支：`feat/v0.17-empathy-teaser`，由 **fc0f769** 的 v0.16.1 source ZIP 恢復後升級。這條分支的 `project/` 已是 **0.17.2 現行源碼**，不再是舊 v0.11.0。

```sh
git clone --single-branch --branch feat/v0.17-empathy-teaser https://github.com/gymfleek-spec/ai-xuan-jiuye.git
cd ai-xuan-jiuye/project
npm run build && npm test
python3 -m http.server 4187 --bind 127.0.0.1 --directory public-preview
```

Node.js 24+，零外部 npm 依賴，Vanilla ES Modules＋固定 iztro 2.6.5。毋須 npm install 或後台。只用虛構生辰試閱。

- [v0.17.1 三盤截圖與圖說](docs/CAPTIONS-v0.17.1.md)

### v0.17.0 上一版留檔

- [上一版改動、驗證及限制](DELIVERY-v0.17.0.md)
- [三盤完整實測摘錄](EXCERPTS-v0.17.0.md)
- [實際83項測試完整輸出](TEST-LOG-v0.17.0.txt)及[驗證範圍](VALIDATION-v0.17.0.json)
- [現行工程說明](project/README.md)
- [完整可重建 source ZIP](xuan-jiuye-v0.17.0-source.zip)，解壓到空目錄後進入 `project/` 執行上述建置。
- [10個安全站檔 public ZIP](xuan-jiuye-v0.17.0-public.zip)，是 v0.17.0 審閱產物。
- [逐檔 SHA-256 清單](backup-v0.17.0.json)

根目錄的舊 public-preview、BACKUP、歷史清單與舊 ZIP 保留歷史用途；不是本版入口。用 `project/public-preview/` 的本次建置輸出作發布。

此版保留 v0.17.1 同理正文及入座首屏，將卷末整合成四章引子及其他四題手風琴。青玉鏡仍按夫妻宮參看的星曜、本命忌與祿選四條問題，事業、愛情、財運各有對應情境。排盤沿用本命四化、大限、三年流年及12季原生查詢；曲線是有完整依據的相對節奏指標，不是已驗證的財富回報或事件準確率。所選一題的前半免費，其餘四題只露出兩句引子，由同一個底部按鈕開啟方案。單題HK$88／全盤HK$148僅顯示方案，付款服務未開通，沒有訂單、扣款、Email或假解鎖。
