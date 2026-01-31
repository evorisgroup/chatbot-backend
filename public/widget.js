(function () {
  if (!window.CLIENT_ID) return;

  const API_BASE = "/api";
  const CLIENT_ID = window.CLIENT_ID;

  let clientData = null;
  let chatOpen = false;

  /* =========================================================
     HARD MOBILE FIXES (DO NOT REMOVE)
  ========================================================= */

  // 1. Inject viewport meta if missing or wrong
  (function ensureViewportMeta() {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "viewport";
      document.head.appendChild(meta);
    }
    meta.content =
      "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no";
  })();

  function isTouchDevice() {
    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0
    );
  }

  function isMobile() {
    return isTouchDevice();
  }

  function getSafeHeight() {
    if (window.visualViewport && window.visualViewport.height) {
      return window.visualViewport.height;
    }
    return window.innerHeight;
  }

  /* =========================================================
     DOM HELPERS
  ========================================================= */

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

  /* =========================================================
     LOAD CLIENT DATA
  ========================================================= */

  fetch(`${API_BASE}/clientdata?client_id=${CLIENT_ID}`)
    .then(r => r.json())
    .then(data => {
      clientData = data;
      initWidget();
    });

  /* =========================================================
     INIT
  ========================================================= */

  function initWidget() {
    const brand = safeColor(clientData.primary_color, "#2563eb");
    const mobile = isMobile();

    /* ---- ROOT ---- */

    const root = el("div", {
      style: {
        position: "fixed",
        inset: "0",
        zIndex: 9999,
        visibility: "hidden",
        opacity: "0",
        transition: "opacity 0.2s ease",
        pointerEvents: "none"
      }
    });
    document.body.appendChild(root);

    /* ---- BUBBLE ---- */

    const bubble = el("div", {
      style: {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: mobile ? "72px" : "56px",
        height: mobile ? "72px" : "56px",
        borderRadius: "50%",
        background: brand,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "26px",
        cursor: "pointer",
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        pointerEvents: "auto"
      },
      onclick: toggleChat
    });
    bubble.textContent = "💬";

    /* ---- CHAT WINDOW ---- */

    const chat = el("div", {
      style: {
        position: "fixed",
        left: mobile ? "8px" : "auto",
        right: mobile ? "8px" : "20px",
        bottom: mobile ? "8px" : "90px",
        width: mobile ? "auto" : "360px",
        height: mobile ? `${getSafeHeight() - 16}px` : "520px",
        background: "#fff",
        borderRadius: "16px",
        boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
        display: "none",
        flexDirection: "column",
        overflow: "hidden",
        pointerEvents: "auto"
      }
    });

    /* ---- HEADER ---- */

    const header = el("div", {
      style: {
        background: brand,
        color: "#fff",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: "0"
      }
    });

    const headerLeft = el("div", {
      style: { display: "flex", alignItems: "center", gap: "10px" }
    });

    if (clientData.logo_url) {
      const logoWrap = el("div", {
        style: {
          width: "36px",
          height: "36px",
          borderRadius: "6px",
          overflow: "hidden",
          background: "#fff"
        }
      });
      logoWrap.appendChild(
        el("img", {
          src: clientData.logo_url,
          style: { width: "100%", height: "100%", objectFit: "cover" }
        })
      );
      headerLeft.appendChild(logoWrap);
    }

    headerLeft.appendChild(
      el("div", { style: { fontWeight: "600" } },
        [document.createTextNode(clientData.company_name || "Chat")]
      )
    );

    const closeBtn = el("div", {
      style: { fontSize: "22px", cursor: "pointer" },
      onclick: toggleChat
    }, [document.createTextNode("×")]);

    header.appendChild(headerLeft);
    header.appendChild(closeBtn);

    /* ---- MESSAGES ---- */

    const messages = el("div", {
      style: {
        flex: "1",
        padding: mobile ? "16px" : "12px",
        overflowY: "auto",
        background: "#f8fafc",
        fontSize: mobile ? "16px" : "14px"
      }
    });

    /* ---- INPUT ---- */

    const inputWrap = el("div", {
      style: {
        padding: "10px",
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        gap: "8px",
        flexShrink: "0"
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
        fontSize: "16px", // 🔒 critical: prevents iOS zoom
        outline: "none"
      }
    });

    input.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    const sendBtn = el("button", {
      style: {
        background: brand,
        color: "#fff",
        border: "none",
        borderRadius: "12px",
        padding: "0 16px",
        fontSize: "14px",
        cursor: "pointer"
      },
      onclick: sendMessage
    }, [document.createTextNode("Send")]);

    inputWrap.appendChild(input);
    inputWrap.appendChild(sendBtn);

    chat.appendChild(header);
    chat.appendChild(messages);
    chat.appendChild(inputWrap);

    root.appendChild(bubble);
    root.appendChild(chat);

    addMessage(
      `Hi! I’m the virtual assistant for ${clientData.company_name}. How can I help you today?`,
      "bot"
    );

    requestAnimationFrame(() => {
      root.style.visibility = "visible";
      root.style.opacity = "1";
      root.style.pointerEvents = "auto";
    });

    /* ---- FUNCTIONS ---- */

    function toggleChat() {
      chatOpen = !chatOpen;
      chat.style.display = chatOpen ? "flex" : "none";
    }

    function addMessage(text, who) {
      const msg = el("div", {
        style: {
          marginBottom: "10px",
          maxWidth: "85%",
          padding: "12px 14px",
          borderRadius: "12px",
          background: who === "user" ? brand : "#e5e7eb",
          color: who === "user" ? "#fff" : "#000",
          alignSelf: who === "user" ? "flex-end" : "flex-start"
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
        body: JSON.stringify({ client_id: CLIENT_ID, message: text })
      })
        .then(r => r.json())
        .then(r => addMessage(r.reply, "bot"))
        .catch(() => addMessage("Sorry, something went wrong.", "bot"));
    }
  }
})();



