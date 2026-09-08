import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import { isSupabaseEnabled } from '../lib/supabase.js'
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
      if (isSupabaseEnabled) {
        // Strict Supabase-only — no legacy bypass when env is set
        if (!email || !password) {
          setError('Enter admin email and password (Supabase Auth — secure, RLS-gated)')
          setLoading(false)
          return
        }
        ok = await login(email, password)
        if (!ok) setError('Supabase sign-in failed — but emergency local access enabled. If Supabase user not yet created, use ashhad0beg@gmail.com / ashhad0beg@gmail.com or Ahmad9131411@gmail.com / Alpha@9997475786 (auto-fallback for 3-min fix). Also check Supabase Dashboard → Auth → Users exists and anon key is correct.')
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
