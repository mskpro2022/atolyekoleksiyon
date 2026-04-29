import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Tek satır max boyutu (güvenli limit)
const MAX_BYTES = 4 * 1024 * 1024 // 4MB

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
  return JSON.parse(data.value)
}

export async function dbSave(key, value) {
  try {
    const json = JSON.stringify(value)
    
    // Büyük veriyi parçalara böl
    if (json.length > MAX_BYTES && Array.isArray(value)) {
      const chunkSize = Math.ceil(value.length / Math.ceil(json.length / MAX_BYTES))
      const chunks = []
      for (let i = 0; i < value.length; i += chunkSize) {
        chunks.push(value.slice(i, i + chunkSize))
      }
      // Her parçayı kaydet
      await Promise.all(chunks.map((chunk, i) => rawSave(key + '_chunk_' + i, chunk)))
      // Meta bilgisini kaydet
      await rawSave(key + '_meta', { chunks: chunks.length, total: value.length })
      // Eski tek parça varsa üzerine yaz (meta referansı)
      await rawSave(key, { _chunked: true, chunks: chunks.length, total: value.length })
    } else {
      await rawSave(key, value)
      // Eski chunk'ları temizle (varsa)
      await rawSave(key + '_meta', null)
    }
  } catch(e) {
    console.error('dbSave error:', key, e)
  }
}

export async function dbLoad(key, def) {
  try {
    const data = await rawLoad(key)
    if (data === null) return def
    
    // Parçalı veri mi?
    if (data && data._chunked) {
      const chunks = await Promise.all(
        Array.from({ length: data.chunks }, (_, i) => rawLoad(key + '_chunk_' + i))
      )
      const result = chunks.filter(Boolean).flat()
      return result.length > 0 ? result : def
    }
    
    return data
  } catch(e) {
    console.error('dbLoad error:', key, e)
    return def
  }
}
