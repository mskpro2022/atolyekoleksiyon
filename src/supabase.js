import { createClient } from '@supabase/supabase-js'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseKey)
const CHUNK_SIZE = 8

// ═══ FOTO STORAGE ═══
const FOTO_BUCKET = 'FOTOLAR'
// base64/blob fotoğrafı Storage'a yükler, public URL döndürür
export async function fotoYukleStorage(dataUrl, modelId, onek = '') {
  try {
    // dataURL değilse (zaten URL) olduğu gibi bırak
    if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl
    const blob = await (await fetch(dataUrl)).blob()
    const uzanti = blob.type.includes('png') ? 'png' : 'jpg'
    const yol = onek + 'model-' + modelId + '.' + uzanti
    for (let deneme = 0; deneme < 3; deneme++) {
      const { error } = await supabase.storage.from(FOTO_BUCKET).upload(yol, blob, { upsert: true, contentType: blob.type })
      if (!error) {
        const { data } = supabase.storage.from(FOTO_BUCKET).getPublicUrl(yol)
        return data.publicUrl
      }
      await new Promise(r => setTimeout(r, 400 * (deneme + 1)))
    }
    // Yükleme başarısızsa base64'ü koru (veri kaybetme)
    console.warn('⚠ Foto Storage\'a yüklenemedi, base64 korundu:', modelId)
    return dataUrl
  } catch (e) {
    console.error('fotoYukleStorage hata:', e.message)
    return dataUrl // hata olursa base64 kalsın
  }
}

// ═══ OTOMATİK YEDEKLEME (yedekler tablosu) ═══
// Yedek kaydet — aynı gün + önek için varsa günceller, son 7'yi tutar
export async function yedekKaydet(onek, veri, modelSayisi, siparisSayisi) {
  try {
    const bugun = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    // Bugünün yedeği var mı? Varsa güncelle (upsert mantığı: önce sil sonra ekle)
    await supabase.from('yedekler').delete().eq('onek', onek).eq('tarih', bugun)
    const { error } = await supabase.from('yedekler').insert({
      onek, tarih: bugun, veri, model_sayisi: modelSayisi, siparis_sayisi: siparisSayisi
    })
    if (error) { console.error('yedekKaydet:', error.message); return false }
    // Son 7'yi tut — fazlasını sil
    const { data: hepsi } = await supabase.from('yedekler')
      .select('id').eq('onek', onek).order('tarih', { ascending: false })
    if (hepsi && hepsi.length > 7) {
      const silinecekIdler = hepsi.slice(7).map(x => x.id)
      await supabase.from('yedekler').delete().in('id', silinecekIdler)
    }
    return true
  } catch (e) { console.error('yedekKaydet hata:', e.message); return false }
}

// Yedek listesini getir (veri hariç, sadece tarih/sayılar — hafif)
export async function yedekListesi(onek) {
  try {
    const { data, error } = await supabase.from('yedekler')
      .select('id, tarih, olusturma, model_sayisi, siparis_sayisi')
      .eq('onek', onek).order('tarih', { ascending: false })
    if (error) { console.error('yedekListesi:', error.message); return [] }
    return data || []
  } catch (e) { console.error('yedekListesi hata:', e.message); return [] }
}

// Belirli bir yedeğin tam verisini getir
export async function yedekGetir(id) {
  try {
    const { data, error } = await supabase.from('yedekler').select('veri').eq('id', id).maybeSingle()
    if (error || !data) return null
    return data.veri
  } catch (e) { console.error('yedekGetir hata:', e.message); return null }
}

// Bugün yedek alınmış mı? (günde 1 kez kontrolü için)
export async function bugunYedekVarMi(onek) {
  try {
    const bugun = new Date().toISOString().slice(0, 10)
    const { data } = await supabase.from('yedekler')
      .select('id').eq('onek', onek).eq('tarih', bugun).maybeSingle()
    return !!data
  } catch { return false }
}

// ═══════════════════════════════════════════════════════
// AŞAMA 2 — GERÇEK TABLOLAR (modeller / siparisler / musteriler)
// Kademeli geçiş: bu fonksiyonlar eski chunk sistemiyle PARALEL çalışır.
// ═══════════════════════════════════════════════════════

