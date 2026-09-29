// api/radar-ingest.js
// Trend Radar — ChatGPT (Custom GPT Action) buradan bulduğu trend kanıtlarını sisteme gönderir.
// Statik bir gizli anahtarla korunur (Supabase Auth değil — ChatGPT Action interaktif login yapamaz).
// service_role anahtarı SADECE burada, sunucu tarafında kullanılır; tarayıcıya asla gitmez.

import { createClient } from '@supabase/supabase-js';

const PLATFORMS = ['instagram', 'pinterest', 'tiktok', 'retailer', 'wholesale', 'editorial', 'fair', 'marketplace', 'search', 'other'];
const ROLES = ['leader', 'regional_retail', 'regional_wholesale', 'discovery', 'commercial'];
const STAGES = ['watch', 'concept', 'sample', 'archive'];
const SIGNALS = ['new_arrival', 'restock', 'repeat', 'variation', 'customer', 'editorial', 'search', 'other'];

function hata(res, kod, mesaj) {
  return res.status(kod).json({ basarili: false, hata: mesaj });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return hata(res, 405, 'Sadece POST kabul edilir');

  // ── Yetkilendirme ──────────────────────────────────────────────
  const gelenAnahtar = req.headers['x-radar-key'];
  const beklenenAnahtar = process.env.RADAR_INGEST_KEY;
  if (!beklenenAnahtar) return hata(res, 500, 'RADAR_INGEST_KEY tanımlı değil (Vercel env)');
  if (!gelenAnahtar || gelenAnahtar !== beklenenAnahtar) return hata(res, 401, 'Geçersiz anahtar');

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const ownerId = process.env.RADAR_OWNER_ID; // worker Auth hesabının UUID'si
  if (!serviceKey || !supabaseUrl) return hata(res, 500, 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tanımlı değil (Vercel env)');
  if (!ownerId) return hata(res, 500, 'RADAR_OWNER_ID tanımlı değil (Vercel env)');

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const { source, trend, evidence } = req.body || {};
    if (!source || !trend || !evidence) {
      return hata(res, 400, 'source, trend ve evidence alanlarının hepsi gerekli');
    }

    // ── Doğrulama ─────────────────────────────────────────────────
    if (!source.name || !source.platform) return hata(res, 400, 'source.name ve source.platform gerekli');
    if (!PLATFORMS.includes(source.platform)) return hata(res, 400, `source.platform geçersiz: ${PLATFORMS.join(', ')}`);
    if (source.role && !ROLES.includes(source.role)) return hata(res, 400, `source.role geçersiz: ${ROLES.join(', ')}`);

    if (!trend.name) return hata(res, 400, 'trend.name gerekli');
    if (trend.stage && !STAGES.includes(trend.stage)) return hata(res, 400, `trend.stage geçersiz: ${STAGES.join(', ')}`);
    for (const alan of ['usa_fit', 'manufacturing_fit', 'margin_fit', 'longevity_fit', 'catalog_gap']) {
      if (trend[alan] != null && (trend[alan] < 0 || trend[alan] > 5)) return hata(res, 400, `trend.${alan} 0-5 arası olmalı`);
    }

    if (!evidence.signal) return hata(res, 400, 'evidence.signal gerekli');
    if (!SIGNALS.includes(evidence.signal)) return hata(res, 400, `evidence.signal geçersiz: ${SIGNALS.join(', ')}`);

    // ── 1) Kaynak: aynı isim+platform varsa yeniden kullan, yoksa oluştur ──
    let kaynakId;
    {
      const { data: mevcut } = await supabase
        .from('radar_sources')
        .select('id')
        .eq('owner_id', ownerId)
        .ilike('name', source.name)
        .eq('platform', source.platform)
        .maybeSingle();

      if (mevcut) {
        kaynakId = mevcut.id;
      } else {
        const { data: yeni, error: eKaynak } = await supabase
          .from('radar_sources')
          .insert({
            owner_id: ownerId,
            platform: source.platform,
            role: source.role || 'discovery',
            name: source.name,
            url: source.url || '',
            region: source.region || 'Global',
            tier: source.tier || 2,
            scan_days: source.scan_days || 7,
            notes: source.notes || '',
          })
          .select('id')
          .single();
        if (eKaynak) return hata(res, 500, 'Kaynak kaydedilemedi: ' + eKaynak.message);
        kaynakId = yeni.id;
      }
    }

    // ── 2) Trend: aynı isimde varsa güncelle/birleştir, yoksa oluştur ──────
    let trendId, trendYeniMi = false;
    {
      const { data: mevcut } = await supabase
        .from('radar_trends')
        .select('id, production_notes')
        .eq('owner_id', ownerId)
        .ilike('name', trend.name)
        .maybeSingle();

      if (mevcut) {
        trendId = mevcut.id;
        const guncelleme = { updated_at: new Date().toISOString() };
        if (trend.category) guncelleme.category = trend.category;
        if (trend.design_cluster) guncelleme.design_cluster = trend.design_cluster;
        if (trend.region) guncelleme.region = trend.region;
        if (trend.stage) guncelleme.stage = trend.stage;
        if (trend.target_grams) guncelleme.target_grams = trend.target_grams;
        if (trend.karats) guncelleme.karats = trend.karats;
        if (trend.cz_compatible != null) guncelleme.cz_compatible = trend.cz_compatible;
        if (trend.usa_fit != null) guncelleme.usa_fit = trend.usa_fit;
        if (trend.manufacturing_fit != null) guncelleme.manufacturing_fit = trend.manufacturing_fit;
        if (trend.margin_fit != null) guncelleme.margin_fit = trend.margin_fit;
        if (trend.longevity_fit != null) guncelleme.longevity_fit = trend.longevity_fit;
        if (trend.catalog_gap != null) guncelleme.catalog_gap = trend.catalog_gap;
        if (trend.matched_model_ids) guncelleme.matched_model_ids = trend.matched_model_ids;
        if (trend.production_notes) {
          const eskiNot = mevcut.production_notes || '';
          guncelleme.production_notes = eskiNot
            ? eskiNot + '\n---\n' + trend.production_notes
            : trend.production_notes;
        }
        const { error: eGuncelle } = await supabase.from('radar_trends').update(guncelleme).eq('id', trendId);
        if (eGuncelle) return hata(res, 500, 'Trend güncellenemedi: ' + eGuncelle.message);
      } else {
        trendYeniMi = true;
        const { data: yeni, error: eTrend } = await supabase
          .from('radar_trends')
          .insert({
            owner_id: ownerId,
            name: trend.name,
            category: trend.category || 'other',
            design_cluster: trend.design_cluster || '',
            region: trend.region || 'USA',
            stage: trend.stage || 'watch',
            production_notes: trend.production_notes || '',
            target_grams: trend.target_grams || '',
            karats: trend.karats || ['10K', '14K'],
            cz_compatible: trend.cz_compatible != null ? trend.cz_compatible : true,
            usa_fit: trend.usa_fit || 0,
            manufacturing_fit: trend.manufacturing_fit || 0,
            margin_fit: trend.margin_fit || 0,
            longevity_fit: trend.longevity_fit || 0,
            catalog_gap: trend.catalog_gap || 0,
            matched_model_ids: trend.matched_model_ids || [],
          })
          .select('id')
          .single();
        if (eTrend) return hata(res, 500, 'Trend kaydedilemedi: ' + eTrend.message);
        trendId = yeni.id;
      }
    }

    // ── 3) Kanıt: her zaman yeni satır ─────────────────────────────
    const { data: yeniKanit, error: eKanit } = await supabase
      .from('radar_evidence')
      .insert({
        owner_id: ownerId,
        trend_id: trendId,
        source_id: kaynakId,
        url: evidence.url || '',
        observed_at: evidence.observed_at || new Date().toISOString().slice(0, 10),
        signal: evidence.signal,
        note: evidence.note || '',
      })
      .select('id')
      .single();
    if (eKanit) return hata(res, 500, 'Kanıt kaydedilemedi: ' + eKanit.message);

    return res.status(200).json({
      basarili: true,
      kaynak_id: kaynakId,
      trend_id: trendId,
      trend_yeni_mi: trendYeniMi,
      kanit_id: yeniKanit.id,
    });
  } catch (e) {
    return hata(res, 500, e.message);
  }
}
