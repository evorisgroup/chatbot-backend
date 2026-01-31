(() => {
  const CLIENT_ID = window.CLIENT_ID || null;
  if (!CLIENT_ID) {
    console.error("Missing CLIENT_ID. Define: window.CLIENT_ID = 'nhh'");
    return;
  }

  let clientData = null;

  async function loadClientData() {
    try {
      const res = await fetch(
        `https://chatbot-backend-tawny-alpha.vercel.app/api/clientdata?client_id=${CLIENT_ID}`
      );
      clientData = await res.json();
      applyBranding();
    } catch (err) {
      console.error("Failed to load client data:", err);
    }
  }

  // UI container
  const widgetContainer = document.createElement("div");
  widgetContainer.style.position = "fixed";
  widgetContainer.style.bottom = "20px";
  widgetContainer.style.right = "20px";
  widgetContainer.style.zIndex = "999999";
  document.body.appendChild(widgetContainer);

  // Chat Icon
  const chatIcon = document.createElement("div");
  chatIcon.style.width = "60px";
  chatIcon.style.height = "60px";
  chatIcon.style.borderRadius = "50%";
  chatIcon.style.background = "#555";
  chatIcon.style.display = "flex";
  chatIcon.style.alignItems = "center";
  chatIcon.style.justifyContent = "center";
  chatIcon.style.cursor = "pointer";
  chatIcon.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
  chatIcon.innerHTML = `
      <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff">
        <path d="M2 3h20v14H6l-4 4V3z"/>
      </svg>
  `;
  widgetContainer.appendChild(chatIcon);

  // Chat Window
  const chatWindow = document.createElement("div");
  chatWindow.style.width = "350px";
  chatWindow.style.height = "480px";
  chatWindow.style.position = "fixed";
  chatWindow.style.bottom = "100px";
  chatWindow.style.right = "20px";
  chatWindow.style.background = "#fff";
  chatWindow.style.borderRadius = "12px";
  chatWindow.style.boxShadow = "0 4px 20px rgba(0,0,0,0.25)";
  chatWindow.style.display = "none";
  chatWindow.style.flexDirection = "column";
  chatWindow.style.overflow = "hidden";
  chatWindow.style.fontFamily = "Arial, sans-serif";

  chatWindow.innerHTML = `
    <div id="chat-header" style="
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 16px;
      font-weight: bold;
      color: white;
    ">
      <img id="chat-logo" style="width:32px;height:32px;border-radius:6px;display:none;">
      <span id="chat-title">Loading...</span>
    </div>

    <div id="chat-messages" style="
      flex: 1;
      padding: 12px;
      overflow-y: auto;
      background: #fafafa;
      box-sizing: border-box;
    "></div>

    <div style="padding: 10px; border-top: 1px solid #ddd; box-sizing: border-box;">
      <textarea id="chat-input" rows="2" placeholder="Type a message..."
        style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; resize:none; box-sizing:border-box;"></textarea>
      <button id="chat-send" style="
        margin-top: 8px;
        width: 100%;
        padding: 10px;
        border: none;
        border-radius: 8px;
        background: #444;
        color: white;
        cursor: pointer;
      ">Send</button>
    </div>
  `;
  document.body.appendChild(chatWindow);

  // Apply Branding
  function applyBranding() {
    if (!clientData) return;

    const header = document.getElementById("chat-header");
    const sendButton = document.getElementById("chat-send");
    const title = document.getElementById("chat-title");
    const logo = document.getElementById("chat-logo");

    // Correct Supabase name field
    title.textContent = clientData.company_name || "Company";

    if (clientData.logo_url) {
      logo.src = clientData.logo_url;
      logo.style.display = "block";
    }

    if (clientData.primary_color) {
      header.style.background = clientData.primary_color;
      sendButton.style.background = clientData.primary_color;
    }
  }

  chatIcon.onclick = () => {
    chatWindow.style.display =
      chatWindow.style.display === "none" ? "flex" : "none";
  };

  async function sendMessage() {
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (!text) return;

    appendMessage("user", text);
    input.value = "";

    try {
      const res = await fetch(
        "https://chatbot-backend-tawny-alpha.vercel.app/api/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, client_id: CLIENT_ID }),
        }
      );

      const data = await res.json();
      appendMessage("bot", data.reply);
    } catch (err) {
      appendMessage("bot", "Server error.");
    }
  }

  document.getElementById("chat-send").onclick = sendMessage;

 function appendMessage(sender, text) {
  const msgBox = document.getElementById("chat-messages");
  const msg = document.createElement("div");

  msg.style.margin = "10px 0";
  msg.style.padding = "10px 14px";
  msg.style.borderRadius = "8px";
  msg.style.maxWidth = "75%";
  msg.style.lineHeight = "1.4";
  msg.style.color = "#000"; // ✅ FORCE readable text

  if (sender === "user") {
    msg.style.background = "#e0e0e0";
    msg.style.alignSelf = "flex-end";
  } else {
    msg.style.background = "#ffffff";
    msg.style.border = "1px solid #ddd";
    msg.style.alignSelf = "flex-start";
  }

  msg.textContent = text;
  msgBox.appendChild(msg);
  msgBox.scrollTop = msgBox.scrollHeight;
}


  loadClientData();
})();



