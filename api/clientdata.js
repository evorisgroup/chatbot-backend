// /api/clientdata.js
import { createClient } from '@supabase/supabase-js';

// Read environment variables (server-side only)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  try {
    // Extract client_id from query string reliably
    let client_id = req.query?.client_id;

    // Fallback: parse from full URL in case req.query is empty
    if (!client_id && req.url) {
      const url = new URL(req.url, `https://${req.headers.host}`);
      client_id = url.searchParams.get('client_id');
    }

    if (!client_id) {
      return res.status(400).json({ error: 'Missing client_id' });
    }

    // Fetch client data from Supabase
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('client_id', client_id)
      .single();

    if (error || !client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Return client data as JSON
    return res.status(200).json(client);
  } catch (err) {
    console.error('Error in /api/clientdata:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
