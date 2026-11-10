/**
 * ==============================================================================
 * GitHub 個人網站 - 前端互動與 AI 客服連線邏輯
 * ==============================================================================
 * 
 * 支援功能：
 * 1. 網頁端即時設定：可點擊客服右上角的 ⚙️ 圖示，直接在網頁上輸入並儲存 Google Apps Script 網址！
 * 2. 瀏覽器本機儲存 (localStorage)：設定後永久儲存，免重新修改程式碼或 git push。
 * 3. OpenRouter 智慧推理歷程 (reasoning_details) 呈現。
 * 4. 離線模擬示範模式。
 */

// 預設代碼中的網址 (若使用者未在網頁上自訂，則以此為預設)：
const DEFAULT_GAS_API_URL = "";

// 對話紀錄陣列（遵照 OpenRouter 格式：支援保留 reasoning_details 多輪對話推理）
let conversationHistory = [];

// DOM 元素引用
const chatWindow = document.getElementById("chatWindow");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");
const chatSettingsPanel = document.getElementById("chatSettingsPanel");
const gasUrlInput = document.getElementById("gasUrlInput");
const settingsStatusMsg = document.getElementById("settingsStatusMsg");
const botStatusBadge = document.getElementById("botStatusBadge");

// 頁面載入時初始化設定
document.addEventListener("DOMContentLoaded", () => {
  initSettings();
});

/**
 * 取得目前使用的 Google Apps Script 網址 (優先讀取 localStorage)
 */
function getActiveGasUrl() {
  const customUrl = localStorage.getItem("CUSTOM_GAS_API_URL");
  if (customUrl && customUrl.trim().length > 0) {
    return customUrl.trim();
  }
  return DEFAULT_GAS_API_URL;
}

/**
 * 初始化設定值與狀態徽章
 */
function initSettings() {
  const activeUrl = getActiveGasUrl();
  if (gasUrlInput) {
    gasUrlInput.value = activeUrl;
  }
  updateStatusBadge(!!activeUrl);
}

/**
 * 更新客服在線狀態文字
 */
function updateStatusBadge(isConfigured) {
  if (!botStatusBadge) return;
  if (isConfigured) {
    botStatusBadge.textContent = "已連線至專屬 AI 後端";
    botStatusBadge.style.color = "#10b981";
  } else {
    botStatusBadge.textContent = "在線為您服務 (示範模式)";
    botStatusBadge.style.color = "#fbbf24";
  }
}

/**
 * 開啟 / 關閉設定面板
 */
function toggleSettingsModal() {
  if (!chatSettingsPanel) return;
  chatSettingsPanel.classList.toggle("active");
  if (chatSettingsPanel.classList.contains("active") && gasUrlInput) {
    gasUrlInput.value = getActiveGasUrl();
    hideSettingsStatus();
    gasUrlInput.focus();
  }
}

/**
 * 儲存使用者輸入的 GAS 網址至 localStorage
 */
function saveGasUrl() {
  const url = gasUrlInput.value.trim();
  
  if (url && !url.startsWith("http")) {
    showSettingsStatus("請輸入有效的完整網址 (必須以 http:// 或 https:// 開頭)", "error");
    return;
  }

  if (url) {
    localStorage.setItem("CUSTOM_GAS_API_URL", url);
    showSettingsStatus("✅ 網址已成功儲存至瀏覽器！AI 客服已啟用即時連線。", "success");
    updateStatusBadge(true);
  } else {
    localStorage.removeItem("CUSTOM_GAS_API_URL");
    showSettingsStatus("⚠️ 已清除自訂網址，恢復為預設示範模式。", "loading");
    updateStatusBadge(false);
  }

  setTimeout(() => {
    chatSettingsPanel.classList.remove("active");
  }, 1200);
}

/**
 * 測試與 Google Apps Script 後端的連線
 */
async function testGasUrl() {
  const url = gasUrlInput.value.trim();
  if (!url) {
    showSettingsStatus("請先輸入網頁應用程式網址再進行測試！", "error");
    return;
  }

  showSettingsStatus("連線測試中，請稍候...", "loading");

  try {
    const res = await fetch(url, {
      method: "GET",
      mode: "cors"
    });
    const data = await res.json();
    if (data && data.status === "online") {
      showSettingsStatus("🎉 連線成功！Google Apps Script 後端運作正常。", "success");
    } else {
      showSettingsStatus(`連線回應成功，但內容為：${JSON.stringify(data)}`, "success");
    }
  } catch (err) {
    showSettingsStatus(`❌ 連線測試失敗：${err.message}。請確認部署時存取權限是否選取「任何人 (Anyone)」。`, "error");
  }
}

