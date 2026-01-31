import { createClient } from "@supabase/supabase-js";
import { classifyIntent } from "./intentClassifier.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/* =========================================================
   NORMALIZATION & DISPLAY HELPERS
========================================================= */

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isPureGreeting(message) {
  return ["hi", "hello", "hey", "hey there", "yo", "sup"].includes(
    normalize(message)
  );
}

/* ---- TIME FORMATTING ---- */

function formatTime12h(time24) {
  if (!time24 || !time24.includes(":")) return time24;

  const [hourStr, minute] = time24.split(":");
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";

  hour = hour % 12;
  if (hour === 0) hour = 12;

  return `${hour}:${minute} ${ampm}`;
}

function normalizeHours(raw) {
  if (!raw) return { closed: true };
  if (raw.closed === true) return { closed: true };

  if (raw.open && raw.close) {
    return { open: raw.open, close: raw.close, closed: false };
  }

  if (raw.start && raw.end) {
    return { open: raw.start, close: raw.end, closed: false };
  }

  if (Array.isArray(raw) && raw.length === 2) {
    return { open: raw[0], close: raw[1], closed: false };
  }

  return { closed: true };
}

function formatWeeklyHours(weeklyHours) {
  if (!weeklyHours) return "Our business hours are currently unavailable.";

  return Object.entries(weeklyHours)
    .map(([day, raw]) => {
      const h = normalizeHours(raw);
      const label = day.charAt(0).toUpperCase() + day.slice(1);

      if (h.closed) return `${label}: Closed`;
      if (!h.open || !h.close) return `${label}: Hours not available`;

      return `${label}: ${formatTime12h(h.open)} – ${formatTime12h(h.close)}`;
    })
    .join("\n");
}

function isOpenNow(weeklyHours) {
  if (!weeklyHours) return false;

  const now = new Date();
  const day = now
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

  const h = normalizeHours(weeklyHours[day]);
  if (h.closed || !h.open || !h.close) return false;

  const current = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = h.open.split(":").map(Number);
  const [ch, cm] = h.close.split(":").map(Number);

  return current >= oh * 60 + om && current <= ch * 60 + cm;
}

function nextOpenTime(weeklyHours) {
  if (!weeklyHours) return null;

  const days = [
    "monday","tuesday","wednesday",
    "thursday","friday","saturday","sunday"
  ];

  const todayIndex = days.indexOf(
    new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()
  );

  for (let i = 0; i < 7; i++) {
    const d = days[(todayIndex + i) % 7];
    const h = normalizeHours(weeklyHours[d]);
    if (!h.closed && h.open) {
      return `${d.charAt(0).toUpperCase() + d.slice(1)} at ${formatTime12h(h.open)}`;
    }
  }
  return null;
}

/* =========================================================
   MAIN HANDLER
========================================================= */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, client_id } = req.body;
  if (!message || !client_id) {
    return res.status(400).json({ error: "Missing message or client_id" });
  }

  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("client_id", client_id)
    .single();

  if (error || !client) {
    return res.json({
      reply: "Sorry, I couldn’t load company information."
    });
  }

  /* ---- Greeting ---- */

  if (isPureGreeting(message)) {
    return res.json({
      reply: `Hi! I’m the virtual assistant for ${client.company_name}. How can I help you today?`
    });
  }

  /* ---- Intent ---- */

  const intent = await classifyIntent(message);
  let reply = [];

  switch (intent.primary_intent) {

    case "GENERAL_HOURS":
      reply.push(`Here are our regular business hours:\n${formatWeeklyHours(client.weekly_hours)}`);
      break;

    case "TODAY_HOURS": {
      const today = new Date()
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();

      const h = normalizeHours(client.weekly_hours?.[today]);
      reply.push(
        h.closed
          ? "We’re closed today."
          : `Today we’re open from ${formatTime12h(h.open)} to ${formatTime12h(h.close)}.`
      );
      break;
    }

    case "OPEN_NOW":
      reply.push(
        isOpenNow(client.weekly_hours)
          ? "Yes, we’re currently open."
          : "We’re currently closed."
      );
      break;

    case "NEXT_OPEN_TIME": {
      const next = nextOpenTime(client.weekly_hours);
      reply.push(
        next
          ? `Our next opening is ${next}.`
          : "Our next opening time isn’t available."
      );
      break;
    }

    default:
      reply.push(
        "I can help with information about our hours, services, pricing, or how to contact us."
      );
  }

  return res.json({
    reply: reply.join("\n")
  });
}


