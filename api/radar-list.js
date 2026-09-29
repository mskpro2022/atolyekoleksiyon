// api/radar-list.js
// Trend Radar — ChatGPT'nin mevcut trendleri/kaynakları OKUMASI için.
// Amaç: aynı trendi farklı isimle tekrar kaydetmesini önlemek ve
// "bu hafta ne buldun" gibi sorulara cevap verebilmesini sağlamak.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ basarili: false, hata: 'Sadece GET kabul edilir' });

  const gelenAnahtar = req.headers['x-radar-key'];
  const beklenenAnahtar = process.env.RADAR_INGEST_KEY;
  if (!beklenenAnahtar) return res.status(500).json({ basarili: false, hata: 'RADAR_INGEST_KEY tanımlı değil' });
  if (!gelenAnahtar || gelenAnahtar !== beklenenAnahtar) return res.status(401).json({ basarili: false, hata: 'Geçersiz anahtar' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const ownerId = process.env.RADAR_OWNER_ID;
  if (!serviceKey || !supabaseUrl || !ownerId) {
    return res.status(500).json({ basarili: false, hata: 'Sunucu ortam değişkenleri eksik' });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const gunSayisi = Math.min(Math.max(parseInt(req.query.gun, 10) || 30, 1), 365);
    const sinirTarih = new Date(Date.now() - gunSayisi * 24 * 60 * 60 * 1000).toISOString();

    const { data: trendler, error: eTrend } = await supabase
      .from('radar_trends')
      .select('id, name, category, stage, region, usa_fit, manufacturing_fit, margin_fit, longevity_fit, catalog_gap, updated_at')
      .eq('owner_id', ownerId)
      .order('updated_at', { ascending: false })
      .limit(200);
    if (eTrend) return res.status(500).json({ basarili: false, hata: eTrend.message });

    const { data: kanitlar, error: eKanit } = await supabase
      .from('radar_evidence')
      .select('trend_id, url, observed_at, signal, note')
      .eq('owner_id', ownerId)
      .gte('observed_at', sinirTarih.slice(0, 10))
      .order('observed_at', { ascending: false })
      .limit(500);
    if (eKanit) return res.status(500).json({ basarili: false, hata: eKanit.message });

    const kanitSayisi = {};
    for (const k of kanitlar) kanitSayisi[k.trend_id] = (kanitSayisi[k.trend_id] || 0) + 1;

    const sonuc = trendler.map(t => ({
      ...t,
      son_gun_kanit_sayisi: kanitSayisi[t.id] || 0,
    }));

    return res.status(200).json({ basarili: true, gun: gunSayisi, trendler: sonuc });
  } catch (e) {
    return res.status(500).json({ basarili: false, hata: e.message });
  }
}