// —— MODELLER ——
// Tüm modelleri tablodan oku (sayfalama ile, 1000'er) 
export async function tabloModelleriOku(onek) {
  try {
    // Önce toplam sayıyı öğren (doğrulama için)
    const beklenen = await tabloModelSayisi(onek)
    const hepsi = []
    let bas = 0
    const ADIM = 1000
    for (let tur = 0; tur < 100; tur++) { // max 100k güvenlik
      const { data, error } = await supabase.from('modeller')
        .select('veri')
        .eq('onek', onek)
        .order('id', { ascending: true })
        .range(bas, bas + ADIM - 1)
      if (error) throw new Error('Model okuma: ' + error.message)
      if (!data || data.length === 0) break
      data.forEach(r => { if (r.veri) hepsi.push(r.veri) })
      if (data.length < ADIM) break
      bas += ADIM
    }
    // DOĞRULAMA: okunan sayı beklenenle uyuşmuyorsa hata fırlat (eksik veri döndürme!)
    if (beklenen > 0 && hepsi.length < beklenen) {
      throw new Error('Eksik okuma: ' + hepsi.length + '/' + beklenen + ' — tekrar denenecek')
    }
    return hepsi
  } catch (e) {
    console.error('tabloModelleriOku hata:', e.message)
    throw e
  }
}

// Tek model yaz (upsert) — satır bazlı, sadece bu model
export async function tabloModelYaz(onek, model) {
  try {
    const { error } = await supabase.from('modeller').upsert({
      id: String(model.id), onek,
      kod: model.kod || null, ki: model.ki || null, kategori: model.kategori || null,
      veri: model, guncelleme: new Date().toISOString()
    }, { onConflict: 'id' })
    if (error) { console.error('tabloModelYaz:', error.message); return false }
    return true
  } catch (e) { console.error('tabloModelYaz hata:', e.message); return false }
}

// Tek model sil
export async function tabloModelSil(id) {
  try {
    const { error } = await supabase.from('modeller').delete().eq('id', String(id))
    return !error
  } catch { return false }
}

// Toplu model yaz (migration + toplu işlemler için) — 100'er batch, retry'lı
export async function tabloModelleriToplu(onek, modeller, ilerlemeCb) {
  const BATCH = 100
  let yazilan = 0
  for (let i = 0; i < modeller.length; i += BATCH) {
    const grup = modeller.slice(i, i + BATCH).map(m => ({
      id: String(m.id), onek,
      kod: m.kod || null, ki: m.ki || null, kategori: m.kategori || null,
      veri: m, guncelleme: new Date().toISOString()
    }))
    let ok = false
    for (let deneme = 0; deneme < 3 && !ok; deneme++) {
      const { error } = await supabase.from('modeller').upsert(grup, { onConflict: 'id' })
      if (!error) { ok = true; yazilan += grup.length }
      else { await new Promise(r => setTimeout(r, 500 * (deneme + 1))) }
    }
    if (ilerlemeCb) ilerlemeCb(yazilan, modeller.length)
  }
  return yazilan
}

// Tablodaki model sayısı (doğrulama için)
export async function tabloModelSayisi(onek) {
  try {
    const { count, error } = await supabase.from('modeller')
      .select('id', { count: 'exact', head: true }).eq('onek', onek)
    if (error) return -1
    return count ?? -1
  } catch { return -1 }
}

// TAM SENKRON — verilen liste ile tabloyu birebir eşitler (silinenleri de temizler)
export async function tabloModelleriSenkron(onek, modeller) {
  try {
    // ═══ GÜVENLİK: Tabloda mevcut sayı ile yeni liste arasında ANİ BÜYÜK DÜŞÜŞ varsa DURDUR ═══
    // (eksik okunmuş bir listenin gerçek silme yapmasını önler)
    const mevcutSayi = await tabloModelSayisi(onek)
    if (mevcutSayi > 50 && modeller.length < mevcutSayi * 0.85) {
      // %15'ten fazla düşüş şüpheli — muhtemelen eksik okuma, senkronu iptal et
      console.error('🛑 Senkron iptal: ' + mevcutSayi + ' → ' + modeller.length + ' (şüpheli büyük düşüş, eksik okuma olabilir). Tablo korundu.')
      return { yazilan: 0, silinen: 0, iptal: true }
    }
    const yazilan = await tabloModelleriToplu(onek, modeller)
    // Tablodaki id'leri çek, listede olmayanları (silinenleri) temizle
    const listeIdler = new Set(modeller.map(m => String(m.id)))
    const mevcutIdler = []
    let bas = 0
    for (let tur = 0; tur < 50; tur++) {
      const { data, error } = await supabase.from('modeller')
        .select('id').eq('onek', onek).range(bas, bas + 999)
      if (error || !data || data.length === 0) break
      data.forEach(r => mevcutIdler.push(r.id))
      if (data.length < 1000) break
      bas += 1000
    }
    const silinecek = mevcutIdler.filter(id => !listeIdler.has(id))
    for (let i = 0; i < silinecek.length; i += 100) {
      await supabase.from('modeller').delete().in('id', silinecek.slice(i, i + 100)).eq('onek', onek)
    }
    if (silinecek.length > 0) console.log('🗑 Tablodan ' + silinecek.length + ' silinen model temizlendi')
    return { yazilan, silinen: silinecek.length }
  } catch (e) { console.error('tabloModelleriSenkron:', e.message); return { yazilan: 0, silinen: 0 } }
}

