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

    // ---------- Supabase ----------
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    const { data: client, error } = await supabase
      .from("clients")
      .select("*")
      .eq("client_id", client_id)
      .single();

    if (error || !client) {
      return res.json({
        reply: "I couldn't load company information right now.",
      });
    }

    // ---------- Company Context ----------
    const companyContext = `
Company name:
${client.company_name}

Company description:
${client.company_info}

Products:
${client.products.map(p => `- ${p.name}: $${p.price}`).join("\n")}

Locations:
${client.locations.join(", ")}

FAQs:
${client.faqs.map(f => `Q: ${f.q}\nA: ${f.a}`).join("\n\n")}
`;

    // ---------- AI Completion ----------
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `
You are a professional customer-facing assistant for the company described below.

Your job:
- Answer questions accurately using ONLY the provided company information.
- Sound confident, clear, and professional.
- Keep responses concise (2–4 sentences unless more detail is requested).
- Do NOT mention being an AI.
- Do NOT speculate or guess.

Conversation style rules:
- Be helpful and direct.
- When appropriate, suggest a reasonable next step (e.g. learning more, scheduling, contacting the company).
- Do NOT be pushy or salesy.
- If the information is not available, say so plainly and offer an alternative.

Never invent:
- Prices
- Policies
- Locations
- Capabilities
          `,
        },
        {
          role: "system",
          content: companyContext,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "I'm not sure how to answer that.";

    return res.json({ reply });
  } catch (err) {
    console.error("AI chat error:", err);
    return res.status(500).json({
      reply: "There was an error generating a response.",
    });
  }
}



