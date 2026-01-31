// public/widget.js
(() => {
  const CLIENT_ID = window.CLIENT_ID;

  // Create chat window elements
  const messengerIcon = document.createElement('div');
  messengerIcon.id = 'chat-messenger-icon';
  messengerIcon.style.position = 'fixed';
  messengerIcon.style.bottom = '20px';
  messengerIcon.style.right = '20px';
  messengerIcon.style.width = '60px';
  messengerIcon.style.height = '60px';
  messengerIcon.style.borderRadius = '50%';
  messengerIcon.style.backgroundColor = '#6C3BAA'; // fallback
  messengerIcon.style.cursor = 'pointer';
  messengerIcon.style.display = 'flex';
  messengerIcon.style.alignItems = 'center';
  messengerIcon.style.justifyContent = 'center';
  messengerIcon.style.color = '#fff';
  messengerIcon.style.fontWeight = 'bold';
  messengerIcon.style.fontSize = '24px';
  messengerIcon.style.zIndex = '9999';
  messengerIcon.textContent = '💬';
  document.body.appendChild(messengerIcon);

  const chatWindow = document.createElement('div');
  chatWindow.id = 'chat-window';
  chatWindow.style.position = 'fixed';
  chatWindow.style.bottom = '90px';
  chatWindow.style.right = '20px';
  chatWindow.style.width = '300px';
  chatWindow.style.maxHeight = '400px';
  chatWindow.style.backgroundColor = '#fff';
  chatWindow.style.border = '1px solid #ccc';
  chatWindow.style.borderRadius = '8px';
  chatWindow.style.display = 'none';
  chatWindow.style.flexDirection = 'column';
  chatWindow.style.overflow = 'hidden';
  chatWindow.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  chatWindow.style.zIndex = '9999';
  document.body.appendChild(chatWindow);

  const chatHeader = document.createElement('div');
  chatHeader.id = 'chat-header';
  chatHeader.style.backgroundColor = '#6C3BAA';
  chatHeader.style.color = '#fff';
  chatHeader.style.padding = '10px';
  chatHeader.style.fontWeight = 'bold';
  chatHeader.style.display = 'flex';
  chatHeader.style.alignItems = 'center';
  chatHeader.style.gap = '10px';
  chatWindow.appendChild(chatHeader);

  const logoImg = document.createElement('img');
  logoImg.id = 'chat-logo';
  logoImg.style.width = '30px';
  logoImg.style.height = '30px';
  logoImg.style.objectFit = 'contain';
  chatHeader.appendChild(logoImg);

  const titleSpan = document.createElement('span');
  titleSpan.textContent = 'Chat';
  chatHeader.appendChild(titleSpan);

  const chatBody = document.createElement('div');
  chatBody.id = 'chat-body';
  chatBody.style.flex = '1';
  chatBody.style.padding = '10px';
  chatBody.style.overflowY = 'auto';
  chatWindow.appendChild(chatBody);

  const chatInputContainer = document.createElement('div');
  chatInputContainer.style.display = 'flex';
  chatInputContainer.style.borderTop = '1px solid #ccc';
  chatWindow.appendChild(chatInputContainer);

  const chatInput = document.createElement('textarea');
  chatInput.style.flex = '1';
  chatInput.style.resize = 'none';
  chatInput.style.padding = '10px';
  chatInput.style.border = 'none';
  chatInput.style.outline = 'none';
  chatInput.rows = 1;
  chatInputContainer.appendChild(chatInput);

  const sendButton = document.createElement('button');
  sendButton.textContent = 'Send';
  sendButton.style.padding = '0 15px';
  sendButton.style.border = 'none';
  sendButton.style.backgroundColor = '#6C3BAA';
  sendButton.style.color = '#fff';
  sendButton.style.cursor = 'pointer';
  chatInputContainer.appendChild(sendButton);

  messengerIcon.addEventListener('click', () => {
    chatWindow.style.display = chatWindow.style.display === 'none' ? 'flex' : 'none';
  });

  // Fetch client data from secure endpoint
  let clientData = {};
  async function loadClientData() {
    try {
      const res = await fetch(`/api/clientdata?client_id=${CLIENT_ID}`);
      clientData = await res.json();
      // Apply client info
      chatHeader.style.backgroundColor = clientData.primaryColor || '#6C3BAA';
      titleSpan.textContent = clientData.name || 'Chat';
      logoImg.src = clientData.logo_url || '';
      sendButton.style.backgroundColor = clientData.primaryColor || '#6C3BAA';
      messengerIcon.style.backgroundColor = clientData.primaryColor || '#6C3BAA';
    } catch (err) {
      console.error('Failed to load client data', err);
    }
  }

  loadClientData();

  function addMessage(text, isBot = true) {
    const msg = document.createElement('div');
    msg.textContent = text;
    msg.style.marginBottom = '8px';
    msg.style.padding = '6px 10px';
    msg.style.borderRadius = '4px';
    msg.style.maxWidth = '80%';
    msg.style.alignSelf = isBot ? 'flex-start' : 'flex-end';
    msg.style.backgroundColor = isBot ? '#f1f0f0' : '#DCF8C6';
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    addMessage(message, false);
    chatInput.value = '';
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, client_id: CLIENT_ID }),
      });
      const data = await res.json();
      addMessage(data.reply || "Sorry, I couldn't understand that.");
    } catch (err) {
      addMessage('Error sending message.');
      console.error(err);
    }
  }

  sendButton.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
})();



