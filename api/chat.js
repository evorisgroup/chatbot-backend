import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error("Missing Supabase environment variables");
      return res.status(500).json({
        reply: "Server configuration error.",
      });
    }

    const { message, client_id } = req.body || {};

    if (!client_id || !message) {
      return res.status(400).json({
        reply: "Invalid request.",
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: client, error } = await supabase
      .from("clients")
      .select("*")
      .eq("client_id", client_id)
      .single();

    if (error || !client) {
      console.error("Supabase error:", error);
      return res.json({
        reply: "I could not load company data right now.",
      });
    }

    const msg = message.toLowerCase();
    const name = client.company_name;

    if (msg.includes("name")) {
      return res.json({ reply: `This company is called ${name}.` });
    }

    if (msg.includes("what do you do") || msg.includes("info")) {
      return res.json({ reply: client.company_info });
    }

    if (msg.includes("product")) {
      const products = client.products
        .map((p) => `${p.name} ($${p.price})`)
        .join(", ");
      return res.json({ reply: `Products: ${products}` });
    }

    if (msg.includes("location")) {
      return res.json({
        reply: `They operate in: ${client.locations.join(", ")}`,
      });
    }

    if (msg.includes("faq")) {
      const faqs = client.faqs
        .map((f) => `Q: ${f.q}\nA: ${f.a}`)
        .join("\n\n");
      return res.json({ reply: faqs });
    }

    return res.json({
      reply: `I'm here to answer questions about ${name}.`,
    });
  } catch (err) {
    console.error("chat.js crash:", err);
    return res.status(500).json({
      reply: "Internal server error.",
    });
  }
}

