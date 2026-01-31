(function () {
  if (!window.CLIENT_ID) {
    console.error("CLIENT_ID not set");
    return;
  }

  const API_BASE = "/api";
  const CLIENT_ID = window.CLIENT_ID;

  let clientData = null;
  let chatOpen = false;

  /* =========================================================
     HELPERS
  ========================================================= */

  function isMobile() {
    return window.matchMedia("(max-width: 768px)").matches;
  }

  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "style") Object.assign(e.style, v);
      else if (k.startsWith("on")) e.addEventListener(k.substring(2), v);
      else e.setAttribute(k, v);
    });
    children.forEach(c => e.appendChild(c));
    return e;
  }

  function safeColor(color, fallback) {
    return typeof color === "string" && color.startsWith("#")
      ? color
      : fallback;
  }

  function hoverable(styleBase, styleHover) {
    if (isMobile()) return styleBase;

    return {
      ...styleBase,
      transition: "all 0.18s ease",
      onmouseenter: e => Object.assign(e.currentTarget.style, styleHover),
      onmouseleave: e => Object.assign(e.currentTarget.style, styleBase)
    };
  }

  /* =========================================================
     LOAD CLIENT DATA
  ========================================================= */

  fetch(`${API_BASE}/clientdata?client_id=${CLIENT_ID}`)
    .then(r => r.json())
    .then(data => {
      clientData = data;
      initWidget();
    })
    .catch(err => {
      console.error("Failed to load client data", err);
    });

  /* =========================================================
     INIT
  ========================================================= */

  function initWidget() {
    const brand = safeColor(clientData.primary_color, "#2563eb");

    /* ---- Bubble ---- */

    const bubbleBase = {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      width: isMobile() ? "64px" : "56px",
      height: isMobile() ? "64px" : "56px",
      borderRadius: "50%",
      background: brand,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "26px",
      cursor: "pointer",
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      zIndex: 9999
    };

    const bubbleHover = {
      transform: "scale(1.06)",
      boxShadow: "0 12px 32px rgba(0,0,0,0.35)"
    };

    const bubble = el("div", {
      ...hoverable(bubbleBase, bubbleHover),
      onclick: toggleChat
    });

    bubble.textContent = "💬";
    document.body.appendChild(bubble);

    /* ---- Chat Window ---- */

    const chat = el("div", {
      id: "chat-widget",
      style: {
        position: "fixed",
        bottom: isMobile() ? "0" : "90px",
        right: isMobile() ? "0" : "20px",
        width: isMobile() ? "100vw" : "360px",
        height: isMobile() ? "100vh" : "520px",
        background: "#fff",
        borderRadius: isMobile() ? "0" : "16px",
        boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
        display: "none",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 9999
      }
    });

    /* ---- Header ---- */

    const header = el("div", {
      style: {
        background: brand,
        color: "#fff",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }
    });

    const headerLeft = el("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: "10px"
      }
    });

    if (clientData.logo_url) {
      headerLeft.appendChild(
        el("img", {
          src: clientData.logo_url,
          style: {
            width: "32px",
            height: "32px",
            borderRadius: "6px",
            objectFit: "contain",
            background: "#fff",
            padding: "2px"
          }
        })
      );
    }

    headerLeft.appendChild(
      el("div", {
        style: { fontWeight: "600", fontSize: "15px" }
      }, [document.createTextNode(clientData.company_name || "Chat")])
    );

    const closeBase = {
      fontSize: "22px",
      cursor: "pointer",
      lineHeight: "1"
    };

    const closeHover = {
      transform: "scale(1.2)",
      opacity: "0.85"
    };

    const closeBtn = el("div", {
      ...hoverable(closeBase, closeHover),
      onclick: toggleChat
    }, [document.createTextNode("×")]);

    header.appendChild(headerLeft);
    header.appendChild(closeBtn);

    /* ---- Messages ---- */

    const messages = el("div", {
      style: {
        flex: "1",
        padding: "12px",
        overflowY: "auto",
        background: "#f8fafc",
        fontSize: "14px"
      }
    });

    /* ---- Input ---- */

    const inputWrap = el("div", {
      style: {
        padding: "10px",
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        gap: "8px"
      }
    });

    const input = el("textarea", {
      rows: 1,
      placeholder: "Type a message…",
      style: {
        flex: "1",
        resize: "none",
        borderRadius: "12px",
        border: "1px solid #d1d5db",
        padding: "10px",
        fontSize: "14px",
        outline: "none",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease"
      },
      onfocus: e => {
        e.target.style.borderColor = brand;
        e.target.style.boxShadow = `0 0 0 2px ${brand}33`;
      },
      onblur: e => {
        e.target.style.borderColor = "#d1d5db";
        e.target.style.boxShadow = "none";
      }
    });

    const sendBase = {
      background: brand,
      color: "#fff",
      border: "none",
      borderRadius: "12px",
      padding: "0 16px",
      cursor: "pointer",
      fontSize: "14px"
    };

    const sendHover = {
      transform: "translateY(-1px)",
      boxShadow: "0 6px 16px rgba(0,0,0,0.25)"
    };

    const sendBtn = el("button", {
      ...hoverable(sendBase, sendHover),
      onclick: sendMessage
    }, [document.createTextNode("Send")]);

    inputWrap.appendChild(input);
    inputWrap.appendChild(sendBtn);

    /* ---- Assemble ---- */

    chat.appendChild(header);
    chat.appendChild(messages);
    chat.appendChild(inputWrap);
    document.body.appendChild(chat);

    /* ---- Default message (no tokens) ---- */

    addMessage(
      `Hi! I’m the virtual assistant for ${clientData.company_name}. How can I help you today?`,
      "bot"
    );

    /* =========================================================
       FUNCTIONS
    ========================================================= */

    function toggleChat() {
      chatOpen = !chatOpen;
      chat.style.display = chatOpen ? "flex" : "none";
    }

    function addMessage(text, who) {
      const msg = el("div", {
        style: {
          marginBottom: "8px",
          maxWidth: "85%",
          padding: "10px 12px",
          borderRadius: "12px",
          background: who === "user" ? brand : "#e5e7eb",
          color: who === "user" ? "#fff" : "#000",
          alignSelf: who === "user" ? "flex-end" : "flex-start",
          transition: "opacity 0.15s ease"
        }
      }, [document.createTextNode(text)]);

      messages.appendChild(msg);
      messages.scrollTop = messages.scrollHeight;
    }

    function sendMessage() {
      const text = input.value.trim();
      if (!text) return;

      addMessage(text, "user");
      input.value = "";

      fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          message: text
        })
      })
        .then(r => r.json())
        .then(r => addMessage(r.reply, "bot"))
        .catch(() => addMessage("Sorry, something went wrong.", "bot"));
    }
  }
})();

