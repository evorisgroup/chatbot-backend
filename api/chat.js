import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, client_id } = req.body;

  if (!client_id) {
    return res.status(400).json({ reply: "Missing client_id" });
  }

  // Debug logging (you can remove later)
  console.log("Incoming chat request:", { message, client_id });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Fetch client record
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("client_id", client_id)
    .single();

  if (error || !client) {
    console.error("Supabase error:", error);
    return res.json({
      reply: "I'm having trouble loading client data right now.",
    });
  }

  console.log("Loaded client from Supabase:", client); // DEBUG

  const msg = message.toLowerCase();

  // ======= Keyword Logic =======

  if (msg.includes("name")) {
    return res.json({ reply: `This company is called ${client.name}.` });
  }

  if (msg.includes("product")) {
    if (client.products?.length > 0) {
      return res.json({
        reply: `Here are the products: ${client.products.join(", ")}.`,
      });
    } else {
      return res.json({ reply: "This company hasn't added products yet." });
    }
  }

  if (msg.includes("email") || msg.includes("contact")) {
    if (client.contact_email) {
      return res.json({
        reply: `You can contact them at: ${client.contact_email}`,
      });
    } else {
      return res.json({ reply: "No contact email is listed." });
    }
  }

  if (msg.includes("phone")) {
    if (client.contact_phone) {
      return res.json({
        reply: `Their phone number is: ${client.contact_phone}`,
      });
    } else {
      return res.json({ reply: "No phone number provided." });
    }
  }

  if (msg.includes("location")) {
    if (client.locations?.length > 0) {
      return res.json({
        reply: `They operate in: ${client.locations.join(", ")}.`,
      });
    } else {
      return res.json({ reply: "No locations listed." });
    }
  }

  if (msg.includes("faq") || msg.includes("question")) {
    if (client.faqs?.length > 0) {
      return res.json({
        reply: `Here are some FAQs:\n• ${client.faqs.join("\n• ")}`,
      });
    } else {
      return res.json({ reply: "No FAQs available." });
    }
  }

  // Default catch-all
  return res.json({
    reply: `I’m here to help with anything about ${client.name}. Ask about products, contact, locations, or FAQs!`,
  });
}

