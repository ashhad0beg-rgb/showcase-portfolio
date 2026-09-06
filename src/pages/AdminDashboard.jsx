import { useState, useRef, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { usePortfolio } from '../context/PortfolioContext.jsx'
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

export default function AdminDashboard() {
  const { data, isAuthenticated, logout, updateData, resetData, importData } = usePortfolio()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [saved, setSaved] = useState(false)
  const [info, setInfo] = useState('')
  const fileRef = useRef(null)

  // Redirect if not authenticated - use Navigate component instead of imperative
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  const triggerSaved = (msg = 'Saved!') => {
    setSaved(true)
    if (msg) setInfo(msg)
    setTimeout(() => { setSaved(false); setInfo('') }, 2500)
  }

  const handleManualSave = () => {
    try {
      localStorage.setItem('portfolio_data', JSON.stringify(data))
      triggerSaved('✓ Saved locally!')
    } catch {
      triggerSaved('Save failed')
    }
  }

  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'portfolio_data.json'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      triggerSaved('✓ Exported JSON')
    } catch {
      triggerSaved('Export failed')
    }
  }

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      triggerSaved('✓ Copied to clipboard')
    } catch {
      triggerSaved('Copy failed')
    }
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result)
        if (!json.hero || !json.work) throw new Error('Invalid format')
        // Directly use context import
        importData(json)
        localStorage.setItem('portfolio_data', JSON.stringify(json))
        triggerSaved('✓ Imported! Reloading...')
        setTimeout(() => window.location.reload(), 800)
      } catch (err) {
        alert('Invalid JSON: ' + err.message)
      }
    }
    reader.readAsText(file)
    // reset input
    e.target.value = ''
  }

  const handleReset = () => {
    if (!confirm('Reset ALL data to defaults? This will erase local changes.')) return
    resetData()
    localStorage.removeItem('portfolio_data')
    triggerSaved('Reset to defaults')
    setTimeout(() => window.location.reload(), 500)
  }

  const handleViewSite = () => {
    window.open('/showcase-portfolio/', '_blank')
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header"><h2>🛠️ Admin</h2></div>
        <nav className="admin-nav">
          {sections.map(s => (
            <button key={s.path} className={`admin-nav-item ${activeSection === getSection(s.path) ? 'active' : ''}`} onClick={() => { setActiveSection(getSection(s.path)); navigate(s.path) }}>
              <span className="admin-nav-icon">{s.icon}</span><span>{s.label}</span>
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer"><button className="btn-logout" onClick={logout}>Logout</button></div>
      </aside>
      <main className="admin-main">
        <div className="admin-topbar">
          <h1>Portfolio Admin</h1>
          <div className="admin-topbar-actions">
            {saved && <span className="save-indicator">{info || '✓ Saved!'}</span>}
            {!saved && <span className="autosave-hint">Auto-saved</span>}
            <button className="btn-save" onClick={handleManualSave} title="Force save to localStorage">Save</button>
            <button className="btn-secondary" onClick={handleViewSite} title="View live site">View Site</button>
            <button className="btn-secondary" onClick={handleExport} title="Download JSON file">Export</button>
            <button className="btn-secondary" onClick={handleCopyJson} title="Copy JSON to clipboard">Copy JSON</button>
            <button className="btn-secondary" onClick={() => fileRef.current?.click()} title="Import JSON file">Import</button>
            <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={handleImport} />
            <button className="btn-danger" onClick={handleReset} title="Reset to defaults">Reset</button>
          </div>
        </div>
        <div className="admin-storage-note">
          💡 Changes auto-save to <code>localStorage</code> (this browser only). Use <strong>Export</strong> → commit <code>src/data/defaultData.js</code> or uploaded JSON to make them visible to all visitors on GitHub Pages.
        </div>
        <div className="admin-content">
          {activeSection === 'dashboard' && <DashboardOverview data={data} updateData={updateData} onSave={triggerSaved} />}
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
          {activeSection === 'settings' && <SettingsEdit onSave={triggerSaved} />}
        </div>
      </main>
    </div>
  )
}

function DashboardOverview({ data, updateData, onSave }) {
  const counts = [
    { label: 'Work', value: data.work?.length || 0 },
    { label: 'Services', value: data.services?.length || 0 },
    { label: 'Tools', value: data.tools?.length || 0 },
    { label: 'FAQ', value: data.faq?.length || 0 },
  ]
  return (
    <div className="admin-section">
      <h2>Quick Overview</h2>
      <div className="admin-stats">{counts.map((c, i) => <div key={i} className="admin-stat-card"><span className="admin-stat-value">{c.value}</span><span className="admin-stat-label">{c.label}</span></div>)}</div>
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
  const wrap = (fn) => (e) => { fn(e); onSave('Saved') }
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

function SettingsEdit({ onSave }) {
  const { data, updateData, updateSection } = usePortfolio()
  const f = data.footer
  return (
    <div className="admin-section"><h2>Site Settings</h2>
      <div className="form-group"><label>Site Name</label><input type="text" value={data.siteName} onChange={(e) => { updateData('siteName', e.target.value); onSave('Saved') }} /></div>
      <div className="form-group"><label>Meta Description</label><input type="text" value={data.siteDescription} onChange={(e) => { updateData('siteDescription', e.target.value); onSave('Saved') }} /></div>
      <div className="form-group"><label>Footer Name</label><input type="text" value={f.name} onChange={(e) => { updateSection('footer', { name: e.target.value }); onSave('Saved') }} /></div>
      <div className="form-group"><label>Footer Role</label><input type="text" value={f.role} onChange={(e) => { updateSection('footer', { role: e.target.value }); onSave('Saved') }} /></div>
      <div className="form-group"><label>Footer Copyright</label><input type="text" value={f.copyright} onChange={(e) => { updateSection('footer', { copyright: e.target.value }); onSave('Saved') }} /></div>
      <div className="form-group"><label>Admin Password</label><p className="hint">Current password: <code>admin2026</code> (change in code if needed)</p></div>
    </div>
  )
}
