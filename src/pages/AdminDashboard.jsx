import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const { data, isAuthenticated, logout, updateData } = usePortfolio()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [saved, setSaved] = useState(false)

  if (!isAuthenticated) { navigate('/admin/login'); return null }

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

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
        <div className="admin-topbar"><h1>Portfolio Admin</h1>{saved && <span className="save-indicator">✓ Saved!</span>}</div>
        <div className="admin-content">
          {activeSection === 'dashboard' && <DashboardOverview data={data} updateData={updateData} handleSave={handleSave} />}
          {activeSection === 'hero' && <HeroEdit />}
          {activeSection === 'showreel' && <ShowreelEdit />}
          {activeSection === 'work' && <WorkEdit />}
          {activeSection === 'services' && <ServicesEdit />}
          {activeSection === 'process' && <ProcessEdit />}
          {activeSection === 'about' && <AboutEdit />}
          {activeSection === 'tools' && <ToolsEdit />}
          {activeSection === 'experience' && <ExperienceEdit />}
          {activeSection === 'testimonials' && <TestimonialsEdit />}
          {activeSection === 'faq' && <FaqEdit />}
          {activeSection === 'contact' && <ContactEdit />}
          {activeSection === 'settings' && <SettingsEdit />}
        </div>
      </main>
    </div>
  )
}

function DashboardOverview({ data, updateData, handleSave }) {
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
        <div className="form-group"><label>Site Name</label><input type="text" value={data.siteName} onChange={(e) => { updateData('siteName', e.target.value); handleSave() }} /></div>
        <div className="form-group"><label>Meta Description</label><input type="text" value={data.siteDescription} onChange={(e) => { updateData('siteDescription', e.target.value); handleSave() }} /></div>
      </div>
    </div>
  )
}

function HeroEdit() {
  const { data, updateSection } = usePortfolio()
  const h = data.hero
  return (
    <div className="admin-section"><h2>Hero Section</h2>
      <div className="form-group"><label>Eyebrow Text</label><input type="text" value={h.eyebrow} onChange={(e) => updateSection('hero', { eyebrow: e.target.value })} /></div>
      <div className="form-group"><label>Title (one line per row)</label><textarea value={h.title} onChange={(e) => updateSection('hero', { title: e.target.value })} rows={4} /></div>
      <div className="form-group"><label>Description</label><textarea value={h.description} onChange={(e) => updateSection('hero', { description: e.target.value })} rows={3} /></div>
      <div className="form-group"><label>Primary Button</label><input type="text" value={h.buttonPrimary} onChange={(e) => updateSection('hero', { buttonPrimary: e.target.value })} /></div>
      <div className="form-group"><label>Secondary Button</label><input type="text" value={h.buttonSecondary} onChange={(e) => updateSection('hero', { buttonSecondary: e.target.value })} /></div>
      <div className="form-group"><label>Hero Image URL</label><input type="text" value={h.image || ''} onChange={(e) => updateSection('hero', { image: e.target.value })} /></div>
    </div>
  )
}

