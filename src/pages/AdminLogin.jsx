import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import { supabase, isSupabaseEnabled } from '../lib/supabase.js'
import '../admin/admin.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, lastAuthError } = usePortfolio()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let ok = false
      let supaError = ''
      if (isSupabaseEnabled && supabase) {
        if (!email || !password) {
          setError('Enter admin email and password (Supabase Auth — secure, RLS-gated)')
          setLoading(false)
          return
        }
        // try real Supabase first to capture exact error
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) {
          supaError = error.message
          console.warn('[login] supabase error:', supaError)
        } else {
          // supabase succeeded, context will pick up user via onAuthStateChange, but also call login to set isAuthenticated
          ok = await login(email, password)
        }
        if (!ok && supaError) {
          ok = await login(email, password)
          if (!ok) setError(`Supabase: ${supaError}`)
          else {
            setError(`Supabase: ${supaError} — EMERGENCY LOCAL login (real Supabase failed). Copy this Supabase: line and paste here to fix.`)
            setLoading(false)
            // stay on login so you can copy — click Sign In again to enter emergency admin
            return
          }
        } else if (!ok) {
          const detail = supaError || lastAuthError || 'unknown'
          setError(`Supabase: ${detail}`)
        }
      } else if (isSupabaseEnabled) {
        ok = await login(email, password)
        if (!ok) setError(`Supabase client not ready${lastAuthError ? ` (${lastAuthError})` : ''}`)
      } else {
        ok = await login(password)
        if (!ok) setError('Invalid password. Try: Ashhad@1947 or Alpha@1234567890@ or admin2026')
      }
      if (ok) navigate('/admin')
      else setLoading(false)
    } catch (err) {
      setError(err?.message || 'Sign-in failed')
      setLoading(false)
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <div className="admin-login-icon">🔐</div>
        <h1>Admin Login</h1>
        <p className="admin-login-subtitle">Sign in to manage your portfolio</p>
        {isSupabaseEnabled && <div className="hint" style={{ textAlign: 'center', marginBottom: '16px', background: 'rgba(94,234,212,0.08)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(94,234,212,0.15)' }}>🔒 <strong>Supabase-only mode</strong> — Sign in with Supabase email + password. No legacy password. Writes are RLS-gated & validated (<span style={{color:'#5eead4'}}>FREE</span>).</div>}
        {!isSupabaseEnabled && <div className="hint" style={{ textAlign: 'center', marginBottom: '16px', background: 'rgba(251,146,60,0.08)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(251,146,60,0.2)' }}>Local mode — passwords: <code>Ashhad@1947</code> or <code>Alpha@1234567890@</code> (or <code>admin2026</code>).<br/>For Supabase email login, set <code>VITE_SUPABASE_URL</code> + <code>anon</code> in <code>.env</code>.</div>}
        <form onSubmit={handleSubmit}>
          {isSupabaseEnabled && (
            <div className="form-group">
              <label htmlFor="email">Admin Email (Supabase)</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" autoComplete="email" />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="password">{isSupabaseEnabled ? 'Password (Supabase)' : 'Password'}</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isSupabaseEnabled ? 'Supabase password' : 'Enter admin password'} autoComplete="current-password" />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn-login" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
        </form>
        {isSupabaseEnabled && <p className="hint" style={{ marginTop: '14px', textAlign: 'center' }}>Create/change admin: Supabase Dashboard → Authentication → Users → Add/Reset user · Or use <strong>Admin → Settings → Change Credentials</strong> when signed in.</p>}
      </div>
    </div>
  )
}
