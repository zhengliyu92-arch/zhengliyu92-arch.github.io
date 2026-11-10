# GitHub 個人網站與 AI 客服助理 (GitHub Pages + OpenRouter + GAS)

這是一個專為開發者設計的現代化 GitHub Pages 個人作品集網站，內建一個由 **OpenRouter API**（如 Claude 3.5 / Haiku 5.5）驅動的 **AI 個人專屬客服助理**。

後端採用 **Google Apps Script (GAS)** 作為無伺服器中繼代理，確保您的 OpenRouter API Key 永遠不會暴露給前端訪客！

---

## 🌟 核心特色

1. **現代化玻璃擬態風格（Glassmorphic Dark Mode）**：
   - 包含簡介（Hero）、關於我（About）、核心技術棧（Skills）、精選作品（Projects）、職涯歷程（Timeline）及聯絡方式（Contact）。
   - 純原生 HTML5 + CSS3 + Vanilla JavaScript，無任何龐大構建工具依賴，秒開且易於客製。

2. **懸浮 AI 客服小助手（Floating Chatbot Widget）**：
   - 支援多輪對話上下文（Multi-turn Conversation）。
   - 支援 OpenRouter **`reasoning: {"enabled": true}`** 推理歷程展示（可展開檢視 AI 的思考步驟）。
   - 具備快速問答標籤（Quick Question Chips）與打字動畫。
   - 內建模擬示範模式（在未綁定 GAS 前亦可直接於本地預覽互動）。

3. **零主機成本 & 金鑰絕對安全**：
   - 靜態網站託管於 **GitHub Pages**（免費、自動 SSL）。
   - 後端 API 託管於 **Google Apps Script**（免費配額充足、隱藏 API Key、免架設伺服器）。

---

## 📁 檔案結構

```text
github-portfolio/
├── index.html                  # 個人網站結構與 AI 客服元件
├── style.css                   # 現代暗黑主題樣式、動畫與客服浮動視窗
├── script.js                   # 前端對話連線與 OpenRouter 歷史管理
├── google-apps-script/
│   └── Code.gs                 # Google Apps Script 後端中繼代理程式碼
└── README.md                   # 完整設定與部署教學
```

---

## 🚀 快速上手教學

### 步驟 1：設定 Google Apps Script (GAS) 後端

1. 開啟 [Google Apps Script 官網](https://script.google.com/) 並登入 Google 帳號。
2. 點擊左上角的 **「新增專案 (New Project)」**。
3. 清空編輯器預設內容，將 `google-apps-script/Code.gs` 的完整程式碼複製並貼入編輯器中。
4. **設定 OpenRouter 金鑰（重要）**：
   - 點擊左側導覽列的 **「專案設定 (齒輪圖示)」**。
   - 向下捲動至 **「指令碼屬性 (Script Properties)」**，點選 **「新增指令碼屬性」**。
   - 屬性名稱輸入：`OPENROUTER_API_KEY`
   - 屬性值輸入：您的 OpenRouter API Key（例如 `sk-or-v1-xxxxxx...`）。
   - 點擊 **「儲存指令碼屬性」**。
5. **部署為網頁應用程式**：
   - 點擊右上角藍色按鈕 **「部署 (Deploy)」** > **「新增部署 (New deployment)」**。
   - 左側齒輪點選 **「網頁應用程式 (Web app)」**。
   - 執行身分：選擇 **「我 (Me)」**。
   - **誰可以存取：務必選擇「任何人 (Anyone)」**（這樣訪客不需要登入 Google 帳號就能呼叫客服）。
   - 點擊 **「部署 (Deploy)」**，並依指示完成授權。
6. 複製彈跳視窗中的 **「網頁應用程式網址 (Web app URL)」**（網址結尾為 `/exec`）。

---

### 步驟 2：將後端網址綁定到前端網頁

1. 打開 `script.js` 檔案。
2. 找到最上方的 `GAS_API_URL`：
   ```javascript
   const GAS_API_URL = "https://script.google.com/macros/s/AKfycbx.../exec";
   ```
3. 將步驟 1 取得的網址貼上並儲存。

> 💡 **客製化個人資訊**：
> - 您可以在 `index.html` 中將姓名、專案與經歷修改為您的個人資料。
> - 同時，請在 Google Apps Script 的 `Code.gs` 中更新 `PERSONAL_SYSTEM_PROMPT`，AI 小客服就會根據您的最新資料回答訪客囉！

---

### 步驟 3：部署至 GitHub Pages

1. 在 GitHub 上建立一個新的公開儲存庫（Repository），例如命名為：
   - `your-username.github.io`（個人主網址，推薦）或
   - `portfolio`（專案子網址）
2. 將本專案的所有檔案（`index.html`、`style.css`、`script.js` 等）上傳或推送至該 Repository 的 `main` 分支。
3. 進入 GitHub 儲存庫頁面，點擊上方標籤頁 **Settings**。
4. 在左側選單點選 **Pages**。
5. 在 **Build and deployment** > **Branch** 下拉選單中：
   - 選擇分支：`main`
   - 選擇資料夾：`/(root)`
   - 點擊 **Save**。
6. 等候約 1 至 2 分鐘，重新整理頁面即可看到網址（例如 `https://<your-username>.github.io`），您的個人網站與 AI 客服就正式上線囉！🎉
