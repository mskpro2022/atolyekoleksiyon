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
      // OKUMA PARALELLEŞTİRİLDİ — tüm chunk'lar aynı anda çekiliyor (sıralı değil)
      const chunkPromises = []
      for (let i = 0; i < data.chunks; i++) {
        chunkPromises.push(dbRead(key + '_chunk_' + i))
      }
      const chunkSonuclari = await Promise.all(chunkPromises)
      // BÜTÜNLÜK KONTROLÜ — herhangi bir chunk okunamadıysa (null) EKSİK veri döndürme.
      // Eksik listeyi gerçek sanıp üzerine yazmak kalıcı veri kaybına yol açar.
      const eksikChunk = chunkSonuclari.findIndex(c => !Array.isArray(c))
      if (eksikChunk !== -1) {
        console.error('❌ ' + key + ': chunk ' + eksikChunk + '/' + data.chunks + ' okunamadı — GÜVENLİK İÇİN eksik veri reddedildi. Tekrar denenecek.')
        // Bir kez daha dene (geçici ağ hatası olabilir)
        const tekrar = []
        for (let i = 0; i < data.chunks; i++) tekrar.push(dbRead(key + '_chunk_' + i))
        const tekrarSonuc = await Promise.all(tekrar)
        if (tekrarSonuc.some(c => !Array.isArray(c))) {
          throw new Error(key + ': chunk okuması eksik (' + data.chunks + ' chunk beklendi), veri kaybını önlemek için iptal edildi')
        }
        const t2 = []
        tekrarSonuc.forEach(chunk => { if (Array.isArray(chunk)) t2.push(...chunk) })
        return t2
      }
      const tumKayitlar = []
      chunkSonuclari.forEach(chunk => {
        if (Array.isArray(chunk)) tumKayitlar.push(...chunk)
      })
      // total ile tutarlılık uyarısı (opsiyonel, sadece log)
      if (typeof data.total === 'number' && tumKayitlar.length !== data.total) {
        console.warn('⚠ ' + key + ': beklenen ' + data.total + ' kayıt, okunan ' + tumKayitlar.length)
      }
      return tumKayitlar.length > 0 ? tumKayitlar : def
    }
    return data
  } catch(e) {
    console.error('❌ dbLoad:', key, e.message)
    return def
  }
}
