import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { PortfolioProvider, usePortfolio } from './context/PortfolioContext.jsx'
import LoginPage from './pages/AdminLogin.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import './App.css'
import './admin/admin.css'

function useVariants() {
  const shouldReduceMotion = useReducedMotion()
  const fadeUp = { hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 24 }, visible: { opacity: 1, y: 0 } }
  const staggerContainer = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: shouldReduceMotion ? 0 : 0.06, when: 'beforeChildren' } } }
  const staggerItem = { hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } } }
  return { fadeUp, staggerContainer, staggerItem, shouldReduceMotion }
}

const Icons = {
  layers: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>,
  grid: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>,
  zap: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 15l-2 5l9-13h-5l2-5-9 13h5z" /></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>,
  linkedin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>,
  menu: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
}

function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const { data } = usePortfolio()
  useEffect(() => {
    const sections = document.querySelectorAll('section[id]')
    const handleScroll = () => {
      const scrollY = window.scrollY + 120
      sections.forEach(s => {
        const top = s.offsetTop, height = s.offsetHeight, id = s.getAttribute('id')
        if (scrollY >= top && scrollY < top + height) setActiveSection(id)
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  const navItems = [{ href: '#about', label: 'About' }, { href: '#skills', label: 'Skills' }, { href: '#certifications', label: 'Certifications' }, { href: '#projects', label: 'Projects' }, { href: '#contact', label: 'Contact' }]
  return (
    <motion.nav className="nav" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} role="navigation" aria-label="Main navigation">
      <a href="#" className="logo" aria-label={data.siteName}>ANSHED <span className="accent">BEG</span></a>
      <ul className="nav-links-desktop" role="menubar">
        {navItems.map(item => <li key={item.href} role="none"><a href={item.href} role="menuitem" className={activeSection === item.href.slice(1) ? 'active' : ''}>{item.label}</a></li>)}
      </ul>
      <motion.button className="nav-toggle" onClick={() => setIsOpen(!isOpen)} aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={isOpen} aria-controls="mobileNav" whileTap={{ scale: 0.92 }}>{isOpen ? Icons.close : Icons.menu}</motion.button>
      <AnimatePresence>
        {isOpen && <motion.div id="mobileNav" className="nav-links-mobile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><motion.ul initial="hidden" animate="visible" exit="hidden" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}>{navItems.map(item => <motion.li key={item.href} variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}><a href={item.href} onClick={() => setIsOpen(false)} className={activeSection === item.href.slice(1) ? 'active' : ''}>{item.label}</a></motion.li>)}</motion.ul></motion.div>}
      </AnimatePresence>
    </motion.nav>
  )
}

function Hero() {
  const { fadeUp, shouldReduceMotion } = useVariants()
  const { data } = usePortfolio()
  const hero = data.hero
  return (
    <section className="hero" aria-label="Introduction">
      <div className="hero-content">
        <motion.div className="hero-badge" variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.5, delay: 0.1 }}>{Icons.layers} {hero.badge}</motion.div>
        <motion.h1 variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}>{hero.title}</motion.h1>
        <motion.p className="hero-description" variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.5, delay: 0.35 }}>{hero.description}</motion.p>
        <motion.div className="hero-buttons" variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.5, delay: 0.5 }}>
          <motion.a href="#projects" className="btn btn-primary" whileHover={shouldReduceMotion ? {} : { scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>{Icons.grid} {hero.buttonPrimary}</motion.a>
          <motion.a href="#skills" className="btn btn-secondary" whileHover={shouldReduceMotion ? {} : { scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>{Icons.zap} {hero.buttonSecondary}</motion.a>
        </motion.div>
      </div>
    </section>
  )
}

function Stats() {
  const { staggerContainer, staggerItem, shouldReduceMotion } = useVariants()
  const { data } = usePortfolio()
  return (<motion.div className="stats" role="list" aria-label="Portfolio statistics" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}>{data.stats.map(stat => <motion.div key={stat.label} className="stat-card" role="listitem" variants={staggerItem} whileHover={shouldReduceMotion ? {} : { y: -4, boxShadow: '0 0 24px rgba(94, 234, 212, 0.15)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}><div className="stat-value">{stat.value}</div><div className="stat-label">{stat.label}</div></motion.div>)}</motion.div>)
}

function About() {
  const { fadeUp } = useVariants()
  const { data } = usePortfolio()
  const about = data.about
  return (
    <section id="about" className="section" aria-labelledby="about-title">
      <div className="section-header">
        <motion.h2 id="about-title" className="section-title" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5 }}>{about.title}</motion.h2>
        <motion.p className="section-subtitle" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5, delay: 0.1 }}>{about.subtitle}</motion.p>
      </div>
      <motion.div className="about-card" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5, delay: 0.15 }}><p dangerouslySetInnerHTML={{ __html: about.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} /></motion.div>
    </section>
  )
}

function Skills() {
  const { fadeUp, staggerContainer, staggerItem, shouldReduceMotion } = useVariants()
  const { data } = usePortfolio()
  return (
    <section id="skills" className="section" aria-labelledby="skills-title">
      <div className="section-header">
        <motion.h2 id="skills-title" className="section-title" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5 }}>Core Expertise</motion.h2>
        <motion.p className="section-subtitle" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5, delay: 0.1 }}>Key areas represented across the portfolio.</motion.p>
      </div>
      <motion.div className="skills-grid" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>{data.skills.map(skill => <motion.div key={skill.title} className="skill-card" variants={staggerItem} whileHover={shouldReduceMotion ? {} : { y: -4, borderColor: 'rgba(94, 234, 212, 0.35)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}><h3>{skill.title}</h3><p>{skill.desc}</p></motion.div>)}</motion.div>
    </section>
  )
}

function Certifications() {
  const { fadeUp, staggerContainer, staggerItem, shouldReduceMotion } = useVariants()
  const { data } = usePortfolio()
  return (
    <section id="certifications" className="section" aria-labelledby="certs-title">
      <div className="section-header">
        <motion.h2 id="certs-title" className="section-title" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5 }}>Professional Certifications</motion.h2>
        <motion.p className="section-subtitle" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5, delay: 0.1 }}>{data.certifications.length} certifications and professional credentials.</motion.p>
      </div>
      <motion.div className="cert-grid" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}>{data.certifications.map((cert, i) => <motion.div key={cert} className="cert-card" variants={staggerItem} whileHover={shouldReduceMotion ? {} : { y: -4, borderColor: 'rgba(94, 234, 212, 0.35)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}><div className="cert-number">CERTIFICATION {String(i + 1).padStart(2, '0')}</div><h3>{cert}</h3><p>{data.issuers[i % data.issuers.length]}</p></motion.div>)}</motion.div>
    </section>
  )
}

function Projects() {
  const { fadeUp, staggerContainer, staggerItem, shouldReduceMotion } = useVariants()
  const { data } = usePortfolio()
  const [selected, setSelected] = useState(null)
  const close = () => setSelected(null)
  useEffect(() => {
    if (!selected) return
    const onKey = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [selected])
  const transition = shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 30 }
  return (
    <section id="projects" className="section" aria-labelledby="projects-title">
      <div className="section-header">
        <motion.h2 id="projects-title" className="section-title" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5 }}>Featured Projects</motion.h2>
        <motion.p className="section-subtitle" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5, delay: 0.1 }}>{data.projects.length} featured creative projects.</motion.p>
      </div>
      <motion.div className="project-grid" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }}>{data.projects.map((project, i) => (
        <motion.button key={`${project.title}-${i}`} type="button" className="project-card project-card-btn" variants={staggerItem} onClick={() => setSelected(project)} whileHover={shouldReduceMotion ? {} : { y: -6, boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)' }} whileTap={shouldReduceMotion ? {} : { scale: 0.98 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} aria-label={`Open ${project.title}`}>
          <span className="project-tile-img-wrap">
            {project.image ? <img className="project-tile-img" src={project.image} alt={project.title} loading="lazy" layoutId={`project-img-${project.title}`} /> : <span className="project-tile-img project-tile-img-fallback" />}
          </span>
          <span className="project-card-body">
            <span className="project-number">{String(i + 1).padStart(2, '0')}</span>
            <span className="project-tile-meta">
              <span className="project-title">{project.title}</span>
              <span className="project-desc">{project.desc}</span>
              <span className="project-tags">{project.tags.map(tag => <span key={tag} className="project-tag">{tag}</span>)}</span>
            </span>
          </span>
        </motion.button>
      ))}</motion.div>
      <AnimatePresence>
        {selected && (
          <motion.div className="project-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} role="dialog" aria-modal="true" aria-label={selected.title}>
            <motion.div className="project-modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={transition} onClick={(e) => e.stopPropagation()}>
              {selected.image && <motion.img className="project-modal-img" layoutId={`project-img-${selected.title}`} src={selected.image} alt={selected.title} transition={transition} />}
              <div className="project-modal-body">
                <motion.h3 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.15, duration: 0.3 }}>{selected.title}</motion.h3>
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.22, duration: 0.3 }}>{selected.desc}</motion.p>
                <div className="project-tags">{selected.tags.map(tag => <span key={tag} className="project-tag">{tag}</span>)}</div>
                <button className="project-modal-close" type="button" onClick={close} aria-label="Close">×</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function Contact() {
  const { fadeUp, shouldReduceMotion } = useVariants()
  const { data } = usePortfolio()
  const contact = data.contact
  return (
    <section id="contact" className="section contact-section" aria-labelledby="contact-title">
      <motion.h2 id="contact-title" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5 }}>{contact.title}</motion.h2>
      <motion.p variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5, delay: 0.1 }}>{contact.description}</motion.p>
      <motion.div className="contact-buttons" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5, delay: 0.2 }}>
        <motion.a href={`mailto:${contact.email}`} className="btn btn-primary" aria-label="Send email to Anshed Beg" whileHover={shouldReduceMotion ? {} : { scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>{Icons.mail} Contact Me</motion.a>
        <motion.a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" aria-label="Visit LinkedIn profile (opens in new tab)" whileHover={shouldReduceMotion ? {} : { scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>{Icons.linkedin} LinkedIn</motion.a>
      </motion.div>
    </section>
  )
}

