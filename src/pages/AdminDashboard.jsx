import { useState, useRef, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import { supabase, isSupabaseEnabled } from '../lib/supabase.js'
import { validatePortfolioData } from '../lib/validate.js'
import '../admin/admin.css'

const sections = [
  { path: '/admin', label: 'Dashboard', icon: '◧' },
  { path: '/admin/hero', label: 'Hero', icon: '⌖' },
  { path: '/admin/work', label: 'Work', icon: '▣' },
  { path: '/admin/about', label: 'About', icon: '○' },
  { path: '/admin/contact', label: 'Contact', icon: '✉' },
  { path: '/admin/theme', label: 'Theme', icon: '⬢' },
  { path: '/admin/settings', label: 'Settings', icon: '⚙' },
]
const moreSections = [
  { path: '/admin/showreel', label: 'Showreel', icon: '▶' },
  { path: '/admin/services', label: 'Services', icon: '⚡' },
  { path: '/admin/process', label: 'Process', icon: '◷' },
  { path: '/admin/tools', label: 'Tools', icon: '⬡' },
  { path: '/admin/experience', label: 'Experience', icon: '▭' },
  { path: '/admin/testimonials', label: 'Quotes', icon: '❝' },
  { path: '/admin/faq', label: 'FAQ', icon: '?' },
]

const getSection = (path) => { const p = path.split('/')[2]; return p || 'dashboard' }

function SyncBadge({ status, isSyncing }) {
  const map = {
    local: { bg: 'rgba(251,146,60,0.12)', color: '#fb923c', dot: '#fb923c', label: 'LOCAL' },
    connecting: { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', dot: '#94a3b8', label: 'CONNECTING' },
    syncing: { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa', dot: '#60a5fa', label: 'SYNCING' },
    synced: { bg: 'rgba(94,234,212,0.12)', color: '#5eead4', dot: '#5eead4', label: 'LIVE • SYNCED' },
    'no-remote': { bg: 'rgba(251,146,60,0.12)', color: '#fb923c', dot: '#fb923c', label: 'NO REMOTE YET' },
    error: { bg: 'rgba(239,68,68,0.12)', color: '#fca5a5', dot: '#ef4444', label: 'ERROR' },
  }
  const s = map[status] || map.local
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: s.bg, color: s.color, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.6px', border: `1px solid ${s.color}33` }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: s.dot, animation: isSyncing ? 'pulse 1.2s infinite' : 'none', display: 'inline-block' }} />
      {s.label}
    </span>
  )
}

export default function AdminDashboard() {
  const { data, isAuthenticated, logout, updateData, resetData, importData, syncStatus, isSyncing, remoteVersion, lastSyncError, supabaseUser, forceSyncToRemote } = usePortfolio()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [saved, setSaved] = useState(false)
  const [info, setInfo] = useState('')
  const [ghToken, setGhToken] = useState(() => {
    try { return localStorage.getItem('github_pat') || '' } catch { return '' }
  })
  const [ghPublishing, setGhPublishing] = useState(false)
  const [instantPublishing, setInstantPublishing] = useState(false)
  const fileRef = useRef(null)

  const sbEnabled = isSupabaseEnabled

  useEffect(() => {
    try {
      if (ghToken) localStorage.setItem('github_pat', ghToken)
      else localStorage.removeItem('github_pat')
    } catch {}
  }, [ghToken])

  if (!isAuthenticated && !supabaseUser) {
    const hasLegacy = (() => { try { return localStorage.getItem('admin_auth_token') === 'admin_token_2026' } catch { return false } })()
    if (!hasLegacy && !supabaseUser) return <Navigate to="/admin/login" replace />
  }

  const triggerSaved = (msg = 'Saved!') => {
    setSaved(true)
    if (msg) setInfo(msg)
    setTimeout(() => { setSaved(false); setInfo('') }, 3000)
  }

  // Supabase secure instant publish — auth-gated, validated, rate-limited, history-backed, RLS protected
  const handleInstantPublish = async () => {
    if (sbEnabled && !supabaseUser) {
      triggerSaved('Sign in with Supabase email to publish globally')
      alert('🔒 Supabase Auth required for instant publish.\n\nGo to /admin/login and sign in with your Supabase admin email + password.\n\nWithout Supabase auth, writes are blocked by RLS (visitors can only read). This is FREE & secure — Supabase free tier includes Auth + Postgres + Realtime.')
      return
    }
    try {
      validatePortfolioData(data)
    } catch (e) {
      alert('Validation failed — fix before publishing:\n\n' + e.message)
      triggerSaved('Validation failed')
      return
    }
    if (!confirm(`⚡ Instant Publish to LIVE via Supabase?\n\n• Validated ✓\n• Auth: ${supabaseUser?.email || 'legacy'}\n• Version will auto-bump to ${(data._version || 0) + 1}\n• Secure: history-backed + rate-limited + global in ~2s via Supabase Realtime (FREE)\n• RLS: visitors read-only`)) return
    setInstantPublishing(true)
    try {
      const res = await forceSyncToRemote()
      if (res.ok) {
        triggerSaved(`✓ LIVE instantly! v${res.version} (Supabase)`)
      } else {
        let msg = 'Instant publish failed: ' + (res.reason || 'unknown')
        if (res.error) msg += '\n' + res.error
        if (res.reason === 'not-authenticated') msg = 'Not Supabase-authenticated — login with Supabase email first. RLS blocks anonymous writes.'
        if (res.reason === 'rate-limited') msg = `Rate-limited — wait ${Math.ceil((res.retryAfter || 1200) / 1000)}s and retry.`
        if (res.reason === 'supabase-disabled') msg = 'Supabase not configured — set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.'
        if (res.reason === 'validation-failed') msg = 'Validation rejected: ' + res.error
        if (res.reason === 'supabase-error') msg = 'Supabase error: ' + (res.error || 'check RLS policies & that portfolio table exists — run setup SQL in DB')
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
    if (!confirm('Publish via GitHub (fallback) to LIVE?\n\nThis commits src/data/defaultData.js and triggers 1–2 min Pages deploy. Use ⚡ Instant Publish for <2s Supabase sync if Supabase is enabled (FREE & secure).')) return
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
      try { localStorage.setItem('portfolio_data', JSON.stringify(publishData)) } catch {}
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
      try { localStorage.setItem('portfolio_data', JSON.stringify(validated)) } catch {}
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
        try { localStorage.setItem('portfolio_data', JSON.stringify(validated)) } catch {}
        triggerSaved(`✓ Imported v${validated._version}! Validated. Auto-syncing…`)
        if (sbEnabled && supabaseUser) {
          setTimeout(() => forceSyncToRemote().then(r => {
            if (r.ok) triggerSaved(`✓ Imported & LIVE v${r.version}! (Supabase FREE)`)
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
    if (!confirm('Confirm again — this will also publish reset to LIVE if Supabase-authenticated (history backed).')) return
    await resetData()
    triggerSaved('Reset to defaults (history backed)')
    setTimeout(() => window.location.reload(), 600)
  }

  const handleViewSite = () => {
    window.open('/showcase-portfolio/', '_blank')
  }

  const handlePublish = () => { if (sbEnabled) handleInstantPublish(); else handleGhPublish() }
  const publishing = instantPublishing || ghPublishing

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header"><h2>Admin</h2><div style={{ fontSize: '11px', color: sbEnabled ? '#5eead4' : '#94a3b8', marginTop: '4px', fontWeight: 600 }}>{sbEnabled ? '● Live' : '○ Local'}</div></div>
        <nav className="admin-nav">
          {sections.map(s => (
            <button key={s.path} className={`admin-nav-item ${activeSection === getSection(s.path) ? 'active' : ''}`} onClick={() => { setActiveSection(getSection(s.path)); navigate(s.path) }}>
              <span className="admin-nav-icon">{s.icon}</span><span>{s.label}</span>
            </button>
          ))}
          <details style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
            <summary style={{ fontSize: '12px', color: '#64748b', cursor: 'pointer', padding: '6px 8px', listStyle: 'none' }}>More ▾</summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
              {moreSections.map(s => (
                <button key={s.path} className={`admin-nav-item ${activeSection === getSection(s.path) ? 'active' : ''}`} onClick={() => { setActiveSection(getSection(s.path)); navigate(s.path) }} style={{ fontSize: '13px', minHeight: '36px', opacity: 0.85 }}>
                  <span className="admin-nav-icon" style={{ fontSize: '14px' }}>{s.icon}</span><span>{s.label}</span>
                </button>
              ))}
            </div>
          </details>
        </nav>
        <div className="admin-sidebar-footer">
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px', wordBreak: 'break-all', lineHeight: 1.4 }}>{supabaseUser ? supabaseUser.email : 'Local admin'}</div>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>
      </aside>
      <main className="admin-main">
        <div className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Portfolio</h1>
            <SyncBadge status={syncStatus} isSyncing={isSyncing} />
          </div>
          <div className="admin-topbar-actions">
            {saved ? <span className="save-indicator">{info || 'Saved'}</span> : <span className="autosave-hint">Auto-saved</span>}
            <button className="btn-secondary" onClick={handleViewSite}>Preview</button>
            <button className="btn-save" onClick={handleManualSave}>Save</button>
            <button className="btn-publish" onClick={handlePublish} disabled={publishing || isSyncing} title={sbEnabled ? 'Publish LIVE via Supabase' : 'Publish via GitHub'}>{publishing ? 'Publishing…' : sbEnabled ? 'Publish' : 'Publish'}</button>
          </div>
        </div>
        <div className="admin-storage-note" style={{ background: sbEnabled ? 'rgba(94,234,212,0.06)' : 'rgba(148,163,184,0.06)', borderColor: sbEnabled ? 'rgba(94,234,212,0.12)' : 'rgba(255,255,255,0.06)' }}>
          {sbEnabled ? (supabaseUser ? (supabaseUser.id === 'emergency-local' ? <span style={{ color: '#fb923c' }}>⚠ Emergency local — {supabaseUser.email} (Supabase login failed, see /admin/login red box for exact error)</span> : <span style={{ color: '#5eead4' }}>✓ Live sync — {supabaseUser.email}</span>) : <span style={{ color: '#fb923c' }}>○ Signed out — sign in to publish live</span>) : <span>○ Local mode — edits saved in this browser only</span>}
          {lastSyncError && !lastSyncError.includes('Realtime failed') && <span style={{ color: '#fca5a5', marginLeft: '12px' }}>· {lastSyncError.slice(0,60)}</span>}
          {lastSyncError && lastSyncError.includes('Realtime failed') && <span style={{ color: '#94a3b8', marginLeft: '12px' }}>· Polling active (Realtime OFF)</span>}
        </div>
        <div className="admin-content">
          {activeSection === 'dashboard' && <DashboardOverview data={data} updateData={updateData} onSave={triggerSaved} />}
          {activeSection === 'theme' && <ThemeEdit onSave={triggerSaved} />}
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

function DashboardOverview({ data, updateData, onSave }) {
  const { isSupabaseEnabled: sbOn, syncStatus, supabaseUser, remoteVersion } = usePortfolio()
  const counts = [
    { label: 'Work', value: data.work?.length || 0 },
    { label: 'Services', value: data.services?.length || 0 },
    { label: 'Tools', value: data.tools?.length || 0 },
    { label: 'FAQ', value: data.faq?.length || 0 },
  ]
  return (
    <div className="admin-section">
      <h2>Overview</h2>
      <div className="admin-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>{counts.map((c, i) => <div key={i} className="admin-stat-card" style={{ padding: '16px' }}><span className="admin-stat-value" style={{ fontSize: '24px' }}>{c.value}</span><span className="admin-stat-label">{c.label}</span></div>)}</div>
      <div className="admin-quick-edit" style={{ padding: '16px' }}>
        <div style={{ fontSize: '13px', color: sbOn && supabaseUser ? '#5eead4' : '#94a3b8' }}>
          {sbOn && supabaseUser ? `Live — ${supabaseUser.email} · v${data._version}` : sbOn ? 'Not signed in — sign in to publish' : 'Local — edits stay in this browser'}
        </div>
      </div>
      <div className="admin-quick-edit" style={{ marginTop: '16px' }}>
        <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Site</h3>
        <div className="form-group" style={{ marginBottom: '12px' }}><label>Site Name</label><input type="text" value={data.siteName} onChange={(e) => { updateData('siteName', e.target.value); onSave('Saved') }} /></div>
        <div className="form-group" style={{ marginBottom: 0 }}><label>Description</label><input type="text" value={data.siteDescription} onChange={(e) => { updateData('siteDescription', e.target.value); onSave('Saved') }} /></div>
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

const FONT_DISPLAY_OPTIONS = ['Poppins','Inter','Roboto','Playfair Display','Montserrat','Space Grotesk','Outfit','DM Sans','Manrope','Syne','JetBrains Mono','Open Sans']
const FONT_BODY_OPTIONS = ['Open Sans','Inter','Roboto','Lora','Manrope','DM Sans','Space Grotesk','Work Sans','Outfit','Poppins']
const LAYOUT_OPTIONS = [
  { value: 'compact', label: 'Compact', desc: 'Tighter spacing • dense • smaller hero (0.82×)', preview: '82% spacing' },
  { value: 'default', label: 'Default', desc: 'Balanced • original design', preview: '100%' },
  { value: 'wide', label: 'Wide', desc: 'Airier • more breathing room (1.18×)', preview: '118%' },
  { value: 'minimal', label: 'Minimal', desc: 'Editorial • max whitespace (1.35×)', preview: '135%' },
]
const RADIUS_OPTIONS = [
  { value: 'sharp', label: 'Sharp', desc: '4px — brutalist' },
  { value: 'default', label: 'Default', desc: '12px — original' },
  { value: 'round', label: 'Round', desc: '20px — softer' },
  { value: 'pill', label: 'Pill', desc: '28px — pill cards' },
]

function ThemeEdit({ onSave }) {
  const { data, updateSection } = usePortfolio()
  const theme = data.theme || { fontDisplay: 'Poppins', fontBody: 'Open Sans', layout: 'default', accentColor: '#00ff88', borderRadius: 'default' }

  const set = (patch) => {
    updateSection('theme', { ...theme, ...patch })
    onSave('Saved — live preview')
  }

  return (
    <div className="admin-section">
      <h2>Font & Layout</h2>
      <p className="hint" style={{ marginBottom: '20px', background: 'rgba(94,234,212,0.06)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(94,234,212,0.12)' }}>
        🎨 Customize typography & spacing <strong>live</strong> — changes auto-save locally, instant global when Supabase authenticated (`⚡ Instant Publish`) or via GitHub fallback. Preview below updates instantly across the site via <code>ThemeInjector</code>.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="form-group">
          <label>Display Font (headings, hero)</label>
          <select value={theme.fontDisplay} onChange={(e) => set({ fontDisplay: e.target.value })} style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#f1f5f9', fontFamily: `'${theme.fontDisplay}', sans-serif` }}>
            {FONT_DISPLAY_OPTIONS.map(f => <option key={f} value={f} style={{ background: '#0f1729' }}>{f}</option>)}
          </select>
          <p className="hint" style={{ marginTop: '6px' }}>Used for <code>var(--font-display)</code> — hero, section titles</p>
        </div>
        <div className="form-group">
          <label>Body Font (paragraphs, UI)</label>
          <select value={theme.fontBody} onChange={(e) => set({ fontBody: e.target.value })} style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#f1f5f9', fontFamily: `'${theme.fontBody}', sans-serif` }}>
            {FONT_BODY_OPTIONS.map(f => <option key={f} value={f} style={{ background: '#0f1729' }}>{f}</option>)}
          </select>
          <p className="hint" style={{ marginTop: '6px' }}>Used for <code>var(--font-body)</code> — descriptions, details</p>
        </div>
      </div>

      <div className="form-group">
        <label>Layout Density — Size Change</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {LAYOUT_OPTIONS.map(o => (
            <button key={o.value} onClick={() => set({ layout: o.value })} className={`admin-theme-card ${theme.layout === o.value ? 'active' : ''}`} style={{
              padding: '14px', borderRadius: '12px', border: theme.layout === o.value ? '1.5px solid #5eead4' : '1px solid rgba(255,255,255,0.08)', background: theme.layout === o.value ? 'rgba(94,234,212,0.08)' : '#0f1729', textAlign: 'left', cursor: 'pointer', color: theme.layout === o.value ? '#5eead4' : '#e2e8f0', transition: 'all 150ms ease'
            }}>
              <div style={{ fontWeight: 800, fontSize: '14px' }}>{o.label} <span style={{ fontWeight: 400, fontSize: '11px', opacity: 0.7 }}>• {o.preview}</span></div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{o.desc}</div>
            </button>
          ))}
        </div>
        <p className="hint" style={{ marginTop: '8px' }}>Scales <code>--space-*</code>, <code>--text-hero</code> (<code>clamp</code>), and section padding. Data attribute: <code>data-layout=&quot;{theme.layout}&quot;</code></p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
        <div className="form-group">
          <label>Accent Color</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input type="color" value={theme.accentColor} onChange={(e) => set({ accentColor: e.target.value })} style={{ width: '56px', height: '42px', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer' }} />
            <input type="text" value={theme.accentColor} onChange={(e) => set({ accentColor: e.target.value })} placeholder="#00ff88" pattern="^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" style={{ flex: 1, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#f1f5f9', fontFamily: 'monospace' }} />
            <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: theme.accentColor, border: '1px solid rgba(255,255,255,0.15)', display: 'inline-block' }} />
          </div>
          <p className="hint" style={{ marginTop: '6px' }}>Updates <code>--color-accent</code>, focus, glow, borders. Hex only (#RGB or #RRGGBB)</p>
        </div>
        <div className="form-group">
          <label>Border Radius</label>
          <select value={theme.borderRadius} onChange={(e) => set({ borderRadius: e.target.value })} style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#f1f5f9' }}>
            {RADIUS_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: '#0f1729' }}>{o.label} — {o.desc}</option>)}
          </select>
          <p className="hint" style={{ marginTop: '6px' }}>Controls <code>--radius-lg/md/xl</code> for cards & buttons</p>
        </div>
      </div>

      <div className="admin-publish-box" style={{ marginTop: '24px', background: '#0f1729', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontFamily: 'Poppins', fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Live Preview</h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{ fontFamily: `'${theme.fontDisplay}', sans-serif`, fontSize: '32px', fontWeight: 900, letterSpacing: '-1px', textTransform: 'uppercase', color: '#f1f5f9', borderLeft: `4px solid ${theme.accentColor}`, paddingLeft: '12px' }}>
            I EDIT. I ANIMATE. I CREATE.
          </div>
          <div style={{ fontFamily: `'${theme.fontBody}', sans-serif`, fontSize: '15px', lineHeight: 1.7, color: '#94a3b8', maxWidth: '620px' }}>
            The quick brown fox jumps over the lazy dog — <strong style={{ color: '#e2e8f0' }}>Aa Bb Cc 123</strong>. Body text in <em>{theme.fontBody}</em> — layout <strong>{theme.layout}</strong> ({theme.layout === 'compact' ? '0.82×' : theme.layout === 'wide' ? '1.18×' : theme.layout === 'minimal' ? '1.35×' : '1×'} spacing) with <em style={{ fontFamily: `'${theme.fontDisplay}', sans-serif` }}>{theme.fontDisplay}</em> headings.
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
            <span style={{ padding: '10px 18px', background: theme.accentColor, color: '#06110f', borderRadius: theme.borderRadius === 'sharp' ? '4px' : theme.borderRadius === 'round' ? '20px' : theme.borderRadius === 'pill' ? '9999px' : '12px', fontFamily: `'${theme.fontDisplay}', sans-serif`, fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Primary Button</span>
            <span style={{ padding: '10px 18px', border: `1px solid ${theme.accentColor}33`, color: '#e2e8f0', borderRadius: theme.borderRadius === 'sharp' ? '4px' : theme.borderRadius === 'round' ? '20px' : theme.borderRadius === 'pill' ? '9999px' : '12px', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Outline</span>
            <span style={{ padding: '10px 18px', background: '#161616', border: '1px solid rgba(255,255,255,0.08)', borderRadius: theme.borderRadius === 'sharp' ? '4px' : theme.borderRadius === 'round' ? '20px' : theme.borderRadius === 'pill' ? '9999px' : '12px', color: '#94a3b8', fontSize: '13px' }}>Card radius: {theme.borderRadius}</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            Fonts load from Google Fonts • Accent <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>{theme.accentColor}</code> • Layout <code>{theme.layout}</code> scales <code>--space-*</code> & <code>--text-hero</code>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
        <button className="btn-secondary" onClick={() => { set({ fontDisplay: 'Poppins', fontBody: 'Open Sans', layout: 'default', accentColor: '#00ff88', borderRadius: 'default' }) }}>Reset to Defaults</button>
        <button className="btn-secondary" onClick={() => { navigator.clipboard.writeText(JSON.stringify(theme, null, 2)); onSave('Theme JSON copied') }}>Copy Theme JSON</button>
        <span className="hint">Changes save instantly + sync globally when you hit <strong>⚡ Instant Publish</strong> in top bar</span>
      </div>
    </div>
  )
}

function SettingsEdit({ onSave, ghToken, setGhToken, ghPublishing, onGhPublish, instantPublishing, onInstantPublish }) {
  const { data, updateData, updateSection, supabaseUser, isSupabaseEnabled: sbOn, syncStatus, remoteVersion, isSyncing, lastSyncError } = usePortfolio()
  const f = data.footer
  const [showToken, setShowToken] = useState(false)
  const [showAudit, setShowAudit] = useState(false)
  // Change credentials (Supabase) — allows admin to update email/password without Dashboard
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changeMsg, setChangeMsg] = useState('')
  const [changeErr, setChangeErr] = useState('')
  const [changing, setChanging] = useState(false)
  const [showPw, setShowPw] = useState(false)
  let audit = []
  try { audit = JSON.parse(localStorage.getItem('portfolio_audit_log') || '[]') } catch {}

  const handleUpdateEmail = async () => {
    setChangeMsg(''); setChangeErr('')
    const email = newEmail.trim()
    if (!email || !email.includes('@')) { setChangeErr('Enter valid new email'); return }
    if (!sbOn || !supabase || !supabaseUser) { setChangeErr('Supabase not enabled or not signed in — sign in first'); return }
    if (!confirm(`Change admin email from ${supabaseUser.email} → ${email}?\n\nYou may need to confirm via new email (check inbox).`)) return
    setChanging(true)
    try {
      const { error } = await supabase.auth.updateUser({ email })
      if (error) throw error
      setChangeMsg(`✓ Email update requested to ${email}. Check new email inbox to confirm (if confirmation enabled). You may need to re-login.`)
      setNewEmail('')
    } catch (e) { setChangeErr(e.message || 'Email update failed') }
    finally { setChanging(false) }
  }
  const handleUpdatePassword = async () => {
    setChangeMsg(''); setChangeErr('')
    if (!newPassword || newPassword.length < 8) { setChangeErr('Password must be ≥8 characters'); return }
    if (newPassword !== confirmPassword) { setChangeErr('Passwords do not match'); return }
    if (!sbOn || !supabase || !supabaseUser) { setChangeErr('Supabase not enabled or not signed in'); return }
    if (!confirm(`Change password for ${supabaseUser.email}?\n\nYou will stay signed in, but use new password next login.`)) return
    setChanging(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setChangeMsg('✓ Password updated! Use new password on next login. (Supabase Auth, bcrypt-hashed)')
      setNewPassword(''); setConfirmPassword('')
    } catch (e) { setChangeErr(e.message || 'Password update failed') }
    finally { setChanging(false) }
  }
  const handleSendReset = async () => {
    setChangeMsg(''); setChangeErr('')
    const email = (newEmail.trim() || supabaseUser?.email || '').trim()
    if (!email || !email.includes('@')) { setChangeErr('Enter email to send reset link, or sign in first'); return }
    if (!sbOn || !supabase) { setChangeErr('Supabase not configured'); return }
    setChanging(true)
    try {
      const redirectTo = window.location.origin + '/showcase-portfolio/admin/login'
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw error
      setChangeMsg(`✓ Reset link sent to ${email}. Check inbox/spam. Link redirects to /admin/login.`)
    } catch (e) { setChangeErr(e.message || 'Reset failed') }
    finally { setChanging(false) }
  }

  return (
    <div className="admin-section"><h2>Site Settings</h2>
      <div className="form-group"><label>Site Name</label><input type="text" value={data.siteName} onChange={(e) => { updateData('siteName', e.target.value); onSave('Saved') }} /></div>
      <div className="form-group"><label>Meta Description</label><input type="text" value={data.siteDescription} onChange={(e) => { updateData('siteDescription', e.target.value); onSave('Saved') }} /></div>
      <div className="form-group"><label>Footer Name</label><input type="text" value={f.name} onChange={(e) => { updateSection('footer', { name: e.target.value }); onSave('Saved') }} /></div>
      <div className="form-group"><label>Footer Role</label><input type="text" value={f.role} onChange={(e) => { updateSection('footer', { role: e.target.value }); onSave('Saved') }} /></div>
      <div className="form-group"><label>Footer Copyright</label><input type="text" value={f.copyright} onChange={(e) => { updateSection('footer', { copyright: e.target.value }); onSave('Saved') }} /></div>
      <div className="hint" style={{ background: sbOn ? 'rgba(94,234,212,0.06)' : 'rgba(148,163,184,0.06)', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${sbOn ? 'rgba(94,234,212,0.12)' : 'rgba(255,255,255,0.06)'}`, fontSize: '12px' }}>{sbOn ? `Live auth — ${supabaseUser?.email || 'not signed in'}` : 'Local mode — set Supabase env for secure login'}</div>

      <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '20px 0 12px' }}>Change Password</h3>
      <div className="admin-publish-box" style={{ background: sbOn && supabaseUser ? 'rgba(94,234,212,0.04)' : 'rgba(255,255,255,0.03)', border: `1px solid ${sbOn && supabaseUser ? 'rgba(94,234,212,0.2)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '12px', padding: '16px' }}>
        {!sbOn ? (
          <div className="hint" style={{ color: '#fb923c', marginBottom: '12px' }}>Supabase not configured</div>
        ) : !supabaseUser ? (
          <div className="hint" style={{ color: '#fca5a5', marginBottom: '12px' }}>Not signed in — sign in first</div>
        ) : (
          <div className="hint" style={{ color: '#5eead4', marginBottom: '12px' }}>Signed in as {supabaseUser.email}</div>
        )}
        <div style={{ display: 'grid', gap: '12px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>New Email {supabaseUser ? `(${supabaseUser.email})` : ''}</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new email" style={{ flex: 1 }} disabled={!sbOn || !supabaseUser || changing} />
              <button className="btn-save" onClick={handleUpdateEmail} disabled={!sbOn || !supabaseUser || changing || !newEmail.trim()}>{changing ? '…' : 'Update'}</button>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>New Password</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type={showPw ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="≥8 chars" style={{ flex: 1 }} disabled={!sbOn || !supabaseUser || changing} autoComplete="new-password" />
              <input type={showPw ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm" style={{ flex: 1 }} disabled={!sbOn || !supabaseUser || changing} autoComplete="new-password" />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button className="btn-secondary" type="button" onClick={() => setShowPw(!showPw)} style={{ fontSize: '12px' }}>{showPw ? 'Hide' : 'Show'}</button>
              <button className="btn-save" onClick={handleUpdatePassword} disabled={!sbOn || !supabaseUser || changing || !newPassword || !confirmPassword}>{changing ? '…' : 'Update Password'}</button>
              <button className="btn-secondary" onClick={handleSendReset} disabled={!sbOn || changing} style={{ fontSize: '12px' }}>Send Reset Link</button>
            </div>
          </div>
          {changeErr && <div style={{ color: '#fca5a5', fontSize: '13px' }}>✗ {changeErr}</div>}
          {changeMsg && <div style={{ color: '#5eead4', fontSize: '13px' }}>✓ {changeMsg}</div>}
        </div>
      </div>

      <details style={{ marginTop: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px' }}>
        <summary style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#94a3b8' }}>Advanced</summary>
        <div style={{ marginTop: '12px', display: 'grid', gap: '12px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>GitHub Token (optional fallback)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type={showToken ? 'text' : 'password'} value={ghToken} onChange={(e) => setGhToken(e.target.value)} placeholder="ghp_..." style={{ flex: 1 }} />
              <button className="btn-secondary" type="button" onClick={() => setShowToken(!showToken)}>{showToken ? 'Hide' : 'Show'}</button>
              {ghToken && <button className="btn-secondary" type="button" onClick={() => { setGhToken(''); try { localStorage.removeItem('github_pat') } catch {} }}>Clear</button>}
            </div>
            <p className="hint" style={{ marginTop: '6px' }}>Stored locally. Create at <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" style={{ color: '#5eead4' }}>github.com/settings/tokens/new</a> (scope `repo`)</p>
          </div>
          <div className="hint" style={{ fontSize: '11px', color: '#64748b' }}>Supabase is primary. GitHub publish commits <code>src/data/defaultData.js</code> (1-2 min deploy).</div>
        </div>
      </details>
    </div>
  )
}
