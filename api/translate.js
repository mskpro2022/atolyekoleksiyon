// api/translate.js — Vitrin ürün adı/açıklamasını TR→EN çevirir, ucuz/hızlı bir model kullanır.
// Anahtar sadece sunucuda kalır. Toplu (batch) çeviri destekler — tek istekte birden fazla metin.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Sadece POST kabul edilir" } });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: "OPENAI_API_KEY tanımlı değil" } });
  }

  try {
    const { metinler } = req.body; // [{id, metin}, ...]
    if (!Array.isArray(metinler) || !metinler.length) {
      return res.status(400).json({ error: { message: "metinler dizisi gerekli" } });
    }

    const sistem = "Sen bir kuyumculuk kataloğu çevirmenisin. Sana JSON dizi olarak Türkçe ürün adları/açıklamaları verilecek. Her birini doğal, kısa, İngilizce mücevher kataloğu diline çevir (örn. 'KURU KAFA' -> 'SKULL', 'Kalp Kolye' -> 'Heart Necklace'). SADECE şu JSON formatında yanıt ver, başka hiçbir şey yazma: [{\"id\":\"...\",\"en\":\"...\"}]";
    const kullanici = JSON.stringify(metinler);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 2000,
        messages: [
          { role: "system", content: sistem },
          { role: "user", content: kullanici },
        ],
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || { message: "OpenAI hata döndü" } });
    }

    let sonuclar = [];
    try {
      const icerik = data.choices?.[0]?.message?.content || "[]";
      const parsed = JSON.parse(icerik);
      sonuclar = Array.isArray(parsed) ? parsed : (parsed.sonuclar || parsed.results || Object.values(parsed)[0] || []);
    } catch (e) {
      return res.status(500).json({ error: { message: "Çeviri sonucu ayrıştırılamadı: " + e.message } });
    }

    return res.status(200).json({ sonuclar });
  } catch (e) {
    return res.status(500).json({ error: { message: e.message } });
  }
}
