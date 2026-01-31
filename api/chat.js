import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed" });
  }

  const { message, clientId } = req.body;

  if (!message || !clientId) {
    return res.status(400).json({ reply: "Missing message or client ID" });
  }

  // --- Fetch client data from Supabase ---
  const { data: clientData, error } = await supabase
    .from("clients")
    .select("*")
    .eq("client_id", clientId)
    .single();

  if (error || !clientData) {
    console.error("Supabase error:", error);
    return res.status(404).json({ reply: "Client data not found" });
  }

  let reply = "Sorry, I don't have an answer for that.";

  const msgLower = message.toLowerCase();

  // --- Simple keyword-based responses ---
  if (msgLower.includes("name")) {
    reply = `The company's name is ${clientData.name}.`;
  } else if (msgLower.includes("product") || msgLower.includes("offer")) {
    if (clientData.products) {
      reply = `We offer: ${clientData.products.join(", ")}.`;
    } else {
      reply = "Our products information is not available right now.";
    }
  } else if (msgLower.includes("contact")) {
    if (clientData.contact_email || clientData.contact_phone) {
      reply = `You can contact us at ${clientData.contact_email || ""} ${clientData.contact_phone || ""}`.trim();
    } else {
      reply = "Contact information is currently unavailable.";
    }
  } else if (msgLower.includes("location")) {
    if (clientData.locations) {
      reply = `We serve the following locations: ${clientData.locations.join(", ")}.`;
    } else {
      reply = "Location information is not available.";
    }
  } else if (msgLower.includes("faq")) {
    if (clientData.faqs) {
      reply = `Here are some FAQs: ${clientData.faqs.join(" | ")}`;
    } else {
      reply = "No FAQs are currently available.";
    }
  }

  // --- Return the reply ---
  res.status(200).json({ reply });
}