// —— SIPARISLER —— (aynı desen)
export async function tabloSiparisleriOku(onek) {
  try {
    const { data, error } = await supabase.from('siparisler').select('veri').eq('onek', onek)
    if (error) { console.error('tabloSiparisleriOku:', error.message); return [] }
    return (data || []).map(r => r.veri).filter(Boolean)
  } catch (e) { console.error(e.message); return [] }
}
export async function tabloSiparisYaz(onek, siparis) {
  try {
    const { error } = await supabase.from('siparisler').upsert({
      id: String(siparis.id), onek, veri: siparis, guncelleme: new Date().toISOString()
    }, { onConflict: 'id' })
    return !error
  } catch { return false }
}
export async function tabloSiparisSil(id) {
  try { const { error } = await supabase.from('siparisler').delete().eq('id', String(id)); return !error } catch { return false }
}
export async function tabloSiparisleriToplu(onek, siparisler) {
  const BATCH = 100
  let yazilan = 0
  for (let i = 0; i < siparisler.length; i += BATCH) {
    const grup = siparisler.slice(i, i + BATCH).map(s => ({ id: String(s.id), onek, veri: s, guncelleme: new Date().toISOString() }))
    for (let d = 0; d < 3; d++) {
      const { error } = await supabase.from('siparisler').upsert(grup, { onConflict: 'id' })
      if (!error) { yazilan += grup.length; break }
      await new Promise(r => setTimeout(r, 500 * (d + 1)))
    }
  }
  return yazilan
}
// Sipariş tam senkron (silinenleri de temizler)
export async function tabloSiparisleriSenkron(onek, siparisler) {
  try {
    await tabloSiparisleriToplu(onek, siparisler)
    const listeIdler = new Set(siparisler.map(s => String(s.id)))
    const { data } = await supabase.from('siparisler').select('id').eq('onek', onek)
    const silinecek = (data || []).map(r => r.id).filter(id => !listeIdler.has(id))
    for (let i = 0; i < silinecek.length; i += 100) {
      await supabase.from('siparisler').delete().in('id', silinecek.slice(i, i + 100)).eq('onek', onek)
    }
    return { silinen: silinecek.length }
  } catch (e) { console.error('tabloSiparisleriSenkron:', e.message); return { silinen: 0 } }
}

// —— MUSTERILER —— (tek satırda, ad->kod objesi)
export async function tabloMusterileriOku(onek) {
  try {
    const { data } = await supabase.from('musteriler').select('veri').eq('onek', onek).maybeSingle()
    return data?.veri || {}
  } catch { return {} }
}
export async function tabloMusterileriYaz(onek, musteriler) {
  try {
    const { error } = await supabase.from('musteriler').upsert({
      onek, veri: musteriler, guncelleme: new Date().toISOString()
    }, { onConflict: 'onek' })
    return !error
  } catch { return false }
}

