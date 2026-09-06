import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import defaultData from '../data/defaultData.js'
import { supabase, isSupabaseEnabled } from '../lib/supabase.js'
import { validatePortfolioData } from '../lib/validate.js'

const PortfolioContext = createContext(null)

const STORAGE_KEY = 'portfolio_data'
const ADMIN_TOKEN_KEY = 'admin_auth_token'
const AUDIT_KEY = 'portfolio_audit_log'
const DATA_VERSION = defaultData._version

function safeSetLocal(key, value) {
  try { localStorage.setItem(key, value) } catch {}
}
function safeGetLocal(key) {
  try { return localStorage.getItem(key) } catch { return null }
}

function loadFromStorage() {
  try {
    const saved = safeGetLocal(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      const validated = validatePortfolioData(parsed)
      if (validated._version >= DATA_VERSION) {
        return validated
      }
      if (!isSupabaseEnabled && validated._version === DATA_VERSION) return validated
      if (isSupabaseEnabled) return validated
    }
  } catch (e) {
    console.warn('[portfolio] loadFromStorage rejected:', e?.message)
  }
  return null
}

function addAudit(action, detail) {
  try {
    const raw = safeGetLocal(AUDIT_KEY)
    const arr = raw ? JSON.parse(raw) : []
    arr.unshift({ ts: new Date().toISOString(), action, detail })
    const trimmed = arr.slice(0, 50)
    safeSetLocal(AUDIT_KEY, JSON.stringify(trimmed))
  } catch {}
}