function showSettingsStatus(text, type) {
  if (!settingsStatusMsg) return;
  settingsStatusMsg.textContent = text;
  settingsStatusMsg.className = `settings-status ${type}`;
}

function hideSettingsStatus() {
  if (!settingsStatusMsg) return;
  settingsStatusMsg.className = "settings-status";
  settingsStatusMsg.textContent = "";
}

/**
 * 開啟 / 關閉對話視窗
 */
function toggleChat() {
  chatWindow.classList.toggle("open");
  if (chatWindow.classList.contains("open")) {
    chatInput.focus();
    scrollToBottom();
  }
}

function openChat() {
  chatWindow.classList.add("open");
  chatInput.focus();
  scrollToBottom();
}

/**
 * 快速問答選題 (點擊標籤直接發問)
 */
function sendQuickQuestion(questionText) {
  openChat();
  chatInput.value = questionText;
  handleChatSubmit(new Event("submit"));
}

/**
 * 專案卡片快捷發問
 */
function askAboutProject(projectName) {
  openChat();
  chatInput.value = `我想深入了解專案「${projectName}」的架構與技術細節！`;
  handleChatSubmit(new Event("submit"));
}

/**
 * 處理訊息送出事件
 */
async function handleChatSubmit(event) {
  if (event) event.preventDefault();

  const userText = chatInput.value.trim();
  if (!userText) return;

  // 1. 在畫面新增使用者訊息
  appendMessage("user", userText);
  chatInput.value = "";
  chatInput.disabled = true;
  chatSendBtn.disabled = true;

  // 2. 加入歷史記錄
  conversationHistory.push({
    role: "user",
    content: userText
  });

  // 3. 顯示打字中等待動畫
  const typingIndicator = appendTypingIndicator();
  scrollToBottom();

  const targetApiUrl = getActiveGasUrl();

  try {
    // 檢查是否有設定 GAS 網址
    if (!targetApiUrl) {
      // 模擬示範模式 (當尚未設定 GAS 時仍可提供即時預覽)
      await new Promise(res => setTimeout(res, 800));
      removeTypingIndicator(typingIndicator);
      
      const mockReply = getMockResponse(userText);
      appendMessage("bot", mockReply.content, mockReply.reasoning);
      
      conversationHistory.push({
        role: "assistant",
        content: mockReply.content,
        reasoning_details: mockReply.reasoning
      });
      return;
    }

    // 4. 呼叫 Google Apps Script 後端 (以 text/plain 避免跨域 OPTIONS 阻擋)
    const response = await fetch(targetApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        messages: conversationHistory
      })
    });

    const result = await response.json();
    removeTypingIndicator(typingIndicator);

    if (result.success && result.message) {
      const assistantMessage = result.message;
      
      // 顯示回答與 OpenRouter 推理鏈 (若有 reasoning_details)
      appendMessage("bot", assistantMessage.content, assistantMessage.reasoning_details);

      // 遵照 OpenRouter 規範：將完整 assistant 物件（包含 content 與 reasoning_details）保留至歷史
      conversationHistory.push({
        role: "assistant",
        content: assistantMessage.content,
        reasoning_details: assistantMessage.reasoning_details || null
      });
    } else {
      const errText = result.error || "未知的伺服器錯誤";
      appendMessage("bot", `⚠️ 發生錯誤：${errText}\n\n💡 提示：若為權限問題，請確認 Google Apps Script「部署」中的存取權是否為「任何人 (Anyone)」。`);
    }

  } catch (err) {
    removeTypingIndicator(typingIndicator);
    console.error("Chat error:", err);
    appendMessage("bot", `抱歉，連線至 Google Apps Script 發生錯誤 (${err.message})。<br><br><a href="javascript:void(0)" onclick="toggleSettingsModal()" style="color:#818cf8; text-decoration:underline;">點此檢查或重新設定 Google Apps Script 網址 ⚙️</a>`);
  } finally {
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
    chatInput.focus();
    scrollToBottom();
  }
}

