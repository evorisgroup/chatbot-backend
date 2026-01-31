export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const clientId = req.query.id;

  const clients = {
    acme123: {
      companyName: "Acme Corp",
      logoURL: "https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg",
      primaryColor: "#FF5722",
      companyInfoText: `
Products:
- Product 1: $19.99
- Product 2: $39.99
Locations: New York, Boston
Contact: support@acme.com
FAQ: Shipping takes 3-5 business days
`
    }
  };

  const clientData = clients[clientId];

  if (!clientData) return res.status(404).json({ error: "Client not found" });

  res.status(200).json(clientData);
}

