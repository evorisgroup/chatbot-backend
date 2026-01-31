import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ===============================
   CONSTANTS
   =============================== */

const DAY_NAMES = [
  "Sunday","Monday","Tuesday","Wednesday",
  "Thursday","Friday","Saturday"
];

const GREETING_ONLY_REGEX =
  /^(hi|hello|hey|hey there|good morning|good afternoon|good evening)[!. ]*$/i;

const GENERAL_HOURS_REGEX =
  /(what are your hours|company hours|business hours|hours of operation|when are you usually open)/i;

const TODAY_HOURS_REGEX =
  /(hours today|today hours|open today)/i;

const OPEN_NOW_REGEX =
  /(are you open now|are you open\?|open right now)/i;

const NEXT_OPEN_REGEX =
  /(when do you open next|next opening|what time do you open next|when should i call)/i;

const CONTACT_REGEX =
  /(contact|phone number|how do i reach|how can i call)/i;

const PRICING_REGEX =
  /(pricing|price|cost|how much)/i;

const DAY_SPECIFIC_REGEX =
  /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i;

/* ===============================
   TIME HELPERS
   =============================== */

function minutes(hm) {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(hm) {
  const [h, m] = hm.split(":").map(Number);
  const hour = h % 12 || 12;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function isOpenNow(client) {
  const todayISO = new Date().toISOString().split("T")[0];
  if (client.holiday_rules?.dates?.includes(todayISO)) return false;

  const now = new Date();
  const minsNow = now.getHours() * 60 + now.getMinutes();
  const dayKey = DAY_NAMES[now.getDay()].toLowerCase();
  const ranges = client.weekly_hours?.[dayKey] || [];

  return ranges.some(([s, e]) =>
    minsNow >= minutes(s) && minsNow < minutes(e)
  );
}

function getHoursForDay(client, dayKey) {
  const ranges = client.weekly_hours?.[dayKey] || [];
  if (!ranges.length) return "Closed";
  return ranges.map(([s, e]) => `${formatTime(s)} – ${formatTime(e)}`).join(", ");
}

function getAllWeeklyHours(client) {
  return DAY_NAMES.map(d => {
    const key = d.toLowerCase();
    return `${d}: ${getHoursForDay(client, key)}`;
  }).join("\n");
}

function getNextOpenTime(client) {
  const now = new Date();
  const todayIndex = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (let offset = 0; offset < 7; offset++) {
    const dayIndex = (todayIndex + offset) % 7;
    const dayKey = DAY_NAMES[dayIndex].toLowerCase();

    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() + offset);
    const checkISO = checkDate.toISOString().split("T")[0];
    if (client.holiday_rules?.dates?.includes(checkISO)) continue;

    const ranges = client.weekly_hours?.[dayKey] || [];
    for (const [start] of ranges) {
      if (offset > 0 || minutes(start) > currentMinutes) {
        return `${DAY_NAMES[dayIndex]} at ${formatTime(start)}`;
      }
    }
  }
  return null;
}

/* ===============================
   HANDLER
   =============================== */

export default async function handler(req, res) {
  try {
    const { message, client_id } = req.body;
    if (!message || !client_id) {
      return res.status(400).json({ reply: "Invalid request." });
    }

    const text = message.trim();

    if (GREETING_ONLY_REGEX.test(text)) {
      return res.json({ reply: "Hi! How can I help you today?" });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    const { data: client } = await supabase
      .from("clients")
      .select("*")
      .eq("client_id", client_id)
      .single();

    if (!client) {
      return res.json({ reply: "How can I help you today?" });
    }

    /* ===============================
       HOURS — HARD PATHS
       =============================== */

    if (GENERAL_HOURS_REGEX.test(text)) {
      return res.json({
        reply: `Here are our regular hours:\n${getAllWeeklyHours(client)}`
      });
    }

    if (TODAY_HOURS_REGEX.test(text)) {
      const todayKey = DAY_NAMES[new Date().getDay()].toLowerCase();
      return res.json({
        reply: `Today’s hours: ${getHoursForDay(client, todayKey)}`
      });
    }

    if (OPEN_NOW_REGEX.test(text)) {
      if (isOpenNow(client)) {
        return res.json({ reply: "Yes, we’re currently open." });
      }
      return res.json({
        reply: `We’re currently closed. Our next opening is ${getNextOpenTime(client)}.`
      });
    }

    if (NEXT_OPEN_REGEX.test(text)) {
      return res.json({
        reply: `Our next opening is ${getNextOpenTime(client)}.`
      });
    }

    /* ===============================
       CONTACT
       =============================== */

    if (CONTACT_REGEX.test(text)) {
      return res.json({
        reply: `You can reach us by phone at ${client.phone_number}.`
      });
    }

    /* ===============================
       PRICING
       =============================== */

    if (PRICING_REGEX.test(text)) {
      return res.json({
        reply: "Pricing varies depending on the situation. The best way to get an accurate quote is to give us a call."
      });
    }

    /* ===============================
       AI — SAFE ONLY
       =============================== */

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
You are a customer support assistant.
You must only use the provided company information.
Never invent hours, prices, services, locations, or guarantees.
`
        },
        {
          role: "system",
          content: `
Company info:
${client.company_info}
Locations:
${Array.isArray(client.locations) ? client.locations.join(", ") : "Not specified"}
`
        },
        { role: "user", content: message }
      ]
    });

    return res.json({
      reply: completion.choices[0]?.message?.content || "How can I help you?"
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ reply: "Something went wrong." });
  }
}

