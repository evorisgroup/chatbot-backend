import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, client_id } = req.body;
  const msg = message.toLowerCase();

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("client_id", client_id)
    .single();

  if (!client)
    return res.json({ reply: "I could not load client data right now." });

  // Company name
  const name = client.company_name;

  // ----- Responses -----

  if (msg.includes("name"))
    return res.json({ reply: `This company is called ${name}.` });

  if (msg.includes("info") || msg.includes("what do you do"))
    return res.json({ reply: client.company_info });

  if (msg.includes("product")) {
    const list = client.products.map((p) => `${p.name} ($${p.price})`);
    return res.json({ reply: `Products: ${list.join(", ")}` });
  }

  if (msg.includes("location"))
    return res.json({
      reply: `They operate in: ${client.locations.join(", ")}`,
    });

  if (msg.includes("faq") || msg.includes("question")) {
    const f = client.faqs
      .map((q) => `Q: ${q.q}\nA: ${q.a}`)
      .join("\n\n");
    return res.json({ reply: f });
  }

  return res.json({
    reply: `I'm here to answer questions about ${name}. Ask about products, locations, FAQs, or company info!`,
  });
}