function ShowreelEdit() {
  const { data, updateSection } = usePortfolio()
  const s = data.showreel
  return (
    <div className="admin-section"><h2>Showreel</h2>
      <div className="form-group"><label>Label</label><input type="text" value={s.label} onChange={(e) => updateSection('showreel', { label: e.target.value })} /></div>
      <div className="form-group"><label>Title</label><input type="text" value={s.title} onChange={(e) => updateSection('showreel', { title: e.target.value })} /></div>
      <div className="form-group"><label>Video URL</label><input type="text" value={s.videoUrl} onChange={(e) => updateSection('showreel', { videoUrl: e.target.value })} /></div>
      <div className="form-group"><label>Poster Image URL</label><input type="text" value={s.posterUrl} onChange={(e) => updateSection('showreel', { posterUrl: e.target.value })} /></div>
      <div className="form-group"><label>Tags (comma separated)</label><input type="text" value={s.tags.join(', ')} onChange={(e) => updateSection('showreel', { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} /></div>
    </div>
  )
}

function WorkEdit() {
  const { data, updateArrayItem, addArrayItem, removeArrayItem } = usePortfolio()
  return (
    <div className="admin-section">
      <div className="section-header-row"><h2>Work ({data.work.length})</h2><button className="btn-add" onClick={() => addArrayItem('work', { title: '', client: '', year: '', role: '', category: '', image: '', description: '' })}>+ Add Project</button></div>
      {data.work.map((p, i) => (
        <div key={i} className="edit-card edit-card-lg">
          <div className="edit-card-header"><span>Project #{i + 1}</span><button className="btn-remove" onClick={() => removeArrayItem('work', i)}>×</button></div>
          <input type="text" placeholder="Title" value={p.title} onChange={(e) => updateArrayItem('work', i, { title: e.target.value })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <input type="text" placeholder="Client" value={p.client} onChange={(e) => updateArrayItem('work', i, { client: e.target.value })} />
            <input type="text" placeholder="Year" value={p.year} onChange={(e) => updateArrayItem('work', i, { year: e.target.value })} />
          </div>
          <input type="text" placeholder="Role" value={p.role} onChange={(e) => updateArrayItem('work', i, { role: e.target.value })} />
          <input type="text" placeholder="Category" value={p.category} onChange={(e) => updateArrayItem('work', i, { category: e.target.value })} />
          <textarea placeholder="Description" value={p.description} onChange={(e) => updateArrayItem('work', i, { description: e.target.value })} rows={2} />
          <div className="tags-edit"><label>Image URL:</label><input type="text" placeholder="https://..." value={p.image || ''} onChange={(e) => updateArrayItem('work', i, { image: e.target.value })} /></div>
          {p.image && <div className="image-preview"><label>Preview:</label><img src={p.image} alt="Preview" /></div>}
        </div>
      ))}
    </div>
  )
}

function ServicesEdit() {
  const { data, updateArrayItem, addArrayItem, removeArrayItem } = usePortfolio()
  return (
    <div className="admin-section">
      <div className="section-header-row"><h2>Services ({data.services.length})</h2><button className="btn-add" onClick={() => addArrayItem('services', { number: String(data.services.length + 1).padStart(2, '0'), name: '', description: '' })}>+ Add Service</button></div>
      {data.services.map((s, i) => (
        <div key={i} className="edit-card edit-card-lg">
          <div className="edit-card-header"><span>{s.number}</span><button className="btn-remove" onClick={() => removeArrayItem('services', i)}>×</button></div>
          <input type="text" placeholder="Name" value={s.name} onChange={(e) => updateArrayItem('services', i, { name: e.target.value })} />
          <textarea placeholder="Description" value={s.description} onChange={(e) => updateArrayItem('services', i, { description: e.target.value })} rows={2} />
        </div>
      ))}
    </div>
  )
}

function ProcessEdit() {
  const { data, updateArrayItem, addArrayItem, removeArrayItem } = usePortfolio()
  return (
    <div className="admin-section">
      <div className="section-header-row"><h2>Process ({data.process.length})</h2><button className="btn-add" onClick={() => addArrayItem('process', { number: String(data.process.length + 1).padStart(2, '0'), name: '', description: '' })}>+ Add Step</button></div>
      {data.process.map((s, i) => (
        <div key={i} className="edit-card">
          <input type="text" placeholder="Name" value={s.name} onChange={(e) => updateArrayItem('process', i, { name: e.target.value })} />
          <input type="text" placeholder="Description" value={s.description} onChange={(e) => updateArrayItem('process', i, { description: e.target.value })} />
          <button className="btn-remove" onClick={() => removeArrayItem('process', i)}>×</button>
        </div>
      ))}
    </div>
  )
}

function AboutEdit() {
  const { data, updateSection } = usePortfolio()
  const a = data.about
  return (
    <div className="admin-section"><h2>About</h2>
      <div className="form-group"><label>Title</label><input type="text" value={a.title} onChange={(e) => updateSection('about', { title: e.target.value })} /></div>
      <div className="form-group"><label>Highlight</label><input type="text" value={a.highlight} onChange={(e) => updateSection('about', { highlight: e.target.value })} /></div>
      <div className="form-group"><label>Content</label><textarea value={a.content} onChange={(e) => updateSection('about', { content: e.target.value })} rows={4} /></div>
      <div className="form-group"><label>Image URL</label><input type="text" value={a.image || ''} onChange={(e) => updateSection('about', { image: e.target.value })} /></div>
      {a.image && <div className="image-preview"><label>Preview:</label><img src={a.image} alt="About" /></div>}
    </div>
  )
}

function ToolsEdit() {
  const { data, updateData } = usePortfolio()
  return (
    <div className="admin-section"><h2>Tools</h2>
      <div className="form-group"><label>Tools (comma separated)</label><textarea value={data.tools.join(', ')} onChange={(e) => updateData('tools', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} rows={3} /></div>
    </div>
  )
}

function ExperienceEdit() {
  const { data, updateArrayItem, addArrayItem, removeArrayItem } = usePortfolio()
  return (
    <div className="admin-section">
      <div className="section-header-row"><h2>Experience ({data.experience.length})</h2><button className="btn-add" onClick={() => addArrayItem('experience', { year: '', role: '', client: '' })}>+ Add Entry</button></div>
      {data.experience.map((e, i) => (
        <div key={i} className="edit-card">
          <input type="text" placeholder="Year" value={e.year} onChange={(ev) => updateArrayItem('experience', i, { year: ev.target.value })} />
          <input type="text" placeholder="Role" value={e.role} onChange={(ev) => updateArrayItem('experience', i, { role: ev.target.value })} />
          <input type="text" placeholder="Client" value={e.client} onChange={(ev) => updateArrayItem('experience', i, { client: ev.target.value })} />
          <button className="btn-remove" onClick={() => removeArrayItem('experience', i)}>×</button>
        </div>
      ))}
    </div>
  )
}

function TestimonialsEdit() {
  const { data, updateArrayItem, addArrayItem, removeArrayItem } = usePortfolio()
  return (
    <div className="admin-section">
      <div className="section-header-row"><h2>Testimonials ({data.testimonials.length})</h2><button className="btn-add" onClick={() => addArrayItem('testimonials', { quote: '', author: '', company: '' })}>+ Add</button></div>
      {data.testimonials.map((t, i) => (
        <div key={i} className="edit-card edit-card-lg">
          <div className="edit-card-header"><span>#{i + 1}</span><button className="btn-remove" onClick={() => removeArrayItem('testimonials', i)}>×</button></div>
          <textarea placeholder="Quote" value={t.quote} onChange={(e) => updateArrayItem('testimonials', i, { quote: e.target.value })} rows={3} />
          <input type="text" placeholder="Author" value={t.author} onChange={(e) => updateArrayItem('testimonials', i, { author: e.target.value })} />
          <input type="text" placeholder="Company" value={t.company} onChange={(e) => updateArrayItem('testimonials', i, { company: e.target.value })} />
        </div>
      ))}
    </div>
  )
}

function FaqEdit() {
  const { data, updateArrayItem, addArrayItem, removeArrayItem } = usePortfolio()
  return (
    <div className="admin-section">
      <div className="section-header-row"><h2>FAQ ({data.faq.length})</h2><button className="btn-add" onClick={() => addArrayItem('faq', { question: '', answer: '' })}>+ Add Question</button></div>
      {data.faq.map((f, i) => (
        <div key={i} className="edit-card edit-card-lg">
          <div className="edit-card-header"><span>#{i + 1}</span><button className="btn-remove" onClick={() => removeArrayItem('faq', i)}>×</button></div>
          <input type="text" placeholder="Question" value={f.question} onChange={(e) => updateArrayItem('faq', i, { question: e.target.value })} />
          <textarea placeholder="Answer" value={f.answer} onChange={(e) => updateArrayItem('faq', i, { answer: e.target.value })} rows={2} />
        </div>
      ))}
    </div>
  )
}

function ContactEdit() {
  const { data, updateSection } = usePortfolio()
  const c = data.contact
  return (
    <div className="admin-section"><h2>Contact / Final CTA</h2>
      <div className="form-group"><label>Label</label><input type="text" value={c.label} onChange={(e) => updateSection('contact', { label: e.target.value })} /></div>
      <div className="form-group"><label>Title</label><input type="text" value={c.title} onChange={(e) => updateSection('contact', { title: e.target.value })} /></div>
      <div className="form-group"><label>Subtitle</label><input type="text" value={c.subtitle} onChange={(e) => updateSection('contact', { subtitle: e.target.value })} /></div>
      <div className="form-group"><label>Button Text</label><input type="text" value={c.buttonPrimary} onChange={(e) => updateSection('contact', { buttonPrimary: e.target.value })} /></div>
      <div className="form-group"><label>Email</label><input type="email" value={c.email} onChange={(e) => updateSection('contact', { email: e.target.value })} /></div>
    </div>
  )
}

function SettingsEdit() {
  const { data, updateData } = usePortfolio()
  const f = data.footer
  return (
    <div className="admin-section"><h2>Site Settings</h2>
      <div className="form-group"><label>Site Name</label><input type="text" value={data.siteName} onChange={(e) => updateData('siteName', e.target.value)} /></div>
      <div className="form-group"><label>Meta Description</label><input type="text" value={data.siteDescription} onChange={(e) => updateData('siteDescription', e.target.value)} /></div>
      <div className="form-group"><label>Footer Name</label><input type="text" value={f.name} onChange={(e) => updateSection('footer', { name: e.target.value })} /></div>
      <div className="form-group"><label>Footer Role</label><input type="text" value={f.role} onChange={(e) => updateSection('footer', { role: e.target.value })} /></div>
      <div className="form-group"><label>Footer Copyright</label><input type="text" value={f.copyright} onChange={(e) => updateSection('footer', { copyright: e.target.value })} /></div>
      <div className="form-group"><label>Admin Password</label><p className="hint">Current password: <code>admin2026</code> (change in code if needed)</p></div>
    </div>
  )
}
