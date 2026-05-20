# GitHub + Supabase 部署筆記

## 架構

- GitHub：版本管理與部署來源。
- Vercel 或 Cloudflare Pages：前端部署。GitHub push 後自動部署。
- Supabase：Auth、Postgres、Storage、RLS 權限。
- Supabase 命名規則：所有本專案資料表與欄位都使用 `eightlatter_` 前綴，避免誤打到其他程序的資料。

> PostgreSQL 不建議未引用識別字用數字開頭；若使用 literal `8latter_`，SQL 需要到處加雙引號。為了後續 JS / Supabase SDK 操作穩定，本專案先採用 `eightlatter_`。

## 1. GitHub

1. 在 GitHub 建立新 repository。
2. 本機專案連上遠端：

```powershell
git remote add origin https://github.com/你的帳號/你的repo.git
git branch -M main
git push -u origin main
```

如果專案已有 remote，改用：

```powershell
git remote -v
git remote set-url origin https://github.com/你的帳號/你的repo.git
```

## 2. Supabase

1. 到 Supabase 建立新 project。
2. 到 SQL Editor，貼上並執行：

```text
supabase/schema.sql
```

3. 到 Storage 建立 bucket：

```text
creator-videos
```

4. 到 Project Settings > API 複製：

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=creator-videos
```

注意：`SERVICE_ROLE_KEY` 只能放在 server-side 環境變數，不能放進瀏覽器前端。

## 3. 建議資料流

註冊：
- Supabase Auth 建立帳號。
- `eightlatter_profiles` 儲存名字、性別、電話、出生資料、工作、喜好、每日重心。
- `eightlatter_bazi_charts` 儲存四柱、日主、能力分佈。

影片牆：
- 影片上傳到 Supabase Storage。
- `eightlatter_videos` 儲存影片 metadata。
- `eightlatter_video_reactions` 儲存按讚與愛心。
- `eightlatter_video_comments` 儲存鼓勵留言。

成就紀錄：
- 發布影片數：查 `eightlatter_videos`。
- 幫別人按讚 / 愛心：查 `eightlatter_video_reactions`。
- 送出鼓勵留言：查 `eightlatter_video_comments`。
- 收到鼓勵與稱讚：查自己影片底下的 `eightlatter_video_comments`。
- 徽章：寫入 `eightlatter_achievements`。

AI 評分：
- 上傳影片後產生轉文字與畫面摘要。
- AI 依個人定位、開頭 3 秒、節奏、CTA、字幕可讀性評分。
- 分數與建議回寫 `eightlatter_videos.eightlatter_ai_score`、`eightlatter_videos.eightlatter_ai_grade`、`eightlatter_videos.eightlatter_ai_strengths`、`eightlatter_videos.eightlatter_ai_improvements`。

## 4. 最小可上線版本

第一版先做：
- Supabase Auth 電話或 email 登入。
- `eightlatter_profiles` 儲存註冊資料。
- `eightlatter_videos`、`eightlatter_video_comments`、`eightlatter_video_reactions` 接上真資料。
- 影片上傳到 `creator-videos` bucket。

第二版再做：
- 真太陽時與節氣精算。
- AI 影片轉文字與評分。
- 留言審核、檢舉、封鎖。
- 推播通知。
