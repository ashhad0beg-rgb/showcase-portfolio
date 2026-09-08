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
  const { login } = usePortfolio()
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
        // try real Supabase first to capture exact error — single sign-in
        const { data: signData, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) {
          supaError = error.message
          console.warn('[login] supabase error:', supaError)
          try { localStorage.setItem('last_supabase_error', supaError) } catch {}
        } else if (signData?.user) {
          try { localStorage.removeItem('last_supabase_error') } catch {}
          console.log('[login] supabase success', signData.user.email)
          setLoading(false)
          navigate('/admin')
          return
        }
        if (supaError) {
          ok = await login(email, password)
          if (!ok) setError('Invalid email or password')
          else {
            setLoading(false)
            navigate('/admin')
            return
          }
        } else if (!ok) {
          setError('Invalid email or password')
        }
      } else if (isSupabaseEnabled) {
        ok = await login(email, password)
        if (!ok) setError('Invalid email or password')
      } else {
        ok = await login(password)
        if (!ok) setError('Invalid email or password')
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
        {isSupabaseEnabled && <div className="hint" style={{ textAlign: 'center', marginBottom: '16px', background: 'rgba(94,234,212,0.08)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(94,234,212,0.15)' }}>Sign in with your email and password</div>}
        {!isSupabaseEnabled && <div className="hint" style={{ textAlign: 'center', marginBottom: '16px', background: 'rgba(251,146,60,0.08)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(251,146,60,0.2)' }}>Sign in to continue</div>}
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
        {isSupabaseEnabled && <p className="hint" style={{ marginTop: '14px', textAlign: 'center' }}>Forgot password? Use Reset in Settings or Supabase Dashboard.</p>}
      </div>
    </div>
  )
}
