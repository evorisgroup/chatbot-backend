// ===== NHH Chat Widget =====
(async function () {
  // --- Configuration ---
  const CLIENT_ID = window.CLIENT_ID;
  const SUPABASE_URL = window.SUPABASE_URL; // set in test.html or Vercel env
  const SUPABASE_KEY = window.SUPABASE_KEY;

  // Load Supabase client
  const { createClient } = supabase;
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

  // --- Fetch client data from Supabase ---
  async function getClientData() {
    const { data, error } = await supabaseClient
      .from("clients")
      .select("*")
      .eq("client_id", CLIENT_ID)
      .single();

    if (error || !data) {
      console.error("Failed to load client data:", error);
      return null;
    }
    return data;
  }

  const clientData = await getClientData();
  if (!clientData) return;

  // --- Create messenger icon ---
  const messengerIcon = document.createElement("div");
  messengerIcon.id = "chat-messenger-icon";
  messengerIcon.style.position = "fixed";
  messengerIcon.style.bottom = "20px";
  messengerIcon.style.right = "20px";
  messengerIcon.style.width = "60px";
  messengerIcon.style.height = "60px";
  messengerIcon.style.backgroundColor = clientData.color || "#6C3BAA";
  messengerIcon.style.borderRadius = "50%";
  messengerIcon.style.cursor = "pointer";
  messengerIcon.style.zIndex = "9999";
  messengerIcon.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
  messengerIcon.style.backgroundImage = `url('${clientData.logo_url}')`;
  messengerIcon.style.backgroundSize = "cover";
  messengerIcon.style.backgroundPosition = "center";
  document.body.appendChild(messengerIcon);

  // --- Create chat window ---
  const chatWindow = document.createElement("div");
  chatWindow.id = "chat-window";
  chatWindow.style.position = "fixed";
  chatWindow.style.bottom = "90px";
  chatWindow.style.right = "20px";
  chatWindow.style.width = "350px";
  chatWindow.style.height = "500px";
  chatWindow.style.backgroundColor = "#fff";
  chatWindow.style.borderRadius = "10px";
  chatWindow.style.boxShadow = "0 4px 20px rgba(0,0,0,0.2)";
  chatWindow.style.display = "none";
  chatWindow.style.flexDirection = "column";
  chatWindow.style.overflow = "hidden";
  chatWindow.style.zIndex = "9999";

  // --- Header ---
  const header = document.createElement("div");
  header.style.height = "60px";
  header.style.backgroundColor = clientData.color || "#6C3BAA";
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "center";
  header.style.position = "relative";

  // Logo
  const logo = document.createElement("img");
  logo.src = clientData.logo_url || "";
  logo.style.height = "40px";
  logo.style.width = "40px";
  logo.style.position = "absolute";
  logo.style.left = "10px";
  logo.style.top = "10px";
  logo.style.objectFit = "contain";
  header.appendChild(logo);

  // Company name
  const title = document.createElement("div");
  title.textContent = clientData.name || "Company";
  title.style.fontWeight = "bold";
  title.style.color = "#fff";
  header.appendChild(title);

  chatWindow.appendChild(header);

  // --- Messages container ---
  const messagesContainer = document.createElement("div");
  messagesContainer.style.flex = "1";
  messagesContainer.style.padding = "10px";
  messagesContainer.style.overflowY = "auto";
  chatWindow.appendChild(messagesContainer);

  // --- Input container ---
  const inputContainer = document.createElement("div");
  inputContainer.style.display = "flex";
  inputContainer.style.borderTop = "1px solid #ccc";

  const input = document.createElement("textarea");
  input.style.flex = "1";
  input.style.resize = "none";
  input.style.border = "none";
  input.style.padding = "10px";
  input.rows = 1;
  input.placeholder = "Type your question...";
  inputContainer.appendChild(input);

  const sendBtn = document.createElement("button");
  sendBtn.textContent = "Send";
  sendBtn.style.padding = "10px 15px";
  sendBtn.style.backgroundColor = clientData.color || "#6C3BAA";
  sendBtn.style.color = "#fff";
  sendBtn.style.border = "none";
  sendBtn.style.cursor = "pointer";
  inputContainer.appendChild(sendBtn);

  chatWindow.appendChild(inputContainer);
  document.body.appendChild(chatWindow);

  // --- Toggle chat window ---
  messengerIcon.addEventListener("click", () => {
    chatWindow.style.display = chatWindow.style.display === "none" ? "flex" : "none";
  });

  // --- Add message ---
  function addMessage(sender, text) {
    const msg = document.createElement("div");
    msg.textContent = text;
    msg.style.margin = "5px 0";
    msg.style.padding = "8px";
    msg.style.borderRadius = "6px";
    msg.style.maxWidth = "80%";
    msg.style.backgroundColor = sender === "user" ? "#DCF8C6" : "#F1F0F0";
    msg.style.alignSelf = sender === "user" ? "flex-end" : "flex-start";
    messagesContainer.appendChild(msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // --- Send message ---
  async function sendMessage() {
    const message = input.value.trim();
    if (!message) return;
    addMessage("user", message);
    input.value = "";
    input.rows = 1;

    // --- Fetch response from chat endpoint ---
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, clientId: CLIENT_ID })
      });
      const data = await response.json();
      addMessage("bot", data.reply || "Sorry, I don't know how to answer that.");
    } catch (err) {
      console.error("Chat error:", err);
      addMessage("bot", "Oops, something went wrong.");
    }
  }

  // --- Send on button click ---
  sendBtn.addEventListener("click", sendMessage);

  // --- Send on Enter (Shift+Enter for new line) ---
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // --- Auto resize textarea ---
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";
  });
})();


