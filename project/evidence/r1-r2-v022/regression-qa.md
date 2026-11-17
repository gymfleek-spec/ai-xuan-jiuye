# AI玄學 v0.2.2｜R1／R2 本機修復與回歸

2026-11-16（香港）。沿唯一來源原地修正；這是製作者自測，不是吖強2.0的獨立複驗。

**本機修復及已測回歸 PASS；新 hash 獨立複驗 PENDING；真機及公開驗收 NOT RUN。**

## 唯一路徑與基準

- 唯一來源：/Users/simsonpersonal/OpenBot/Shared/AI玄學/web-draft-qiang-20261116/。
- 原版 v0.2.1 manifest：`83ae3b1693a43d6d18bc93874dae9901600837e730f159b2f937100d833d04fe`。
- 開工前32個追蹤檔全與2.0的 identity-before.json 相同；已讀其實走報告、runtime-results、identity-before／after。沒有回滾、另開產品版本或修改2.0報告。
- 原版已親自重現：1440×900正常動態，返回對白使入場事件3→6；可信批次輸入五位年份，原生maxlength只留四位，表單及核對頁接受了截短值。見 `baseline-runtime.json`。
- 新版本 metadata、package、CSS／JS／content資源查詢均為0.2.2。新manifest、HTML、ZIP摘要以根目錄 `delivery-sha256.txt` 為準。
- 本輪實走四檔集合 SHA-256：`20ec8786eec01be8a162be31a55041fd48c2c7f905ec1655bbabd929b3411ed1`。算法為排序相對檔名、TAB、檔案hash、LF，再取SHA-256。
- 既有本機預覽仍為 http://127.0.0.1:4186/，PID62854；沒有新起、停止或更改服務。這不是公開網址。

## 根因、影響範圍與最小修復

### R1：返回重播

`openOffice`加上的office-entering原先只在resetVisit清除。showBirth把phase改為questions，但回showWelcome會再次匹配CSS動畫，重播推近與門片。

在共用paint切去非welcome畫面時清除office-entering，消耗當次入場轉場。涵蓋逐句走完、跳過開場、生日返回、修改資料、直接故事及其餘paint呼叫；close／reset後真正新入場仍由openOffice加入狀態。沒有增加計時器、動畫事件監聽、額外旗標或改CSS。

### R2：截字後校驗

原maxlength在input事件及getBirthDateError之前截斷，validator看不到五位字串。年、月、日三欄共用同樣做法，月／日亦可能靜默截成另一合法值。

移除三欄maxlength；完整輸入仍經既有input→記憶體→submit→getBirthDateError，保留原字串及原錯誤／aria-invalid／焦點處理。在既有年／月／日校驗加入最多4／2／2位條件，包含前置零超長字串，合法0001年及一、兩位月日仍可用。沒有改錯誤文案、年齡門檻、故事或資料用途。

### 相關呼叫、測試及交付

- app.js：paint、showWelcome／showBirth及其既有返回／跳過／reset呼叫；其他畫面共用paint。
- content.js：getBirthDateError由出生日期submit及test.mjs呼叫；無外部API呼叫者。
- test.mjs：保留原21項，新增實際執行paint的狀態回歸，以及完整日期輸入／長度校驗。新增兩測在原版先FAIL，修後PASS，見red-tests.txt與當前test-results.txt。
- index.html、package.json、app.js只同步0.2.2版本查詢；build.mjs把本輪證據併入原交付，不建立另一套來源。
- 來源比較確認：STORIES起至檔尾、WELCOME／GOALS、產品文字模板、styles.css及所有圖片均未改。差異見product.patch。

## 本輪親自實走

用本輪新開的OpenBot私有Chromium156分頁，不接管同代理其他執行緒的分頁。操作使用可信點擊、文字及鍵盤；evaluate只讀DOM／焦點／動畫／資源／儲存和加被動觀察器，不替換產品函式或狀態。全部為虛構測試值；是文字批次輸入，不冒稱OS剪貼簿貼上。