// ═══ DATABASE ═══
async function dbWrite(key, value) {
  const json = JSON.stringify(value)
  const boyutKB = Math.round(json.length / 1024)
  // Timeout'a karşı 3 deneme — büyük chunk'lar (ağır foto) bazen ilk seferde timeout olur
  let sonHata = null
  for (let deneme = 0; deneme < 3; deneme++) {
    const { error } = await supabase
      .from('storage')
      .upsert({ key, value: json }, { onConflict: 'key' })
    if (!error) return // başarılı
    sonHata = error
    // 57014 = statement timeout → biraz bekleyip tekrar dene
    if (error.code === '57014' || (error.message && error.message.includes('timeout'))) {
      console.warn('⏳ dbWrite timeout: ' + key + ' (' + boyutKB + 'KB), deneme ' + (deneme + 1) + '/3')
      await new Promise(r => setTimeout(r, 500 * (deneme + 1)))
      continue
    }
    // Başka bir hata → tekrar denemeden çık
    break
  }
  console.error('❌ dbWrite başarısız:', key, '(' + boyutKB + 'KB)', sonHata && sonHata.message)
  throw sonHata
}
async function dbRead(key) {
  const { data, error } = await supabase
    .from('storage')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  if (error) return null
  if (!data || !data.value) return null
  try { return JSON.parse(data.value) } catch { return null }
}
export async function dbSave(key, value) {
  try {
    if (value === null || value === undefined) return
    if (Array.isArray(value) && value.length > CHUNK_SIZE) {
      const chunks = []
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE))
      }
      const yeniChunkSayisi = chunks.length
      // Eski fazla chunk'ları sil
      const eskiMeta = await dbRead(key + '_meta')
      if (eskiMeta && eskiMeta.chunks > yeniChunkSayisi) {
        for (let i = yeniChunkSayisi; i < eskiMeta.chunks; i++) {
          await supabase.from('storage').delete().eq('key', key + '_chunk_' + i)
        }
      }
      // Chunk'ları sırayla kaydet
      let basarili = 0
      for (let i = 0; i < chunks.length; i++) {
        try {
          await dbWrite(key + '_chunk_' + i, chunks[i])
          basarili++
        } catch(e) {
          console.error('⚠ Chunk ' + i + ' hatası, devam ediliyor')
        }
      }
      await dbWrite(key + '_meta', { chunks: yeniChunkSayisi, total: value.length })
      await dbWrite(key, { _chunked: true, chunks: yeniChunkSayisi, total: value.length })
      console.log('✓ ' + key + ': ' + value.length + ' kayıt → ' + basarili + '/' + yeniChunkSayisi + ' chunk kaydedildi')
    } else {
      await dbWrite(key, value)
    }
  } catch(e) {
    console.error('❌ dbSave:', key, e.message)
  }
}
export async function dbLoad(key, def) {
  try {
    const data = await dbRead(key)
    if (data === null || data === undefined) return def
    if (data && typeof data === 'object' && data._chunked && data.chunks) {
      // Chunk'ları GRUPLU (batch) oku — 55'i birden değil, 8'erli gruplar halinde.
      // Tek seferde çok fazla eşzamanlı istek Supabase'i tıkıyor, bazı chunk'lar boş dönüyordu.
      const BATCH = 8;
      const okuTekChunk = async (i) => {
        // Her chunk için 3 deneme (geçici boş/hata durumuna karşı)
        for (let deneme = 0; deneme < 3; deneme++) {
          try {
            const c = await dbRead(key + '_chunk_' + i);
            if (Array.isArray(c)) return c;
          } catch (e) { /* tekrar dene */ }
          await new Promise(r => setTimeout(r, 150 * (deneme + 1))); // artan bekleme
        }
        return null; // 3 denemede de olmadı
      };

      const sonuc = new Array(data.chunks);
      for (let start = 0; start < data.chunks; start += BATCH) {
        const grup = [];
        for (let i = start; i < Math.min(start + BATCH, data.chunks); i++) {
          grup.push(okuTekChunk(i).then(c => { sonuc[i] = c; }));
        }
        await Promise.all(grup);
      }

      // Bütünlük kontrolü — bir chunk hâlâ null ise (3 denemeye rağmen) eksik veri döndürme
      const eksik = sonuc.findIndex(c => !Array.isArray(c));
      if (eksik !== -1) {
        console.error('❌ ' + key + ': chunk ' + eksik + '/' + data.chunks + ' 3 denemede okunamadı — veri kaybını önlemek için iptal edildi');
        throw new Error(key + ': chunk okuması eksik (' + data.chunks + ' chunk beklendi), veri kaybını önlemek için iptal edildi');
      }

      const tumKayitlar = [];
      sonuc.forEach(chunk => { if (Array.isArray(chunk)) tumKayitlar.push(...chunk); });
      if (typeof data.total === 'number' && tumKayitlar.length !== data.total) {
        console.warn('⚠ ' + key + ': beklenen ' + data.total + ' kayıt, okunan ' + tumKayitlar.length);
      }
      return tumKayitlar.length > 0 ? tumKayitlar : def;
    }
    return data
  } catch(e) {
    console.error('❌ dbLoad:', key, e.message)
    return def
  }
}

