import { createClient } from "@supabase/supabase-js";
import { classifyIntent } from "./intentClassifier.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/* =========================================================
   NORMALIZATION HELPERS
   These make the bot tolerant of real-world Supabase data
========================================================= */

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isPureGreeting(message) {
  const n = normalize(message);
  return ["hi", "hello", "hey", "hey there", "yo", "sup"].includes(n);
}

/**
 * Accepts MANY possible hour formats and returns one shape:
 * { open: "09:00", close: "17:00", closed: false }
 */
function normalizeHours(raw) {
  if (!raw) return { closed: true };

  // Explicit closed
  if (raw.closed === true) return { closed: true };

  // { open, close }
  if (raw.open && raw.close) {
    return { open: raw.open, close: raw.close, closed: false };
  }

  // { start, end }
  if (raw.start && raw.end) {
    return { open: raw.start, close: raw.end, closed: false };
  }

  // ["09:00", "17:00"]
  if (Array.isArray(raw) && raw.length === 2) {
    return { open: raw[0], close: raw[1], closed: false };
  }

  return { closed: true };
}

function formatWeeklyHours(weeklyHours) {
  if (!weeklyHours) {
    return "Our business hours are not available.";
  }

  return Object.entries(weeklyHours)
    .map(([day, raw]) => {
      const h = normalizeHours(raw);
      const label = day.charAt(0).toUpperCase() + day.slice(1);

      if (h.closed) return `${label}: Closed`;
      if (!h.open || !h.close) return `${label}: Hours not available`;

      return `${label}: ${h.open} – ${h.close}`;
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

  const minsNow = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = h.open.split(":").map(Number);
  const [ch, cm] = h.close.split(":").map(Number);

  return minsNow >= oh * 60 + om && minsNow <= ch * 60 + cm;
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
      return `${d.charAt(0).toUpperCase() + d.slice(1)} at ${h.open}`;
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

  /* ---------------- Fetch client ---------------- */

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

  /* ---------------- Greeting short-circuit ---------------- */

  if (isPureGreeting(message)) {
    return res.json({
      reply: `Hi! How can I help you today?`
    });
  }

  /* ---------------- Intent classification ---------------- */

  const intent = await classifyIntent(message);
  let reply = [];

  /* ---------------- Primary intent ---------------- */

  switch (intent.primary_intent) {
    case "GENERAL_HOURS":
      reply.push(formatWeeklyHours(client.weekly_hours));
      break;

    case "TODAY_HOURS": {
      const today = new Date()
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();

      const h = normalizeHours(client.weekly_hours?.[today]);
      reply.push(
        h.closed
          ? "We’re closed today."
          : `Today we’re open from ${h.open} to ${h.close}.`
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

    case "SERVICES_LIST":
      reply.push(
        Array.isArray(client.services) && client.services.length
          ? `We offer:\n${client.services.join(", ")}`
          : "Our services information isn’t available."
      );
      break;

    case "PRICING_GENERAL":
      reply.push(
        client.pricing_policy ||
          "Pricing depends on the service and situation."
      );
      break;

    case "CONTACT_PHONE":
      if (!intent.constraints.avoid_phone && client.contact_phone) {
        reply.push(`You can call us at ${client.contact_phone}.`);
      }
      break;

    case "COMPANY_OVERVIEW":
      reply.push(
        client.company_info ||
          `We help customers with services provided by ${client.company_name}.`
      );
      break;

    case "UNKNOWN_INTENT":
    default:
      reply.push(
        "I’m here to help. You can ask about our hours, services, pricing, or how to contact us."
      );
  }

  /* ---------------- Secondary intent ---------------- */

  if (intent.secondary_intent === "GENERAL_HOURS") {
    reply.push("\nOur regular hours:\n" + formatWeeklyHours(client.weekly_hours));
  }

  /* ---------------- Soft CTA (guarded) ---------------- */

  if (
    !intent.constraints.avoid_phone &&
    !intent.constraints.avoid_sales &&
    client.contact_phone &&
    ["PRICING_GENERAL", "APPOINTMENT_HOW"].includes(intent.primary_intent)
  ) {
    reply.push(`You can reach us at ${client.contact_phone} if you’d like to talk.`);
  }

  return res.json({
    reply: reply.join("\n")
  });
}

