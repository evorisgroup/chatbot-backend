export default function handler(req, res) {
  // === CORS SETTINGS FOR LOCAL TESTING ===
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const clientId = req.query.id;

  // === CLIENT DATA ===
  const clients = {
    acme123: {
      companyName: "Acme Corp",
      logoURL: "/logos/acme123.png",  // logo stored in public/logos/
      primaryColor: "#6C3BAA",        // updated brand color
      companyInfoText: `
Products:
- Widget A: $19.99
- Widget B: $39.99
Locations: New York, Boston
Contact: support@acme.com
FAQ: Shipping takes 3-5 business days
`
    },
    test456: {
      companyName: "Test Co",
      logoURL: "/logos/test456.png", // example logo
      primaryColor: "#007bff",
      companyInfoText: "This is test company info."
    }
  };

  const clientData = clients[clientId];

  if (!clientData) {
    return res.status(404).json({ error: "Client not found" });
  }

  res.status(200).json(clientData);
}
