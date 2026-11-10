/**
 * ==============================================================================
 * GitHub 個人網站 - AI 個人客服後端 (Google Apps Script)
 * 整合 OpenRouter API (以 Claude / Haiku / Gemini 等模型驅動)
 * ==============================================================================
 * 
 * 【設定說明】：
 * 1. 前往 https://script.google.com 建立新專案。
 * 2. 將此程式碼全部貼入 Code.gs 中。
 * 3. 設定金鑰 (推薦方式)：
 *    點擊左側「專案設定 (齒輪圖示)」-> 捲動至「指令碼屬性 (Script Properties)」-> 點「新增指令碼屬性」
 *    屬性名稱：OPENROUTER_API_KEY
 *    屬性值：sk-or-v1-xxxxxxxxxxxxxxxxx (填入您的 OpenRouter 金鑰)
 * 4. 點擊右上角「部署 (Deploy)」->「新增部署 (New deployment)」：
 *    - 種類選擇：「網頁應用程式 (Web app)」
 *    - 執行身分：「我 (Me)」
 *    - 誰可以存取：「任何人 (Anyone)」 (※ 務必選 Anyone，訪客才能免登入呼叫)
 * 5. 複製產生的「網頁應用程式網址 (Web app URL)」(以 /exec 結尾)。
 * 6. 將該網址貼到個人網頁的 script.js 中的 GAS_API_URL 變數即可！
 */

// 若您不想使用「指令碼屬性」，也可直接寫在下方備用變數中（若設定了指令碼屬性則優先讀取屬性）：
const FALLBACK_OPENROUTER_KEY = "YOUR_OPENROUTER_API_KEY_HERE";

// 預設模型：可自由切換如 anthropic/claude-haiku-5.5, anthropic/claude-3.5-sonnet, google/gemini-2.0-flash-001 等
const DEFAULT_MODEL = "anthropic/claude-haiku-5.5";

/**
 * 個人專屬資訊與 System Prompt
 * 您可以在此自由修改為您的真實履歷與資訊！
 */
const PERSONAL_SYSTEM_PROMPT = `
你是一位個人網站的 AI 專屬客服與數位助理，你的主人是「Alex Chen（陳立宇）」。
你的職責是親切、專業、精準地向造訪網站的訪客、HR、獵頭或技術合作夥伴介紹 Alex 的背景與經歷。

【Alex 的個人資料與技術背景】
- 稱謂：Alex Chen (立宇)
- 現職：資深全端工程師 & AI Solutions Architect
- 核心理念：「結合現代前端工程與大語言模型（LLM Agent），打造具備實用商業價值的高效能軟體系統。」
- 專長技術：
  * 前端：TypeScript, React, Next.js, Vue, Tailwind CSS, 響應式現代化介面
  * 後端：Python (FastAPI), Node.js, Go, PostgreSQL, Redis, 分布式系統
  * AI & LLM：Prompt Engineering, LangChain, OpenRouter, Agent 架構設計, RAG 企業知識庫
  * 雲端與維運：Docker, Kubernetes, GitHub Actions (CI/CD), GCP, AWS
- 精選專案：
  1. OmniAgent 智慧企業助理：以 LLM + 向量檢索打造的智慧內部問答與自動化工作流系統。
  2. CloudScale 微服務網關：承受高並發請求的 API 閘道器，具備負載平衡與動態路由。
  3. GitHub Pages AI 客服整合專案：利用靜態網站結合 Google Apps Script 與 OpenRouter 打造的無伺服器對話機器人。
- 經歷簡述：
  * 2023 - 至今：AI 解決方案架構師 @ 雲端創新實驗室
  * 2021 - 2023：資深全端工程師 @ 數位科技
  * 2019 - 2021：軟體工程師 @ 開源技術社群
- 聯絡方式：
  * Email: alex.chen.dev@example.com (請訪客透過網站聯絡表單或信箱聯繫)
  * GitHub: https://github.com/
  * LinkedIn: https://linkedin.com/

【回覆準則】
1. 語氣熱情友善、具備科技感且得體有禮，回覆精簡俐落，避免冗長空洞。
2. 若訪客想洽談合作、徵才或詢問報價，請親切引導對方透過 Email 留下聯繫資訊。
3. 若訪客詢問與 Alex 無關的生活閒聊或惡意攻擊問題，請禮貌地婉拒並將主題帶回 Alex 的專案或技術專長。
4. 預設使用繁體中文（台灣）回覆；若訪客以英文發問，請以流暢流利的英文回答。
`;

