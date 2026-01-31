/* ===============================
   ENSURE MOBILE VIEWPORT (SELF-CONTAINED)
   =============================== */
(function ensureViewport() {
  try {
    const existing = document.querySelector('meta[name="viewport"]');
    if (!existing) {
      const meta = document.createElement("meta");
      meta.name = "viewport";
      meta.content = "width=device-width, initial-scale=1";
      document.head.appendChild(meta);
    }
  } catch (_) {}
})();

(() => {
  const CLIENT_ID = window.CLIENT_ID;
  if (!CLIENT_ID) return;

  let clientData = null;
  let chatOpen = false;
  let typingInterval = null;
  let unreadCount = 0;

  /* ===============================
     HELPERS
     =============================== */
  function isMobile() {
    return window.innerWidth <= 768;
  }

  const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;

  const colors = {
    light: {
      bg: "#ffffff",
      panel: "#fafafa",
      text: "#000",
      user: "#e0e0e0",
      bot: "#ffffff",
      border: "#ddd",
    },
    dark: {
      bg: "#1e1e1e",
      panel: "#2a2a2a",
      text: "#fff",
      user: "#3a3a3a",
      bot: "#2a2a2a",
      border: "#444",
    },
  };

  const theme = isDarkMode ? colors.dark : colors.light;

  /* ===============================
     FETCH CLIENT DATA
     =============================== */
  async function loadClientData() {
    const res = await fetch(
      `https://chatbot-backend-tawny-alpha.vercel.app/api/clientdata?client_id=${CLIENT_ID}`
    );
    clientData = await res.json();
    applyBranding();
  }

  /* ===============================
     CHAT BUBBLE
     =============================== */
  const bubble = document.createElement("div");
  bubble.innerHTML = "💬";
  bubble.style.position = "fixed";
  bubble.style.bottom = "20px";
  bubble.style.right = "20px";
  bubble.style.borderRadius = "50%";
  bubble.style.display = "flex";
  bubble.style.alignItems = "center";
  bubble.style.justifyContent = "center";
  bubble.style.cursor = "pointer";
  bubble.style.boxShadow = "0 6px 18px rgba(0,0,0,0.35)";
  bubble.style.zIndex = "999999";
  bubble.style.transition = "transform 0.2s ease";

  function sizeBubble() {
    bubble.style.width = isMobile() ? "88px" : "72px";
    bubble.style.height = isMobile() ? "88px" : "72px";
    bubble.style.fontSize = isMobile() ? "36px" : "28px";
  }

  sizeBubble();
  document.body.appendChild(bubble);

  /* ---------- Unread Badge ---------- */
  const badge = document.createElement("div");
  badge.style.position = "absolute";
  badge.style.top = "6px";
  badge.style.right = "6px";
  badge.style.background = "red";
  badge.style.color = "white";
  badge.style.borderRadius = "50%";
  badge.style.fontSize = "12px";
  badge.style.padding = "2px 6px";
  badge.style.display = "none";
  bubble.appendChild(badge);

  function updateBadge() {
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = "block";
    } else {
      badge.style.display = "none";
    }
  }

  /* ===============================
     CHAT WINDOW
     =============================== */
  const chat = document.createElement("div");
  chat.style.position = "fixed";
  chat.style.background = theme.bg;
  chat.style.display = "flex";
  chat.style.flexDirection = "column";
  chat.style.boxShadow = "0 12px 32px rgba(0,0,0,0.35)";
  chat.style.transition = "transform 0.25s ease, opacity 0.25s ease";
  chat.style.opacity = "0";
  chat.style.pointerEvents = "none";
  chat.style.transform = "translateY(40px)";
  chat.style.zIndex = "999998";
  chat.style.overflow = "hidden";

  function sizeChat() {
    if (isMobile()) {
      chat.style.top = "env(safe-area-inset-top, 12px)";
      chat.style.bottom = "12px";
      chat.style.left = "8px";
      chat.style.right = "8px";
      chat.style.borderRadius = "18px";
    } else {
      chat.style.width = "360px";
      chat.style.height = "500px";
      chat.style.bottom = "110px";
      chat.style.right = "20px";
      chat.style.borderRadius = "16px";
    }
  }

  sizeChat();
  document.body.appendChild(chat);

  /* ===============================
     HEADER (SWIPE + SAFE)
     =============================== */
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.padding = "16px";
  header.style.color = "#fff";
  header.style.fontWeight = "600";
  header.style.borderTopLeftRadius = "16px";
  header.style.borderTopRightRadius = "16px";

  let startY = null;
  if (isMobile()) {
    header.addEventListener("touchstart", e => {
      startY = e.touches[0].clientY;
    });
    header.addEventListener("touchmove", e => {
      if (!startY) return;
      const delta = e.touches[0].clientY - startY;
      if (delta > 80) closeChat();
    });
  }

  const headerLeft = document.createElement("div");
  headerLeft.style.display = "flex";
  headerLeft.style.alignItems = "center";
  headerLeft.style.gap = "10px";

  const logo = document.createElement("img");
  logo.style.width = "30px";
  logo.style.height = "30px";
  logo.style.borderRadius = "6px";
  logo.style.display = "none";

  const title = document.createElement("span");
  title.textContent = "Chat";

  headerLeft.appendChild(logo);
  headerLeft.appendChild(title);

  const close = document.createElement("div");
  close.textContent = "✕";
  close.style.cursor = "pointer";
  close.style.fontSize = "20px";
  close.onclick = closeChat;

  header.appendChild(headerLeft);
  header.appendChild(close);
  chat.appendChild(header);

  /* ===============================
     MESSAGES
     =============================== */
  const messages = document.createElement("div");
  messages.style.flex = "1";
  messages.style.padding = "16px";
  messages.style.overflowY = "auto";
  messages.style.background = theme.panel;
  messages.style.color = theme.text;
  chat.appendChild(messages);

  const typing = document.createElement("div");
  typing.style.fontSize = "13px";
  typing.style.opacity = "0.7";
  typing.style.display = "none";
  messages.appendChild(typing);

  function showTyping() {
    let dots = 0;
    typing.style.display = "block";
    typingInterval = setInterval(() => {
      dots = (dots + 1) % 4;
      typing.textContent = "Bot is typing" + ".".repeat(dots);
    }, 400);
  }

  function hideTyping() {
    clearInterval(typingInterval);
    typing.style.display = "none";
  }

  /* ===============================
     INPUT (KEYBOARD SAFE)
     =============================== */
  const inputWrap = document.createElement("div");
  inputWrap.style.padding = "16px";
  inputWrap.style.borderTop = `1px solid ${theme.border}`;

  const textarea = document.createElement("textarea");
  textarea.placeholder = "Type a message…";
  textarea.rows = 2;
  textarea.style.width = "100%";
  textarea.style.padding = "12px";
  textarea.style.borderRadius = "8px";
  textarea.style.border = `1px solid ${theme.border}`;
  textarea.style.background = theme.bg;
  textarea.style.color = theme.text;
  textarea.style.resize = "none";
  textarea.style.boxSizing = "border-box";

  const send = document.createElement("button");
  send.textContent = "Send";
  send.style.marginTop = "10px";
  send.style.width = "100%";
  send.style.padding = "12px";
  send.style.border = "none";
  send.style.borderRadius = "8px";
  send.style.color = "#fff";
  send.style.cursor = "pointer";

  inputWrap.appendChild(textarea);
  inputWrap.appendChild(send);
  chat.appendChild(inputWrap);

  if (window.visualViewport) {
    visualViewport.addEventListener("resize", () => {
      if (isMobile()) {
        chat.style.bottom = `${window.innerHeight - visualViewport.height + 12}px`;
      }
    });
  }

  /* ===============================
     BRANDING
     =============================== */
  function applyBranding() {
    if (!clientData) return;
    bubble.style.background = clientData.primary_color;
    header.style.background = clientData.primary_color;
    send.style.background = clientData.primary_color;
    title.textContent = clientData.company_name;
    if (clientData.logo_url) {
      logo.src = clientData.logo_url;
      logo.style.display = "block";
    }
  }

  function addMessage(text, user) {
    const msg = document.createElement("div");
    msg.style.margin = "10px 0";
    msg.style.padding = "12px 14px";
    msg.style.borderRadius = "10px";
    msg.style.maxWidth = "80%";
    msg.style.color = theme.text;
    msg.style.alignSelf = user ? "flex-end" : "flex-start";
    msg.style.background = user ? theme.user : theme.bot;
    msg.style.border = `1px solid ${theme.border}`;
    msg.textContent = text;
    messages.insertBefore(msg, typing);
    messages.scrollTop = messages.scrollHeight;
  }

  async function sendMessage() {
    const text = textarea.value.trim();
    if (!text) return;
    textarea.value = "";
    addMessage(text, true);
    showTyping();

    const res = await fetch(
      "https://chatbot-backend-tawny-alpha.vercel.app/api/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, client_id: CLIENT_ID }),
      }
    );

    const data = await res.json();
    hideTyping();
    if (!chatOpen) {
      unreadCount++;
      updateBadge();
    }
    addMessage(data.reply, false);
  }

  send.onclick = sendMessage;

  function openChat() {
    unreadCount = 0;
    updateBadge();
    chat.style.opacity = "1";
    chat.style.pointerEvents = "auto";
    chat.style.transform = "translateY(0)";
    chatOpen = true;
  }

  function closeChat() {
    chat.style.opacity = "0";
    chat.style.pointerEvents = "none";
    chat.style.transform = "translateY(40px)";
    chatOpen = false;
  }

  bubble.onclick = () => (chatOpen ? closeChat() : openChat());

  loadClientData();
})();
