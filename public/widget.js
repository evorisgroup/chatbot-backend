(function () {
  // ---------------------------
  // CONFIG
  // ---------------------------
  const CLIENT_ID = "nhh"; // change when testing other clients

  // Create floating chat icon
  const chatButton = document.createElement("div");
  chatButton.id = "chatbot-button";
  chatButton.innerHTML = "💬";
  chatButton.style.position = "fixed";
  chatButton.style.bottom = "20px";
  chatButton.style.right = "20px";
  chatButton.style.width = "60px";
  chatButton.style.height = "60px";
  chatButton.style.background = "#6C3BAA";
  chatButton.style.color = "white";
  chatButton.style.borderRadius = "50%";
  chatButton.style.display = "flex";
  chatButton.style.alignItems = "center";
  chatButton.style.justifyContent = "center";
  chatButton.style.cursor = "pointer";
  chatButton.style.zIndex = "9999";
  chatButton.style.fontSize = "30px";
  document.body.appendChild(chatButton);

  // Create chat window container
  const chatWindow = document.createElement("div");
  chatWindow.id = "chatbot-window";
  chatWindow.style.position = "fixed";
  chatWindow.style.bottom = "90px";
  chatWindow.style.right = "20px";
  chatWindow.style.width = "380px";
  chatWindow.style.height = "520px";
  chatWindow.style.background = "white";
  chatWindow.style.borderRadius = "16px";
  chatWindow.style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)";
  chatWindow.style.display = "none";
  chatWindow.style.flexDirection = "column";
  chatWindow.style.overflow = "hidden";
  chatWindow.style.zIndex = "9999";
  document.body.appendChild(chatWindow);

  // Inner structure
  chatWindow.innerHTML = `
      <div id="chatbot-header" style="
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: bold;
          color: white;
          position: relative;
      ">
          <img id="chatbot-logo" style="
              position: absolute;
              left: 15px;
              width: 36px;
              height: 36px;
              border-radius: 6px;
              object-fit: cover;
          ">
          <span id="chatbot-title"></span>
      </div>

      <div id="chatbot-messages" style="
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          font-family: Arial, sans-serif;
          font-size: 15px;
      "></div>

      <div style="
          display: flex;
          padding: 10px;
          border-top: 1px solid #ddd;
      ">
          <textarea id="chatbot-input" placeholder="Type a message…" style="
              flex: 1;
              resize: none;
              padding: 8px;
              height: 35px;
              border-radius: 8px;
              border: 1px solid #ccc;
              font-size: 14px;
              font-family: Arial, sans-serif;
              overflow-y: hidden;
          "></textarea>
          <button id="chatbot-send" style="
              margin-left: 8px;
              background: #6C3BAA;
              color: white;
              border: none;
              padding: 0 16px;
              border-radius: 8px;
              cursor: pointer;
              font-weight: bold;
          ">Send</button>
      </div>
  `;

  // DOM references
  const header = document.getElementById("chatbot-header");
  const logoImg = document.getElementById("chatbot-logo");
  const titleSpan = document.getElementById("chatbot-title");
  const msgContainer = document.getElementById("chatbot-messages");
  const input = document.getElementById("chatbot-input");
  const sendBtn = document.getElementById("chatbot-send");

  let clientData = null;

  // ---------------------------
  // FETCH CLIENT DATA FROM YOUR SERVER
  // ---------------------------
  async function loadClientData() {
    try {
      const response = await fetch(`/api/clientdata?client_id=${CLIENT_ID}`);
      clientData = await response.json();

      // Apply visual theming
      header.style.background = clientData.primaryColor || "#6C3BAA";
      titleSpan.textContent = clientData.name || "Company";

      if (clientData.logo_url) {
        logoImg.src = clientData.logo_url;
      }
    } catch (err) {
      console.error("Failed to load client data:", err);
    }
  }

  loadClientData();

  // ---------------------------
  // CHAT WINDOW TOGGLE
  // ---------------------------
  chatButton.addEventListener("click", () => {
    chatWindow.style.display =
      chatWindow.style.display === "none" ? "flex" : "none";
  });

  // ---------------------------
  // SEND MESSAGE
  // ---------------------------
  function addMessage(text, sender) {
    const div = document.createElement("div");
    div.style.margin = "10px 0";
    div.style.padding = "8px 10px";
    div.style.borderRadius = "8px";
    div.style.maxWidth = "80%";

    if (sender === "user") {
      div.style.background = "#6C3BAA";
      div.style.color = "white";
      div.style.marginLeft = "auto";
    } else {
      div.style.background = "#f1f1f1";
      div.style.color = "#222";
    }

    div.textContent = text;
    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    input.value = "";
    input.style.height = "35px";

    // Fetch bot response
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: CLIENT_ID, message: text }),
    });

    const data = await response.json();
    addMessage(data.reply || "(No response)", "bot");
  }

  sendBtn.addEventListener("click", sendMessage);

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";
  });
})();


