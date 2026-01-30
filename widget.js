// ==========================
// PROFESSIONAL DYNAMIC CHAT WIDGET WITH ANIMATION, SOUND & ANIMATED TYPING
// ==========================

// ===== DEFAULT CLIENT CONFIG =====
let clientInfo = {
  companyName: "Default Company",
  products: [],
  contact: "",
  logoURL: "",
  primaryColor: "#007bff"
};

// ===== MERGE CLIENT CONFIG IF PROVIDED =====
if (window.CLIENT_CHAT_CONFIG) {
  clientInfo = { ...clientInfo, ...window.CLIENT_CHAT_CONFIG };
}

// ===== SOUND EFFECTS (SHORT & QUIET) =====
const sendSound = new Audio("https://freesound.org/data/previews/402/402264_5121236-lq.mp3"); // subtle send
const receiveSound = new Audio("https://freesound.org/data/previews/402/402265_5121236-lq.mp3"); // subtle receive

// ===== SEND MESSAGE FUNCTION =====
async function sendMessageToAI(message) {
  const messageWithContext = `${message}\nUse this company info: ${JSON.stringify(clientInfo)}`;
  const response = await fetch("https://chatbot-backend-tawny-alpha.vercel.app/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: messageWithContext })
  });
  const data = await response.json();
  return data.reply;
}

// ===== FLOATING MESSENGER ICON =====
const chatIcon = document.createElement("div");
chatIcon.style.position = "fixed";
chatIcon.style.bottom = "20px";
chatIcon.style.right = "20px";
chatIcon.style.width = "60px";
chatIcon.style.height = "60px";
chatIcon.style.backgroundColor = clientInfo.primaryColor;
chatIcon.style.borderRadius = "50%";
chatIcon.style.cursor = "pointer";
chatIcon.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
chatIcon.style.display = "flex";
chatIcon.style.alignItems = "center";
chatIcon.style.justifyContent = "center";
chatIcon.style.zIndex = "9999";
chatIcon.title = "Chat with us";
chatIcon.style.transition = "transform 0.2s ease-in-out";
chatIcon.onmouseover = () => chatIcon.style.transform = "scale(1.1)";
chatIcon.onmouseout = () => chatIcon.style.transform = "scale(1)";
chatIcon.innerHTML = `<svg style="width:28px;height:28px;fill:#fff;" viewBox="0 0 24 24"><path d="M12,3C7.03,3,3,6.58,3,11C3,13.5,4.5,15.71,7,16.96V21L11.04,18.97C11.69,19.08,12.34,19.13,13,19.13C17.97,19.13,22,15.55,22,11.13C22,6.71,17.97,3,13,3H12Z" /></svg>`;
document.body.appendChild(chatIcon);

// ===== CHAT WINDOW =====
const chatContainer = document.createElement("div");
chatContainer.style.position = "fixed";
chatContainer.style.bottom = "90px";
chatContainer.style.right = "20px";
chatContainer.style.width = "320px";
chatContainer.style.height = "440px";
chatContainer.style.backgroundColor = "#fff";
chatContainer.style.borderRadius = "15px";
chatContainer.style.boxShadow = "0 4px 16px rgba(0,0,0,0.3)";
chatContainer.style.display = "none"; // hidden initially
chatContainer.style.flexDirection = "column";
chatContainer.style.overflow = "hidden";
chatContainer.style.fontFamily = "Arial, sans-serif";
chatContainer.style.zIndex = "9999";
chatContainer.style.transform = "translateY(100px)";
chatContainer.style.opacity = "0";
chatContainer.style.transition = "all 0.3s ease";
document.body.appendChild(chatContainer);

// ===== HEADER =====
const header = document.createElement("div");
header.style.position = "relative";
header.style.height = "60px";
header.style.backgroundColor = clientInfo.primaryColor;
header.style.display = "flex";
header.style.alignItems = "center";
header.style.justifyContent = "center"; // center company name
header.style.borderTopLeftRadius = "15px";
header.style.borderTopRightRadius = "15px";
chatContainer.appendChild(header);

