// ==========================
// PROFESSIONAL FLOATING CHAT WIDGET
// ==========================

// ----- 1. Client info (customize per client) -----
const clientInfo = {
  companyName: "Acme Corp",
  products: ["Widget A", "Widget B", "Widget C"],
  contact: "contact@acme.com"
};

const apiEndpoint = "https://chatbot-backend-tawny-alpha.vercel.app/api/chat";

// ----- 2. Send message to AI -----
async function sendMessageToAI(message) {
  const messageWithContext = `${message}\nUse this company info: ${JSON.stringify(clientInfo)}`;
  const response = await fetch(apiEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: messageWithContext })
  });
  const data = await response.json();
  return data.reply;
}

// ----- 3. Create floating icon -----
const chatIcon = document.createElement("div");
chatIcon.style.position = "fixed";
chatIcon.style.bottom = "20px";
chatIcon.style.right = "20px";
chatIcon.style.width = "60px";
chatIcon.style.height = "60px";
chatIcon.style.backgroundColor = "#007bff";
chatIcon.style.borderRadius = "50%";
chatIcon.style.cursor = "pointer";
chatIcon.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
chatIcon.style.display = "flex";
chatIcon.style.alignItems = "center";
chatIcon.style.justifyContent = "center";
chatIcon.style.zIndex = "9999";
chatIcon.title = "Chat with us";
chatIcon.innerHTML = `<svg style="width:28px;height:28px;fill:#fff;" viewBox="0 0 24 24"><path d="M12,3C7.03,3,3,6.58,3,11C3,13.5,4.5,15.71,7,16.96V21L11.04,18.97C11.69,19.08,12.34,19.13,13,19.13C17.97,19.13,22,15.55,22,11.13C22,6.71,17.97,3,13,3H12Z" /></svg>`;
document.body.appendChild(chatIcon);

// ----- 4. Create chat container (hidden by default) -----
const chatContainer = document.createElement("div");
chatContainer.style.position = "fixed";
chatContainer.style.bottom = "90px";
chatContainer.style.right = "20px";
chatContainer.style.width = "320px";
chatContainer.style.height = "420px";
chatContainer.style.backgroundColor = "#fff";
chatContainer.style.borderRadius = "15px";
chatContainer.style.boxShadow = "0 4px 16px rgba(0,0,0,0.3)";
chatContainer.style.display = "none"; // hidden initially
chatContainer.style.flexDirection = "column";
chatContainer.style.overflow = "hidden";
chatContainer.style.fontFamily = "Arial, sans-serif";
chatContainer.style.zIndex = "9999";
document.body.appendChild(chatContainer);

// ----- 5. Output area -----
const output = document.createElement("div");
output.style.flex = "1";
output.style.padding = "10px";
output.style.overflowY = "auto";
output.style.fontSize = "14px";
chatContainer.appendChild(output);

// ----- 6. Input area -----
const inputWrapper = document.createElement("div");
inputWrapper.style.display = "flex";
inputWrapper.style.borderTop = "1px solid #ccc";
chatContainer.appendChild(inputWrapper);

const input = document.createElement("input");
input.style.flex = "1";
input.style.border = "none";
input.style.padding = "10px";
input.style.outline = "none";
input.placeholder = "Type your question...";
inputWrapper.appendChild(input);

const button = document.createElement("button");
button.innerText = "Send";
button.style.padding = "10px";
button.style.border = "none";
button.style.backgroundColor = "#007bff";
button.style.color = "#fff";
button.style.cursor = "pointer";
inputWrapper.appendChild(button);

// ----- 7. Toggle chat window -----
chatIcon.onclick = () => {
  chatContainer.style.display = chatContainer.style.display === "none" ? "flex" : "none";
};

// ----- 8. Handle sending messages -----
async function handleMessage() {
  if (!input.value) return;
  const userMessage = document.createElement("p");
  userMessage.innerText = "You: " + input.value;
  userMessage.style.margin = "5px 0";
  userMessage.style.fontWeight = "bold";
  output.appendChild(userMessage);

  const reply = await sendMessageToAI(input.value);
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
