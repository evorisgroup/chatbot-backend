import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------- Business hours helper ----------
function isBusinessOpen(businessHours) {
  if (businessHours !== "weekday_9_5") return true;

  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const hour = now.getHours();

  const isWeekday = day >= 1 && day <= 5;
  const isWorkingHour = hour >= 9 && hour < 17;

  return isWeekday && isWorkingHour;
}

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
      return res.json({
        reply: "I couldn’t load company information right now.",
      });
    }

    const openNow = isBusinessOpen(client.business_hours);

    const phoneLine = client.phone_number
      ? `Phone number: ${client.phone_number}`
      : "No phone number available.";

    const hoursLine = client.business_hours === "weekday_9_5"
      ? "Business hours: Monday to Friday, 9:00 AM to 5:00 PM."
      : "Business hours: Not specified.";

    const availabilityLine = openNow
      ? "The business is currently open."
      : "The business is currently closed.";

    const companyContext = `
Company name: ${client.company_name}

Description:
${client.company_info}

Locations:
${client.locations.join(", ")}

${phoneLine}
${hoursLine}
${availabilityLine}

Important rules:
- Appointments are handled by phone only.
- Only suggest calling if the business is currently open.
- If closed, tell the user when they can call instead.

FAQs:
${client.faqs.map(f => `Q: ${f.q} A: ${f.a}`).join(" | ")}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
You are a professional customer-facing assistant.

STRICT RULES:
- Maximum 3 sentences.
- Maximum 60 words.
- Be concise and confident.
- Do NOT mention being an AI.
- Do NOT invent information.

CALLING RULES:
- Appointments are handled by phone only.
- Suggest calling ONLY if the business is currently open.
- If closed, explain hours and suggest calling during open times.
- Include the phone number when recommending a call.

If information is unavailable, say so plainly.
          `,
        },
        { role: "system", content: companyContext },
        { role: "user", content: message },
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "Could you clarify what you’re looking for?";

    return res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    return res.status(500).json({
      reply: "There was an error generating a response.",
    });
  }
}






