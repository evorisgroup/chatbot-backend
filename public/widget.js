(() => {
  const CLIENT_ID = window.CLIENT_ID;
  if (!CLIENT_ID) {
    console.error("Missing CLIENT_ID");
    return;
  }

  let clientData = null;
  let chatOpen = false;
  let typingInterval = null;

  function isMobile() {
    return window.innerWidth <= 768;
  }

  // ---------------- Fetch client data ----------------
  async function loadClientData() {
    const res = await fetch(
      `https://chatbot-backend-tawny-alpha.vercel.app/api/clientdata?client_id=${CLIENT_ID}`
    );
    clientData = await res.json();
    applyBranding();
  }

  // ---------------- Container ----------------
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.bottom = "20px";
  container.style.right = "20px";
  container.style.zIndex = "999999";
  document.body.appendChild(container);

  // ---------------- Bubble ----------------
  const bubble = document.createElement("div");
  bubble.style.display = "flex";
  bubble.style.alignItems = "center";
  bubble.style.justifyContent = "center";
  bubble.style.borderRadius = "50%";
  bubble.style.cursor = "pointer";
  bubble.style.boxShadow = "0 6px 16px rgba(0,0,0,0.3)";
  bubble.style.transition = "transform 0.2s ease";

  bubble.innerHTML = "💬";

  if (isMobile()) {
    bubble.style.width = "80px";
    bubble.style.height = "80px";
    bubble.style.fontSize = "32px";
  } else {
    bubble.style.width = "72px";
    bubble.style.height = "72px";
    bubble.style.fontSize = "28px";
  }

  bubble.onmouseenter = () => (bubble.style.transform = "scale(1.08)");
  bubble.onmouseleave = () => (bubble.style.transform = "scale(1)");

  container.appendChild(bubble);

  // ---------------- Chat Window ----------------
  const chat = document.createElement("div");
  chat.style.position = "fixed";
  chat.style.background = "#fff";
  chat.style.display = "flex";
  chat.style.flexDirection = "column";
  chat.style.boxShadow = "0 12px 30px rgba(0,0,0,0.3)";
  chat.style.transition = "all 0.25s ease";
  chat.style.opacity = "0";
  chat.style.pointerEvents = "none";
  chat.style.transform = "translateY(30px)";

  if (isMobile()) {
    chat.style.width = "calc(100vw - 20px)";
    chat.style.height = "80vh";
    chat.style.right = "10px";
    chat.style.bottom = "10px";
    chat.style.borderRadius = "16px";
  } else {
    chat.style.width = "360px";
    chat.style.height = "500px";
    chat.style.right = "20px";
    chat.style.bottom = "100px";
    chat.style.borderRadius = "14px";
  }

  document.body.appendChild(chat);

  // ---------------- Header ----------------
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.padding = "12px 14px";
  header.style.color = "#fff";
  header.style.fontWeight = "600";

  const titleWrap = document.createElement("div");
  titleWrap.style.display = "flex";
  titleWrap.style.alignItems = "center";
  titleWrap.style.gap = "10px";

  const logo = document.createElement("img");
  logo.style.width = "28px";
  logo.style.height = "28px";
  logo.style.borderRadius = "6px";
  logo.style.display = "none";

  const title = document.createElement("span");
  title.textContent = "Chat";

  titleWrap.appendChild(logo);
  titleWrap.appendChild(title);

  const closeBtn = document.createElement("div");
  closeBtn.textContent = "✕";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.opacity = "0.85";
  closeBtn.onmouseenter = () => (closeBtn.style.opacity = "1");
  closeBtn.onmouseleave = () => (closeBtn.style.opacity = "0.85");
  closeBtn.onclick = closeChat;

  header.appendChild(titleWrap);
  header.appendChild(closeBtn);
  chat.appendChild(header);

  // ---------------- Messages ----------------
  const messages = document.createElement("div");
  messages.style.flex = "1";
  messages.style.padding = "14px";
  messages.style.overflowY = "auto";
  messages.style.background = "#fafafa";
  chat.appendChild(messages);

  // ---------------- Typing Indicator ----------------
  const typing = document.createElement("div");
  typing.style.fontSize = "13px";
  typing.style.opacity = "0.7";
  typing.style.margin = "6px 0";
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

  // ---------------- Input ----------------
  const inputWrap = document.createElement("div");
  inputWrap.style.padding = "12px";
  inputWrap.style.borderTop = "1px solid #ddd";

  const textarea = document.createElement("textarea");
  textarea.placeholder = "Type a message...";
  textarea.rows = 2;
  textarea.style.width = "100%";
  textarea.style.padding = "10px";
  textarea.style.borderRadius = "8px";
  textarea.style.border = "1px solid #ccc";
  textarea.style.resize = "none";
  textarea.style.boxSizing = "border-box";

  const send = document.createElement("button");
  send.textContent = "Send";
  send.style.marginTop = "8px";
  send.style.width = "100%";
  send.style.padding = "10px";
  send.style.border = "none";
  send.style.borderRadius = "8px";
  send.style.color = "#fff";
  send.style.cursor = "pointer";
  send.style.transition = "filter 0.2s";
  send.onmouseenter = () => (send.style.filter = "brightness(1.1)");
  send.onmouseleave = () => (send.style.filter = "brightness(1)");

  inputWrap.appendChild(textarea);
  inputWrap.appendChild(send);
  chat.appendChild(inputWrap);

  // ---------------- Branding ----------------
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

  // ---------------- Chat Logic ----------------
  function addMessage(text, user) {
    const msg = document.createElement("div");
    msg.style.margin = "10px 0";
    msg.style.padding = "10px 14px";
    msg.style.borderRadius = "8px";
    msg.style.maxWidth = "75%";
    msg.style.color = "#000";
    msg.style.alignSelf = user ? "flex-end" : "flex-start";
    msg.style.background = user ? "#e0e0e0" : "#fff";
    msg.style.border = user ? "none" : "1px solid #ddd";
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
    addMessage(data.reply, false);
  }

  send.onclick = sendMessage;

  // ---------------- Open / Close ----------------
  function openChat() {
    chat.style.opacity = "1";
    chat.style.pointerEvents = "auto";
    chat.style.transform = "translateY(0)";
    chatOpen = true;
  }

  function closeChat() {
    chat.style.opacity = "0";
    chat.style.pointerEvents = "none";
    chat.style.transform = "translateY(30px)";
    chatOpen = false;
  }

  bubble.onclick = () => (chatOpen ? closeChat() : openChat());

  loadClientData();
})();