// ═══ AKILLI OKUMA — önce tablo, boş/hata olursa chunk'a düş (Aşama 2 Adım 3) ═══
export async function akilliModelOku(onek) {
  // Eksik okumaya karşı 3 deneme — tam okuyana kadar
  for (let deneme = 0; deneme < 3; deneme++) {
    try {
      const tabloModeller = await tabloModelleriOku(onek)
      if (tabloModeller && tabloModeller.length > 0) {
        console.log('📊 Modeller TABLODAN okundu: ' + tabloModeller.length)
        return tabloModeller
      }
      // Boş döndü — chunk'a düş
      console.warn('⚠ Tablo boş, chunk sistemine düşülüyor')
      return await dbLoad((onek || '') + 'v7m', [])
    } catch (e) {
      console.warn('⏳ Model okuma denemesi ' + (deneme + 1) + '/3: ' + e.message)
      await new Promise(r => setTimeout(r, 800 * (deneme + 1)))
    }
  }
  // 3 deneme de eksik — chunk'a düş (son çare)
  console.error('❌ Tablo 3 denemede tam okunamadı, chunk fallback')
  return await dbLoad((onek || '') + 'v7m', [])
}
export async function akilliSiparisOku(onek) {
  try {
    const t = await tabloSiparisleriOku(onek)
    const chunk = await dbLoad((onek || '') + 'v7s', [])
    if (t.length >= chunk.length) return t
    return chunk
  } catch (e) {
    console.error('akilliSiparisOku:', e.message)
    return await dbLoad((onek || '') + 'v7s', [])
  }
}
export async function akilliMusteriOku(onek) {
  try {
    const t = await tabloMusterileriOku(onek)
    if (t && Object.keys(t).length > 0) return t
    return await dbLoad((onek || '') + 'v7u', {})
  } catch {
    return await dbLoad((onek || '') + 'v7u', {})
  }
}

// ═══ İŞLEM GEÇMİŞİ (Aşama 3) ═══
// Cihaz kimliği — tarayıcı başına sabit, kim yaptı ayırt etmek için
function cihazKimligi() {
  try {
    let c = localStorage.getItem('atolye_cihaz_id')
    if (!c) {
      c = 'cihaz-' + Math.random().toString(36).slice(2, 8)
      localStorage.setItem('atolye_cihaz_id', c)
    }
    return c
  } catch { return 'bilinmeyen' }
}

// İşlem kaydet (arka planda, sessiz — hata olsa uygulamayı etkilemez)
export async function islemKaydet(onek, islem, tur, detay) {
  try {
    await supabase.from('islem_gecmisi').insert({
      onek, islem, tur, detay: detay || null, cihaz: cihazKimligi()
    })
    // Son 500 kaydı tut, eskiyi temizle (ara sıra)
    if (Math.random() < 0.1) { // %10 ihtimalle temizlik yap (her seferinde değil)
      const { data } = await supabase.from('islem_gecmisi')
        .select('id').eq('onek', onek).order('zaman', { ascending: false }).range(500, 500)
      if (data && data.length > 0) {
        await supabase.from('islem_gecmisi').delete().eq('onek', onek).lt('id', data[0].id)
      }
    }
  } catch (e) { /* sessiz — geçmiş kaydı kritik değil */ }
}

// Son işlemleri getir
export async function islemGecmisiGetir(onek, limit = 50) {
  try {
    const { data, error } = await supabase.from('islem_gecmisi')
      .select('*').eq('onek', onek).order('zaman', { ascending: false }).limit(limit)
    if (error) return []
    return data || []
  } catch { return [] }
}

