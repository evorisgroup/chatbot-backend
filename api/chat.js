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

const AVAILABILITY_REGEX =
  /(are you open|open today|open now|hours|business hours|availability)/i;

const NEXT_OPEN_REGEX =
  /(when do you open next|next opening|what time do you open next|when should i call)/i;

const CALL_INTENT_REGEX =
  /(call|phone|appointment|book|schedule|pricing|price|cost|quote)/i;

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
  if (!client.weekly_hours) return false;

  const todayISO = new Date().toISOString().split("T")[0];
  if (client.holiday_rules?.dates?.includes(todayISO)) return false;

  const now = new Date();
  const minsNow = now.getHours() * 60 + now.getMinutes();
  const dayKey = DAY_NAMES[now.getDay()].toLowerCase();
  const ranges = client.weekly_hours[dayKey] || [];

  return ranges.some(([s, e]) =>
    minsNow >= minutes(s) && minsNow < minutes(e)
  );
}

function getHoursToday(client) {
  if (!client.weekly_hours) return null;
  const dayKey = DAY_NAMES[new Date().getDay()].toLowerCase();
  const ranges = client.weekly_hours[dayKey] || [];
  if (!ranges.length) return null;

  return ranges.map(
    ([s, e]) => `${formatTime(s)} – ${formatTime(e)}`
  ).join(", ");
}

function getNextOpenTime(client) {
  if (!client.weekly_hours) return null;

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

    const ranges = client.weekly_hours[dayKey] || [];
    for (const [start] of ranges) {
      const startMin = minutes(start);
      if (offset > 0 || startMin > currentMinutes) {
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

    const openNow = isOpenNow(client);
    const hoursToday = getHoursToday(client);
    const nextOpen = getNextOpenTime(client);

    /* ===============================
       HARD ANSWERS — NO AI
       =============================== */

    if (NEXT_OPEN_REGEX.test(text)) {
      if (openNow && hoursToday) {
        return res.json({
          reply: `We’re already open today. Our hours today are ${hoursToday}.`
        });
      }
      if (!openNow && nextOpen) {
        return res.json({
          reply: `Our next opening is ${nextOpen}.`
        });
      }
      return res.json({
        reply: "Our hours vary by day. Let me know how else I can help."
      });
    }

    if (AVAILABILITY_REGEX.test(text)) {
      if (openNow && hoursToday) {
        return res.json({
          reply: `Yes, we’re open today from ${hoursToday}.`
        });
      }
      if (!openNow && nextOpen) {
        return res.json({
          reply: `We’re currently closed. Our next opening is ${nextOpen}.`
        });
      }
      return res.json({
        reply: "Our hours vary by day. Let me know what you’re looking for."
      });
    }

    /* ===============================
       AI PATH — GUARDED
       =============================== */

    const callRelevant = CALL_INTENT_REGEX.test(text);

    let context = `
Company name: ${client.company_name}
Description: ${client.company_info}

Locations: ${Array.isArray(client.locations) ? client.locations.join(", ") : "Not specified"}

Rules:
- Use only provided information.
- Never invent hours, prices, policies, guarantees, or services.
- If pricing is asked, say pricing varies.
- Appointments are handled by phone only.
- Do not exaggerate or claim superiority.
`;

    if (callRelevant) {
      if (openNow) {
        context += `
Calling:
- Business is OPEN.
- Phone: ${client.phone_number}
${hoursToday ? `Today's hours: ${hoursToday}` : ""}
`;
      } else {
        context += `
Calling:
- Business is CLOSED.
- Do not suggest calling now.
${nextOpen ? `Next opening: ${nextOpen}` : ""}
Phone: ${client.phone_number}
`;
      }
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
You are a customer support assistant.

Hard rules:
- Never invent facts.
- Never invent hours or prices.
- If you do not know something, say so politely.
- Keep answers under 60 words.
`
        },
        { role: "system", content: context },
        { role: "user", content: message }
      ]
    });

    return res.json({
      reply: completion.choices[0]?.message?.content || "How can I help you?"
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      reply: "Something went wrong."
    });
  }
}

