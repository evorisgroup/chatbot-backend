// api/chat.js

import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const { message } = req.body;

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await client.responses.create({
      model: "gpt-4o-mini",
      input: message,
    });

    const reply = completion.output_text;

    res.status(200).json({ reply });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
