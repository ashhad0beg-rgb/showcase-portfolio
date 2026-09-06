import { useState, useRef, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import { validatePortfolioData } from '../lib/validate.js'
import '../admin/admin.css'

const sections = [
  { path: '/admin', label: 'Dashboard', icon: '📊' },
  { path: '/admin/hero', label: 'Hero', icon: '🏠' },
  { path: '/admin/showreel', label: 'Showreel', icon: '🎬' },
  { path: '/admin/work', label: 'Work', icon: '📁' },
  { path: '/admin/services', label: 'Services', icon: '⚡' },
  { path: '/admin/process', label: 'Process', icon: '🔄' },
  { path: '/admin/about', label: 'About', icon: '👤' },
  { path: '/admin/tools', label: 'Tools', icon: '🛠️' },
  { path: '/admin/experience', label: 'Experience', icon: '📋' },
  { path: '/admin/testimonials', label: 'Testimonials', icon: '💬' },
  { path: '/admin/faq', label: 'FAQ', icon: '❓' },
  { path: '/admin/contact', label: 'Contact', icon: '📧' },
  { path: '/admin/settings', label: 'Settings', icon: '⚙️' },
]

const getSection = (path) => { const p = path.split('/')[2]; return p || 'dashboard' }

function SyncBadge({ status, isSyncing }) {
  const map = {
    local: { label: 'Local mode', color: '#fb923c', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.25)' },
    connecting: { label: 'Connecting…', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' },
    syncing: { label: 'Syncing…', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.2)' },
    synced: { label: '✓ Synced LIVE', color: '#5eead4', bg: 'rgba(94,234,212,0.12)', border: 'rgba(94,234,212,0.3)' },
    'no-remote': { label: 'No remote yet', color: '#facc15', bg: 'rgba(250,204,21,0.1)', border: 'rgba(250,204,21,0.2)' },
    error: { label: 'Sync error', color: '#fca5a5', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' },
  }
  const s = map[status] || map.local
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.4px', padding: '5px 10px', borderRadius: '20px', background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {isSyncing && status === 'syncing' ? '⟳' : status === 'synced' ? '●' : '◌'} {s.label}
    </span>
  )
}

export default function AdminDashboard() {
  const { data, isAuthenticated, firebaseUser, isFirebaseEnabled: fbEnabled, syncStatus, isSyncing, remoteVersion, lastSyncError, logout, updateData, resetData, importData, forceSyncToRemote } = usePortfolio()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [saved, setSaved] = useState(false)
  const [info, setInfo] = useState('')
  const [ghToken, setGhToken] = useState(() => localStorage.getItem('github_pat') || '')
  const [ghPublishing, setGhPublishing] = useState(false)
  const [instantPublishing, setInstantPublishing] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (ghToken) localStorage.setItem('github_pat', ghToken)
    else localStorage.removeItem('github_pat')
  }, [ghToken])

  if (!isAuthenticated && !firebaseUser) {
    // Allow either legacy or firebase auth
    // But PortfolioContext login sets isAuthenticated for legacy; firebaseUser for firebase
    // Check both
    const hasLegacy = localStorage.getItem('admin_auth_token') === 'admin_token_2026'
    if (!hasLegacy && !firebaseUser) return <Navigate to="/admin/login" replace />
  }

  const triggerSaved = (msg = 'Saved!') => {
    setSaved(true)
    if (msg) setInfo(msg)
    setTimeout(() => { setSaved(false); setInfo('') }, 3000)
  }

  // Super-safe instant publish — Firestore, auth-gated, validated, rate-limited, history-backed
  const handleInstantPublish = async () => {
    if (fbEnabled && !firebaseUser) {
      triggerSaved('Sign in with Firebase email to publish globally')
      alert('Super-safe: Firebase Auth required for instant publish.\n\nGo to /admin/login and sign in with your Firebase admin email + password.\n\nWithout Firebase auth, writes are blocked by Firestore rules (visitors can only read).')
      return
    }
    // Validate before any network
    try {
      validatePortfolioData(data)
    } catch (e) {
      alert('Validation failed — fix before publishing:\n\n' + e.message)
      triggerSaved('Validation failed')
      return
    }
    if (!confirm(`Instant Publish to LIVE?\n\n• Validated ✓\n• Auth: ${firebaseUser?.email || 'legacy'}\n• Version will auto-bump to ${ (data._version||0)+1 }\n• Super safe: history backup + rate-limited + global in ~2s via Firestore`)) return
    setInstantPublishing(true)
    try {
      const res = await forceSyncToRemote()
      if (res.ok) {
        triggerSaved(`✓ LIVE instantly! v${res.version}`)
      } else {
        let msg = 'Instant publish failed: ' + (res.reason || 'unknown')
        if (res.error) msg += '\n' + res.error
        if (res.reason === 'not-authenticated') msg = 'Not Firebase-authenticated — login with Firebase email first. Firestore rules block anonymous writes.'
        if (res.reason === 'rate-limited') msg = `Rate-limited — wait ${Math.ceil((res.retryAfter||1200)/1000)}s and retry. Prevents flood/abuse.`
        if (res.reason === 'validation-failed') msg = 'Validation rejected: ' + res.error
        alert(msg)
        triggerSaved('Publish blocked')
      }
    } catch (e) {
      alert('Publish error: ' + e.message)
      triggerSaved('Publish error')
    } finally {
      setInstantPublishing(false)
    }
  }

  const handleGhPublish = async () => {
    try {
      validatePortfolioData(data)
    } catch (e) {
      alert('Fix validation before GitHub publish:\n' + e.message)
      return
    }
    if (!ghToken) {
      alert('GitHub Token not set!\n\nGo to Admin → Settings → GitHub Publish Token and paste a Personal Access Token (classic) with `repo` scope.\nCreate one at: https://github.com/settings/tokens/new')
      setActiveSection('settings')
      navigate('/admin/settings')
      return
    }
    if (!confirm('Publish via GitHub (fallback) to LIVE?\n\nThis commits src/data/defaultData.js and triggers 1–2 min Pages deploy. Use Instant Publish for <2s Firestore sync if Firebase is enabled.')) return
    setGhPublishing(true)
    try {
      const publishData = validatePortfolioData({ ...data, _version: (data._version || 0) + 1 })
      const fileStr = `const defaultData = ${JSON.stringify(publishData, null, 2)}\n\nexport default defaultData\n`
      const b64 = btoa(unescape(encodeURIComponent(fileStr)))
      const owner = 'ashhad0beg-rgb'
      const repo = 'showcase-portfolio'
      const path = 'src/data/defaultData.js'
      const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github.v3+json' }
      })
      if (!getRes.ok) {
        const txt = await getRes.text()
        throw new Error(`Fetch SHA failed (${getRes.status}): ${txt.slice(0, 400)}`)
      }
      const { sha } = await getRes.json()
      const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `chore(admin): publish v${publishData._version} via admin (GH fallback)`,
          content: b64,
          sha,
          branch: 'main'
        })
      })
      if (!putRes.ok) {
        const txt = await putRes.text()
        throw new Error(`Publish failed (${putRes.status}): ${txt.slice(0, 600)}`)
      }
      importData(publishData)
      localStorage.setItem('portfolio_data', JSON.stringify(publishData))
      triggerSaved(`✓ GitHub published v${publishData._version}! Live in ~2 min`)
    } catch (e) {
      console.error(e)
      alert('GitHub publish failed: ' + e.message + '\n\nCheck token has `repo` scope.')
      triggerSaved('GH publish failed')
    } finally {
      setGhPublishing(false)
    }
  }

  const handleManualSave = () => {
    try {
      const validated = validatePortfolioData(data)
      localStorage.setItem('portfolio_data', JSON.stringify(validated))
      triggerSaved('✓ Saved locally (validated)')
    } catch (e) {
      alert('Save blocked — validation failed:\n' + e.message)
      triggerSaved('Validation failed')
    }
  }

  const handleExport = () => {
    try {
      const validated = validatePortfolioData(data)
      const blob = new Blob([JSON.stringify(validated, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `portfolio_data_v${validated._version}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      triggerSaved('✓ Exported (validated)')
    } catch (e) {
      alert('Export blocked — invalid data: ' + e.message)
    }
  }

  const handleCopyJson = async () => {
    try {
      const validated = validatePortfolioData(data)
      await navigator.clipboard.writeText(JSON.stringify(validated, null, 2))
      triggerSaved('✓ Copied (validated)')
    } catch (e) {
      triggerSaved('Copy failed: ' + e.message)
    }
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500_000) {
      alert('File too large — max 500KB')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result)
        const validated = validatePortfolioData(json)
        if (!validated.hero || !validated.work) throw new Error('Missing hero/work')
        importData(validated)
        localStorage.setItem('portfolio_data', JSON.stringify(validated))
        triggerSaved(`✓ Imported v${validated._version}! Validated. Auto-syncing…`)
        // Auto-push to Firestore if Firebase-authenticated (super safe instant)
        if (fbEnabled && firebaseUser) {
          setTimeout(() => forceSyncToRemote().then(r => {
            if (r.ok) triggerSaved(`✓ Imported & LIVE v${r.version}!`)
          }), 600)
        }
      } catch (err) {
        alert('Import rejected — validation failed:\n' + err.message)
        triggerSaved('Import blocked')
      }
    }
    reader.onerror = () => alert('Failed to read file')
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleReset = async () => {
    if (!confirm('Reset ALL data to defaults? This erases local edits.')) return
    if (!confirm('Confirm again — this will also publish reset to LIVE if Firebase-authenticated (super safe history backup will keep old version).')) return
    await resetData()
    triggerSaved('Reset to defaults (history backed up)')
    setTimeout(() => window.location.reload(), 600)
  }

  const handleViewSite = () => {
    window.open('/showcase-portfolio/', '_blank')
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header"><h2>🛠️ Admin</h2><div style={{ fontSize: '11px', color: fbEnabled ? '#5eead4' : '#fb923c', marginTop: '4px', fontWeight: 700 }}>{fbEnabled ? '🔒 SECURE • Firestore' : '⚠️ LOCAL mode'}</div></div>
        <nav className="admin-nav">
          {sections.map(s => (
            <button key={s.path} className={`admin-nav-item ${activeSection === getSection(s.path) ? 'active' : ''}`} onClick={() => { setActiveSection(getSection(s.path)); navigate(s.path) }}>
              <span className="admin-nav-icon">{s.icon}</span><span>{s.label}</span>
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px', wordBreak: 'break-all' }}>{firebaseUser ? `👤 ${firebaseUser.email}` : '👤 Legacy admin'}</div>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>
      </aside>
      <main className="admin-main">
        <div className="admin-topbar">
          <h1>Portfolio Admin</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <SyncBadge status={syncStatus} isSyncing={isSyncing} />
            {remoteVersion && <span className="hint" style={{ fontSize: '11px' }}>remote v{remoteVersion}</span>}
            {lastSyncError && <span title={lastSyncError} style={{ fontSize: '11px', color: '#fca5a5', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>⚠ {lastSyncError.slice(0, 40)}</span>}
          </div>
          <div className="admin-topbar-actions">
            {saved && <span className="save-indicator">{info || '✓ Saved!'}</span>}
            {!saved && <span className="autosave-hint">{fbEnabled && firebaseUser ? 'Auto-sync LIVE' : 'Auto-saved local'}</span>}
            {fbEnabled ? (
              <button className="btn-publish" onClick={handleInstantPublish} disabled={instantPublishing || isSyncing} title="Super-safe instant publish via Firestore (auth-gated, validated, rate-limited, history backup)">{instantPublishing ? 'Publishing…' : '⚡ Instant Publish'}</button>
            ) : (
              <button className="btn-publish" onClick={handleGhPublish} disabled={ghPublishing} title="Publish via GitHub (no Firebase — 1-2 min deploy)">{ghPublishing ? 'Publishing…' : '🌐 Publish to Web'}</button>
            )}
            {fbEnabled && <button className="btn-secondary" onClick={handleGhPublish} disabled={ghPublishing} title="Fallback: also commit to GitHub for static backup">{ghPublishing ? '…' : 'GH Backup'}</button>}
            <button className="btn-save" onClick={handleManualSave} title="Validate & save to localStorage">Save</button>
            <button className="btn-secondary" onClick={handleViewSite} title="View live site">View Site</button>
            <button className="btn-secondary" onClick={handleExport} title="Export validated JSON">Export</button>
            <button className="btn-secondary" onClick={handleCopyJson} title="Copy validated JSON">Copy</button>
            <button className="btn-secondary" onClick={() => fileRef.current?.click()} title="Import validated JSON">Import</button>
            <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={handleImport} />
            <button className="btn-danger" onClick={handleReset} title="Reset to defaults (history backed)">Reset</button>
          </div>
        </div>
        <div className="admin-storage-note">
          {fbEnabled ? (
            <>
              <strong>🔒 Super-safe LIVE sync:</strong> Edits auto-validate, sanitize (XSS-safe), rate-limited (1/1.2s, 25/min), and <strong>instantly sync to Firestore</strong> when Firebase-authenticated (`portfolio/live`). All visitors see updates in ~2s via real-time `onSnapshot`. Every publish is <strong>history-backed</strong> to `portfolio/live/history` + audit-logged locally. Visitors have <strong>read-only</strong> (Firestore rules: `allow read: if true; allow write: if request.auth != null`). <strong>GitHub Publish</strong> remains as static backup (1–2 min deploy).<br />
              {!firebaseUser && <span style={{ color: '#fca5a5' }}>⚠️ Not Firebase-signed in — instant writes blocked. Login with Firebase email. Local edits still auto-save, but not LIVE until you sign in.</span>}
              {firebaseUser && <span style={{ color: '#5eead4' }}>✓ Signed in as {firebaseUser.email} — instant writes enabled, history & validation active.</span>}
            </>
          ) : (
            <>
              <strong>How publishing works:</strong> ✏️ Edits <strong>auto-save locally</strong> to this browser's <code>localStorage</code> (instant preview, only you see it). 🌐 Firebase not configured — set <code>VITE_FIREBASE_*</code> env for instant global sync. Fallback: <strong>Publish to Web</strong> via GitHub Token commits <code>src/data/defaultData.js</code> → live after 1–2 min deploy.
            </>
          )}
        </div>
        <div className="admin-content">
          {activeSection === 'dashboard' && <DashboardOverview data={data} updateData={updateData} onSave={triggerSaved} fbEnabled={fbEnabled} syncStatus={syncStatus} firebaseUser={firebaseUser} remoteVersion={remoteVersion} />}
          {activeSection === 'hero' && <HeroEdit onSave={triggerSaved} />}
          {activeSection === 'showreel' && <ShowreelEdit onSave={triggerSaved} />}
          {activeSection === 'work' && <WorkEdit onSave={triggerSaved} />}
          {activeSection === 'services' && <ServicesEdit onSave={triggerSaved} />}
          {activeSection === 'process' && <ProcessEdit onSave={triggerSaved} />}
          {activeSection === 'about' && <AboutEdit onSave={triggerSaved} />}
          {activeSection === 'tools' && <ToolsEdit onSave={triggerSaved} />}
          {activeSection === 'experience' && <ExperienceEdit onSave={triggerSaved} />}
          {activeSection === 'testimonials' && <TestimonialsEdit onSave={triggerSaved} />}
          {activeSection === 'faq' && <FaqEdit onSave={triggerSaved} />}
          {activeSection === 'contact' && <ContactEdit onSave={triggerSaved} />}
          {activeSection === 'settings' && <SettingsEdit onSave={triggerSaved} ghToken={ghToken} setGhToken={setGhToken} ghPublishing={ghPublishing} onGhPublish={handleGhPublish} instantPublishing={instantPublishing} onInstantPublish={handleInstantPublish} />}
        </div>
      </main>
    </div>
  )
}

function DashboardOverview({ data, updateData, onSave, fbEnabled, syncStatus, firebaseUser, remoteVersion }) {
  const counts = [
    { label: 'Work', value: data.work?.length || 0 },
    { label: 'Services', value: data.services?.length || 0 },
    { label: 'Tools', value: data.tools?.length || 0 },
    { label: 'FAQ', value: data.faq?.length || 0 },
  ]
  let audit = []
  try { audit = JSON.parse(localStorage.getItem('portfolio_audit_log') || '[]').slice(0, 5) } catch {}
  return (
    <div className="admin-section">
      <h2>Quick Overview</h2>
      <div className="admin-stats">{counts.map((c, i) => <div key={i} className="admin-stat-card"><span className="admin-stat-value">{c.value}</span><span className="admin-stat-label">{c.label}</span></div>)}</div>
      <div className="admin-quick-edit" style={{ marginBottom: '16px', background: fbEnabled ? 'rgba(94,234,212,0.06)' : 'rgba(251,146,60,0.06)', borderColor: fbEnabled ? 'rgba(94,234,212,0.15)' : 'rgba(251,146,60,0.15)' }}>
        <h3>{fbEnabled ? '🔒 Secure Sync Status' : '⚠️ Local Mode'}</h3>
        <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#cbd5e1' }}>
          {fbEnabled ? (
            <>
              <div>Firestore: <strong>{syncStatus}</strong> {remoteVersion ? `· remote v${remoteVersion}` : ''} · local v{data._version}</div>
              <div>Auth: <strong>{firebaseUser ? firebaseUser.email : 'Not signed in (writes blocked by rules)'}</strong></div>
              <div>Validation: <strong>on</strong> · Sanitization: <strong>on (XSS-safe)</strong> · Rate-limit: <strong>1/1.2s, 25/min</strong> · History: <strong>portfolio/live/history</strong></div>
              <div style={{ marginTop: '6px', color: '#94a3b8' }}>All edits are validated, sanitized, and only Firebase-authenticated users can write. Visitors have read-only access. Payload &lt;400KB enforced.</div>
            </>
          ) : (
            <div>Set <code>VITE_FIREBASE_API_KEY</code> etc. in <code>.env</code> and GitHub Secrets to enable &lt;2s global sync. Currently edits are local-only until GitHub Publish.</div>
          )}
        </div>
      </div>
      {audit.length > 0 && (
        <div className="admin-quick-edit" style={{ marginBottom: '16px' }}>
          <h3>Audit Log (last 5)</h3>
          <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.7 }}>
            {audit.map((a, i) => <div key={i}><span style={{ color: '#64748b' }}>{new Date(a.ts).toLocaleString()}</span> — <strong style={{ color: '#cbd5e1' }}>{a.action}</strong> {a.detail}</div>)}
          </div>
        </div>
      )}
      <div className="admin-quick-edit">
        <h3>Site Settings</h3>
        <div className="form-group"><label>Site Name</label><input type="text" value={data.siteName} onChange={(e) => { updateData('siteName', e.target.value); onSave('Saved') }} /></div>
        <div className="form-group"><label>Meta Description</label><input type="text" value={data.siteDescription} onChange={(e) => { updateData('siteDescription', e.target.value); onSave('Saved') }} /></div>
      </div>
    </div>
  )
}

function HeroEdit({ onSave }) {
  const { data, updateSection } = usePortfolio()
  const h = data.hero
  return (
    <div className="admin-section"><h2>Hero Section</h2>
      <div className="form-group"><label>Eyebrow Text</label><input type="text" value={h.eyebrow} onChange={(e) => { updateSection('hero', { eyebrow: e.target.value }); onSave('Saved') }} /></div>
      <div className="form-group"><label>Title (one line per row)</label><textarea value={h.title} onChange={(e) => { updateSection('hero', { title: e.target.value }); onSave('Saved') }} rows={4} /></div>
      <div className="form-group"><label>Description</label><textarea value={h.description} onChange={(e) => { updateSection('hero', { description: e.target.value }); onSave('Saved') }} rows={3} /></div>
      <div className="form-group"><label>Primary Button</label><input type="text" value={h.buttonPrimary} onChange={(e) => { updateSection('hero', { buttonPrimary: e.target.value }); onSave('Saved') }} /></div>
      <div className="form-group"><label>Secondary Button</label><input type="text" value={h.buttonSecondary} onChange={(e) => { updateSection('hero', { buttonSecondary: e.target.value }); onSave('Saved') }} /></div>
      <div className="form-group"><label>Hero Image URL</label><input type="text" value={h.image || ''} onChange={(e) => { updateSection('hero', { image: e.target.value }); onSave('Saved') }} /></div>
    </div>
  )
}

function ShowreelEdit({ onSave }) {
  const { data, updateSection } = usePortfolio()
  const s = data.showreel
  return (
    <div className="admin-section"><h2>Showreel</h2>
      <div className="form-group"><label>Label</label><input type="text" value={s.label} onChange={(e) => { updateSection('showreel', { label: e.target.value }); onSave('Saved') }} /></div>
      <div className="form-group"><label>Title</label><input type="text" value={s.title} onChange={(e) => { updateSection('showreel', { title: e.target.value }); onSave('Saved') }} /></div>
      <div className="form-group"><label>Video URL</label><input type="text" value={s.videoUrl} onChange={(e) => { updateSection('showreel', { videoUrl: e.target.value }); onSave('Saved') }} /></div>
      <div className="form-group"><label>Poster Image URL</label><input type="text" value={s.posterUrl} onChange={(e) => { updateSection('showreel', { posterUrl: e.target.value }); onSave('Saved') }} /></div>
      <div className="form-group"><label>Tags (comma separated)</label><input type="text" value={s.tags.join(', ')} onChange={(e) => { updateSection('showreel', { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }); onSave('Saved') }} /></div>
    </div>
  )
}

function WorkEdit({ onSave }) {
  const { data, updateArrayItem, addArrayItem, removeArrayItem } = usePortfolio()
  return (
    <div className="admin-section">
      <div className="section-header-row"><h2>Work ({data.work.length})</h2><button className="btn-add" onClick={() => { addArrayItem('work', { title: '', client: '', year: '', role: '', category: '', image: '', description: '' }); onSave('Added') }}>+ Add Project</button></div>
      {data.work.map((p, i) => (
        <div key={i} className="edit-card edit-card-lg">
          <div className="edit-card-header"><span>Project #{i + 1}</span><button className="btn-remove" onClick={() => { removeArrayItem('work', i); onSave('Removed') }}>×</button></div>
          <input type="text" placeholder="Title" value={p.title} onChange={(e) => { updateArrayItem('work', i, { title: e.target.value }); onSave('Saved') }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <input type="text" placeholder="Client" value={p.client} onChange={(e) => { updateArrayItem('work', i, { client: e.target.value }); onSave('Saved') }} />
            <input type="text" placeholder="Year" value={p.year} onChange={(e) => { updateArrayItem('work', i, { year: e.target.value }); onSave('Saved') }} />
          </div>
          <input type="text" placeholder="Role" value={p.role} onChange={(e) => { updateArrayItem('work', i, { role: e.target.value }); onSave('Saved') }} />
          <input type="text" placeholder="Category" value={p.category} onChange={(e) => { updateArrayItem('work', i, { category: e.target.value }); onSave('Saved') }} />
          <textarea placeholder="Description" value={p.description} onChange={(e) => { updateArrayItem('work', i, { description: e.target.value }); onSave('Saved') }} rows={2} />
          <div className="tags-edit"><label>Image URL:</label><input type="text" placeholder="https://..." value={p.image || ''} onChange={(e) => { updateArrayItem('work', i, { image: e.target.value }); onSave('Saved') }} /></div>
          {p.image && <div className="image-preview"><label>Preview:</label><img src={p.image} alt="Preview" /></div>}
        </div>
      ))}
    </div>
  )
}

function ServicesEdit({ onSave }) {
  const { data, updateArrayItem, addArrayItem, removeArrayItem } = usePortfolio()
  return (
    <div className="admin-section">
      <div className="section-header-row"><h2>Services ({data.services.length})</h2><button className="btn-add" onClick={() => { addArrayItem('services', { number: String(data.services.length + 1).padStart(2, '0'), name: '', description: '' }); onSave('Added') }}>+ Add Service</button></div>
      {data.services.map((s, i) => (
        <div key={i} className="edit-card edit-card-lg">
          <div className="edit-card-header"><span>{s.number}</span><button className="btn-remove" onClick={() => { removeArrayItem('services', i); onSave('Removed') }}>×</button></div>
          <input type="text" placeholder="Name" value={s.name} onChange={(e) => { updateArrayItem('services', i, { name: e.target.value }); onSave('Saved') }} />
          <textarea placeholder="Description" value={s.description} onChange={(e) => { updateArrayItem('services', i, { description: e.target.value }); onSave('Saved') }} rows={2} />
        </div>
      ))}
    </div>
  )
}

function ProcessEdit({ onSave }) {
  const { data, updateArrayItem, addArrayItem, removeArrayItem } = usePortfolio()
  return (
    <div className="admin-section">
      <div className="section-header-row"><h2>Process ({data.process.length})</h2><button className="btn-add" onClick={() => { addArrayItem('process', { number: String(data.process.length + 1).padStart(2, '0'), name: '', description: '' }); onSave('Added') }}>+ Add Step</button></div>
      {data.process.map((s, i) => (
        <div key={i} className="edit-card">
          <input type="text" placeholder="Name" value={s.name} onChange={(e) => { updateArrayItem('process', i, { name: e.target.value }); onSave('Saved') }} />
          <input type="text" placeholder="Description" value={s.description} onChange={(e) => { updateArrayItem('process', i, { description: e.target.value }); onSave('Saved') }} />
          <button className="btn-remove" onClick={() => { removeArrayItem('process', i); onSave('Removed') }}>×</button>
        </div>
      ))}
    </div>
  )
}

function AboutEdit({ onSave }) {
  const { data, updateSection } = usePortfolio()
  const a = data.about
  return (
    <div className="admin-section"><h2>About</h2>
      <div className="form-group"><label>Title</label><input type="text" value={a.title} onChange={(e) => { updateSection('about', { title: e.target.value }); onSave('Saved') }} /></div>
      <div className="form-group"><label>Highlight</label><input type="text" value={a.highlight} onChange={(e) => { updateSection('about', { highlight: e.target.value }); onSave('Saved') }} /></div>
      <div className="form-group"><label>Content</label><textarea value={a.content} onChange={(e) => { updateSection('about', { content: e.target.value }); onSave('Saved') }} rows={4} /></div>
      <div className="form-group"><label>Image URL</label><input type="text" value={a.image || ''} onChange={(e) => { updateSection('about', { image: e.target.value }); onSave('Saved') }} /></div>
      {a.image && <div className="image-preview"><label>Preview:</label><img src={a.image} alt="About" /></div>}
    </div>
  )
}

function ToolsEdit({ onSave }) {
  const { data, updateData } = usePortfolio()
  return (
    <div className="admin-section"><h2>Tools</h2>
      <div className="form-group"><label>Tools (comma separated)</label><textarea value={data.tools.join(', ')} onChange={(e) => { updateData('tools', e.target.value.split(',').map(t => t.trim()).filter(Boolean)); onSave('Saved') }} rows={3} /></div>
    </div>
  )
}

function ExperienceEdit({ onSave }) {
  const { data, updateArrayItem, addArrayItem, removeArrayItem } = usePortfolio()
  return (
    <div className="admin-section">
      <div className="section-header-row"><h2>Experience ({data.experience.length})</h2><button className="btn-add" onClick={() => { addArrayItem('experience', { year: '', role: '', client: '' }); onSave('Added') }}>+ Add Entry</button></div>
      {data.experience.map((e, i) => (
        <div key={i} className="edit-card">
          <input type="text" placeholder="Year" value={e.year} onChange={(ev) => { updateArrayItem('experience', i, { year: ev.target.value }); onSave('Saved') }} />
          <input type="text" placeholder="Role" value={e.role} onChange={(ev) => { updateArrayItem('experience', i, { role: ev.target.value }); onSave('Saved') }} />
          <input type="text" placeholder="Client" value={e.client} onChange={(ev) => { updateArrayItem('experience', i, { client: ev.target.value }); onSave('Saved') }} />
          <button className="btn-remove" onClick={() => { removeArrayItem('experience', i); onSave('Removed') }}>×</button>
        </div>
      ))}
    </div>
  )
}

function TestimonialsEdit({ onSave }) {
  const { data, updateArrayItem, addArrayItem, removeArrayItem } = usePortfolio()
  return (
    <div className="admin-section">
      <div className="section-header-row"><h2>Testimonials ({data.testimonials.length})</h2><button className="btn-add" onClick={() => { addArrayItem('testimonials', { quote: '', author: '', company: '' }); onSave('Added') }}>+ Add</button></div>
      {data.testimonials.map((t, i) => (
        <div key={i} className="edit-card edit-card-lg">
          <div className="edit-card-header"><span>#{i + 1}</span><button className="btn-remove" onClick={() => { removeArrayItem('testimonials', i); onSave('Removed') }}>×</button></div>
          <textarea placeholder="Quote" value={t.quote} onChange={(e) => { updateArrayItem('testimonials', i, { quote: e.target.value }); onSave('Saved') }} rows={3} />
          <input type="text" placeholder="Author" value={t.author} onChange={(e) => { updateArrayItem('testimonials', i, { author: e.target.value }); onSave('Saved') }} />
          <input type="text" placeholder="Company" value={t.company} onChange={(e) => { updateArrayItem('testimonials', i, { company: e.target.value }); onSave('Saved') }} />
        </div>
      ))}
    </div>
  )
}

function FaqEdit({ onSave }) {
  const { data, updateArrayItem, addArrayItem, removeArrayItem } = usePortfolio()
  return (
    <div className="admin-section">
      <div className="section-header-row"><h2>FAQ ({data.faq.length})</h2><button className="btn-add" onClick={() => { addArrayItem('faq', { question: '', answer: '' }); onSave('Added') }}>+ Add Question</button></div>
      {data.faq.map((f, i) => (
        <div key={i} className="edit-card edit-card-lg">
          <div className="edit-card-header"><span>#{i + 1}</span><button className="btn-remove" onClick={() => { removeArrayItem('faq', i); onSave('Removed') }}>×</button></div>
          <input type="text" placeholder="Question" value={f.question} onChange={(e) => { updateArrayItem('faq', i, { question: e.target.value }); onSave('Saved') }} />
          <textarea placeholder="Answer" value={f.answer} onChange={(e) => { updateArrayItem('faq', i, { answer: e.target.value }); onSave('Saved') }} rows={2} />
        </div>
      ))}
    </div>
  )
}

function ContactEdit({ onSave }) {
  const { data, updateSection } = usePortfolio()
  const c = data.contact
  return (
    <div className="admin-section"><h2>Contact / Final CTA</h2>
      <div className="form-group"><label>Label</label><input type="text" value={c.label} onChange={(e) => { updateSection('contact', { label: e.target.value }); onSave('Saved') }} /></div>
      <div className="form-group"><label>Title</label><input type="text" value={c.title} onChange={(e) => { updateSection('contact', { title: e.target.value }); onSave('Saved') }} /></div>
      <div className="form-group"><label>Subtitle</label><input type="text" value={c.subtitle} onChange={(e) => { updateSection('contact', { subtitle: e.target.value }); onSave('Saved') }} /></div>
      <div className="form-group"><label>Button Text</label><input type="text" value={c.buttonPrimary} onChange={(e) => { updateSection('contact', { buttonPrimary: e.target.value }); onSave('Saved') }} /></div>
      <div className="form-group"><label>Email</label><input type="email" value={c.email} onChange={(e) => { updateSection('contact', { email: e.target.value }); onSave('Saved') }} /></div>
    </div>
  )
}

function SettingsEdit({ onSave, ghToken, setGhToken, ghPublishing, onGhPublish, instantPublishing, onInstantPublish }) {
  const { data, updateData, updateSection, firebaseUser, isFirebaseEnabled: fbOn, syncStatus, remoteVersion, isSyncing, lastSyncError } = usePortfolio()
  const f = data.footer
  const [showToken, setShowToken] = useState(false)
  const [showAudit, setShowAudit] = useState(false)
  let audit = []
  try { audit = JSON.parse(localStorage.getItem('portfolio_audit_log') || '[]') } catch {}
  return (
    <div className="admin-section"><h2>Site Settings</h2>
      <div className="form-group"><label>Site Name</label><input type="text" value={data.siteName} onChange={(e) => { updateData('siteName', e.target.value); onSave('Saved') }} /></div>
      <div className="form-group"><label>Meta Description</label><input type="text" value={data.siteDescription} onChange={(e) => { updateData('siteDescription', e.target.value); onSave('Saved') }} /></div>
      <div className="form-group"><label>Footer Name</label><input type="text" value={f.name} onChange={(e) => { updateSection('footer', { name: e.target.value }); onSave('Saved') }} /></div>
      <div className="form-group"><label>Footer Role</label><input type="text" value={f.role} onChange={(e) => { updateSection('footer', { role: e.target.value }); onSave('Saved') }} /></div>
      <div className="form-group"><label>Footer Copyright</label><input type="text" value={f.copyright} onChange={(e) => { updateSection('footer', { copyright: e.target.value }); onSave('Saved') }} /></div>
      <div className="form-group"><label>Admin Password (legacy local)</label><p className="hint">Legacy: <code>admin2026</code> + <code>VITE_ADMIN_PASSWORD</code> env. Firebase Auth is primary when enabled.</p></div>

      <div className="settings-divider" />
      <h3 style={{ fontFamily: 'Poppins', fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>🔒 Super-Safe Security</h3>
      <div className="admin-publish-box" style={{ borderColor: fbOn ? 'rgba(94,234,212,0.2)' : 'rgba(251,146,60,0.2)' }}>
        <div style={{ display: 'grid', gap: '10px', fontSize: '13px', lineHeight: 1.6 }}>
          <div><strong>Firebase:</strong> {fbOn ? <span style={{ color: '#5eead4' }}>✓ Enabled · {firebaseUser ? `signed in as ${firebaseUser.email}` : 'not signed in (writes blocked)'}</span> : <span style={{ color: '#fb923c' }}>⚠ Not configured — set VITE_FIREBASE_* env</span>}</div>
          <div><strong>Sync:</strong> {syncStatus} {isSyncing ? '(syncing…)' : ''} {remoteVersion ? `· remote v${remoteVersion}` : ''} · local v{data._version}</div>
          <div><strong>Auth gate:</strong> {fbOn ? 'Firestore rules: `allow read: if true; allow write: if request.auth != null` — visitors read-only' : 'Local + GitHub only'}</div>
          <div><strong>Validation:</strong> All writes validated & sanitized (XSS, URL, size &lt;400KB, array caps)</div>
          <div><strong>Rate-limit:</strong> 1 / 1.2s + 25 / min · History backup: <code>portfolio/live/history</code> · Audit log: localStorage(50)</div>
          {lastSyncError && <div style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.08)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.15)' }}><strong>Last error:</strong> {lastSyncError}</div>}
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
          <button className="btn-publish" onClick={onInstantPublish} disabled={instantPublishing || !fbOn || !firebaseUser} title={!fbOn ? 'Firebase not configured' : !firebaseUser ? 'Sign in with Firebase first' : 'Instant sync'}>
            {instantPublishing ? '⏳ Publishing…' : '⚡ Instant Publish (Firestore)'}
          </button>
          <button className="btn-secondary" onClick={onGhPublish} disabled={ghPublishing}>{ghPublishing ? 'Publishing…' : 'GH Backup Publish'}</button>
          <button className="btn-secondary" onClick={() => setShowAudit(!showAudit)}>{showAudit ? 'Hide Audit' : `View Audit (${audit.length})`}</button>
        </div>
        {showAudit && (
          <div style={{ marginTop: '12px', maxHeight: '220px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', fontSize: '11px', lineHeight: 1.6 }}>
            {audit.length === 0 ? <span style={{ color: '#64748b' }}>No entries yet</span> : audit.map((a, i) => <div key={i}><span style={{ color: '#64748b' }}>{new Date(a.ts).toLocaleString()}</span> <strong style={{ color: '#5eead4' }}>{a.action}</strong> — {a.detail}</div>)}
            <button className="btn-secondary" style={{ marginTop: '8px', fontSize: '11px', padding: '4px 8px' }} onClick={() => { localStorage.removeItem('portfolio_audit_log'); window.location.reload() }}>Clear Audit</button>
          </div>
        )}
      </div>

      <div className="settings-divider" />
      <h3 style={{ fontFamily: 'Poppins', fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>🌐 GitHub Backup Publish</h3>
      <div className="admin-publish-box">
        <div className="form-group" style={{ marginBottom: '12px' }}>
          <label>GitHub Publish Token (PAT) — fallback static backup</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type={showToken ? 'text' : 'password'}
              value={ghToken}
              onChange={(e) => setGhToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              style={{ flex: 1 }}
              autoComplete="off"
            />
            <button className="btn-secondary" type="button" onClick={() => setShowToken(!showToken)} style={{ whiteSpace: 'nowrap' }}>{showToken ? 'Hide' : 'Show'}</button>
            {ghToken && <button className="btn-secondary" type="button" onClick={() => { setGhToken(''); localStorage.removeItem('github_pat') }} title="Clear token">Clear</button>}
          </div>
          <p className="hint" style={{ marginTop: '8px', lineHeight: 1.6 }}>
            Stored only in <code>localStorage</code> on this browser. Required scope: <code>repo</code> (classic PAT).<br />
            Create: <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" style={{ color: '#5eead4', textDecoration: 'underline' }}>github.com/settings/tokens/new</a> → select <code>repo</code> → Generate → paste here.<br />
            For fine-grained PAT: repo <code>ashhad0beg-rgb/showcase-portfolio</code> → Permissions: Contents: Read & write.
          </p>
          {ghToken ? <span className="hint" style={{ color: '#5eead4' }}>✓ Token saved locally ({ghToken.length} chars, {ghToken.slice(0, 4)}…{ghToken.slice(-4)})</span> : <span className="hint" style={{ color: '#fca5a5' }}>No token — GitHub publish will prompt.</span>}
        </div>
        <div className="hint" style={{ marginTop: '12px', background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <strong>Setup Firebase for instant & super-safe sync:</strong><br />
          1. Firebase Console → Create project → Web app → copy <code>firebaseConfig</code><br />
          2. Enable <strong>Authentication</strong> → Email/Password → Add admin user<br />
          3. Enable <strong>Firestore</strong> → Create DB → Deploy rules from <code>firestore.rules</code> (see repo)<br />
          4. Add to <code>.env</code> (<code>VITE_FIREBASE_*</code>) and GitHub Secrets → redeploy.<br />
          Visitors then get &lt;2s global updates, fully validated & auth-gated.
        </div>
      </div>
    </div>
  )
}
