// api/radar-models.js
// Trend Radar — ChatGPT'nin GERÇEK modelleri (kod, isim, kategori, gram, ayar, FOTOĞRAF) görüp
// bir trendi somut modellerle eşleştirebilmesi için. Maliyet/müşteri verisi YOK.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ basarili: false, hata: 'Sadece GET kabul edilir' });

  const gelenAnahtar = req.headers['x-radar-key'];
  const beklenenAnahtar = process.env.RADAR_INGEST_KEY;
  if (!beklenenAnahtar) return res.status(500).json({ basarili: false, hata: 'RADAR_INGEST_KEY tanımlı değil' });
  if (!gelenAnahtar || gelenAnahtar !== beklenenAnahtar) return res.status(401).json({ basarili: false, hata: 'Geçersiz anahtar' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) return res.status(500).json({ basarili: false, hata: 'Sunucu ortam değişkenleri eksik' });

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const sirket = (req.query.sirket || 'MSK').toUpperCase();
    const onek = sirket === 'BSP' ? 'bsp2_' : '';
    const kategori = req.query.kategori || null;
    const arama = req.query.arama || null; // kod veya ad içinde geçen metin
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);

    let sorgu = supabase
      .from('modeller')
      .select('id, kod, kategori, veri')
      .eq('onek', onek)
      .limit(limit);

    if (kategori) sorgu = sorgu.eq('kategori', kategori);
    if (arama) {
      const temiz = arama.replace(/[,()%]/g, ' ').trim();
      if (temiz) sorgu = sorgu.or(`kod.ilike.%${temiz}%,veri->>ad.ilike.%${temiz}%`);
    }

    const { data, error } = await sorgu;
    if (error) return res.status(500).json({ basarili: false, hata: error.message });

    const sonuc = (data || []).map(m => ({
      id: m.id,
      kod: m.kod,
      kategori: m.kategori,
      ad: m.veri?.ad || '',
      gram: m.veri?.gram || null,
      ayar: m.veri?.refAyar || null,
      foto: m.veri?.foto || null,
    }));

    return res.status(200).json({ basarili: true, sirket, adet: sonuc.length, modeller: sonuc });
  } catch (e) {
    return res.status(500).json({ basarili: false, hata: e.message });
  }
}
