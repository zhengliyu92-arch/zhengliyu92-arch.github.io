/**
 * ==============================================================================
 * GitHub 個人網站 - 前端互動與 AI 客服連線邏輯
 * ==============================================================================
 * 
 * 【重要設定】：
 * 當您依照 README.md 或 google-apps-script/Code.gs 部署好 Google Apps Script 後，
 * 請將產生的「網頁應用程式網址 (Web App URL)」填入下方的 GAS_API_URL 中！
 */

// 請將部署後的 Google Apps Script 網址貼在此處：
// 例如: "https://script.google.com/macros/s/AKfycbx.../exec"
const GAS_API_URL = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";

// 對話紀錄陣列（遵照 OpenRouter 格式：支援保留 reasoning_details 多輪對話推理）
let conversationHistory = [];

// DOM 元素引用
const chatWindow = document.getElementById("chatWindow");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");

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

  try {
    // 檢查是否有設定 GAS 網址
    if (!GAS_API_URL || GAS_API_URL === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE") {
      // 模擬示範模式 (當尚未設定 GAS 時仍可提供互動體驗)
      await new Promise(res => setTimeout(res, 900));
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
    const response = await fetch(GAS_API_URL, {
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
      appendMessage("bot", `⚠️ 發生錯誤：${errText}`);
    }

  } catch (err) {
    removeTypingIndicator(typingIndicator);
    console.error("Chat error:", err);
    appendMessage("bot", `抱歉，目前連線出現問題 (${err.message})。請檢查 Google Apps Script 部署網址是否正確。`);
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
 * 簡易文字格式化 (換行處理)
 */
function formatText(text) {
  if (!text) return "";
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
 * 離線預覽模擬回覆 (當使用者尚未完成 GAS 部署時展示用)
 */
function getMockResponse(question) {
  const q = question.toLowerCase();
  let reasoning = "訪客詢問了個人檔案相關資訊。檢索預設知識庫並回覆相應細節。";
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
    content = `收到您的問題：「${question}」！\n\n我是 Alex 的數位助理，很高興為您服務。如果您想了解 Alex 的技術背景、專案經驗或聯絡方式，都可以隨時告訴我！\n\n💡 提示：在 \`script.js\` 中填入您的 Google Apps Script 網址，即可啟用由 OpenRouter Claude 大模型驅動的即時智慧回答！`;
  }

  return { content, reasoning };
}
