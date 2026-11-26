# 玄與九爺 v0.18.0｜路線二商業化候選

現行 [公開預覽站](https://xuan-jiuye-preview.pages.dev/) 是既有免費版；路線二在 `feat/v0.18-commercial-mvp` 完成同版驗收前不得合併 `main`、覆蓋公開站或啟用真收款。

```sh
cd project
npm run build -- --mode=production && npm test
```

前端仍為零外部 npm 依賴、Vanilla ES Modules、固定 iztro 2.6.5。保留免費看盤、720×1280 判詞卡、原有安全分流；只在訪客確認結帳後送出生辰等排盤資料。完整四章只由後端從同盤生成；回站的 `paid=1` 不解鎖，必須有已核實嘅 Stripe 付款通知。免登入命書連結等同存取憑證，不可公開。

唯一站檔輸出為 `project/public-preview/`。根目錄舊 `public-preview/` 已在 Git 歷史封存；勿把歷史 ZIP、私人設定、`functions/` 原始碼或資料庫打包成靜態網站。既有 Pages 的網頁上傳不會編譯 `functions/`，此版必須用 Wrangler。

## Cloudflare 測試及發布

1. 先用 Wrangler 本機測試：在倉庫根目錄執行 `wrangler d1 migrations apply DB --local` 和 `wrangler pages dev project/public-preview`。提交內 `wrangler.toml` 只放本機資料庫佔位值，結帳預設關閉。**唔好將呢份佔位設定部署到遠端。**
2. 用私密設定接駁隔離的測試 D1 及已批准測試收件地址；先核對寄件網域已關閉開信／連結追蹤，唔用追蹤網址包住命書連結。合併前只可部署測試分支。在同一工作目錄用已核對真實綁定及環境的設定執行 `wrangler d1 migrations apply DB --remote --env preview`，再執行 `wrangler pages deploy project/public-preview --project-name xuan-jiuye-preview --branch route2-test`。不要將同一個測試 D1 綁去真正收款環境。
3. 測試域名與 `PUBLIC_BASE_URL` 必須相同。Stripe 測試通知只訂閱 `checkout.session.completed` 指向該域名的 `/api/webhooks/stripe`。同版完成測試卡、回站及重新開啟四章、列印、寄信收件、重複通知、404 與安全基線；不能用替身測試當收款驗收。
4. 全部通過先准合併 `main`，用同一提交部署原公開站；仍以測試模式走一次，沒有真扣款。正式開賣由主理人另作最終確認：核對私隱告知及保存安排、正式 D1／收件設定，並用 Cloudflare 私密變數配置正確的 Stripe live key、同域 live webhook secret，再把 `COMMERCIAL_MODE` 切為 `live`；勿將 live key 傳入測試域名或群組。

### 私密設定

- `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`RESEND_API_KEY`：服務端秘密，只能用 Vault／私密表單或平台秘密綁定。
- `COMMERCIAL_MODE`：`off`、`test` 或 `live`。金鑰類型必須與模式相符。
- `PUBLIC_BASE_URL`：確切公開來源，例如已批准嘅測試分支 HTTPS 網址；無路徑、參數或登入資料。
- `RESEND_FROM`：Resend 已驗證寄件地址。`TEST_ORDER_EMAIL`：已批准的唯一測試收件地址。
- `DB`：D1 綁定。遠端 Wrangler 需已有授權登入，或從私密保管讀 `CLOUDFLARE_API_TOKEN`，不提交任何密鑰。

付款後的命書即使暫停新結帳仍可重開（保留原域名和 D1）。投遞服務無回覆時，已付款訪客仍可由 Stripe 回站閱讀。通知重送以訂單狀態、交易及發信鍵防止再建章或再寄；超出已知安全重試窗的寄件由主理人先查寄送記錄，唔好盲目再寄。
