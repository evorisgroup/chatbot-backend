import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with env variables
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// In-memory cache
let cache = {};
let cacheTimestamp = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default async function handler(req, res) {
  const clientId = req.query.id;

  if (!clientId) {
    return res.status(400).json({ error: "Missing client_id in query" });
  }

  const now = Date.now();

  // Serve from cache if still valid
  if (cache[clientId] && now - (cacheTimestamp[clientId] || 0) < CACHE_DURATION) {
    return res.status(200).json(cache[clientId]);
  }

  try {
    // Fetch client data from Supabase
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("client_id", clientId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Update cache
    cache[clientId] = data;
    cacheTimestamp[clientId] = now;

    // CORS headers so any site can fetch this
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(200).end();

    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

