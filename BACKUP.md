# v0.6.2 備份／還原

## 身份與範圍

- 私人倉庫 simsoncheng0502-stack/ai-xuan-jiuye；以正常新提交接續原歷史，沒有 force-push。
- project/ 是當時已收口的 v0.6.2 candidate_revision1；117 個檔案與原 release-manifest.json 一致。該 manifest SHA-256：1b770419253d71c67e595181bfc73995c71a4b55f1fed033ca5d8d35ccb92b72。
- 包含 customer/ 後台及 migration、固定 iztro 引擎及授權、前端／原素材／內容資料、所有建置輸入與 Node／Django 測試。evidence/ 是原建置需要的歷史虛構測試證據，不是本次或新版產品驗收。
- 不含現用 DB、帳戶／客戶紀錄、session／cookie、簽章密鑰、.env、API key、token、真實密碼；未讀或匯出外部私人資料。故能還原程式與非私人資料，不能還原舊用戶帳戶或歷史回答。
- 未整合的首段生成／分鏡不在本主版；未遞迴備份 Shared 或其他專案。
- project/README.md 保留作者當時授權與驗收聲明；此新備份授權不構成發布、正式保存服務或新增產品功能批准。

## 核對來源

在倉庫根目錄執行（Python 3）：

```python
import hashlib, json
from pathlib import Path
r = Path("project")
m = json.loads(Path("backup-manifest-v062.json").read_text())
assert hashlib.sha256((r / "release-manifest.json").read_bytes()).hexdigest() == m["source_manifest_sha256"]
for name, item in m["files"].items():
    assert hashlib.sha256((r / name).read_bytes()).hexdigest() == item["sha256"], name
assert len(m["files"]) == 117
print("117 backup files verified")
```

## 前端／原始包還原

需現有 Node.js 及 Python 3；Node 無外部套件，不用 npm install。

```sh
cd project
npm test
npm run build
npm test
python3 -m http.server 4186 --bind 127.0.0.1 --directory public-preview
```

只在本機開啟 http://127.0.0.1:4186/。build 會重建全內嵌 HTML、純前端目錄、manifest 及原始 ZIP；原 ZIP 未重複存入 Git。此步不發布到互聯網。

## 後台源碼還原／測試

原後台仍是未正式放行的本機測試原型，F01 舊答案覆寫及 F02 刪除重建等已知風險保留，不用真人資料。另開終端、在 project/ 下執行；以下建立全新、與原運行資料隔離的目錄：

```sh
python3 -m venv ../.venv
../.venv/bin/python -m pip install -r requirements.txt
export XUAN_DATA_DIR="$(mktemp -d "${TMPDIR:-/tmp}/xuan-restore.XXXXXX")"
../.venv/bin/python manage.py test customer --verbosity 2
../.venv/bin/python manage.py migrate --noinput
../.venv/bin/python manage.py check
../.venv/bin/python manage.py runserver 127.0.0.1:4188 --noreload
```

settings.py 只在新 XUAN_DATA_DIR 內自動產生新簽章密鑰。mktemp 目錄是測試用途，重開終端不保留設定；不會取回舊帳戶。不要把既有私人 DB、secret 或 .env 加入 Git。後台不可直接用於正式或外網服務。

## 驗證邊界

本次只做備份可重建及離線隔離測試，不重跑整個瀏覽器／真機產品驗收，不修正產品、不更新公開站。GitHub 邀請狀態以平台回讀為準；邀請寄出不等於對方已接受。
