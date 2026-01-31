import { createClient } from "@supabase/supabase-js";
import { classifyIntent } from "./intentClassifier.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/* -----------------------------
   Utility helpers
-------------------------------- */

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isPureGreeting(message) {
  const normalized = normalize(message);
  return [
    "hi",
    "hello",
    "hey",
    "hey there",
    "yo",
    "sup"
  ].includes(normalized);
}

function formatWeeklyHours(weeklyHours) {
  if (!weeklyHours) return "Our business hours are not available.";

  return Object.entries(weeklyHours)
    .map(([day, hours]) => {
      if (!hours || hours.closed) return `${day}: Closed`;
      return `${day}: ${hours.open} – ${hours.close}`;
    })
    .join("\n");
}

function isOpenNow(weeklyHours) {
  if (!weeklyHours) return false;

  const now = new Date();
  const day = now
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

  const hours = weeklyHours[day];
  if (!hours || hours.closed) return false;

  const current = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = hours.open.split(":").map(Number);
  const [ch, cm] = hours.close.split(":").map(Number);

  return current >= oh * 60 + om && current <= ch * 60 + cm;
}

function nextOpenTime(weeklyHours) {
  if (!weeklyHours) return null;

  const days = [
    "monday","tuesday","wednesday",
    "thursday","friday","saturday","sunday"
  ];

  const now = new Date();
  let index = days.indexOf(
    now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()
  );

  for (let i = 0; i < 7; i++) {
    const d = days[(index + i) % 7];
    const hours = weeklyHours[d];
    if (hours && !hours.closed) {
      return `${d.charAt(0).toUpperCase() + d.slice(1)} at ${hours.open}`;
    }
  }
  return null;
}

/* -----------------------------
   Main handler
-------------------------------- */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, client_id } = req.body;

  if (!message || !client_id) {
    return res.status(400).json({ error: "Missing message or client_id" });
  }

  // Fetch client data
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("client_id", client_id)
    .single();

  if (error || !client) {
    return res.json({ reply: "Sorry, I couldn’t load company information." });
  }

  /* -----------------------------
     Pure greeting short-circuit
  -------------------------------- */
  if (isPureGreeting(message)) {
    return res.json({
      reply: `Hi! How can I help you today?`
    });
  }

  /* -----------------------------
     Intent classification
  -------------------------------- */
  const intent = await classifyIntent(message);

  let replyParts = [];

  /* -----------------------------
     Primary intent routing
  -------------------------------- */
  switch (intent.primary_intent) {
    case "GENERAL_HOURS":
      replyParts.push(formatWeeklyHours(client.weekly_hours));
      break;

    case "TODAY_HOURS": {
      const today = new Date()
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();
      const hours = client.weekly_hours?.[today];
      replyParts.push(
        hours && !hours.closed
          ? `Today we’re open from ${hours.open} to ${hours.close}.`
          : `We’re closed today.`
      );
      break;
    }

    case "OPEN_NOW":
      replyParts.push(
        isOpenNow(client.weekly_hours)
          ? "Yes, we’re currently open."
          : "We’re currently closed."
      );
      break;

    case "NEXT_OPEN_TIME":
      replyParts.push(
        nextOpenTime(client.weekly_hours)
          ? `Our next opening is ${nextOpenTime(client.weekly_hours)}.`
          : "Our next opening time isn’t available."
      );
      break;

    case "SERVICES_LIST":
      replyParts.push(
        client.services
          ? `We offer the following services:\n${client.services.join(", ")}`
          : "Our services information isn’t available."
      );
      break;

    case "PRICING_GENERAL":
      replyParts.push(
        client.pricing_policy ||
          "Pricing depends on the service and situation. We can provide details by phone."
      );
      break;

    case "CONTACT_PHONE":
      if (!intent.constraints.avoid_phone && client.contact_phone) {
        replyParts.push(`You can call us at ${client.contact_phone}.`);
      }
      break;

    case "COMPANY_OVERVIEW":
      replyParts.push(
        client.company_info ||
          `We’re here to help with questions about ${client.company_name}.`
      );
      break;

    default:
      replyParts.push(
        `I can help with information about our services, hours, pricing, or contact details.`
      );
  }

  /* -----------------------------
     Secondary intent handling
  -------------------------------- */
  if (intent.secondary_intent === "GENERAL_HOURS") {
    replyParts.push("\nOur regular hours:\n" + formatWeeklyHours(client.weekly_hours));
  }

  /* -----------------------------
     Soft CTA (only if allowed)
  -------------------------------- */
  if (
    !intent.constraints.avoid_phone &&
    !intent.constraints.avoid_sales &&
    client.contact_phone &&
    ["PRICING_GENERAL", "APPOINTMENT_HOW"].includes(intent.primary_intent)
  ) {
    replyParts.push(`\nYou can reach us at ${client.contact_phone} to get help.`);
  }

  return res.json({
    reply: replyParts.join("\n")
  });
}