/**
 * 在聊天視窗新增訊息氣泡
 */
function appendMessage(sender, text, reasoningDetails) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `msg msg-${sender}`;

  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "msg-bubble";
  bubbleDiv.innerHTML = formatText(text);
  msgDiv.appendChild(bubbleDiv);

  // 若模型有回傳 reasoning_details (OpenRouter 推理歷程)，以收摺元件展示
  if (reasoningDetails) {
    const detailsEl = document.createElement("details");
    detailsEl.className = "reasoning-box";
    const summaryEl = document.createElement("summary");
    summaryEl.textContent = "🧠 查看 AI 思考推理過程";
    const textEl = document.createElement("p");
    textEl.style.marginTop = "4px";
    textEl.style.whiteSpace = "pre-wrap";
    textEl.textContent = typeof reasoningDetails === "string" ? reasoningDetails : JSON.stringify(reasoningDetails, null, 2);
    
    detailsEl.appendChild(summaryEl);
    detailsEl.appendChild(textEl);
    msgDiv.appendChild(detailsEl);
  }

  chatMessages.appendChild(msgDiv);
  scrollToBottom();
}

/**
 * 顯示打字中動態
 */
function appendTypingIndicator() {
  const typingDiv = document.createElement("div");
  typingDiv.className = "msg msg-bot typing-bubble";
  typingDiv.id = "activeTypingIndicator";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.innerHTML = `
    <div class="typing-dots">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>
  `;
  typingDiv.appendChild(bubble);
  chatMessages.appendChild(typingDiv);
  return typingDiv;
}

function removeTypingIndicator(indicator) {
  if (indicator && indicator.parentNode) {
    indicator.parentNode.removeChild(indicator);
  }
}

/**
 * 文字格式化 (換行與連結支援)
 */
function formatText(text) {
  if (!text) return "";
  // 避免重複跳脫 HTML 標籤
  if (text.includes("<a href=") || text.includes("<br>")) {
    return text;
  }
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * 離線預覽模擬回覆 (當使用者尚未設定 GAS 時展示用)
 */
function getMockResponse(question) {
  const q = question.toLowerCase();
  let reasoning = "檢測到尚未配置 Google Apps Script 網址，進入離線模擬應答。";
  let content = "";

  if (q.includes("技術") || q.includes("專長") || q.includes("stack")) {
    content = "Alex 的技術棧主要涵蓋：\n- 前端：TypeScript、React、Next.js、Tailwind CSS\n- 後端：Python (FastAPI)、Node.js、Go、PostgreSQL、Redis\n- AI 領域：OpenRouter API、Claude / GPT、LangChain、RAG 向量檢索與 Agent 架構！";
  } else if (q.includes("專案") || q.includes("作品") || q.includes("omniagent") || q.includes("cloudscale")) {
    content = "Alex 目前有三大精選代表專案：\n1. OmniAgent 智慧企業問答系統：結合向量資料庫與 Claude 打造內部 AI 助理。\n2. CloudScale 高並發微服務網關：支援動態限流與負載平衡。\n3. 無伺服器個人 AI 客服助理：也就是您目前使用的這隻機器人，以 GitHub Pages 結合 Google Apps Script 實現！";
  } else if (q.includes("經歷") || q.includes("背景") || q.includes("工作")) {
    content = "Alex 擁有超過 5 年軟體工程經驗：\n- 2023 至今：AI 解決方案架構師 @ 雲端創新實驗室\n- 2021 - 2023：資深全端工程師 @ 數位科技\n- 2019 - 2021：軟體工程師 @ 開源技術社群";
  } else if (q.includes("聯絡") || q.includes("信箱") || q.includes("email") || q.includes("合作")) {
    content = "歡迎與 Alex 聯繫！您可以透過電子郵件：alex.chen.dev@example.com，或前往本站下方的聯絡表單發送信件喔！";
  } else {
    content = `收到您的問題：「${question}」！\n\n我是 Alex 的數位助理。目前處於示範預覽模式。\n\n⚙️ **啟用真實 AI**：您可以直接點擊本視窗右上角的 ⚙️（齒輪圖示），貼上您的 Google Apps Script 網頁應用程式網址，就能立即串接 OpenRouter 進行即時對話！`;
  }

  return { content, reasoning };
}
