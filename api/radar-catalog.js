// api/radar-catalog.js
// Trend Radar — ChatGPT'nin katalog YAPISINI görmesi için (fiyat/maliyet/müşteri verisi YOK).
// Amaç: bulduğu trendleri "sende zaten güçlü olan / boşluk olan" kategorilerle kıyaslayıp yönlendirebilmesi.

import { createClient } from '@supabase/supabase-js';

const SIRKETLER = [
  { onek: '', ad: 'MSK' },
  { onek: 'bsp2_', ad: 'BSP' },
];

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
    const sonuc = [];

    for (const { onek, ad } of SIRKETLER) {
      // Koleksiyon isimleri (JSONB dizi — koleksiyonlar tablosu şirket başına tek satır)
      const { data: kolRow } = await supabase.from('koleksiyonlar').select('veri').eq('onek', onek).maybeSingle();
      const koleksiyonlar = (kolRow?.veri || []).map(k => k.ad).filter(Boolean);

      // Modeller: sadece yapısal alanlar (kategori, ayar, gram) — maliyet/müşteri YOK
      const { data: modeller, error } = await supabase
        .from('modeller')
        .select('kategori, veri')
        .eq('onek', onek);
      if (error) return res.status(500).json({ basarili: false, hata: error.message });

      const kategoriDagilimi = {};
      const ayarDagilimi = {};
      let gramToplam = 0, gramSayisi = 0, gramMin = null, gramMax = null;

      for (const m of modeller || []) {
        const kat = m.kategori || 'diğer';
        kategoriDagilimi[kat] = (kategoriDagilimi[kat] || 0) + 1;

        const ayar = m.veri?.refAyar || 'belirsiz';
        ayarDagilimi[ayar] = (ayarDagilimi[ayar] || 0) + 1;

        const gram = Number(m.veri?.gram);
        if (!isNaN(gram) && gram > 0) {
          gramToplam += gram; gramSayisi++;
          if (gramMin === null || gram < gramMin) gramMin = gram;
          if (gramMax === null || gram > gramMax) gramMax = gram;
        }
      }

      sonuc.push({
        sirket: ad,
        toplam_model: (modeller || []).length,
        koleksiyon_sayisi: koleksiyonlar.length,
        koleksiyonlar,
        kategori_dagilimi: Object.entries(kategoriDagilimi).map(([kategori, sayi]) => ({ kategori, sayi })).sort((a, b) => b.sayi - a.sayi),
        ayar_dagilimi: Object.entries(ayarDagilimi).map(([ayar, sayi]) => ({ ayar, sayi })).sort((a, b) => b.sayi - a.sayi),
        gram_araligi: gramSayisi ? { min: gramMin, max: gramMax, ortalama: Math.round((gramToplam / gramSayisi) * 10) / 10 } : null,
      });
    }

    return res.status(200).json({ basarili: true, sirketler: sonuc });
  } catch (e) {
    return res.status(500).json({ basarili: false, hata: e.message });
  }
}
