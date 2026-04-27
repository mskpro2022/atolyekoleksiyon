import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Storage yardımcıları — Supabase kullanır
export async function dbLoad(key, def) {
  try {
    const { data, error } = await supabase
      .from('storage')
      .select('value')
      .eq('key', key)
      .single()
    if (error || !data) return def
    return JSON.parse(data.value)
  } catch { return def }
}

export async function dbSave(key, value) {
  try {
    const { error } = await supabase
      .from('storage')
      .upsert({ key, value: JSON.stringify(value) }, { onConflict: 'key' })
    if (error) console.error('dbSave error:', error)
  } catch(e) { console.error('dbSave exception:', e) }
}
