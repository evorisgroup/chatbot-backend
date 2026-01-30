// Simple chatbot widget
async function sendMessageToAI(message) {
  const response = await fetch("https://chatbot-backend-tawny-alpha.vercel.app/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });
  const data = await response.json();
  return data.reply;
}

// Example usage: create a simple prompt
const input = document.createElement("input");
input.placeholder = "Ask me something...";
document.body.appendChild(input);

const button = document.createElement("button");
button.innerText = "Send";
document.body.appendChild(button);

const output = document.createElement("div");
document.body.appendChild(output);

button.onclick = async () => {
  const reply = await sendMessageToAI(input.value);
  output.innerText = reply;
};
