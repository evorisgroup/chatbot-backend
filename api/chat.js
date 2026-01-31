import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const phoneLine = client.phone_number
      ? `Primary phone number: ${client.phone_number}`
      : "No phone number available.";

    const companyContext = `
Company name: ${client.company_name}

Description:
${client.company_info}

Products:
${client.products.map(p => `${p.name} ($${p.price})`).join(", ")}

Locations:
${client.locations.join(", ")}

Phone:
${phoneLine}

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
You are a professional customer-facing assistant for the company below.

STRICT RULES:
- Answer using ONLY the provided company information.
- Maximum 3 sentences.
- Maximum 60 words.
- Be confident and concise.
- Do NOT mention being an AI.
- Do NOT over-explain.

PHONE & APPOINTMENT RULES:
- All appointments and orders are handled by phone unless explicitly stated otherwise.
- When users ask about pricing, scheduling, appointments, ordering, or urgent issues:
  - Recommend calling the company.
  - Include the phone number if available.
- Do NOT invent online booking or forms.
- Do NOT push the phone number unless it is relevant.

If information is unavailable, say so plainly and suggest the best next step.

Never invent pricing, policies, locations, or services.
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





