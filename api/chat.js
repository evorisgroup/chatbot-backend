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

    // --- Supabase ---
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

    // --- Build company context ---
    const companyContext = `
Company Name: ${client.company_name}

Company Description:
${client.company_info}

Products:
${client.products.map(p => `- ${p.name}: $${p.price}`).join("\n")}

Locations:
${client.locations.join(", ")}

FAQs:
${client.faqs.map(f => `Q: ${f.q}\nA: ${f.a}`).join("\n\n")}
`;

    // --- AI Prompt ---
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
You are a customer support chatbot for the company below.
Only answer using the provided company information.
If the question cannot be answered, politely say you don't have that information.
Be clear, concise, and professional.
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
      temperature: 0.3,
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


