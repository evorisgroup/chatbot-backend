(async () => {
  // ----- Fetch client data -----
  async function getClientData() {
    try {
      const res = await fetch(`${window.API_ENDPOINT}?id=${window.CLIENT_ID}`);
      if (!res.ok) throw new Error("Client data fetch failed");
      const data = await res.json();
      return data;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  const clientInfo = await getClientData();
  if (!clientInfo) return;

  // ----- Create chat icon -----
  const chatIcon = document.createElement("div");
  chatIcon.id = "chat-icon";
  chatIcon.style.position = "fixed";
  chatIcon.style.bottom = "20px";
  chatIcon.style.right = "20px";
  chatIcon.style.width = "60px";
  chatIcon.style.height = "60px";
  chatIcon.style.borderRadius = "50%";
  chatIcon.style.backgroundColor = clientInfo.primary_color || "#6C3BAA";
  chatIcon.style.cursor = "pointer";
  chatIcon.style.display = "flex";
  chatIcon.style.justifyContent = "center";
  chatIcon.style.alignItems = "center";
  chatIcon.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
  chatIcon.style.zIndex = "9999";
  chatIcon.title = "Chat with us";

  // Icon content (messenger bubble)
  chatIcon.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M12 3C6.48 3 2 7 2 12c0 2.5 1 4.8 2.7 6.6L4 21l4.6-1.2C10.2 20.8 11 21 12 21c5.52 0 10-4 10-9s-4.48-9-10-9z"/></svg>`;

  document.body.appendChild(chatIcon);

  // ----- Create chat window -----
  const chatWindow = document.createElement("div");
  chatWindow.id = "chat-window";
  chatWindow.style.position = "fixed";
  chatWindow.style.bottom = "90px";
  chatWindow.style.right = "20px";
  chatWindow.style.width = "350px";
  chatWindow.style.maxHeight = "500px";
  chatWindow.style.borderRadius = "15px";
  chatWindow.style.boxShadow = "0 8px 30px rgba(0,0,0,0.3)";
  chatWindow.style.overflow = "hidden";
  chatWindow.style.display = "none";
  chatWindow.style.flexDirection = "column";
  chatWindow.style.backgroundColor = "#fff";
  chatWindow.style.fontFamily = "Arial, sans-serif";
  chatWindow.style.zIndex = "9999";

  // Top border with logo and company name
  const topBorder = document.createElement("div");
  topBorder.style.backgroundColor = clientInfo.primary_color || "#6C3BAA";
  topBorder.style.color = "#fff";
  topBorder.style.display = "flex";
  topBorder.style.alignItems = "center";
  topBorder.style.padding = "10px 15px";
  topBorder.style.height = "50px";
  topBorder.style.boxSizing = "border-box";

  const logo = document.createElement("img");
  logo.src = clientInfo.logo_url || "";
  logo.style.height = "30px";
  logo.style.width = "30px";
  logo.style.objectFit = "contain";
  logo.style.marginRight = "10px";

  const headerText = document.createElement("div");
  headerText.innerText = clientInfo.company_name || "Company";
  headerText.style.flexGrow = "1";
  headerText.style.textAlign = "center";
  headerText.style.fontWeight = "bold";
  headerText.style.fontSize = "16px";

  topBorder.appendChild(logo);
  topBorder.appendChild(headerText);
  chatWindow.appendChild(topBorder);

  // Message container
  const messagesContainer = document.createElement("div");
  messagesContainer.style.flexGrow = "1";
  messagesContainer.style.padding = "10px";
  messagesContainer.style.overflowY = "auto";
  messagesContainer.style.backgroundColor = "#f7f7f7";
  chatWindow.appendChild(messagesContainer);

  // Input container
  const inputContainer = document.createElement("div");
  inputContainer.style.display = "flex";
  inputContainer.style.borderTop = "1px solid #ddd";

  const input = document.createElement("textarea");
  input.style.flexGrow = "1";
  input.style.border = "none";
  input.style.padding = "10px";
  input.style.resize = "none";
  input.style.fontFamily = "Arial, sans-serif";
  input.style.fontSize = "14px";
  input.style.outline = "none";
  input.rows = 1;

  // Resize input as user types
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";
  });

  const sendButton = document.createElement("button");
  sendButton.innerText = "Send";
  sendButton.style.backgroundColor = clientInfo.primary_color || "#6C3BAA";
  sendButton.style.color = "#fff";
  sendButton.style.border = "none";
  sendButton.style.padding = "10px 15px";
  sendButton.style.cursor = "pointer";

  inputContainer.appendChild(input);
  inputContainer.appendChild(sendButton);
  chatWindow.appendChild(inputContainer);

  document.body.appendChild(chatWindow);

  // ----- Toggle chat window -----
  chatIcon.addEventListener("click", () => {
    chatWindow.style.display = chatWindow.style.display === "none" ? "flex" : "none";
    if (chatWindow.style.display === "flex") input.focus();
  });

  // ----- Function to add messages -----
  function addMessage(text, isUser = false) {
    const msg = document.createElement("div");
    msg.innerText = text;
    msg.style.margin = "5px 0";
    msg.style.padding = "8px 12px";
    msg.style.borderRadius = "12px";
    msg.style.maxWidth = "80%";
    msg.style.wordWrap = "break-word";
    msg.style.alignSelf = isUser ? "flex-end" : "flex-start";
    msg.style.backgroundColor = isUser ? clientInfo.primary_color || "#6C3BAA" : "#eee";
    msg.style.color = isUser ? "#fff" : "#000";

    messagesContainer.appendChild(msg);
    messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: "smooth" });
  }

  // ----- Handle send button -----
  sendButton.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, true);
    input.value = "";
    input.style.height = "auto";

    // Call your chat backend API here (replace with your actual chat API)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      addMessage(data.reply || "Sorry, no response.");
    } catch (err) {
      addMessage("Error: could not reach API");
      console.error(err);
    }
  });

  // Allow Enter to send
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendButton.click();
    }
  });
})();


