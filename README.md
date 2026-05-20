# 命定內容引擎 Eightlatter

八字 x AI x 短影音定位 MVP。使用者輸入出生資料、現在工作、喜好與一天花最多時間的事情後，系統會產生八字四柱、能力分佈、AI 時代職涯方向、短影音腳本、成就紀錄、影片牆與 AI 影片評分原型。

## 功能

- 註冊資料：名字、性別、電話、密碼、出生年月日、出生時刻、出生地、工作、喜好、每日重心。
- 八字四柱：目前為節氣近似版，可核對一般日期；正式版需接天文節氣與真太陽時。
- 定位首頁：職涯方向、能力分佈、今日內容角度。
- 腳本主題：三個短影音主題，每個含 30 到 40 秒逐字稿。
- 成就紀錄：發布影片數、互動數、收到的鼓勵與稱讚。
- 影片牆：今日影片卡片、按讚、愛心、鼓勵留言。
- AI 評分：90 秒內影片評分原型，分數從 60 起跳。

## 啟動

```powershell
npm run dev
```

預設網址：

```text
http://localhost:3000
```

健康檢查：

```text
http://localhost:3000/health
```

前端 Supabase 設定檢查：

```text
http://localhost:3000/app-config
```

## Supabase

本專案 Supabase 命名規則：所有資料表與欄位使用 `eightlatter_` 前綴，避免和其他程序撞名。

先到 Supabase SQL Editor 執行：

```text
supabase/schema.sql
```

再建立 Storage bucket：

```text
creator-videos
```

環境變數：

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=creator-videos
```

`SUPABASE_SERVICE_ROLE_KEY` 只能放後端環境，不能放進前端。

## 部署

建議：

- GitHub：版本管理。
- Vercel 或 Cloudflare Pages：前端 / Node 靜態服務部署。
- Supabase：Auth、Postgres、Storage。

更多部署步驟見 [GITHUB_SUPABASE_DEPLOY.md](./GITHUB_SUPABASE_DEPLOY.md)。
