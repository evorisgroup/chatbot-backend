// ==========================
// CLIENT-FACING CHAT WIDGET
// ==========================

// ----- 1. Configuration per client -----
const clientInfo = {
  companyName: "Acme Corp",
  products: ["Widget A", "Widget B"],
  contact: "contact@acme.com"
};

const apiEndpoint = "https://chatbot-backend-tawny-alpha.vercel.app/api/chat"; // your Vercel API

// ----- 2. Send message to AI backend -----
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

// ----- 3. Create floating chat container -----
const chatContainer = document.createElement("div");
chatContainer.style.position = "fixed";
chatContainer.style.bottom = "20px";
chatContainer.style.right = "20px";
chatContainer.style.width = "300px";
chatContainer.style.height = "400px";
chatContainer.style.backgroundColor = "#fff";
chatContainer.style.border = "1px solid #ccc";
chatContainer.style.borderRadius = "10px";
chatContainer.style.boxShadow = "0 0 10px rgba(0,0,0,0.2)";
chatContainer.style.display = "flex";
chatContainer.style.flexDirection = "column";
chatContainer.style.overflow = "hidden";
chatContainer.style.fontFamily = "Arial, sans-serif";
chatContainer.style.zIndex = "9999"; // on top
document.body.appendChild(chatContainer);

// ----- 4. Output area -----
const output = document.createElement("div");
output.style.flex = "1";
output.style.padding = "10px";
output.style.overflowY = "auto";
chatContainer.appendChild(output);

// ----- 5. Input area -----
const inputWrapper = document.createElement("div");
inputWrapper.style.display = "flex";
inputWrapper.style.borderTop = "1px solid #ccc";
chatContainer.appendChild(inputWrapper);

const input = document.createElement("input");
input.style.flex = "1";
input.style.border = "none";
input.style.padding = "10px";
input.style.outline = "none";
input.placeholder = "Ask us something...";
inputWrapper.appendChild(input);

const button = document.createElement("button");
button.innerText = "Send";
button.style.padding = "10px";
button.style.border = "none";
button.style.backgroundColor = "#007bff";
button.style.color = "#fff";
button.style.cursor = "pointer";
inputWrapper.appendChild(button);

// ----- 6. Handle sending messages -----
button.onclick = async () => {
  if (!input.value) return;
  const userMessage = document.createElement("p");
  userMessage.innerText = "You: " + input.value;
  output.appendChild(userMessage);

  const reply = await sendMessageToAI(input.value);
  const botMessage = document.createElement("p");
  botMessage.innerText = clientInfo.companyName + " Bot: " + reply;
  output.appendChild(botMessage);

  output.scrollTop = output.scrollHeight;
  input.value = "";
};

// Optional: send message on Enter key
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") button.click();
});