// ═══ REALTIME SENKRON (Aşama 3) ═══
// Tablo değişikliklerini canlı dinler. Değişiklik olunca callback tetiklenir.
// Dönen fonksiyon çağrılınca abonelik iptal edilir (cleanup için).
export function realtimeBaslat(onek, callback) {
  try {
    const kanal = supabase
      .channel('atolye-degisiklikler-' + (onek || 'msk'))
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'modeller', filter: 'onek=eq.' + onek },
        (payload) => callback('modeller', payload))
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'siparisler', filter: 'onek=eq.' + onek },
        (payload) => callback('siparisler', payload))
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'musteriler', filter: 'onek=eq.' + onek },
        (payload) => callback('musteriler', payload))
      .subscribe((durum) => {
        if (durum === 'SUBSCRIBED') console.log('📡 Realtime bağlandı')
        else if (durum === 'CHANNEL_ERROR') console.warn('⚠ Realtime bağlantı hatası (polling devam ediyor)')
      })
    return () => { try { supabase.removeChannel(kanal) } catch {} }
  } catch (e) {
    console.error('realtimeBaslat:', e.message)
    return () => {}
  }
}

// ═══ KOLEKSIYONLAR + KASA tablosu (Aşama 3 — chunk temizliği hazırlığı) ═══
export async function tabloKoleksiyonlariOku(onek) {
  try {
    const { data } = await supabase.from('koleksiyonlar').select('veri').eq('onek', onek).maybeSingle()
    return Array.isArray(data?.veri) ? data.veri : null
  } catch { return null }
}
export async function tabloKoleksiyonlariYaz(onek, kollar) {
  try {
    const { error } = await supabase.from('koleksiyonlar').upsert({
      onek, veri: kollar, guncelleme: new Date().toISOString()
    }, { onConflict: 'onek' })
    return !error
  } catch { return false }
}
export async function tabloKasaOku(onek) {
  try {
    const { data } = await supabase.from('kasa').select('veri').eq('onek', onek).maybeSingle()
    return data?.veri || null
  } catch { return null }
}
export async function tabloKasaYaz(onek, kasa) {
  try {
    const { error } = await supabase.from('kasa').upsert({
      onek, veri: kasa, guncelleme: new Date().toISOString()
    }, { onConflict: 'onek' })
    return !error
  } catch { return false }
}

// Akıllı okuma — koleksiyon ve kasa (tablo öncelikli, chunk fallback)
export async function akilliKoleksiyonOku(onek) {
  try {
    const t = await tabloKoleksiyonlariOku(onek)
    if (t && t.length > 0) return t
    return await dbLoad((onek || '') + 'v7k', [])
  } catch {
    return await dbLoad((onek || '') + 'v7k', [])
  }
}
export async function akilliKasaOku(onek) {
  try {
    const t = await tabloKasaOku(onek)
    if (t) return t
    return await dbLoad((onek || '') + 'v7kasa', null)
  } catch {
    return await dbLoad((onek || '') + 'v7kasa', null)
  }
}

// ═══ SAĞLIK DENETİMİ (Aşama 3 — otomatik tutarlılık kontrolü) ═══
// Tablo ve chunk sayılarını karşılaştırır, tutarsızlık varsa raporlar.
export async function saglikDenetimi(onek) {
  const rapor = { saglikli: true, uyarilar: [], detay: {} }
  try {
    // 1. Modeller: tablo sayısı
    const tabloModel = await tabloModelSayisi(onek)
    rapor.detay.tabloModel = tabloModel
    // 2. Modeller: chunk sayısı (meta'dan)
    let chunkModel = -1
    try {
      const meta = await dbRead((onek || '') + 'v7m_meta')
      if (meta && typeof meta.total === 'number') chunkModel = meta.total
    } catch {}
    rapor.detay.chunkModel = chunkModel
    // Karşılaştır — tablo ile chunk arası %5'ten fazla fark şüpheli
    if (tabloModel > 0 && chunkModel > 0) {
      const fark = Math.abs(tabloModel - chunkModel)
      if (fark > Math.max(5, tabloModel * 0.05)) {
        rapor.saglikli = false
        rapor.uyarilar.push('Model sayısı uyuşmuyor: tablo ' + tabloModel + ', chunk ' + chunkModel)
      }
    }
    // 3. Siparişler
    try {
      const { count } = await supabase.from('siparisler').select('id', { count: 'exact', head: true }).eq('onek', onek)
      rapor.detay.tabloSiparis = count ?? -1
    } catch { rapor.detay.tabloSiparis = -1 }
    // 4. Koleksiyon + Kasa tablo var mı
    try {
      const { count: kc } = await supabase.from('koleksiyonlar').select('onek', { count: 'exact', head: true }).eq('onek', onek)
      rapor.detay.koleksiyonTablo = (kc ?? 0) > 0
      if (!rapor.detay.koleksiyonTablo) rapor.uyarilar.push('Koleksiyon tablosu boş')
    } catch { rapor.detay.koleksiyonTablo = false }
    try {
      const { count: ksc } = await supabase.from('kasa').select('onek', { count: 'exact', head: true }).eq('onek', onek)
      rapor.detay.kasaTablo = (ksc ?? 0) > 0
    } catch { rapor.detay.kasaTablo = false }
    return rapor
  } catch (e) {
    rapor.saglikli = false
    rapor.uyarilar.push('Denetim hatası: ' + e.message)
    return rapor
  }
}

