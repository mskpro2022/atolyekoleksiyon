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
      const eskiMeta = await dbRead(key + '_meta')
      // Chunk'ları sırayla kaydet (YAZMA MANTIĞI DEĞİŞMEDİ — güvenlik için sıralı kalıyor)
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
      // Eski fazla chunk'ları EN SON temizle — ana kayıt güncellendiği için artık kimse
      // bu chunk'ları okumuyor; silme paralel yapılır (hızlı, tek seferlik geçişte bekletmez)
      if (eskiMeta && eskiMeta.chunks > yeniChunkSayisi) {
        const silinecek = []
        for (let i = yeniChunkSayisi; i < eskiMeta.chunks; i++) {
          silinecek.push(supabase.from('storage').delete().eq('key', key + '_chunk_' + i))
        }
        try { await Promise.all(silinecek) } catch(e) { console.error('⚠ Eski chunk temizliği:', e.message) }
      }
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
      const tumKayitlar = []
      chunkSonuclari.forEach(chunk => {
        if (Array.isArray(chunk)) tumKayitlar.push(...chunk)
      })
      return tumKayitlar.length > 0 ? tumKayitlar : def
    }
    return data
  } catch(e) {
    console.error('❌ dbLoad:', key, e.message)
    return def
  }
}
