// ===================================================
// UNETI AI Chatbot - Frontend Logic
// ===================================================

const API_URL = "/api/chat";
const RESET_URL = "/api/reset";
const BOT_LOGO =
  "https://uneti.edu.vn/wp-content/uploads/2025/06/Logo-nen-trang-1.webp";

// Generate or restore session ID
let sessionId = sessionStorage.getItem("uneti_session") || generateId();
sessionStorage.setItem("uneti_session", sessionId);

let isLoading = false;

// ===================================================
// DOM REFERENCES
// ===================================================
const messagesArea = document.getElementById("messages-area");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const welcomeCard = document.getElementById("welcome-card");
const sidebar = document.getElementById("sidebar");

// ===================================================
// UTILITY FUNCTIONS
// ===================================================
function generateId() {
  return "sess_" + Math.random().toString(36).substring(2, 11);
}

function getNow() {
  return new Date().toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Simple markdown → HTML renderer for bot messages
 */
function renderMarkdown(text) {
  let html = text
    // Escape HTML first (except we allow some tags below)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Headings
    .replace(/^### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^## (.+)$/gm, "<h3>$1</h3>")
    .replace(/^# (.+)$/gm, "<h3>$1</h3>")
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Unordered lists
    .replace(/^[\-\*] (.+)$/gm, "<li>$1</li>")
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    // Links
    .replace(
      /\[(.+?)\]\((https?:\/\/[^\)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>',
    )
    // Horizontal rules
    .replace(/^---$/gm, "<hr>")
    // Line breaks
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*?<\/li>(\s*<br\s*\/?>)?)+/gs, (match) => {
    const items = match.replace(/<br\s*\/?>/g, "");
    return "<ul>" + items + "</ul>";
  });

  return "<p>" + html + "</p>";
}

// ===================================================
// MESSAGE RENDERING
// ===================================================
function appendMessage(text, sender, isError = false) {
  const row = document.createElement("div");
  row.classList.add("msg-row", sender);

  const isBot = sender === "bot";

  // Avatar
  const avatar = document.createElement("div");
  avatar.classList.add("msg-avatar", sender);
  if (isBot) {
    const img = document.createElement("img");
    img.src = BOT_LOGO;
    img.alt = "UNETI";
    img.onerror = () => {
      avatar.textContent = "🎓";
    };
    avatar.appendChild(img);
  } else {
    avatar.textContent = "👤";
  }

  // Content wrapper
  const content = document.createElement("div");
  content.classList.add("msg-content");

  // Bubble
  const bubble = document.createElement("div");
  bubble.classList.add("msg-bubble");
  if (isError) bubble.classList.add("error");

  if (isBot && !isError) {
    bubble.innerHTML = renderMarkdown(text);
  } else {
    bubble.textContent = text;
  }

  // Timestamp
  const time = document.createElement("div");
  time.classList.add("msg-time");
  time.textContent = getNow();

  content.appendChild(bubble);
  content.appendChild(time);

  row.appendChild(avatar);
  row.appendChild(content);

  messagesArea.appendChild(row);
  scrollToBottom();
  return row;
}

function appendTypingIndicator() {
  const row = document.createElement("div");
  row.classList.add("msg-row", "bot");
  row.id = "typing-row";

  const avatar = document.createElement("div");
  avatar.classList.add("msg-avatar", "bot");
  const img = document.createElement("img");
  img.src = BOT_LOGO;
  img.alt = "UNETI";
  img.onerror = () => {
    avatar.textContent = "🎓";
  };
  avatar.appendChild(img);

  const content = document.createElement("div");
  content.classList.add("msg-content");

  const indicator = document.createElement("div");
  indicator.classList.add("typing-indicator");
  indicator.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
  content.appendChild(indicator);

  row.appendChild(avatar);
  row.appendChild(content);
  messagesArea.appendChild(row);
  scrollToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById("typing-row");
  if (el) el.remove();
}

function scrollToBottom() {
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

function hideWelcomeCard() {
  if (welcomeCard && welcomeCard.parentNode) {
    welcomeCard.style.transition = "opacity 0.3s ease";
    welcomeCard.style.opacity = "0";
    setTimeout(() => {
      if (welcomeCard.parentNode) welcomeCard.remove();
    }, 300);
  }
}

// ===================================================
// SEND MESSAGE LOGIC
// ===================================================
async function handleSend() {
  const text = userInput.value.trim();
  if (!text || isLoading) return;

  hideWelcomeCard();
  appendMessage(text, "user");
  userInput.value = "";
  autoResizeTextarea();

  setLoading(true);
  appendTypingIndicator();

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, sessionId }),
    });

    const data = await response.json();
    removeTypingIndicator();

    if (response.ok && data.reply) {
      appendMessage(data.reply, "bot");
      if (data.sessionId) {
        sessionId = data.sessionId;
        sessionStorage.setItem("uneti_session", sessionId);
      }
    } else {
      appendMessage(
        data.error || "Có lỗi xảy ra. Vui lòng thử lại.",
        "bot",
        true,
      );
    }
  } catch (err) {
    removeTypingIndicator();
    appendMessage(
      "⚠️ Không thể kết nối đến máy chủ. Hãy đảm bảo server đang chạy bằng lệnh:\n\nnode server.js",
      "bot",
      true,
    );
    console.error("Connection error:", err);
  } finally {
    setLoading(false);
    userInput.focus();
  }
}