// Açılışta hızlı tutarlılık: ekrandaki sayı vs sunucudaki gerçek sayı
export async function ekranSunucuFarki(onek, ekranModelSayisi) {
  try {
    const sunucu = await tabloModelSayisi(onek)
    if (sunucu < 0) return null // sayılamadı
    const fark = sunucu - ekranModelSayisi
    return { sunucu, ekran: ekranModelSayisi, fark, sorunVar: Math.abs(fark) > Math.max(5, sunucu * 0.05) }
  } catch { return null }
}

// ═══ TOPTANCI KAYIT (vitrin bülteni) ═══
// Toptancı kaydı ekle (vitrinden). Aynı telefon varsa günceller (mükerrer önlenir).
export async function toptanciKaydet(onek, ad, telefon, vitrinKod) {
  try {
    // Telefonu normalize et (sadece rakam)
    const tel = String(telefon).replace(/\D/g, '')
    if (tel.length < 10) return { ok: false, hata: 'Geçersiz telefon numarası' }
    const { error } = await supabase.from('toptancilar').upsert({
      onek, ad: String(ad).trim(), telefon: tel, vitrin_kod: vitrinKod || null, aktif: true
    }, { onConflict: 'onek,telefon' })
    if (error) return { ok: false, hata: error.message }
    return { ok: true }
  } catch (e) { return { ok: false, hata: e.message } }
}

// Kayıtlı toptancıları getir (senin panelin için)
export async function toptancilariGetir(onek) {
  try {
    const { data, error } = await supabase.from('toptancilar')
      .select('*').eq('onek', onek).order('kayit_tarihi', { ascending: false })
    if (error) return []
    return data || []
  } catch { return [] }
}

// Toptancı sil
export async function toptanciSil(id) {
  try { const { error } = await supabase.from('toptancilar').delete().eq('id', id); return !error } catch { return false }
}

// ═══ VİTRİN AKTİVİTE TAKİBİ (müşteri davranışı) ═══
export async function vitrinAktiviteKaydet(onek, musteriKod, musteriAd, eylem, koleksiyon, modelKod, modelAd) {
  try {
    await supabase.from('vitrin_aktivite').insert({
      onek, musteri_kod: musteriKod, musteri_ad: musteriAd || null,
      eylem, koleksiyon: koleksiyon || null, model_kod: modelKod || null, model_ad: modelAd || null
    })
  } catch (e) { /* sessiz */ }
}
export async function vitrinGecmisiGetir(onek, musteriKod, limit = 100) {
  try {
    const { data, error } = await supabase.from('vitrin_aktivite')
      .select('*').eq('onek', onek).eq('musteri_kod', musteriKod)
      .order('zaman', { ascending: false }).limit(limit)
    if (error) return []
    return data || []
  } catch { return [] }
}
export async function vitrinEnCokBakilan(onek, musteriKod) {
  try {
    const { data } = await supabase.from('vitrin_aktivite')
      .select('model_kod, model_ad').eq('onek', onek).eq('musteri_kod', musteriKod)
      .eq('eylem', 'model').limit(500)
    if (!data) return []
    const say = {}
    data.forEach(r => {
      if (!r.model_kod) return
      if (!say[r.model_kod]) say[r.model_kod] = { kod: r.model_kod, ad: r.model_ad, sayi: 0 }
      say[r.model_kod].sayi++
    })
    return Object.values(say).sort((a, b) => b.sayi - a.sayi).slice(0, 10)
  } catch { return [] }
}
