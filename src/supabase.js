import { createClient } from '@supabase/supabase-js'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseKey)
const CHUNK_SIZE = 50
// ═══ DATABASE ═══
async function dbWrite(key, value) {
  const json = JSON.stringify(value)
  const { error } = await supabase
    .from('storage')
    .upsert({ key, value: json }, { onConflict: 'key' })
  if (error) {
    console.error('❌ dbWrite:', key, '(' + Math.round(json.length/1024) + 'KB)', error.message)
    throw error
  }
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
