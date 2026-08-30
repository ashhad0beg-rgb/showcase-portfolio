import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import '../admin/admin.css'

const sections = [
  { path: '/admin', label: 'Dashboard', icon: '📊' },
  { path: '/admin/hero', label: 'Hero Section', icon: '🏠' },
  { path: '/admin/about', label: 'About', icon: '👤' },
  { path: '/admin/skills', label: 'Skills', icon: '⚡' },
  { path: '/admin/stats', label: 'Stats', icon: '📊' },
  { path: '/admin/certifications', label: 'Certifications', icon: '🎓' },
  { path: '/admin/projects', label: 'Projects', icon: '📁' },
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
          {activeSection === 'dashboard' && <DashboardOverview updateData={updateData} data={data} handleSave={handleSave} />}
          {activeSection === 'hero' && <HeroEdit />}
          {activeSection === 'about' && <AboutEdit />}
          {activeSection === 'skills' && <SkillsEdit />}
          {activeSection === 'stats' && <StatsEdit />}
          {activeSection === 'certifications' && <CertificationsEdit />}
          {activeSection === 'projects' && <ProjectsEdit />}
          {activeSection === 'contact' && <ContactEdit />}
          {activeSection === 'settings' && <SettingsEdit />}
        </div>
      </main>
    </div>
  )
}

function DashboardOverview({ updateData, data, handleSave }) {
  return (
    <div className="admin-section">
      <h2>Quick Overview</h2>
      <div className="admin-stats">
        {[data.skills.length, data.certifications.length, data.projects.length, data.stats.length].map((v, i) => <div key={i} className="admin-stat-card"><span className="admin-stat-value">{v}</span><span className="admin-stat-label">{['Skills', 'Certifications', 'Projects', 'Stats'][i]}</span></div>)}
      </div>
      <div className="admin-quick-edit">
        <h3>Site Settings</h3>
        <div className="form-group"><label>Site Name</label><input type="text" value={data.siteName} onChange={(e) => { updateData('siteName', e.target.value); handleSave() }} /></div>
        <div className="form-group"><label>Meta Description</label><input type="text" value={data.siteDescription} onChange={(e) => { updateData('siteDescription', e.target.value); handleSave() }} /></div>
        <div className="form-group"><label>Footer Text</label><input type="text" value={data.footer} onChange={(e) => { updateData('footer', e.target.value); handleSave() }} /></div>
      </div>
    </div>
  )
}

function HeroEdit() {
  const { data, updateSection } = usePortfolio()
  const hero = data.hero
  return (
    <div className="admin-section"><h2>Hero Section</h2>
      <div className="form-group"><label>Badge Text</label><input type="text" value={hero.badge} onChange={(e) => updateSection('hero', { badge: e.target.value })} /></div>
      <div className="form-group"><label>Title</label><input type="text" value={hero.title} onChange={(e) => updateSection('hero', { title: e.target.value })} /></div>
      <div className="form-group"><label>Description</label><textarea value={hero.description} onChange={(e) => updateSection('hero', { description: e.target.value })} rows={4} /></div>
      <div className="form-group"><label>Primary Button Text</label><input type="text" value={hero.buttonPrimary} onChange={(e) => updateSection('hero', { buttonPrimary: e.target.value })} /></div>
      <div className="form-group"><label>Secondary Button Text</label><input type="text" value={hero.buttonSecondary} onChange={(e) => updateSection('hero', { buttonSecondary: e.target.value })} /></div>
      <div className="form-group"><label>Hero Image URL</label><input type="text" value={hero.image} onChange={(e) => updateSection('hero', { image: e.target.value })} /></div>
      <div className="image-preview"><label>Preview:</label><img src={hero.image} alt="Hero" /></div>
    </div>
  )
}

function AboutEdit() {
  const { data, updateSection } = usePortfolio()
  const about = data.about
  return (
    <div className="admin-section"><h2>About Section</h2>
      <div className="form-group"><label>Title</label><input type="text" value={about.title} onChange={(e) => updateSection('about', { title: e.target.value })} /></div>
      <div className="form-group"><label>Subtitle</label><input type="text" value={about.subtitle} onChange={(e) => updateSection('about', { subtitle: e.target.value })} /></div>
      <div className="form-group"><label>Content</label><textarea value={about.content} onChange={(e) => updateSection('about', { content: e.target.value })} rows={6} /></div>
    </div>
  )
}

