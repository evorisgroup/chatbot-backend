import { createClient } from "@supabase/supabase-js";
import { classifyIntent } from "./intentClassifier.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/* =========================================================
   NORMALIZATION & SAFETY HELPERS
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

  /* ---------------- Greeting ---------------- */

  if (isPureGreeting(message)) {
    return res.json({
      reply: `Hi! I’m the virtual assistant for ${client.company_name}. How can I help you today?`
    });
  }

  /* ---------------- Intent classification ---------------- */

  const intent = await classifyIntent(message);
  let reply = [];

  /* ---------------- Primary intent ---------------- */

  switch (intent.primary_intent) {

    /* ===== HOURS ===== */

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

    /* ===== SERVICES ===== */

    case "SERVICES_LIST":
      reply.push(
        Array.isArray(client.services) && client.services.length
          ? `We offer the following services:\n${client.services.join(", ")}`
          : "Our service information isn’t available right now."
      );
      break;

    case "SERVICE_SPECIFIC":
      reply.push(
        Array.isArray(client.services) && client.services.length
          ? `Yes, we do offer ${intent.parameters.service}.`
          : "I don’t have details on that service at the moment."
      );
      break;

    case "EMERGENCY_SERVICE":
      reply.push(
        client.emergency_service
          ? "Yes, we offer emergency service. Please call us for immediate assistance."
          : "We don’t currently offer emergency service."
      );
      break;

    /* ===== PRICING & PAYMENTS ===== */

    case "PRICING_GENERAL":
    case "PRICING_ESTIMATE":
      reply.push(
        client.pricing_policy ||
          "Pricing varies depending on the service and situation."
      );
      break;

    case "PAYMENT_METHODS":
      reply.push(
        Array.isArray(client.payment_methods) && client.payment_methods.length
          ? `We accept the following payment methods:\n${client.payment_methods.join(", ")}`
          : "Payment method information isn’t available."
      );
      break;

    case "REFUNDS_POLICIES":
      reply.push(
        client.refunds_policy ||
          "Refund policies depend on the service provided."
      );
      break;

    /* ===== CONTACT & APPOINTMENTS ===== */

    case "CONTACT_PHONE":
      if (!intent.constraints.avoid_phone && client.contact_phone) {
        reply.push(`You can call us at ${client.contact_phone}.`);
      }
      break;

    case "CONTACT_EMAIL":
      if (client.contact_email) {
        reply.push(`You can email us at ${client.contact_email}.`);
      }
      break;

    case "CONTACT_METHODS":
      reply.push(
        `You can reach us by phone${client.contact_email ? " or email" : ""}.`
      );
      break;

    case "APPOINTMENT_HOW":
      if (client.appointment_method === "online") {
        reply.push("Appointments can be booked online.");
      } else {
        reply.push("Appointments are scheduled over the phone.");
      }
      break;

    /* ===== LOCATIONS ===== */

    case "LOCATIONS_LIST":
      reply.push(
        Array.isArray(client.locations) && client.locations.length
          ? `We serve the following areas:\n${client.locations.join(", ")}`
          : "Service location information isn’t available."
      );
      break;

    case "SERVICE_AREA_CHECK":
      reply.push(
        Array.isArray(client.locations) && client.locations.includes(intent.parameters.location)
          ? `Yes, we service ${intent.parameters.location}.`
          : `Please contact us to confirm service availability in that area.`
      );
      break;

    /* ===== COMPANY INFO ===== */

    case "COMPANY_OVERVIEW":
      reply.push(
        client.company_info ||
          `We provide professional services through ${client.company_name}.`
      );
      break;

    case "LICENSES_CERTS":
      reply.push(
        client.licenses || "Licensing information is available upon request."
      );
      break;

    case "INSURANCE":
      reply.push(
        client.insurance_info || "Insurance details are available upon request."
      );
      break;

    /* ===== FAQ ===== */

    case "FAQ_MATCH":
      if (Array.isArray(client.faqs) && client.faqs.length) {
        const match = client.faqs.find(f =>
          normalize(message).includes(normalize(f.q))
        );
        reply.push(match ? match.a : "I can help answer common questions.");
      }
      break;

    /* ===== FALLBACK ===== */

    case "UNKNOWN_INTENT":
    default:
      reply.push(
        "I can help with information about our services, hours, pricing, or how to contact us."
      );
  }

  /* ---------------- Secondary intent ---------------- */

  if (intent.secondary_intent === "GENERAL_HOURS") {
    reply.push(`\nOur regular hours:\n${formatWeeklyHours(client.weekly_hours)}`);
  }

  /* ---------------- Soft CTA ---------------- */

  if (
    !intent.constraints.avoid_phone &&
    !intent.constraints.avoid_sales &&
    client.contact_phone &&
    ["PRICING_GENERAL", "APPOINTMENT_HOW"].includes(intent.primary_intent)
  ) {
    reply.push(`You can reach us at ${client.contact_phone} if you’d like to speak with us.`);
  }

  return res.json({
    reply: reply.join("\n")
  });
}


