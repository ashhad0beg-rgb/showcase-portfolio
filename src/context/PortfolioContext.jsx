import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import defaultData from '../data/defaultData.js'
import { db, auth, isFirebaseEnabled } from '../lib/firebase.js'
import { validatePortfolioData } from '../lib/validate.js'
import { doc, onSnapshot, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth'

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
      // Validate before trusting localStorage — prevents tampered/corrupt cache
      const validated = validatePortfolioData(parsed)
      if (validated._version >= DATA_VERSION) {
        // Accept same version or newer (after publish) — backward compat
        return validated
      }
      // If version mismatch but validated, still return if remote will override anyway
      // For local-only mode, require exact version match to avoid stale schema
      if (!isFirebaseEnabled && validated._version === DATA_VERSION) return validated
      if (isFirebaseEnabled) return validated // let remote sync decide
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
    // Keep last 50 entries, max ~20KB
    const trimmed = arr.slice(0, 50)
    safeSetLocal(AUDIT_KEY, JSON.stringify(trimmed))
  } catch {}
}

export function PortfolioProvider({ children }) {
  const [data, setData] = useState(() => loadFromStorage() || defaultData)
  const [isAuthenticated, setIsAuthenticated] = useState(() => safeGetLocal(ADMIN_TOKEN_KEY) === 'admin_token_2026')
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [syncStatus, setSyncStatus] = useState(isFirebaseEnabled ? 'connecting' : 'local')
  const [isSyncing, setIsSyncing] = useState(isFirebaseEnabled)
  const [remoteVersion, setRemoteVersion] = useState(null)
  const [lastSyncError, setLastSyncError] = useState(null)

  const lastRemoteDataRef = useRef(null)
  const isWritingRemoteRef = useRef(false)
  const lastWriteTimeRef = useRef(0)
  const writeCountRef = useRef({ count: 0, windowStart: Date.now() })
  const pendingSyncRef = useRef(null)

  // Track Firebase Auth
  useEffect(() => {
    if (!isFirebaseEnabled || !auth) return
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u)
      if (u) addAudit('auth', `firebase sign-in ${u.email}`)
    })
    return () => unsub()
  }, [])

  // Subscribe to Firestore live document for instant global updates
  useEffect(() => {
    if (!isFirebaseEnabled || !db) {
      setSyncStatus('local')
      setIsSyncing(false)
      return
    }
    setIsSyncing(true)
    setSyncStatus('syncing')
    const ref = doc(db, 'portfolio', 'live')
    const unsub = onSnapshot(ref,
      (snap) => {
        if (snap.exists()) {
          const remote = snap.data()
          // Strip Firestore meta fields before validation
          const { _updatedAt, _updatedBy, ...clean } = remote
          try {
            const validated = validatePortfolioData(clean)
            lastRemoteDataRef.current = validated
            setRemoteVersion(validated._version)
            setLastSyncError(null)
            setData(prev => {
              // Avoid echo loop: if we just wrote this exact data, ignore
              if (isWritingRemoteRef.current) {
                try {
                  if (JSON.stringify(prev) === JSON.stringify(validated)) return prev
                } catch {}
              }
              // Adopt if remote version newer, or if not recently edited locally (debounce window 3s)
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
              // Otherwise keep local (has newer unsaved edits) — will sync out shortly
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
          console.log('[sync] no remote doc yet — will create on first authenticated write')
        }
        setIsSyncing(false)
      },
      (err) => {
        console.error('[sync] snapshot error:', err)
        setSyncStatus('error')
        setLastSyncError(err.message)
        setIsSyncing(false)
      }
    )
    return () => unsub()
  }, [])

  // Always persist locally (offline cache + instant preview)
  useEffect(() => {
    try {
      // Validate before persisting to localStorage — prevents corrupt cache
      const validated = validatePortfolioData(data)
      safeSetLocal(STORAGE_KEY, JSON.stringify(validated))
    } catch (e) {
      console.warn('[portfolio] skipping local persist, invalid data:', e.message)
    }
  }, [data])

  // Debounced auto-sync to Firestore when admin edits and is firebase-authenticated
  useEffect(() => {
    if (!isFirebaseEnabled || !db) return
    // Only sync if Firebase-authenticated admin — super safe: visitors never write
    if (!firebaseUser && !isAuthenticated) return
    if (!auth?.currentUser && !firebaseUser) return // require firebase auth when enabled
    // Don't sync if data came from remote very recently or we are still initial syncing
    if (isSyncing && !lastRemoteDataRef.current) return

    // Debounce 1200ms — batches rapid keystrokes into one write
    if (pendingSyncRef.current) clearTimeout(pendingSyncRef.current)
    pendingSyncRef.current = setTimeout(async () => {
      // Avoid syncing if data equals last remote (no change)
      try {
        if (lastRemoteDataRef.current && JSON.stringify(data) === JSON.stringify(lastRemoteDataRef.current)) return
      } catch {}
      const res = await syncToRemote(data, 'auto')
      if (!res.ok && res.reason === 'rate-limited') {
        // Retry after cooldown
        setTimeout(() => syncToRemote(data, 'retry'), res.retryAfter || 1500)
      }
    }, 1200)
    return () => clearTimeout(pendingSyncRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, firebaseUser, isAuthenticated, isSyncing])

  // Core safe write — auth-gated, validated, rate-limited, with history backup
  const syncToRemote = useCallback(async (newData, reason = 'manual') => {
    if (!isFirebaseEnabled || !db) return { ok: false, reason: 'firebase-disabled' }
    const fbUser = auth?.currentUser || firebaseUser
    if (!fbUser) {
      console.warn('[sync] blocked — no firebase user')
      setLastSyncError('Not authenticated — sign in as admin in Firebase')
      return { ok: false, reason: 'not-authenticated' }
    }
    // Rate limit: 1 per 1.2s and 25 per minute — prevents abuse/flood
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
    // Extra safety: ensure _version increments (prevent stale overwrite)
    if (lastRemoteDataRef.current && validated._version <= lastRemoteDataRef.current._version) {
      // Auto-bump version to keep global truth monotonic
      validated = { ...validated, _version: lastRemoteDataRef.current._version + 1 }
      // Update local state to match bumped version
      setData(validated)
      safeSetLocal(STORAGE_KEY, JSON.stringify(validated))
    }
    try {
      isWritingRemoteRef.current = true
      lastWriteTimeRef.current = now
      writeCountRef.current.count += 1
      setSyncStatus('syncing')
      setLastSyncError(null)
      const ref = doc(db, 'portfolio', 'live')
      // History backup — best effort, keep audit trail (last 100 versions)
      try {
        const histCol = collection(db, 'portfolio', 'live', 'history')
        await addDoc(histCol, {
          data: validated,
          _version: validated._version,
          timestamp: serverTimestamp(),
          reason,
          by: fbUser.email || 'admin',
          uid: fbUser.uid,
        })
      } catch (e) {
        console.warn('[sync] history backup failed (non-fatal):', e.message)
      }
      await setDoc(ref, { ...validated, _updatedAt: serverTimestamp(), _updatedBy: fbUser.email || 'admin' }, { merge: false })
      lastRemoteDataRef.current = validated
      setRemoteVersion(validated._version)
      setSyncStatus('synced')
      addAudit('publish', `pushed v${validated._version} (${reason}) by ${fbUser.email}`)
      return { ok: true, version: validated._version }
    } catch (e) {
      console.error('[sync] write failed:', e)
      setSyncStatus('error')
      setLastSyncError(e.message)
      addAudit('error', `sync failed: ${e.message}`)
      return { ok: false, reason: 'firestore-error', error: e.message }
    } finally {
      setTimeout(() => { isWritingRemoteRef.current = false }, 600)
    }
  }, [firebaseUser])

  const forceSyncToRemote = useCallback(async () => {
    // Manual publish button — validates + forces version bump
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
    setData(prev => {
      const next = { ...prev, [key]: value }
      return next
    })
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
    // Firebase mode: login(email, password) via Firebase Auth
    if (isFirebaseEnabled && maybePassword !== undefined) {
      const email = passwordOrEmail
      const password = maybePassword
      try {
        await signInWithEmailAndPassword(auth, email, password)
        safeSetLocal(ADMIN_TOKEN_KEY, 'admin_token_2026')
        setIsAuthenticated(true)
        addAudit('auth', `firebase login ${email}`)
        return true
      } catch (e) {
        console.warn('[auth] firebase login failed:', e.code, e.message)
        return false
      }
    }
    // Legacy fallback: password only ('admin2026')
    const password = passwordOrEmail
    if (password === 'admin2026' || password === (import.meta.env.VITE_ADMIN_PASSWORD || '')) {
      // If Firebase enabled but no firebase user, still allow legacy for local-only, but not remote writes
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
    if (isFirebaseEnabled && auth) {
      try { await fbSignOut(auth) } catch {}
    }
    setFirebaseUser(null)
    addAudit('auth', 'logout')
  }, [])

  const resetData = useCallback(async () => {
    safeSetLocal(STORAGE_KEY, '')
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
    setData(defaultData)
    addAudit('reset', 'reset to defaults')
    // Also push defaults to remote if authenticated — creates clean history entry
    if (isFirebaseEnabled && (auth?.currentUser || firebaseUser)) {
      setTimeout(() => syncToRemote(defaultData, 'reset'), 800)
    }
  }, [firebaseUser, syncToRemote])

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
      firebaseUser,
      isFirebaseEnabled,
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