function setLoading(state) {
  isLoading = state;
  sendBtn.disabled = state;
  userInput.disabled = state;
}

// ===================================================
// QUICK ACTIONS
// ===================================================
function sendQuickMessage(text) {
  userInput.value = text;
  handleSend();
}

function insertTopic(text) {
  userInput.value = text;
  userInput.focus();
  autoResizeTextarea();
  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    closeSidebarMobile();
  }
}

// ===================================================
// RESET CHAT
// ===================================================
async function resetChat() {
  try {
    await fetch(RESET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
  } catch (_) {}

  // Generate new session
  sessionId = generateId();
  sessionStorage.setItem("uneti_session", sessionId);

  // Clear messages and re-add welcome card
  messagesArea.innerHTML = "";
  const newCard = createWelcomeCard();
  messagesArea.appendChild(newCard);
  userInput.value = "";
  userInput.focus();
}

function createWelcomeCard() {
  const card = document.createElement("div");
  card.classList.add("welcome-card");
  card.id = "welcome-card";
  card.innerHTML = `
        <div class="welcome-logo-wrap">
            <img src="${BOT_LOGO}" alt="UNETI" class="welcome-logo" onerror="this.style.display='none'">
        </div>
        <h2 class="welcome-title">Xin chào! Tôi là Trợ lý AI UNETI 👋</h2>
        <p class="welcome-desc">Tôi có thể giải đáp các thắc mắc về <strong>học phí</strong>, <strong>thủ tục hành chính</strong>, <strong>kế hoạch đào tạo</strong> và <strong>liên hệ phòng ban</strong> của Trường Đại học Kinh tế - Kỹ thuật Công nghiệp.</p>
        <div class="quick-questions">
            <p class="quick-label">Câu hỏi thường gặp:</p>
            <div class="quick-grid">
                <button class="quick-btn" onclick="sendQuickMessage('Học phí đại học chính quy năm 2025-2026 là bao nhiêu?')">💰 Mức học phí năm 2025-2026</button>
                <button class="quick-btn" onclick="sendQuickMessage('Làm thế nào để đăng ký học phần trực tuyến?')">📝 Đăng ký học phần online</button>
                <button class="quick-btn" onclick="sendQuickMessage('Tôi muốn xin giấy xác nhận sinh viên, cần làm gì?')">📄 Xin giấy xác nhận SV</button>
                <button class="quick-btn" onclick="sendQuickMessage('Email và điện thoại liên hệ phòng Công tác Sinh viên?')">📞 Liên hệ Phòng CTSV</button>
                <button class="quick-btn" onclick="sendQuickMessage('Thủ tục xin bảo lưu kết quả học tập gồm những bước nào?')">🔖 Thủ tục bảo lưu học tập</button>
                <button class="quick-btn" onclick="sendQuickMessage('Thời gian nộp học phí học kỳ I năm 2025-2026 là khi nào?')">📅 Thời hạn nộp học phí</button>
            </div>
        </div>
    `;
  return card;
}

// ===================================================
// SIDEBAR TOGGLE
// ===================================================
function toggleSidebar() {
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle("mobile-open");
    getOrCreateOverlay().classList.toggle("active");
  } else {
    sidebar.classList.toggle("collapsed");
  }
}

function closeSidebarMobile() {
  sidebar.classList.remove("mobile-open");
  const overlay = document.querySelector(".sidebar-overlay");
  if (overlay) overlay.classList.remove("active");
}

function getOrCreateOverlay() {
  let overlay = document.querySelector(".sidebar-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.classList.add("sidebar-overlay");
    overlay.onclick = closeSidebarMobile;
    document.body.appendChild(overlay);
  }
  return overlay;
}

// ===================================================
// TEXTAREA AUTO-RESIZE
// ===================================================
function autoResizeTextarea() {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + "px";
}

// ===================================================
// EVENT LISTENERS
// ===================================================
userInput.addEventListener("input", autoResizeTextarea);

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

// On resize - reset sidebar state
window.addEventListener("resize", () => {
  if (window.innerWidth > 768) {
    sidebar.classList.remove("mobile-open");
    const overlay = document.querySelector(".sidebar-overlay");
    if (overlay) overlay.classList.remove("active");
  }
});

// Initial focus
window.addEventListener("DOMContentLoaded", () => {
  userInput.focus();
});
