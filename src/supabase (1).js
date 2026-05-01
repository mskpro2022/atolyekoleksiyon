import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

const BUCKET = 'fotograflar'
const CHUNK_SIZE = 25

// ═══════════════════════════════════════════════════
//  FOTOĞRAF: Base64 → Bucket URL dönüşümü
// ═══════════════════════════════════════════════════
async function fotoYukle(base64, modelId) {
  if (!base64 || typeof base64 !== 'string') return base64
  if (!base64.startsWith('data:image')) return base64 // zaten URL veya boş

  try {
    const parts = base64.split(',')
    if (parts.length !== 2) return base64
    
    const mimeMatch = parts[0].match(/:(.*?);/)
    if (!mimeMatch) return base64
    const mime = mimeMatch[1]
    const ext = (mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
    
    const binary = atob(parts[1])
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: mime })
    
    const fileName = (modelId || 'foto') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,7) + '.' + ext

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, blob, { upsert: false, contentType: mime })

    if (error) {
      console.error('❌ Bucket upload:', error.message)
      return base64
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName)
    return urlData.publicUrl
  } catch(e) {
    console.error('❌ fotoYukle exception:', e.message)
    return base64
  }
}

// Modeller dizisindeki tüm base64 fotoları bucket'a yükle
async function modellerinFotolariniIsle(modeller) {
  if (!Array.isArray(modeller)) return modeller
  
  const sonuc = []
  let yuklenenSayi = 0
  
  for (const m of modeller) {
    if (m && m.foto && typeof m.foto === 'string' && m.foto.startsWith('data:image')) {
      const url = await fotoYukle(m.foto, m.id)
      if (url && url.startsWith('http')) {
        sonuc.push({ ...m, foto: url })
        yuklenenSayi++
      } else {
        sonuc.push(m) // hata olursa orijinali tut
      }
    } else {
      sonuc.push(m)
    }
  }
  
  if (yuklenenSayi > 0) {
    console.log('✓ ' + yuklenenSayi + ' fotoğraf bucket\'a taşındı')
  }
  return sonuc
}

// ═══════════════════════════════════════════════════
//  DATABASE: storage tablosu
// ═══════════════════════════════════════════════════
async function dbWrite(key, value) {
  const json = JSON.stringify(value)
  const sizeKB = Math.round(json.length / 1024)
  
  const { error } = await supabase
    .from('storage')
    .upsert({ key, value: json }, { onConflict: 'key' })
  
  if (error) {
    console.error('❌ dbWrite:', key, '(' + sizeKB + 'KB)', error.message)
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

// ═══════════════════════════════════════════════════
//  PUBLIC API
// ═══════════════════════════════════════════════════
export async function dbSave(key, value) {
  try {
    if (value === null || value === undefined) return
    
    let veri = value
    
    // 1. Modeller veya kollar ise: ÖNCE fotoğrafları bucket'a yükle
    if ((key === 'v7m' || key === 'v7k') && Array.isArray(value)) {
      veri = await modellerinFotolariniIsle(value)
    }

    // 2. Büyük array ise chunk'la
    if (Array.isArray(veri) && veri.length > CHUNK_SIZE) {
      const chunks = []
      for (let i = 0; i < veri.length; i += CHUNK_SIZE) {
        chunks.push(veri.slice(i, i + CHUNK_SIZE))
      }
      const yeniChunkSayisi = chunks.length

      // Eski fazla chunk'ları sil
      const eskiMeta = await dbRead(key + '_meta')
      if (eskiMeta && eskiMeta.chunks > yeniChunkSayisi) {
        for (let i = yeniChunkSayisi; i < eskiMeta.chunks; i++) {
          await supabase.from('storage').delete().eq('key', key + '_chunk_' + i)
        }
      }

      // Chunk'ları sırayla kaydet (paralel değil — timeout önleme)
      let basariliChunk = 0
      for (let i = 0; i < chunks.length; i++) {
        try {
          await dbWrite(key + '_chunk_' + i, chunks[i])
          basariliChunk++
        } catch(e) {
          console.error('⚠ Chunk ' + i + ' hatası, devam ediliyor')
        }
      }

      // Meta ve ana key
      await dbWrite(key + '_meta', { chunks: yeniChunkSayisi, total: veri.length })
      await dbWrite(key, { _chunked: true, chunks: yeniChunkSayisi, total: veri.length })
      
      console.log('✓ ' + key + ': ' + veri.length + ' kayıt → ' + basariliChunk + '/' + yeniChunkSayisi + ' chunk')
    } else {
      // Tek seferde kaydet
      await dbWrite(key, veri)
    }
  } catch(e) {
    console.error('❌ dbSave:', key, e.message)
  }
}

export async function dbLoad(key, def) {
  try {
    const data = await dbRead(key)
    if (data === null || data === undefined) return def

    // Chunk'lı veri ise topla
    if (data && typeof data === 'object' && data._chunked && data.chunks) {
      const tumKayitlar = []
      for (let i = 0; i < data.chunks; i++) {
        const chunk = await dbRead(key + '_chunk_' + i)
        if (Array.isArray(chunk)) tumKayitlar.push(...chunk)
      }
      return tumKayitlar.length > 0 ? tumKayitlar : def
    }

    return data
  } catch(e) {
    console.error('❌ dbLoad:', key, e.message)
    return def
  }
}
