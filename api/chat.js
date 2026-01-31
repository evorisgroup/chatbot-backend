import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ===============================
   TIME HELPERS
   =============================== */

const DAY_NAMES = [
  "Sunday","Monday","Tuesday","Wednesday",
  "Thursday","Friday","Saturday"
];

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

function formatWeeklyHours(weekly) {
  if (!weekly) return "Hours not available.";

  return Object.entries(weekly)
    .map(([day, ranges]) => {
      if (!ranges.length) return `${day}: Closed`;
      const times = ranges
        .map(r => `${formatTime(r[0])} – ${formatTime(r[1])}`)
        .join(", ");
      return `${day.charAt(0).toUpperCase() + day.slice(1)}: ${times}`;
    })
    .join("\n");
}

function getNextOpenTime(weekly, holidays = []) {
  if (!weekly) return null;

  const now = new Date();
  const todayIndex = now.getDay();
  const todayISO = now.toISOString().split("T")[0];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (let offset = 0; offset < 7; offset++) {
    const dayIndex = (todayIndex + offset) % 7;
    const dayName = DAY_NAMES[dayIndex].toLowerCase();

    // Skip holidays
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() + offset);
    const checkISO = checkDate.toISOString().split("T")[0];
    if (holidays.includes(checkISO)) continue;

    const ranges = weekly[dayName] || [];
    for (const [start] of ranges) {
      const startMin = minutes(start);
      if (offset > 0 || startMin > currentMinutes) {
        return `${DAY_NAMES[dayIndex]} at ${formatTime(start)}`;
      }
    }
  }

  return null;
}

function isOpenNow(weekly) {
  if (!weekly) return false;

  const now = new Date();
  const dayKey = DAY_NAMES[now.getDay()].toLowerCase();
  const minsNow = now.getHours() * 60 + now.getMinutes();
  const ranges = weekly[dayKey] || [];

  return ranges.some(([s, e]) => minsNow >= minutes(s) && minsNow < minutes(e));
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
      return res.json({ reply: "Company information is unavailable." });
    }

    const openNow = isOpenNow(client.weekly_hours);
    const hoursText = formatWeeklyHours(client.weekly_hours);
    const nextOpen = getNextOpenTime(
    client.weekly_hours,
    client.holiday_rules?.dates || []
  );

    const context = `
Company: ${client.company_name}
Description: ${client.company_info}
Phone: ${client.phone_number || "Not available"}

Current status:
${openNow ? "OPEN" : "CLOSED"}

Regular hours:
${hoursText}

${!openNow && nextOpen ? `Next opening time: ${nextOpen}` : ""}

Rules:
- Appointments are handled by phone only.
- Suggest calling ONLY if currently open.
- If closed, explain hours and next opening time.
- If user reports a missed or failed call, respond calmly and suggest trying again during open hours.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
You are a professional customer service assistant.

Constraints:
- Max 3 sentences
- Max 60 words
- No AI mentions
- Be calm and helpful

Behavior:
- If open, recommend calling when appropriate.
- If closed, clearly state hours and next opening time.
- If the user says their call didn’t go through, acknowledge it and suggest retrying during business hours.
`
        },
        { role: "system", content: context },
        { role: "user", content: message }
      ]
    });

    return res.json({
      reply: completion.choices[0]?.message?.content
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ reply: "Server error." });
  }
}