export function PortfolioProvider({ children }) {
  const [data, setData] = useState(() => loadFromStorage() || defaultData)
  const [isAuthenticated, setIsAuthenticated] = useState(() => safeGetLocal(ADMIN_TOKEN_KEY) === 'admin_token_2026')
  const [supabaseUser, setSupabaseUser] = useState(null)
  const [syncStatus, setSyncStatus] = useState(isSupabaseEnabled ? 'connecting' : 'local')
  const [isSyncing, setIsSyncing] = useState(isSupabaseEnabled)
  const [remoteVersion, setRemoteVersion] = useState(null)
  const [lastSyncError, setLastSyncError] = useState(null)

  const lastRemoteDataRef = useRef(null)
  const isWritingRemoteRef = useRef(false)
  const lastWriteTimeRef = useRef(0)
  const writeCountRef = useRef({ count: 0, windowStart: Date.now() })
  const pendingSyncRef = useRef(null)
  const channelRef = useRef(null)

  // Track Supabase Auth — FREE, secure, RLS-gated
  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return
    // initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user || null
      setSupabaseUser(u)
      if (u) {
        setIsAuthenticated(true)
        safeSetLocal(ADMIN_TOKEN_KEY, 'admin_token_2026')
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user || null
      setSupabaseUser(u)
      if (u) {
        setIsAuthenticated(true)
        safeSetLocal(ADMIN_TOKEN_KEY, 'admin_token_2026')
        addAudit('auth', `supabase sign-in ${u.email}`)
      } else if (event === 'SIGNED_OUT') {
        addAudit('auth', 'supabase sign-out')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Subscribe to Supabase Realtime for instant global updates (<2s)
  // Table: portfolio (id=1) with columns: id, data(jsonb), version, updated_at, updated_by
  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) {
      setSyncStatus('local')
      setIsSyncing(false)
      return
    }
    let cancelled = false
    setIsSyncing(true)
    setSyncStatus('syncing')

    const fetchInitial = async () => {
      try {
        const { data: row, error } = await supabase
          .from('portfolio')
          .select('data, version, updated_at, updated_by')
          .eq('id', 1)
          .single()
        if (cancelled) return
        if (error) {
          // PGRST116 = no rows, 42P01 = table not exist yet (user hasn't run SQL)
          if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
            setSyncStatus('no-remote')
            console.log('[supabase] no remote row yet — will create on first authenticated write')
          } else if (error.code === '42P01') {
            setSyncStatus('no-remote')
            setLastSyncError('Supabase table portfolio missing — run supabase.sql in SQL Editor')
            console.warn('[supabase] table missing, run supabase.sql')
          } else {
            console.warn('[supabase] fetch initial failed:', error.message)
            setSyncStatus('error')
            setLastSyncError(error.message)
          }
          setIsSyncing(false)
          return
        }
        if (row?.data) {
          try {
            const validated = validatePortfolioData(row.data)
            lastRemoteDataRef.current = validated
            setRemoteVersion(validated._version ?? row.version)
            setLastSyncError(null)
            setData(prev => {
              if (isWritingRemoteRef.current) {
                try { if (JSON.stringify(prev) === JSON.stringify(validated)) return prev } catch {}
              }
              const now = Date.now()
              const isRecentLocalEdit = now - lastWriteTimeRef.current < 3000
              if (validated._version > (prev._version ?? 0)) {
                safeSetLocal(STORAGE_KEY, JSON.stringify(validated))
                addAudit('sync', `adopted remote v${validated._version} (newer)`)
                return validated
              }
              if (validated._version >= (prev._version ?? 0) && !isRecentLocalEdit) {
                safeSetLocal(STORAGE_KEY, JSON.stringify(validated))
                if (JSON.stringify(prev) !== JSON.stringify(validated)) addAudit('sync', `adopted remote v${validated._version}`)
                return validated
              }
              return prev
            })
            setSyncStatus('synced')
          } catch (e) {
            console.warn('[sync] invalid remote rejected:', e.message)
            setSyncStatus('error')
            setLastSyncError('Invalid remote data: ' + e.message)
          }
        } else {
          setSyncStatus('no-remote')
        }
        setIsSyncing(false)
      } catch (e) {
        if (!cancelled) {
          console.error('[supabase] initial fetch error:', e.message)
          setSyncStatus('error')
          setLastSyncError(e.message)
          setIsSyncing(false)
        }
      }
    }
    fetchInitial()

    // Realtime channel — public read, so visitors get <2s updates too
    const channel = supabase
      .channel('portfolio-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'portfolio', filter: 'id=eq.1' }, (payload) => {
        try {
          const row = payload.new
          if (!row || !row.data) return
          const validated = validatePortfolioData(row.data)
          lastRemoteDataRef.current = validated
          setRemoteVersion(validated._version ?? row.version)
          setLastSyncError(null)
          setData(prev => {
            if (isWritingRemoteRef.current) {
              try { if (JSON.stringify(prev) === JSON.stringify(validated)) return prev } catch {}
            }
            const now = Date.now()
            const isRecentLocalEdit = now - lastWriteTimeRef.current < 3000
            if (validated._version > (prev._version ?? 0)) {
              safeSetLocal(STORAGE_KEY, JSON.stringify(validated))
              addAudit('sync', `realtime v${validated._version}`)
              return validated
            }
            if (validated._version >= (prev._version ?? 0) && !isRecentLocalEdit) {
              safeSetLocal(STORAGE_KEY, JSON.stringify(validated))
              if (JSON.stringify(prev) !== JSON.stringify(validated)) addAudit('sync', `realtime v${validated._version}`)
              return validated
            }
            return prev
          })
          setSyncStatus('synced')
        } catch (e) {
          console.warn('[realtime] invalid payload rejected:', e.message)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log('[supabase] realtime subscribed: portfolio-live')
        if (status === 'CHANNEL_ERROR') {
          console.warn('[supabase] realtime channel error — fallback to polling')
          setLastSyncError('Realtime failed — using polling fallback')
        }
      })
    channelRef.current = channel

    // Polling fallback every 15s when realtime not available (ensures visitors still sync)
    const pollId = setInterval(async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const { data: row } = await supabase.from('portfolio').select('data,version').eq('id', 1).single()
        if (row?.data && !isWritingRemoteRef.current) {
          const validated = validatePortfolioData(row.data)
          if (validated._version > (lastRemoteDataRef.current?._version ?? -1)) {
            lastRemoteDataRef.current = validated
            setRemoteVersion(validated._version)
            setData(prev => {
              const isRecent = Date.now() - lastWriteTimeRef.current < 3000
              if (!isRecent && validated._version > (prev._version ?? 0)) {
                safeSetLocal(STORAGE_KEY, JSON.stringify(validated))
                return validated
              }
              return prev
            })
          }
        }
      } catch {}
    }, 15000)

    return () => {
      cancelled = true
      clearInterval(pollId)
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [])

  // Always persist locally (offline cache + instant preview)
  useEffect(() => {
    try {
      const validated = validatePortfolioData(data)
      safeSetLocal(STORAGE_KEY, JSON.stringify(validated))
    } catch (e) {
      console.warn('[portfolio] skipping local persist, invalid data:', e.message)
    }
  }, [data])

  // Debounced auto-sync to Supabase when admin edits and is authenticated
  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return
    // Only sync if Supabase-authenticated admin — visitors never write (RLS blocks anon writes)
    if (!supabaseUser) return
    if (isSyncing && !lastRemoteDataRef.current) return

    if (pendingSyncRef.current) clearTimeout(pendingSyncRef.current)
    pendingSyncRef.current = setTimeout(async () => {
      try {
        if (lastRemoteDataRef.current && JSON.stringify(data) === JSON.stringify(lastRemoteDataRef.current)) return
      } catch {}
      const res = await syncToRemote(data, 'auto')
      if (!res.ok && res.reason === 'rate-limited') {
        setTimeout(() => syncToRemote(data, 'retry'), res.retryAfter || 1500)
      }
    }, 1200)
    return () => clearTimeout(pendingSyncRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, supabaseUser, isSyncing])

  // Core safe write — auth-gated, validated, rate-limited, with history backup
  const syncToRemote = useCallback(async (newData, reason = 'manual') => {
    if (!isSupabaseEnabled || !supabase) return { ok: false, reason: 'supabase-disabled' }
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user || supabaseUser
    if (!user) {
      console.warn('[sync] blocked — no supabase user')
      setLastSyncError('Not authenticated — sign in as admin via Supabase Auth')
      return { ok: false, reason: 'not-authenticated' }
    }
    // Rate limit: 1 per 1.2s and 25 per minute — prevents abuse/flood, free-tier safe
    const now = Date.now()
    if (now - lastWriteTimeRef.current < 1200) {
      return { ok: false, reason: 'rate-limited', retryAfter: 1200 - (now - lastWriteTimeRef.current) }
    }
    if (now - writeCountRef.current.windowStart > 60_000) {
      writeCountRef.current = { count: 0, windowStart: now }
    }
    if (writeCountRef.current.count >= 25) {
      return { ok: false, reason: 'rate-limited-window' }
    }
    let validated
    try {
      validated = validatePortfolioData(newData)
    } catch (e) {
      setLastSyncError('Validation failed: ' + e.message)
      return { ok: false, reason: 'validation-failed', error: e.message }
    }
    // Ensure _version monotonic — prevents stale overwrite
    if (lastRemoteDataRef.current && validated._version <= lastRemoteDataRef.current._version) {
      validated = { ...validated, _version: lastRemoteDataRef.current._version + 1 }
      setData(validated)
      safeSetLocal(STORAGE_KEY, JSON.stringify(validated))
    }
    try {
      isWritingRemoteRef.current = true
      lastWriteTimeRef.current = now
      writeCountRef.current.count += 1
      setSyncStatus('syncing')
      setLastSyncError(null)

      // History backup — best effort, free tier okay (small rows)
      try {
        await supabase.from('portfolio_history').insert({
          portfolio_id: 1,
          data: validated,
          version: validated._version,
          reason,
          by_email: user.email || 'admin',
          by_uid: user.id,
        })
      } catch (e) {
        console.warn('[sync] history backup failed (non-fatal):', e.message)
      }

      const { error } = await supabase
        .from('portfolio')
        .upsert({
          id: 1,
          data: validated,
          version: validated._version,
          updated_at: new Date().toISOString(),
          updated_by: user.email || user.id,
        }, { onConflict: 'id' })

      if (error) throw error

      lastRemoteDataRef.current = validated
      setRemoteVersion(validated._version)
      setSyncStatus('synced')
      addAudit('publish', `pushed v${validated._version} (${reason}) by ${user.email}`)
      return { ok: true, version: validated._version }
    } catch (e) {
      console.error('[sync] write failed:', e)
      setSyncStatus('error')
      const msg = e.message || 'supabase write failed'
      setLastSyncError(msg)
      // Common Supabase RLS error -> clearer message
      if (msg.includes('row-level security') || msg.includes('RLS') || e.code === '42501') {
        setLastSyncError('RLS blocked — check supabase.sql policies & that you are signed in')
      }
      addAudit('error', `sync failed: ${msg}`)
      return { ok: false, reason: 'supabase-error', error: msg }
    } finally {
      setTimeout(() => { isWritingRemoteRef.current = false }, 600)
    }
  }, [supabaseUser])

  const forceSyncToRemote = useCallback(async () => {
    const bumped = { ...data, _version: (data._version || 0) + 1 }
    try {
      const validated = validatePortfolioData(bumped)
      setData(validated)
      return await syncToRemote(validated, 'manual-publish')
    } catch (e) {
      return { ok: false, reason: 'validation-failed', error: e.message }
    }
  }, [data, syncToRemote])

  const updateData = useCallback((key, value) => {
    setData(prev => ({ ...prev, [key]: value }))
  }, [])

  const updateSection = useCallback((section, updates) => {
    setData(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates }
    }))
  }, [])

  const updateArrayItem = useCallback((section, index, updates) => {
    setData(prev => {
      const arr = [...prev[section]]
      arr[index] = { ...arr[index], ...updates }
      return { ...prev, [section]: arr }
    })
  }, [])

  const addArrayItem = useCallback((section, item) => {
    setData(prev => ({
      ...prev,
      [section]: [...prev[section], item]
    }))
  }, [])

  const removeArrayItem = useCallback((section, index) => {
    setData(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index)
    }))
  }, [])

  const login = useCallback(async (passwordOrEmail, maybePassword) => {
    // Supabase mode: login(email, password) via Supabase Auth — FREE & SECURE (bcrypt + JWT + RLS)
    if (isSupabaseEnabled && maybePassword !== undefined) {
      const email = String(passwordOrEmail).trim()
      const password = String(maybePassword)
      if (!email || !password) return false
      try {
        const { data: res, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          console.warn('[auth] supabase login failed:', error.message)
          // Try legacy fallback if password is legacy token (allows local access without Supabase user)
          if (password === 'admin2026' || password === (import.meta.env.VITE_ADMIN_PASSWORD || '')) {
            safeSetLocal(ADMIN_TOKEN_KEY, 'admin_token_2026')
            setIsAuthenticated(true)
            addAudit('auth', 'legacy fallback login (supabase enabled, auth failed)')
            return true
          }
          return false
        }
        if (res.user) {
          safeSetLocal(ADMIN_TOKEN_KEY, 'admin_token_2026')
          setIsAuthenticated(true)
          setSupabaseUser(res.user)
          addAudit('auth', `supabase login ${email}`)
          return true
        }
        return false
      } catch (e) {
        console.warn('[auth] supabase exception:', e.message)
        return false
      }
    }
    // Legacy fallback: password only ('admin2026') — local mode or emergency access
    const password = String(passwordOrEmail)
    const envPwd = import.meta.env.VITE_ADMIN_PASSWORD || ''
    if (password === 'admin2026' || (envPwd && password === envPwd)) {
      safeSetLocal(ADMIN_TOKEN_KEY, 'admin_token_2026')
      setIsAuthenticated(true)
      addAudit('auth', 'legacy login')
      return true
    }
    return false
  }, [])

  const logout = useCallback(async () => {
    safeSetLocal(ADMIN_TOKEN_KEY, '')
    try { localStorage.removeItem(ADMIN_TOKEN_KEY) } catch {}
    setIsAuthenticated(false)
    if (isSupabaseEnabled && supabase) {
      try { await supabase.auth.signOut() } catch {}
    }
    setSupabaseUser(null)
    addAudit('auth', 'logout')
  }, [])

  const resetData = useCallback(async () => {
    safeSetLocal(STORAGE_KEY, '')
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
    setData(defaultData)
    addAudit('reset', 'reset to defaults')
    if (isSupabaseEnabled && supabaseUser) {
      setTimeout(() => syncToRemote(defaultData, 'reset'), 800)
    }
  }, [supabaseUser, syncToRemote])

  const importData = useCallback((newData) => {
    try {
      const validated = validatePortfolioData(newData)
      setData(validated)
      addAudit('import', `imported v${validated._version}`)
    } catch (e) {
      console.error('import failed validation:', e)
      throw e
    }
  }, [])

  return (
    <PortfolioContext.Provider value={{
      data,
      setData,
      isAuthenticated,
      supabaseUser,
      // aliases for compat with previous Firebase naming
      firebaseUser: supabaseUser,
      isSupabaseEnabled,
      isFirebaseEnabled: isSupabaseEnabled,
      syncStatus,
      isSyncing,
      remoteVersion,
      lastSyncError,
      login,
      logout,
      updateData,
      updateSection,
      updateArrayItem,
      addArrayItem,
      removeArrayItem,
      resetData,
      importData,
      syncToRemote,
      forceSyncToRemote,
    }}>
      {children}
    </PortfolioContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export function usePortfolio() {
  const ctx = useContext(PortfolioContext)
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider')
  return ctx
}

export default PortfolioContext
