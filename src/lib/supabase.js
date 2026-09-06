import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase = null
let isSupabaseEnabled = false

if (supabaseUrl && supabaseAnonKey) {
  try {
    // Basic URL validation
    const url = supabaseUrl.trim()
    if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
      console.warn('[supabase] VITE_SUPABASE_URL looks invalid, expected https://xxx.supabase.co')
    }
    supabase = createClient(url, supabaseAnonKey.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: { eventsPerSecond: 5 },
      },
    })
    isSupabaseEnabled = true
    console.log('[supabase] enabled for', url)
  } catch (e) {
    console.warn('[supabase] init failed, falling back to local mode:', e?.message)
    isSupabaseEnabled = false
  }
} else {
  console.log('[supabase] not configured — running in local mode. Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY to enable secure global sync.')
}

export { supabase, isSupabaseEnabled, supabaseUrl }
