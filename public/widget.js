(() => {
  // Require CLIENT_ID to be defined in client website
  const CLIENT_ID = window.CLIENT_ID || null;

  if (!CLIENT_ID) {
    console.error("CLIENT_ID is missing. Define: window.CLIENT_ID = 'xyz'");
    return;
  }

  let clientData = null;

  // -------------------------------
  // Fetch client data from backend
  // -------------------------------
  async function loadClientData() {
    try {
      const res = await fetch(
        `https://chatbot-backend-tawny-alpha.vercel.app/api/clientdata?client_id=${CLIENT_ID}`
      );

      if (!res.ok) throw new Error("Failed to fetch client data");

      clientData = await res.json();
      console.log("Loaded client data:", clientData);

      applyBranding();
    } catch (err) {
      console.error("Error loading client data:", err);
    }
  }

  // -------------------------------
  // Create Chat Widget UI
  // -------------------------------
  const widgetContainer = document.createElement("div");
  widgetContainer.id = "ai-chatbot-widget";
  widgetContainer.style.position = "fixed";
  widgetContainer.style.bottom = "20px";
  widgetContainer.style.right = "20px";
  widgetContainer.style.zIndex = "999999";
  document.body.appendChild(widgetContainer);

  // Chat Icon
  const chatIcon = document.createElement("div");
  chatIcon.id = "chat-icon";
  chatIcon.style.width = "60px";
  chatIcon.style.height = "60px";
  chatIcon.style.borderRadius = "50%";
  chatIcon.style.background = "#6C3BAA";
  chatIcon.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
  chatIcon.style.display = "flex";
  chatIcon.style.alignItems = "center";
  chatIcon.style.justifyContent = "center";
  chatIcon.style.cursor = "pointer";
  chatIcon.style.transition = "0.3s";

  chatIcon.innerHTML = `
      <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff">
        <path d="M2 3h20v14H6l-4 4V3z"/>
      </svg>
  `;

  widgetContainer.appendChild(chatIcon);

  // Chat Window
  const chatWindow = document.createElement("div");
  chatWindow.id = "chat-window";
  chatWindow.style.width = "350px";
  chatWindow.style.height = "450px";
  chatWindow.style.position = "fixed";
  chatWindow.style.bottom = "100px";
  chatWindow.style.right = "20px";
  chatWindow.style.background = "#fff";
  chatWindow.style.borderRadius = "12px";
  chatWindow.style.boxShadow = "0 4px 20px rgba(0,0,0,0.25)";
  chatWindow.style.display = "none";
  chatWindow.style.flexDirection = "column";
  chatWindow.style.overflow = "hidden";

  chatWindow.innerHTML = `
    <div id="chat-header" style="
      padding: 12px;
      color: white;
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: bold;
      font-size: 16px;
    ">
      <img id="chat-logo" src="" style="width:32px;height:32px;border-radius:6px;display:none;">
      <span id="chat-title">Loading...</span>
    </div>

    <div id="chat-messages" style="
      flex: 1;
      padding: 15px;
      overflow-y: auto;
      font-family: sans-serif;
      font-size: 14px;
    "></div>

    <div style="padding: 10px; border-top: 1px solid #ddd;">
      <textarea id="chat-input" rows="2" placeholder="Ask something..." 
        style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; resize:none;"></textarea>
      <button id="chat-send" style="
        margin-top: 8px;
        width: 100%;
        padding: 10px;
        background: #6C3BAA;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
      ">Send</button>
    </div>
  `;

  document.body.appendChild(chatWindow);

  // -------------------------------
  // Apply Branding (Name, Color, Logo)
  // -------------------------------
  function applyBranding() {
    if (!clientData) return;

    const header = document.getElementById("chat-header");
    const title = document.getElementById("chat-title");
    const logo = document.getElementById("chat-logo");

    // Company name
    title.textContent = clientData.name || "Company";

    // Brand color
    if (clientData.primaryColor) {
      header.style.background = clientData.primaryColor;
      document.getElementById("chat-send").style.background = clientData.primaryColor;
    }

    // Logo
    if (clientData.logo_url) {
      logo.src = clientData.logo_url;
      logo.style.display = "block";
    }
  }

  // -------------------------------
  // Toggle Chat Window
  // -------------------------------
  chatIcon.onclick = () => {
    chatWindow.style.display = chatWindow.style.display === "none" ? "flex" : "none";
  };

  // -------------------------------
  // Send Message (POST → /api/chat)
  // -------------------------------
  async function sendMessage() {
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (!text) return;

    appendMessage("user", text);
    input.value = "";

    try {
      const res = await fetch("https://chatbot-backend-tawny-alpha.vercel.app/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, client_id: CLIENT_ID })
      });

      const data = await res.json();
      appendMessage("bot", data.reply || "I'm not sure how to answer that.");
    } catch (err) {
      appendMessage("bot", "Error connecting to server.");
    }
  }

  document.getElementById("chat-send").onclick = sendMessage;

  // -------------------------------
  // Add Message to Chat Window
  // -------------------------------
  function appendMessage(sender, text) {
    const msgBox = document.getElementById("chat-messages");
    const msg = document.createElement("div");

    msg.style.margin = "10px 0";
    msg.style.padding = "8px 12px";
    msg.style.borderRadius = "8px";
    msg.style.maxWidth = "75%";

    if (sender === "user") {
      msg.style.background = "#eee";
      msg.style.alignSelf = "flex-end";
    } else {
      msg.style.background = "#d9cfff";
    }

    msg.textContent = text;
    msgBox.appendChild(msg);
    msgBox.scrollTop = msgBox.scrollHeight;
  }

  // Start loading brand data
  loadClientData();
})();



