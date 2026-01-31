// /api/chat.js
import { createClient } from '@supabase/supabase-js';

// Read environment variables (server-side only)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, client_id } = req.body;

    if (!message || !client_id) {
      return res.status(400).json({ error: 'Missing message or client_id' });
    }

    // Fetch client data from Supabase
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .eq('client_id', client_id)
      .limit(1)
      .single();

    if (error || !clients) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const client = clients;

    // Normalize message for keyword matching
    const msg = message.toLowerCase();

    // Responses based on keywords
    let reply = "Sorry, I don't have that information right now.";

    if (msg.includes('name') || msg.includes('company')) {
      reply = `Our company is ${client.name}.`;
    } else if (msg.includes('product') || msg.includes('service')) {
      if (client.products && client.products.length > 0) {
        reply = `We offer: ${client.products.join(', ')}.`;
      } else {
        reply = `We currently have no products listed.`;
      }
    } else if (msg.includes('contact') || msg.includes('email') || msg.includes('phone')) {
      const email = client.contact_email || 'N/A';
      const phone = client.contact_phone || 'N/A';
      reply = `You can contact us at ${email} or ${phone}.`;
    } else if (msg.includes('location') || msg.includes('office')) {
      if (client.locations && client.locations.length > 0) {
        reply = `We have offices in: ${client.locations.join(', ')}.`;
      } else {
        reply = `Our locations are not listed currently.`;
      }
    } else if (msg.includes('faq') || msg.includes('question')) {
      if (client.faqs && client.faqs.length > 0) {
        reply = `Here are some FAQs:\n- ${client.faqs.join('\n- ')}`;
      } else {
        reply = `No FAQs are available at this time.`;
      }
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Chat API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
