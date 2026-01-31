import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const GREETING_ONLY_REGEX = /^(hi|hello|hey|hey there|good morning|good afternoon|good evening)[!. ]*$/i;
const CALL_INTENT_REGEX = /(call|phone|appointment|book|schedule|pricing|price|cost|order|quote)/i;

/* ===============================
   TIME HELPERS
   =============================== */
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

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
  if (!client.weekly_hours) return true;

  const todayISO = new Date().toISOString().split("T")[0];
  if (client.holiday_rules?.dates?.includes(todayISO)) return false;

  const now = new Date();
  const dayKey = DAY_NAMES[now.getDay()].toLowerCase();
  const minsNow = now.getHours() * 60 + now.getMinutes();
  const ranges = client.weekly_hours[dayKey] || [];

  return ranges.some(([s, e]) => minsNow >= minutes(s) && minsNow < minutes(e));
}

function getHoursSummary(client) {
  if (!client.weekly_hours) return null;

  const dayKey = DAY_NAMES[new Date().getDay()].toLowerCase();
  const ranges = client.weekly_hours[dayKey] || [];
  if (!ranges.length) return null;

  return ranges.map(r => `${formatTime(r[0])} – ${formatTime(r[1])}`).join(", ");
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

    // Rule 1: greetings are always neutral
    if (GREETING_ONLY_REGEX.test(message.trim())) {
  return res.json({
    reply: "Hi! How can I help you today?"
  });
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
    const callRelevant = CALL_INTENT_REGEX.test(message);
    const hoursToday = getHoursSummary(client);

    // Build minimal, sales-safe context
    let context = `
Company: ${client.company_name}
Description: ${client.company_info}

Rules:
- Be helpful and concise.
- Do not mention hours or closure unless calling is relevant.
- Only suggest calling if it adds value.
`;

    // Only include call info if relevant
    if (callRelevant) {
      context += `
Calling policy:
- Appointments and pricing are handled by phone.
- The business is currently ${openNow ? "open" : "closed"}.
${openNow && hoursToday ? `Today's hours: ${hoursToday}` : ""}
Phone number: ${client.phone_number || "Not available"}
`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `
You are a professional, friendly customer assistant.

Hard rules:
- Never discourage the user.
- Never volunteer that the business is closed unless calling is relevant.
- Never push calling if the question was already answered.
- Be warm, calm, and reassuring.
- Max 3 sentences, max 60 words.
- Do not mention being an AI.
`
        },
        { role: "system", content: context },
        { role: "user", content: message }
      ]
    });

    return res.json({
      reply:
        completion.choices[0]?.message?.content ||
        "How can I help you?"
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ reply: "Something went wrong." });
  }
}