// Logo top-left
const logo = document.createElement("img");
logo.src = clientInfo.logoURL || "https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg";
logo.style.height = "40px";
logo.style.width = "auto";
logo.style.position = "absolute";
logo.style.left = "10px";
logo.style.top = "10px";
logo.style.borderRadius = "5px";
header.appendChild(logo);

// Company name centered
const title = document.createElement("span");
title.innerText = clientInfo.companyName;
title.style.color = "#fff";
title.style.fontWeight = "bold";
title.style.fontSize = "16px";
title.style.textAlign = "center";
header.appendChild(title);

// ===== OUTPUT AREA =====
const output = document.createElement("div");
output.style.flex = "1";
output.style.padding = "10px";
output.style.overflowY = "auto";
output.style.fontSize = "14px";
chatContainer.appendChild(output);

// ===== INPUT AREA =====
const inputWrapper = document.createElement("div");
inputWrapper.style.display = "flex";
inputWrapper.style.borderTop = `1px solid ${clientInfo.primaryColor}`;
chatContainer.appendChild(inputWrapper);

const input = document.createElement("input");
input.style.flex = "1";
input.style.border = "none";
input.style.padding = "10px";
input.style.outline = "none";
input.style.fontWeight = "bold";
input.style.fontFamily = "Arial, sans-serif";
input.placeholder = "Type your question...";
inputWrapper.appendChild(input);

const button = document.createElement("button");
button.innerText = "Send";
button.style.padding = "10px";
button.style.border = "none";
button.style.backgroundColor = clientInfo.primaryColor;
button.style.color = "#fff";
button.style.cursor = "pointer";
inputWrapper.appendChild(button);

// ===== TOGGLE CHAT WINDOW WITH FIXED ANIMATION =====
let open = false;
chatContainer.style.display = "none"; // ensure hidden initially

chatIcon.onclick = () => {
  open = !open;
  if (open) {
    chatContainer.style.display = "flex";
    setTimeout(() => {
      chatContainer.style.opacity = "1";
      chatContainer.style.transform = "translateY(0)";
    }, 10);
  } else {
    chatContainer.style.opacity = "0";
    chatContainer.style.transform = "translateY(100px)";
    setTimeout(() => {
      chatContainer.style.display = "none";
    }, 300);
  }
};

// ===== TYPING INDICATOR =====
const typingIndicator = document.createElement("p");
typingIndicator.style.margin = "5px 0";
typingIndicator.style.fontStyle = "italic";
typingIndicator.style.color = "#888";
typingIndicator.style.display = "none";
output.appendChild(typingIndicator);

let typingDotsInterval;

function startTypingIndicator() {
  typingIndicator.style.display = "block";
  let dots = 0;
  typingIndicator.innerText = clientInfo.companyName + " Bot is typing";
  typingDotsInterval = setInterval(() => {
    dots = (dots + 1) % 4;
    typingIndicator.innerText = clientInfo.companyName + " Bot is typing" + ".".repeat(dots);
    output.scrollTop = output.scrollHeight;
  }, 500);
}

function stopTypingIndicator() {
  typingIndicator.style.display = "none";
  clearInterval(typingDotsInterval);
}

// ===== HANDLE MESSAGES =====
async function handleMessage() {
  if (!input.value) return;

  // User message
  const userMessage = document.createElement("p");
  userMessage.innerText = "You: " + input.value;
  userMessage.style.margin = "5px 0";
  userMessage.style.fontWeight = "bold";
  output.appendChild(userMessage);
  sendSound.play();

  // Show animated typing
  startTypingIndicator();

  // AI reply
  const reply = await sendMessageToAI(input.value);

  stopTypingIndicator();
  receiveSound.play();

  const botMessage = document.createElement("p");
  botMessage.innerText = clientInfo.companyName + " Bot: " + reply;
  botMessage.style.margin = "5px 0";
  botMessage.style.color = "#555";
  output.appendChild(botMessage);

  output.scrollTop = output.scrollHeight;
  input.value = "";
}

button.onclick = handleMessage;
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleMessage();
});
