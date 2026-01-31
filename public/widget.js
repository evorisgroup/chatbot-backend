/* ===============================
   ENSURE MOBILE VIEWPORT
   =============================== */
(function ensureViewport() {
  try {
    if (!document.querySelector('meta[name="viewport"]')) {
      const meta = document.createElement("meta");
      meta.name = "viewport";
      meta.content = "width=device-width, initial-scale=1";
      document.head.appendChild(meta);
    }
  } catch {}
})();

(() => {
  const CLIENT_ID = window.CLIENT_ID;
  if (!CLIENT_ID) return;

  let clientData = null;
  let chatOpen = false;

  /* ===============================
     HELPERS
     =============================== */
  function isMobile() {
    return window.innerWidth <= 768;
  }

  function getDayName(idx) {
    return [
      "sunday","monday","tuesday","wednesday",
      "thursday","friday","saturday"
    ][idx];
  }

  function formatTime(hm) {
    const [h, m] = hm.split(":").map(Number);
    const hour = h % 12 || 12;
    const ampm = h >= 12 ? "PM" : "AM";
    return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
  }

  function getTodayHours() {
    if (!clientData?.weekly_hours) return null;
    const day = getDayName(new Date().getDay());
    const ranges = clientData.weekly_hours[day] || [];
    if (!ranges.length) return null;
    return ranges.map(r => `${formatTime(r[0])} – ${formatTime(r[1])}`).join(", ");
  }

  function isBusinessOpen() {
    if (!clientData?.weekly_hours) return false;

    const todayISO = new Date().toISOString().split("T")[0];
    if (clientData.holiday_rules?.dates?.includes(todayISO)) return false;

    const now = new Date();
    const minsNow = now.getHours() * 60 + now.getMinutes();
    const day = getDayName(now.getDay());
    const ranges = clientData.weekly_hours[day] || [];

    return ranges.some(([s, e]) => {
      const [sh, sm] = s.split(":").map(Number);
      const [eh, em] = e.split(":").map(Number);
      return minsNow >= sh * 60 + sm && minsNow < eh * 60 + em;
    });
  }

  /* ===============================
     FETCH CLIENT DATA
     =============================== */
  async function loadClientData() {
    const res = await fetch(
      `https://chatbot-backend-tawny-alpha.vercel.app/api/clientdata?client_id=${CLIENT_ID}`
    );
    clientData = await res.json();
    applyBranding();
    renderCallStatusBar();
  }

  /* ===============================
     CHAT BUBBLE
     =============================== */
  const bubble = document.createElement("div");
  bubble.textContent = "💬";
  Object.assign(bubble.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    cursor: "pointer",
    boxShadow: "0 6px 18px rgba(0,0,0,.35)",
    zIndex: 999999
  });

  document.body.appendChild(bubble);

  /* ===============================
     CHAT WINDOW
     =============================== */
  const chat = document.createElement("div");
  Object.assign(chat.style, {
    position: "fixed",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 12px 32px rgba(0,0,0,.35)",
    opacity: "0",
    pointerEvents: "none",
    transform: "translateY(40px)",
    transition: "0.25s",
    zIndex: 999998,
    overflow: "hidden",
    borderRadius: "16px"
  });

  function sizeChat() {
    if (isMobile()) {
      Object.assign(chat.style, {
        top: "12px",
        bottom: "12px",
        left: "8px",
        right: "8px"
      });
    } else {
      Object.assign(chat.style, {
        width: "360px",
        height: "500px",
        bottom: "110px",
        right: "20px"
      });
    }
  }
  sizeChat();
  window.addEventListener("resize", sizeChat);
  document.body.appendChild(chat);

  /* ===============================
     HEADER
     =============================== */
  const header = document.createElement("div");
  Object.assign(header.style, {
    padding: "16px",
    color: "#fff",
    fontWeight: "600",
    borderTopLeftRadius: "16px",
    borderTopRightRadius: "16px"
  });

  const title = document.createElement("div");
  header.appendChild(title);
  chat.appendChild(header);

  /* ===============================
     CALL STATUS BAR
     =============================== */
  const callBar = document.createElement("a");
  Object.assign(callBar.style, {
    display: "none",
    padding: "12px 16px",
    fontSize: "14px",
    fontWeight: "500",
    textDecoration: "none",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomLeftRadius: "12px",
    borderBottomRightRadius: "12px",
    cursor: "pointer"
  });

  const callText = document.createElement("span");
  const callAction = document.createElement("span");
  callAction.textContent = "Call Now";

  callBar.append(callText, callAction);
  chat.appendChild(callBar);

  function renderCallStatusBar() {
    if (!clientData?.phone_number) return;
    if (!isBusinessOpen()) return;

    const hours = getTodayHours();
    if (!hours) return;

    callBar.href = `tel:${clientData.phone_number}`;
    callText.textContent = `Open Today · ${hours}`;
    callBar.style.display = "flex";
    callBar.style.background = clientData.primary_color;
    callBar.style.color = "#fff";
  }

  /* ===============================
     MESSAGES
     =============================== */
  const messages = document.createElement("div");
  Object.assign(messages.style, {
    flex: "1",
    padding: "16px",
    overflowY: "auto",
    background: "#fafafa"
  });
  chat.appendChild(messages);

  /* ===============================
     INPUT
     =============================== */
  const inputWrap = document.createElement("div");
  Object.assign(inputWrap.style, {
    padding: "16px",
    borderTop: "1px solid #ddd",
    boxSizing: "border-box"
  });

  const textarea = document.createElement("textarea");
  Object.assign(textarea.style, {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "16px",
    resize: "none",
    boxSizing: "border-box"
  });
  textarea.placeholder = "Type a message…";

  const send = document.createElement("button");
  send.textContent = "Send";
  Object.assign(send.style, {
    marginTop: "10px",
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    boxSizing: "border-box"
  });

  inputWrap.append(textarea, send);
  chat.appendChild(inputWrap);

  /* ===============================
     BRANDING
     =============================== */
  function applyBranding() {
    if (!clientData) return;
    bubble.style.background = clientData.primary_color;
    header.style.background = clientData.primary_color;
    send.style.background = clientData.primary_color;
    title.textContent = clientData.company_name;
  }

  /* ===============================
     OPEN / CLOSE
     =============================== */
  bubble.onclick = () => {
    chatOpen = !chatOpen;
    chat.style.opacity = chatOpen ? "1" : "0";
    chat.style.pointerEvents = chatOpen ? "auto" : "none";
    chat.style.transform = chatOpen ? "translateY(0)" : "translateY(40px)";
  };

  loadClientData();
})();

