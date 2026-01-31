(function () {
  if (!window.CLIENT_ID) return;

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

  function supportsHover() {
    return window.matchMedia("(hover: hover)").matches;
  }

  /* =========================================================
     LOAD CLIENT DATA FIRST
  ========================================================= */

  fetch(`${API_BASE}/clientdata?client_id=${CLIENT_ID}`)
    .then(r => r.json())
    .then(data => {
      clientData = data;
      initWidget();
    })
    .catch(() => {});

  /* =========================================================
     INIT (NO DOM FLASH)
  ========================================================= */

  function initWidget() {
    const brand = safeColor(clientData.primary_color, "#2563eb");

    /* ---- ROOT CONTAINER (HIDDEN) ---- */

    const root = el("div", {
      style: {
        position: "fixed",
        inset: "0",
        zIndex: 9999,
        pointerEvents: "none",
        visibility: "hidden",
        opacity: "0",
        transition: "opacity 0.2s ease"
      }
    });

    document.body.appendChild(root);

    /* ---- BUBBLE ---- */

    const bubble = el("div", {
      style: {
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
        pointerEvents: "auto"
      },
      onclick: toggleChat
    });

    bubble.textContent = "💬";

    if (supportsHover()) {
      bubble.style.transition = "transform 0.15s ease, box-shadow 0.15s ease";
      bubble.onmouseenter = () => {
        bubble.style.transform = "scale(1.06)";
        bubble.style.boxShadow = "0 12px 32px rgba(0,0,0,0.35)";
      };
      bubble.onmouseleave = () => {
        bubble.style.transform = "none";
        bubble.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
      };
    }

    /* ---- CHAT WINDOW ---- */

    const chat = el("div", {
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

    const closeBtn = el("div", {
      style: {
        fontSize: "22px",
        cursor: "pointer",
        lineHeight: "1",
        transition: "transform 0.15s ease, opacity 0.15s ease"
      },
      onclick: toggleChat
    }, [document.createTextNode("×")]);

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

    /* ---- MESSAGES ---- */

    const messages = el("div", {
      style: {
        flex: "1",
        padding: "12px",
        overflowY: "auto",
        background: "#f8fafc",
        fontSize: "14px"
      }
    });

    /* ---- INPUT ---- */

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

    const sendBtn = el("button", {
      style: {
        background: brand,
        color: "#fff",
        border: "none",
        borderRadius: "12px",
        padding: "0 16px",
        cursor: "pointer",
        fontSize: "14px",
        transition: "transform 0.15s ease, box-shadow 0.15s ease"
      },
      onclick: sendMessage
    }, [document.createTextNode("Send")]);

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

    root.appendChild(bubble);
    root.appendChild(chat);

    /* ---- INITIAL BOT MESSAGE ---- */

    addMessage(
      `Hi! I’m the virtual assistant for ${clientData.company_name}. How can I help you today?`,
      "bot"
    );

    /* ---- REVEAL AT ONCE ---- */

    requestAnimationFrame(() => {
      root.style.visibility = "visible";
      root.style.opacity = "1";
      root.style.pointerEvents = "auto";
    });

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

