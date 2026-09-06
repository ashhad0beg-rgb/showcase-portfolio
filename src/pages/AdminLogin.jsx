import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import { isFirebaseEnabled } from '../lib/firebase.js'
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
      if (isFirebaseEnabled) {
        // Super-safe: Firebase Auth email+password — only this can write globally
        if (!email || !password) {
          setError('Enter admin email and password (Firebase Auth)')
          setLoading(false)
          return
        }
        ok = await login(email, password)
        if (!ok) setError('Firebase sign-in failed. Check email/password and Firebase Auth user exists. Fallback: try legacy password admin2026 in password field.')
      } else {
        ok = await login(password)
        if (!ok) setError('Invalid password. Try: admin2026')
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
        {isFirebaseEnabled && <div className="hint" style={{ textAlign: 'center', marginBottom: '16px', background: 'rgba(94,234,212,0.08)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(94,234,212,0.15)' }}>🔒 <strong>Secure mode</strong> — Firebase Auth enabled. Use your Firebase admin email + password. Writes are auth-gated & validated.</div>}
        {!isFirebaseEnabled && <div className="hint" style={{ textAlign: 'center', marginBottom: '16px', background: 'rgba(251,146,60,0.08)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(251,146,60,0.2)' }}>⚠️ Local mode — set <code>VITE_FIREBASE_*</code> env to enable instant global sync.</div>}
        <form onSubmit={handleSubmit}>
          {isFirebaseEnabled && (
            <div className="form-group">
              <label htmlFor="email">Admin Email (Firebase)</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" autoComplete="email" />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="password">{isFirebaseEnabled ? 'Password (Firebase)' : 'Password'}</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isFirebaseEnabled ? 'Firebase password' : 'Enter admin password'} autoComplete="current-password" />
          </div>
          {isFirebaseEnabled && <div className="hint" style={{ marginBottom: '12px' }}>Legacy fallback: enter <code>admin2026</code> as password to access locally (no global write).</div>}
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn-login" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
        </form>
        {isFirebaseEnabled && <p className="hint" style={{ marginTop: '14px', textAlign: 'center' }}>Create admin user: Firebase Console → Authentication → Users → Add user</p>}
      </div>
    </div>
  )
}