/**
 * 處理 POST 請求 (由前端網頁 fetch 呼叫)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ error: "Missing request body" }, 400);
    }

    const requestData = JSON.parse(e.postData.contents);
    const userMessages = requestData.messages || [];

    if (!Array.isArray(userMessages) || userMessages.length === 0) {
      return jsonResponse({ error: "No messages provided" }, 400);
    }

    // 取得 API Key (優先從 Script Properties 讀取)
    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty("OPENROUTER_API_KEY") || FALLBACK_OPENROUTER_KEY;

    if (!apiKey || apiKey === "YOUR_OPENROUTER_API_KEY_HERE") {
      return jsonResponse({
        error: "OpenRouter API Key 未設定。請至 Google Apps Script 的專案設定中加入 OPENROUTER_API_KEY 指令碼屬性。"
      }, 500);
    }

    // 組裝訊息列表：確保包含 System Prompt，並保留前後對話上下文與 reasoning_details
    const messages = [
      { role: "system", content: PERSONAL_SYSTEM_PROMPT }
    ];

    // 加入訪客傳入的對話歷史
    for (const msg of userMessages) {
      const item = {
        role: msg.role,
        content: msg.content || ""
      };
      // 保留 OpenRouter / Claude 所需的 reasoning_details (如果有的話)
      if (msg.reasoning_details) {
        item.reasoning_details = msg.reasoning_details;
      }
      messages.push(item);
    }

    const model = requestData.model || DEFAULT_MODEL;

    // 呼叫 OpenRouter API (支援 reasoning)
    const payload = {
      model: model,
      messages: messages,
      reasoning: { enabled: true }
    };

    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "HTTP-Referer": "https://github.com",
        "X-Title": "Personal Portfolio AI Assistant"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch("https://openrouter.ai/api/v1/chat/completions", options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode >= 200 && responseCode < 300) {
      const data = JSON.parse(responseBody);
      const choice = data.choices && data.choices[0];
      const assistantMessage = choice ? choice.message : { content: "抱歉，目前未能取得回應。" };

      return jsonResponse({
        success: true,
        message: assistantMessage,
        model: data.model || model
      });
    } else {
      Logger.log("OpenRouter Error: " + responseBody);
      return jsonResponse({
        error: "OpenRouter API 錯誤 (" + responseCode + "): " + responseBody
      }, responseCode);
    }

  } catch (err) {
    Logger.log("doPost Exception: " + err.toString());
    return jsonResponse({ error: "伺服器處理例外: " + err.toString() }, 500);
  }
}

/**
 * 處理 GET 請求 (用於測試 Web App 是否部署成功)
 */
function doGet(e) {
  const info = {
    status: "online",
    service: "GitHub Portfolio AI Assistant Backend",
    timestamp: new Date().toISOString(),
    instructions: "請以 POST 方法並帶入 JSON 格式 messages 呼叫此端點。"
  };
  return jsonResponse(info);
}

/**
 * 輔助函式：產生跨來源安全格式的 JSON 輸出
 */
function jsonResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * ==============================================================================
 * 【金鑰設定程式碼 - 執行一次即可】
 * ==============================================================================
 * 若您覺得去專案設定點介面很麻煩，可以直接用這段程式碼設定金鑰：
 * 
 * 使用方式：
 * 1. 將下方的 YOUR_OPENROUTER_API_KEY 改成您的 OpenRouter 金鑰 (sk-or-v1-...)
 * 2. 在 Apps Script 編輯器上方工具列的函式下拉選單，選取「setApiKey」
 * 3. 點擊「執行 (Run)」按鈕
 * 4. 看到「✅ 金鑰已成功存入指令碼屬性！」即可！
 */
function setApiKey() {
  const myKey = "YOUR_OPENROUTER_API_KEY"; // 👈 請在此貼上您的金鑰 (如 sk-or-v1-...)
  
  if (!myKey || myKey === "YOUR_OPENROUTER_API_KEY") {
    Logger.log("❌ 請先將 myKey 替換為您的實際 OpenRouter API Key 再執行！");
    return;
  }
  
  PropertiesService.getScriptProperties().setProperty("OPENROUTER_API_KEY", myKey.trim());
  Logger.log("✅ 金鑰已成功存入指令碼屬性 (OPENROUTER_API_KEY)！");
}

/**
 * 測試金鑰是否已成功設定
 */
function checkApiKey() {
  const key = PropertiesService.getScriptProperties().getProperty("OPENROUTER_API_KEY");
  if (key && key.length > 8) {
    const masked = key.substring(0, 8) + "..." + key.substring(key.length - 4);
    Logger.log("✅ 目前指令碼屬性中的金鑰已設定：" + masked);
  } else {
    Logger.log("⚠️ 尚未偵測到 OPENROUTER_API_KEY，請先執行 setApiKey()");
  }
}