function Footer() {
  const { data } = usePortfolio()
  return <footer className="footer">{data.footer}</footer>
}

function AdminRoutes() {
  const { isAuthenticated } = usePortfolio()
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminDashboard />} />
      <Route path="/admin/login" element={<LoginPage />} />
    </Routes>
  )
}

function RedirectHandler() {
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    const redirect = sessionStorage.getItem('portfolio_redirect')
    if (redirect && redirect !== '/portfolio/') {
      sessionStorage.removeItem('portfolio_redirect')
      if (window.location.pathname === '/portfolio/' || window.location.pathname === '/') {
        navigate(redirect.replace(/^\/portfolio/, '') || '/')
      }
    }
  }, [navigate, location.pathname])
  return null
}

function PortfolioRoutes() {
  return (
    <>
      <RedirectHandler />
      <Routes>
        <Route path="/admin/*" element={<AdminRoutes />} />
        <Route path="/*" element={<PortfolioApp />} />
      </Routes>
    </>
  )
}

function PortfolioApp() {
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Navbar />
      <main id="main-content">
        <Hero />
        <Stats />
        <About />
        <Skills />
        <Certifications />
        <Projects />
        <Contact />
      </main>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <PortfolioProvider>
      <BrowserRouter>
        <PortfolioRoutes />
      </BrowserRouter>
    </PortfolioProvider>
  )
}