import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ===============================
   AVAILABILITY HELPERS
   =============================== */

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function getTodayName() {
  return [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
  ][new Date().getDay()];
}

function isHoliday(client) {
  const today = todayISO();
  const rules = client.holiday_rules;

  if (!rules) return false;

  if (rules.type === "us_federal") {
    // Conservative: handled externally later
    // For now, rely on explicit dates only
    return Array.isArray(rules.dates) && rules.dates.includes(today);
  }

  if (rules.type === "custom") {
    return Array.isArray(rules.dates) && rules.dates.includes(today);
  }

  return false;
}

function isOpenNow(client) {
  if (!client.weekly_hours) return true;
  if (isHoliday(client)) return false;

  const today = getTodayName();
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const ranges = client.weekly_hours[today] || [];

  return ranges.some(([start, end]) => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    return currentMinutes >= startMin && currentMinutes < endMin;
  });
}

/* ===============================
   HANDLER
   =============================== */

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { message, client_id } = req.body;
    if (!message || !client_id) {
      return res.status(400).json({ reply: "Invalid request." });
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
      return res.json({ reply: "Company data is unavailable." });
    }

    const openNow = isOpenNow(client);

    const context = `
Company: ${client.company_name}
Description: ${client.company_info}
Phone: ${client.phone_number || "Not available"}

Status:
The business is currently ${openNow ? "OPEN" : "CLOSED"}.

Rules:
- Appointments are handled by phone only.
- Suggest calling ONLY if the business is open.
- If closed, explain hours instead.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
You are a professional assistant.

Constraints:
- Max 3 sentences
- Max 60 words
- No AI mentions
- No speculation

Behavior:
- If open, recommend calling when appropriate.
- If closed, say they are closed and mention hours.
          `
        },
        { role: "system", content: context },
        { role: "user", content: message }
      ]
    });

    return res.json({
      reply:
        completion.choices[0]?.message?.content ||
        "Could you clarify what you’re looking for?"
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ reply: "Server error." });
  }
}






