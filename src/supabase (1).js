import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

const BUCKET = 'fotograflar'
const CHUNK_SIZE = 50 // Fotoğraflar URL olduğu için artık büyük olabilir

// ═══ STORAGE BUCKET — fotoğraf yükleme ═══
async function fotoYukle(base64, modelId) {
  if (!base64 || !base64.startsWith('data:image')) return base64
  // Zaten URL ise dokunma
  if (base64.startsWith('http')) return base64
  
  try {
    // Base64'ü blob'a çevir
    const [header, data] = base64.split(',')
    const mime = header.match(/:(.*?);/)[1]
    const ext = mime.split('/')[1] || 'jpg'
    const binary = atob(data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: mime })
    
    // Dosya adı: modelId-timestamp.ext
    const fileName = modelId + '-' + Date.now() + '.' + ext
    
    // Yükle
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, blob, { upsert: true, contentType: mime })
    
    if (error) {
      console.error('Foto yükleme hatası:', error)
      return base64 // Hata olursa base64'ü tut
    }
    
    // Public URL al
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName)
    return urlData.publicUrl
  } catch(e) {
    console.error('Foto yükleme exception:', e)
    return base64
  }
}

// ═══ DATABASE ═══
async function rawSave(key, value) {
  const { error } = await supabase
    .from('storage')
    .upsert({ key, value: JSON.stringify(value) }, { onConflict: 'key' })
  if (error) throw error
}

async function rawLoad(key) {
  const { data, error } = await supabase
    .from('storage')
    .select('value')
    .eq('key', key)
    .single()
  if (error || !data) return null
  try { return JSON.parse(data.value) } catch { return null }
}

// Modellerdeki fotoğrafları otomatik storage'a yükle
async function fotograflariIsle(modeller) {
  if (!Array.isArray(modeller)) return modeller
  
  const sonuc = []
  let yuklenenSayi = 0
  
  for (const m of modeller) {
    if (m.foto && m.foto.startsWith('data:image')) {
      // Base64 — bucket'a yükle
      const url = await fotoYukle(m.foto, m.id)
      if (url !== m.foto) {
        yuklenenSayi++
        sonuc.push({ ...m, foto: url })
      } else {
        sonuc.push(m)
      }
    } else {
      sonuc.push(m)
    }
  }
  
  if (yuklenenSayi > 0) console.log('✓ ' + yuklenenSayi + ' fotoğraf bucket\'a yüklendi')
  return sonuc
}

export async function dbSave(key, value) {
  try {
    if (value === null || value === undefined) return
    
    // Modeller veya kollar varsa fotoğrafları işle
    let veri = value
    if ((key === 'v7m' || key === 'v7k') && Array.isArray(value)) {
      veri = await fotograflariIsle(value)
    }

    if (Array.isArray(veri) && veri.length > CHUNK_SIZE) {
      const chunks = []
      for (let i = 0; i < veri.length; i += CHUNK_SIZE) {
        chunks.push(veri.slice(i, i + CHUNK_SIZE))
      }
      const newChunkCount = chunks.length

      // Eski fazla chunk'ları temizle
      const oldMeta = await rawLoad(key + '_meta')
      if (oldMeta && oldMeta.chunks > newChunkCount) {
        for (let i = newChunkCount; i < oldMeta.chunks; i++) {
          await supabase.from('storage').delete().eq('key', key + '_chunk_' + i)
        }
      }

      // Chunk'ları sırayla kaydet
      for (let i = 0; i < chunks.length; i++) {
        await rawSave(key + '_chunk_' + i, chunks[i])
      }

      await rawSave(key + '_meta', { chunks: newChunkCount, total: veri.length })
      await rawSave(key, { _chunked: true, chunks: newChunkCount, total: veri.length })
      console.log('✓ Kaydedildi: ' + key + ' (' + veri.length + ' kayıt, ' + newChunkCount + ' chunk)')
    } else {
      await rawSave(key, veri)
    }
  } catch(e) {
    console.error('dbSave error:', key, e)
  }
}

export async function dbLoad(key, def) {
  try {
    const data = await rawLoad(key)
    if (data === null) return def

    if (data && data._chunked && data.chunks) {
      const chunks = []
      for (let i = 0; i < data.chunks; i++) {
        const chunk = await rawLoad(key + '_chunk_' + i)
        if (chunk) chunks.push(...chunk)
      }
      return chunks.length > 0 ? chunks : def
    }

    return data
  } catch(e) {
    console.error('dbLoad error:', key, e)
    return def
  }
}
