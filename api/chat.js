export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // ── GEÇİCİ DEBUG — sorun çözülünce kaldırılacak ──
  if (!apiKey) {
    const anthroKeys = Object.keys(process.env).filter(k => k.toUpperCase().includes("ANTHRO"));
    const tumKeyler = Object.keys(process.env).filter(k => !k.startsWith("npm_") && !k.startsWith("__")).sort();
    return res.status(500).json({
      error: "API key okunamadi",
      debug: {
        anthropicVarlari: anthroKeys,
        anthropicDegerUzunluk: anthroKeys.map(k => ({ isim: k, uzunluk: (process.env[k] || "").length })),
        toplamEnvSayisi: Object.keys(process.env).length,
        ornekEnvler: tumKeyler.slice(0, 40),
      }
    });
  }
  // ── DEBUG SONU ──

  try {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); }
    catch (e) { return res.status(500).json({ error: "Parse hatasi", raw: text.slice(0, 300) }); }
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
