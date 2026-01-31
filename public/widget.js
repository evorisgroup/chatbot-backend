(function () {
  if (!window.CLIENT_ID) return;

  const API_BASE = "/api";
  const CLIENT_ID = window.CLIENT_ID;

  let clientData = null;
  let chat = null;
  let chatOpen = false;

  /* =========================================================
     HARD REQUIREMENTS (LOCKED)
  ========================================================= */

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

  function supportsHover() {
    return window.matchMedia("(hover: hover)").matches;
  }

  function isTouchDevice() {
    return navigator.maxTouchPoints > 0;
  }

  function isMobileNow() {
    return isTouchDevice() && !supportsHover();
  }

  function safeHeight() {
    return window.visualViewport
      ? window.visualViewport.height
      : window.innerHeight;
  }

  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "style") Object.assign(e.style, v);
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    });
    children.forEach(c => e.appendChild(c));
    return e;
  }

  function safeColor(c, f) {
    return typeof c === "string" && c.startsWith("#") ? c : f;
  }

  /* =========================================================
     LAUNCHER (ALWAYS VISIBLE)
  ========================================================= */

  const bubble = el("div", {
    style: {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      width: "56px",
      height: "56px",
      borderRadius: "50%",
      background: "#2563eb",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "26px",
      cursor: "pointer",
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      zIndex: 9999,
      transition: "transform 0.15s ease, box-shadow 0.15s ease"
    },
    onclick: toggleChat
  });
  bubble.textContent = "💬";

  if (supportsHover()) {
    bubble.onmouseenter = () => {
      bubble.style.transform = "scale(1.06)";
      bubble.style.boxShadow = "0 12px 32px rgba(0,0,0,0.35)";
    };
    bubble.onmouseleave = () => {
      bubble.style.transform = "none";
      bubble.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
    };
  }

  document.body.appendChild(bubble);

  /* =========================================================
     LOAD CLIENT DATA (NON-BLOCKING)
  ========================================================= */

  fetch(`${API_BASE}/clientdata?client_id=${CLIENT_ID}`)
    .then(r => r.json())
    .then(data => {
      clientData = data;
      const brand = safeColor(data.primary_color, "#2563eb");
      bubble.style.background = brand;
    })
    .catch(() => {});

  /* =========================================================
     BUILD CHAT (ON DEMAND)
  ========================================================= */

  function buildChat() {
    if (chat) return;

    const brand = safeColor(clientData?.primary_color, "#2563eb");

    chat = el("div", {
      style: {
        position: "fixed",
        background: "#fff",
        borderRadius: "16px",
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

    if (clientData?.logo_url) {
      const logoWrap = el("div", {
        style: {
          width: "36px",
          height: "36px",
          borderRadius: "6px",
          overflow: "hidden",
          background: "#fff",
          flexShrink: "0"
        }
      });

      logoWrap.appendChild(
        el("img", {
          src: clientData.logo_url,
          style: {
            width: "100%",
            height: "100%",
            objectFit: "cover"
          }
        })
      );

      headerLeft.appendChild(logoWrap);
    }

    headerLeft.appendChild(
      el(
        "div",
        { style: { fontWeight: "600", fontSize: "15px" } },
        [document.createTextNode(clientData?.company_name || "Chat")]
      )
    );

    const closeBtn = el(
      "div",
      {
        style: {
          fontSize: "22px",
          cursor: "pointer",
          transition: "transform 0.15s ease, opacity 0.15s ease"
        },
        onclick: toggleChat
      },
      [document.createTextNode("×")]
    );

    if (supportsHover()) {
      closeBtn.onmouseenter = () => {
        closeBtn.style.transform = "scale(1.2)";
        closeBtn.style.opacity = "0.85";
      };
      closeBtn.onmouseleave = () => {
        closeBtn.style.transform = "none";
        closeBtn.style.opacity = "1";
      };
    }

    header.appendChild(headerLeft);
    header.appendChild(closeBtn);

    /* ---- Messages ---- */

    const messages = el("div", {
      style: {
        flex: "1",
        padding: "16px",
        overflowY: "auto",
        background: "#f8fafc",
        fontSize: "15px"
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
        fontSize: "16px",
        outline: "none",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease"
      }
    });

    input.onfocus = () => {
      input.style.borderColor = brand;
      input.style.boxShadow = `0 0 0 2px ${brand}33`;
    };
    input.onblur = () => {
      input.style.borderColor = "#d1d5db";
      input.style.boxShadow = "none";
    };

    input.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    const sendBtn = el(
      "button",
      {
        style: {
          background: brand,
          color: "#fff",
          border: "none",
          borderRadius: "12px",
          padding: "0 16px",
          cursor: "pointer",
          transition: "transform 0.15s ease, box-shadow 0.15s ease"
        },
        onclick: sendMessage
      },
      [document.createTextNode("Send")]
    );

    if (supportsHover()) {
      sendBtn.onmouseenter = () => {
        sendBtn.style.transform = "translateY(-1px)";
        sendBtn.style.boxShadow = "0 6px 16px rgba(0,0,0,0.25)";
      };
      sendBtn.onmouseleave = () => {
        sendBtn.style.transform = "none";
        sendBtn.style.boxShadow = "none";
      };
    }

    inputWrap.appendChild(input);
    inputWrap.appendChild(sendBtn);

    chat.appendChild(header);
    chat.appendChild(messages);
    chat.appendChild(inputWrap);
    document.body.appendChild(chat);

    /* ---- Default message (no tokens) ---- */

    addMessage(
      `Hi! I’m the virtual assistant for ${clientData?.company_name || "this company"}. How can I help you today?`,
      "bot"
    );

    function addMessage(text, who) {
      const msg = el(
        "div",
        {
          style: {
            marginBottom: "10px",
            maxWidth: "85%",
            padding: "12px 14px",
            borderRadius: "12px",
            background: who === "user" ? brand : "#e5e7eb",
            color: who === "user" ? "#fff" : "#000",
            alignSelf: who === "user" ? "flex-end" : "flex-start"
          }
        },
        [document.createTextNode(text)]
      );
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
        .catch(() =>
          addMessage("Sorry, something went wrong.", "bot")
        );
    }
  }

  /* =========================================================
     TOGGLE CHAT (LAYOUT DECIDED HERE)
  ========================================================= */

  function toggleChat() {
    chatOpen = !chatOpen;

    if (!chatOpen) {
      if (chat) chat.style.display = "none";
      return;
    }

    buildChat();

    const mobile = isMobileNow();

    if (mobile) {
      chat.style.left = "8px";
      chat.style.right = "8px";
      chat.style.bottom = "8px";
      chat.style.width = "auto";
      chat.style.height = `${safeHeight() - 16}px`;
    } else {
      chat.style.left = "auto";
      chat.style.right = "20px";
      chat.style.bottom = "90px";
      chat.style.width = "360px";
      chat.style.height = "520px";
    }

    chat.style.display = "flex";
  }
})();


