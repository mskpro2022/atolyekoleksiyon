import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

const CHUNK_SIZE = 15 // Daha küçük — 500 hata önleme

async function rawSave(key, value) {
  const json = JSON.stringify(value)
  // 4MB üzerinde uyarı
  if (json.length > 4000000) {
    console.warn('Büyük veri:', key, (json.length/1024/1024).toFixed(2)+'MB')
  }
  const { error } = await supabase
    .from('storage')
    .upsert({ key, value: json }, { onConflict: 'key' })
  if (error) {
    console.error('rawSave hata:', key, error)
    throw error
  }
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

export async function dbSave(key, value) {
  try {
    if (value === null || value === undefined) return

    if (Array.isArray(value) && value.length > CHUNK_SIZE) {
      const chunks = []
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE))
      }
      const newChunkCount = chunks.length

      // Eski fazla chunk'ları temizle
      const oldMeta = await rawLoad(key + '_meta')
      if (oldMeta && oldMeta.chunks > newChunkCount) {
        for (let i = newChunkCount; i < oldMeta.chunks; i++) {
          await supabase.from('storage').delete().eq('key', key + '_chunk_' + i)
        }
      }

      // Chunk'ları SIRAYLA kaydet
      let basariliSayisi = 0
      for (let i = 0; i < chunks.length; i++) {
        try {
          await rawSave(key + '_chunk_' + i, chunks[i])
          basariliSayisi++
        } catch(e) {
          console.error('Chunk ' + i + ' kaydedilemedi:', e)
          throw new Error('Chunk ' + i + ' kaydedilemedi: ' + e.message)
        }
      }

      // Meta kaydet
      await rawSave(key + '_meta', { chunks: newChunkCount, total: value.length })
      await rawSave(key, { _chunked: true, chunks: newChunkCount, total: value.length })

      console.log('✓ Kaydedildi: ' + key + ' (' + value.length + ' kayıt, ' + newChunkCount + ' chunk)')
    } else {
      await rawSave(key, value)
    }
  } catch(e) {
    console.error('dbSave error:', key, e)
    throw e // hatayı yukarı fırlat
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