| 範圍 | 結果及界線 |
|---|---|
| R1桌面1440×900正常 | 首次office-in／door-left／door-right共3個；生日返回仍3個，class已消耗，三者animationName均none。關閉後新入場累計6個，即每次新visit可再播一次。 |
| R1手機390×844正常 | 入場→跳過→生日→返回對白，仍3個，動畫皆none；跳過前讀取的樣本約289ms，不當成精確點擊時間。 |
| R1窄屏320×667減少動態 | 迎接→生日→返回，動畫事件0、running0、內容opacity1。 |
| R2桌面／手機 | 1440正常、390正常及減少動態、320×420減少動態，五位年完整留在欄內，拒絕續行，aria-invalid=true，焦點回year；沒有核對截短值。 |
| 年份及日期UI | 16個case全部PASS：五位年、五位前置零、三位月／日、1900非閏／2000閏、0001、缺年、非數字、零年／月／日、13月、4月31日、今日與翌日。錯誤有正確欄位／焦點；合法0001核對及修改回填吻合。 |
| 三故事六分支 | 來源1440正常、來源320×667減少動態、便攜HTML390正常，六路各跑到反思。結局／反思／行動與來源逐字比較，無水平溢出，行動正文16px。是同六路跑三個環境，不是18個故事。便攜另逐句比較開場及角色結局說話。 |
| 可跳過／返回／修改 | 跳生日後回編輯為全空；修改保留有效輸入；返回對白不丟當次輸入；返回主題／目標保留選取。直接免資料入口、完整生日入口接故事均可操作。 |
| 清除及重入 | Escape即清DOM；重開全空；5輪開／關後再驗空值；填寫後真正reload再重入全空。自己的分頁最後dialog已關、內容已清，分頁已關閉。 |
| 390減少動態鍵盤 | 從已開生日頁開始，年月日Tab次序正確；修正錯誤→核對→love/send→反思→關閉，該段無滑鼠點擊。不是六路全鍵盤或完整入口鍵盤認證。 |
| 手動暫停 | 390正常偏好下手動停動效；迎接、生日、返回迎接、主題、核對、開場、結局、反思8屏，running0／opacity1／無水平溢出。 |
| 偏好切換 | 390生日錯誤頁正常→reduce，完整五位輸入、錯誤及焦點保留，running0；重交仍拒絕。 |
| 320×420短高度 | Tab到年欄top357.24／bottom406.44（高420），輸入16px、高49.20px；錯誤焦點仍可見，返回保留完整輸入，無水平溢出。不是實機軟鍵盤。 |
| 資料保護 | 桌面16case前後Resource Timing7→7、URL／localStorage／sessionStorage／cookie相同；較早核心流程3次submit觀察皆preventDefault、頁面錯誤及CSP事件0。不是封包／完整console／全機安全認證，今輪沒有重列IndexedDB／Cache。 |
| 便攜HTML | 390正常重走R1、R2、0001核對／修改與六路，全部PASS；版本0.2.2、7處圖片data URI、子資源0。以HTTP開，不宣稱file://已測。 |

實際觀察整理見runtime-results.json，來源凍結見tested-source.sha256，HTTP四檔逐位元組與磁碟吻合見http-source-sha256.json。這些是本輪製作者工具回傳的結構化記錄，不是完整錄影或獨立複驗。

測試時曾遇故事選擇器同時匹配首頁卡及dialog；改限#story-content後全六路重跑，沒有更改產品去迎合測試。未保存新截圖；沒有把舊截圖當新版目視證據。產品文字／CSS／圖檔未改，本輪版面判定以幾何和可達性讀回為界。

## 同版交付及後續

- 仍只使用原檔名：玄與九爺-網頁初稿.html、玄與九爺-初稿原始檔.zip。
- 最後build後逐檔驗manifest與磁碟、ZIP成員與磁碟、內嵌CSS／content／app／圖片及版本。tested-source／tested-delivery的瀏覽器測試內容必須與最後交付相同，結果在delivery-check.json（不放進ZIP，避免自我引用）。
- design-qa.md、evidence/office-v2及2.0的v0.2.1報告保持原版本／原結果。舊FAIL沒有改成PASS；新0.2.2在此另附修正自測，交回本群後由原安排按新hash獨立複驗，不自行再派人。
- 沒有公開更新、部署、付款、對外發送、權限變更或重啟其他專案。這次修正沒有公開授權，舊公開版批准不適用新檔。

## NOT RUN／風險及寫入

真手機、OS軟鍵盤／剪貼簿、Safari／Firefox、讀屏器、200%縮放、全站WCAG／對比、file://、慢網絡／記憶體／效能、午夜時區切換、封包／完整console、OS／擴充安全、公開頁及命理／AI後台均未測。新hash獨立複驗仍待原安排；本機自測不能代替產品或公開放行。

寫入僅同一來源的最小產品修復、版本／測試／README／build、原HTML／ZIP／manifest／hash，以及自己的evidence/r1-r2-v022。原preview-server.log因正常GET追加；瀏覽器有普通快取，自己的新分頁已關。無新依賴、無新服務、未改2.0證據。HTML約22MiB、ZIP約27MiB，未作效能改善，沿用既有交付形態。