function SkillsEdit() {
  const { data, updateArrayItem, addArrayItem, removeArrayItem } = usePortfolio()
  return (
    <div className="admin-section">
      <div className="section-header-row"><h2>Skills ({data.skills.length})</h2><button className="btn-add" onClick={() => addArrayItem('skills', { title: '', desc: '' })}>+ Add Skill</button></div>
      {data.skills.map((skill, i) => (
        <div key={i} className="edit-card">
          <input type="text" placeholder="Title" value={skill.title} onChange={(e) => updateArrayItem('skills', i, { title: e.target.value })} />
          <input type="text" placeholder="Description" value={skill.desc} onChange={(e) => updateArrayItem('skills', i, { desc: e.target.value })} />
          <button className="btn-remove" onClick={() => removeArrayItem('skills', i)}>×</button>
        </div>
      ))}
    </div>
  )
}

function StatsEdit() {
  const { data, updateArrayItem, addArrayItem, removeArrayItem } = usePortfolio()
  return (
    <div className="admin-section">
      <div className="section-header-row"><h2>Stats ({data.stats.length})</h2><button className="btn-add" onClick={() => addArrayItem('stats', { value: '', label: '' })}>+ Add Stat</button></div>
      {data.stats.map((stat, i) => (
        <div key={i} className="edit-card">
          <input type="text" placeholder="Value (e.g. 50+)" value={stat.value} onChange={(e) => updateArrayItem('stats', i, { value: e.target.value })} />
          <input type="text" placeholder="Label (e.g. Projects Completed)" value={stat.label} onChange={(e) => updateArrayItem('stats', i, { label: e.target.value })} />
          <button className="btn-remove" onClick={() => removeArrayItem('stats', i)}>×</button>
        </div>
      ))}
    </div>
  )
}

function CertificationsEdit() {
  const { data, updateArrayItem, addArrayItem, removeArrayItem } = usePortfolio()
  return (
    <div className="admin-section">
      <div className="section-header-row"><h2>Certifications ({data.certifications.length})</h2><button className="btn-add" onClick={() => addArrayItem('certifications', '')}>+ Add</button></div>
      {data.certifications.map((cert, i) => (
        <div key={i} className="edit-card">
          <input type="text" value={cert} onChange={(e) => updateArrayItem('certifications', i, e.target.value)} />
          <button className="btn-remove" onClick={() => removeArrayItem('certifications', i)}>×</button>
        </div>
      ))}
    </div>
  )
}

function ProjectsEdit() {
  const { data, updateArrayItem, addArrayItem, removeArrayItem } = usePortfolio()
  return (
    <div className="admin-section">
      <div className="section-header-row"><h2>Projects ({data.projects.length})</h2><button className="btn-add" onClick={() => addArrayItem('projects', { title: '', desc: '', tags: [''] })}>+ Add Project</button></div>
      {data.projects.map((project, i) => (
        <div key={i} className="edit-card edit-card-lg">
          <div className="edit-card-header"><span>Project #{i + 1}</span><button className="btn-remove" onClick={() => removeArrayItem('projects', i)}>×</button></div>
          <input type="text" placeholder="Title" value={project.title} onChange={(e) => updateArrayItem('projects', i, { title: e.target.value })} />
          <textarea placeholder="Description" value={project.desc} onChange={(e) => updateArrayItem('projects', i, { desc: e.target.value })} rows={2} />
          <div className="tags-edit"><label>Tags (comma separated):</label><input type="text" value={project.tags.join(', ')} onChange={(e) => updateArrayItem('projects', i, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} /></div>
        </div>
      ))}
    </div>
  )
}

function ContactEdit() {
  const { data, updateSection } = usePortfolio()
  const contact = data.contact
  return (
    <div className="admin-section"><h2>Contact Section</h2>
      <div className="form-group"><label>Title</label><input type="text" value={contact.title} onChange={(e) => updateSection('contact', { title: e.target.value })} /></div>
      <div className="form-group"><label>Description</label><textarea value={contact.description} onChange={(e) => updateSection('contact', { description: e.target.value })} rows={3} /></div>
      <div className="form-group"><label>Email</label><input type="email" value={contact.email} onChange={(e) => updateSection('contact', { email: e.target.value })} /></div>
      <div className="form-group"><label>LinkedIn URL</label><input type="url" value={contact.linkedin} onChange={(e) => updateSection('contact', { linkedin: e.target.value })} /></div>
    </div>
  )
}

function SettingsEdit() {
  const { data, updateData } = usePortfolio()
  return (
    <div className="admin-section"><h2>Site Settings</h2>
      <div className="form-group"><label>Site Name</label><input type="text" value={data.siteName} onChange={(e) => updateData('siteName', e.target.value)} /></div>
      <div className="form-group"><label>Meta Description</label><input type="text" value={data.siteDescription} onChange={(e) => updateData('siteDescription', e.target.value)} /></div>
      <div className="form-group"><label>Footer Text</label><input type="text" value={data.footer} onChange={(e) => updateData('footer', e.target.value)} /></div>
      <div className="form-group"><label>Admin Password</label><p className="hint">Current password: <code>admin2026</code> (change in code if needed)</p></div>
    </div>
  )
}