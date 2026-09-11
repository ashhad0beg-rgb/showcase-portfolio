import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { PortfolioProvider, usePortfolio } from './context/PortfolioContext.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import ParticlesBackground from './components/ParticlesBackground.jsx'
import ThemeInjector from './components/ThemeInjector.jsx'
import './App.css'
import './admin/admin.css'

function useReduce() { return useReducedMotion() }

/* ====== CUSTOM CURSOR ====== */
function CustomCursor() {
  const reduced = useReduce()
  const dotRef = useRef(null)
  const ringRef = useRef(null)
  const wrapRef = useRef(null)
  const [vis, setVis] = useState(false)
  const [cursorType, setCursorType] = useState('')
  const mouse = useRef({ x: -100, y: -100 })
  const pos = useRef({ x: -100, y: -100 })
  useEffect(() => {
    if (reduced || window.matchMedia('(pointer: coarse)').matches) return
    const onM = (e) => { mouse.current = { x: e.clientX, y: e.clientY }; setVis(true) }
    const onE = () => setVis(true)
    const onL = () => setVis(false)
    const onOver = (e) => {
      const t = e.target
      if (!(t instanceof Element)) return
      if (t.closest('.work-item')) setCursorType('project')
      else if (t.closest('a, button, .btn, .service-item, .faq-question, .showreel-play')) setCursorType('hover')
      else setCursorType('')
    }
    const onOut = (e) => {
      const t = e.target
      if (!(t instanceof Element)) return
      if (!t.closest('a, button, .btn, .work-item, .service-item, .faq-question, .showreel-play')) setCursorType('')
    }
    window.addEventListener('mousemove', onM, { passive: true })
    document.addEventListener('mouseenter', onE)
    document.addEventListener('mouseleave', onL)
    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout', onOut)
    let raf
    const tick = () => {
      pos.current.x += (mouse.current.x - pos.current.x) * 0.15
      pos.current.y += (mouse.current.y - pos.current.y) * 0.15
      if (dotRef.current) dotRef.current.style.transform = `translate(${mouse.current.x - 4}px, ${mouse.current.y - 4}px)`
      if (ringRef.current) ringRef.current.style.transform = `translate(${pos.current.x - 20}px, ${pos.current.y - 20}px)`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { window.removeEventListener('mousemove', onM); document.removeEventListener('mouseenter', onE); document.removeEventListener('mouseleave', onL); document.removeEventListener('mouseover', onOver); document.removeEventListener('mouseout', onOut); cancelAnimationFrame(raf) }
  }, [reduced])
  if (reduced || (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches)) return null
  return (
    <div ref={wrapRef} className={`custom-cursor${cursorType ? ` cursor-${cursorType}` : ''}`} style={{ opacity: vis ? 1 : 0 }}>
      <div className="custom-cursor-dot" ref={dotRef} />
      <div className="custom-cursor-ring" ref={ringRef}><span className="custom-cursor-label">View</span></div>
    </div>
  )
}

/* ====== NAVBAR ====== */
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mob, setMob] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])
  const items = [{ href: '#work', l: 'Work' }, { href: '#services', l: 'Services' }, { href: '#about', l: 'About' }, { href: '#contact', l: 'Contact' }]
  return (
    <>
      <motion.nav className={`nav${scrolled ? ' scrolled' : ''}`} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
        <a href="#" className="nav-logo">Ashhad <span className="accent">Beg</span></a>
        <ul className="nav-links">{items.map(i => <li key={i.href}><a href={i.href}>{i.l}</a></li>)}</ul>
        <div className="nav-availability"><span className="nav-availability-dot" /> AVAILABLE FOR FREELANCE</div>
        <button className={`nav-toggle${mob ? ' open' : ''}`} onClick={() => setMob(!mob)} aria-label="Toggle menu"><span /><span /><span /></button>
      </motion.nav>
      <AnimatePresence>{mob && <motion.div className="nav-mobile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>{items.map(i => <a key={i.href} href={i.href} onClick={() => setMob(false)}>{i.l}</a>)}</motion.div>}</AnimatePresence>
    </>
  )
}

/* ====== HERO ====== */
function Hero() {
  const r = useReduce()
  const { data } = usePortfolio()
  const h = data.hero
  const lines = h.title.split('\n')
  return (
    <section className="hero" aria-label="Introduction">
      <ParticlesBackground />
      <motion.div className="hero-eyebrow" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>{h.eyebrow}</motion.div>
      <h1 className="hero-title">{lines.map((line, i) => (
        <span className="line" key={i}><motion.span className="word" initial={{ y: '110%', filter: 'blur(8px)' }} animate={{ y: 0, filter: 'blur(0px)' }} transition={r ? { duration: 0 } : { duration: 0.7, delay: 0.2 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}>{line}</motion.span></span>
      ))}</h1>
      <motion.p className="hero-desc" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={r ? { duration: 0 } : { duration: 0.5, delay: 0.7 }}>{h.description}</motion.p>
      <motion.div className="hero-buttons" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={r ? { duration: 0 } : { duration: 0.5, delay: 0.9 }}>
        <a href="#showreel" className="btn btn-primary">{h.buttonPrimary} <span className="btn-arrow">→</span></a>
        <a href="#contact" className="btn btn-outline">{h.buttonSecondary}</a>
      </motion.div>
      <motion.div className="hero-scroll" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={r ? { duration: 0 } : { duration: 0.5, delay: 1.2 }}>
        <span className="hero-scroll-line" /> SCROLL TO EXPLORE <span className="hero-scroll-arrow">↓</span>
      </motion.div>
    </section>
  )
}

/* ====== MARQUEE BANNER ====== */
function MarqueeBanner({ items, reverse }) {
  const doubled = [...items, ...items]
  return (
    <div className="marquee-banner">
      <div className={`marquee${reverse ? ' marquee-reverse' : ''}`}>{doubled.map((t, i) => <span className="marquee-item" key={i}>{t}<span className="dot" /></span>)}</div>
    </div>
  )
}

/* ====== SHOWREEL ====== */
function Showreel() {
  const r = useReduce()
  const { data } = usePortfolio()
  const s = data.showreel
  if (s.enabled === false) return null
  const [playing, setPlaying] = useState(false)
  return (
    <section id="showreel" className="showreel">
      <motion.div className="section-label" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>{s.label}</motion.div>
      <motion.h2 className="section-title" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={r ? { duration: 0 } : { duration: 0.6, delay: 0.1 }}>{s.title}</motion.h2>
      <motion.div className="showreel-player" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={r ? { duration: 0 } : { duration: 0.7, delay: 0.2 }}>
        {s.videoUrl && !playing ? (
          <>
            {s.posterUrl && <img src={s.posterUrl} alt="Showreel poster" />}
            <button className="showreel-play" onClick={() => setPlaying(true)} aria-label="Play showreel">▶</button>
          </>
        ) : s.videoUrl && playing ? (
          <video src={s.videoUrl} controls autoPlay />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(0,255,136,0.08), rgba(0,0,0,0.4))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)', letterSpacing: '2px', textTransform: 'uppercase' }}>Add showreel video in admin</span>
          </div>
        )}
      </motion.div>
      <div className="showreel-tags">{s.tags.map(t => <span className="showreel-tag" key={t}>{t}</span>)}</div>
    </section>
  )
}

/* ====== SELECTED WORK ====== */
function Work() {
  const r = useReduce()
  const { data } = usePortfolio()
  const [selected, setSelected] = useState(null)
  useEffect(() => {
    if (!selected) return
    const k = (e) => { if (e.key === 'Escape') setSelected(null) }
    document.addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [selected])
  return (
    <section id="work" className="work">
      <div className="work-header">
        <div>
          <motion.div className="section-label" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>PORTFOLIO</motion.div>
          <motion.h2 className="section-title" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={r ? { duration: 0 } : { duration: 0.6, delay: 0.1 }}>SELECTED WORK</motion.h2>
        </div>
      </div>
      <div className="work-grid">{data.work.map((p, i) => (
        <motion.div className="work-item" key={i} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={r ? { duration: 0 } : { duration: 0.6, delay: i * 0.05 }} onClick={() => setSelected(p)}>
          <div className="work-item-visual">{p.image ? <img src={p.image} alt={p.title} loading="lazy" /> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(0,255,136,0.06), var(--color-surface))' }} />}</div>
          <div className="work-item-info">
            <div className="work-item-category">{p.category}</div>
            <h3 className="work-item-title">{p.title}</h3>
            <div className="work-item-meta"><span>{p.client}</span><span>{p.year}</span><span>{p.role}</span></div>
            <div className="work-item-view">VIEW PROJECT <span className="btn-arrow">→</span></div>
          </div>
        </motion.div>
      ))}</div>
      <AnimatePresence>{selected && (
        <motion.div className="project-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} role="dialog" aria-modal="true" aria-label={selected.title}>
          <motion.div className="project-modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }} onClick={e => e.stopPropagation()}>
            {selected.image && <img className="project-modal-img" src={selected.image} alt={selected.title} />}
            <div className="project-modal-body">
              <div className="work-item-category" style={{ marginBottom: '12px' }}>{selected.category}</div>
              <h3>{selected.title}</h3>
              <p style={{ marginTop: '8px', fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>{selected.client} · {selected.year} · {selected.role}</p>
              <p>{selected.description}</p>
              <button className="project-modal-close" onClick={() => setSelected(null)} aria-label="Close">×</button>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
    </section>
  )
}

/* ====== SERVICES ====== */
function Services() {
  const r = useReduce()
  const { data } = usePortfolio()
  const [open, setOpen] = useState(null)
  return (
    <section id="services" className="services">
      <motion.div className="section-label" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>WHAT I DO</motion.div>
      <motion.h2 className="section-title" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={r ? { duration: 0 } : { duration: 0.6, delay: 0.1 }}>SERVICES</motion.h2>
      <div className="services-list">{data.services.map((s, i) => (
        <motion.div className={`service-item${open === i ? ' open' : ''}`} key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={r ? { duration: 0 } : { duration: 0.5, delay: i * 0.05 }} onClick={() => setOpen(open === i ? null : i)}>
          <div className="service-header"><span className="service-number">{s.number}</span><h3 className="service-name">{s.name}</h3></div>
          <div className="service-desc"><p>{s.description}</p></div>
        </motion.div>
      ))}</div>
    </section>
  )
}

/* ====== PROCESS ====== */
function Process() {
  const r = useReduce()
  const { data } = usePortfolio()
  return (
    <section id="process" className="process">
      <motion.div className="section-label" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>HOW I WORK</motion.div>
      <motion.h2 className="section-title" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={r ? { duration: 0 } : { duration: 0.6, delay: 0.1 }}>PROCESS</motion.h2>
      <div className="process-grid">{data.process.map((s, i) => (
        <motion.div className="process-step" key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={r ? { duration: 0 } : { duration: 0.5, delay: i * 0.08 }}>
          <div className="process-step-number">{s.number}</div>
          <h3 className="process-step-name">{s.name}</h3>
          <p className="process-step-desc">{s.description}</p>
        </motion.div>
      ))}</div>
    </section>
  )
}

/* ====== ABOUT ====== */
function About() {
  const r = useReduce()
  const { data } = usePortfolio()
  const a = data.about
  return (
    <section id="about" className="about">
      <motion.div className="section-label" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>ABOUT</motion.div>
      <div className="about-grid">
        <motion.div className="about-content" initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={r ? { duration: 0 } : { duration: 0.6 }}>
          <h2 className="section-title" style={{ marginBottom: '32px' }}>{a.title}</h2>
          <div className="highlight">{a.highlight}</div>
          <p>{a.content}</p>
          <div className="about-details">{a.details.map((d, i) => (
            <div className="about-detail" key={i}><span className="about-detail-label">{d.label}</span><span>{d.value}</span></div>
          ))}</div>
        </motion.div>
        <motion.div className="about-image" initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={r ? { duration: 0 } : { duration: 0.6, delay: 0.15 }}>
          {a.image ? <img src={a.image} alt="Portrait" /> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(0,255,136,0.06), var(--color-surface))' }} />}
        </motion.div>
      </div>
    </section>
  )
}

/* ====== TOOLS MARQUEE ====== */
function Tools() {
  const { data } = usePortfolio()
  const t = [...data.tools, ...data.tools]
  return (
    <section className="tools">
      <div className="tools-label">TOOLS I USE</div>
      <div className="marquee">{t.map((name, i) => <span className="marquee-item" key={i}>{name}<span className="dot" /></span>)}</div>
    </section>
  )
}

/* ====== EXPERIENCE ====== */
function Experience() {
  const r = useReduce()
  const { data } = usePortfolio()
  const layout = data.experienceLayout || 'timeline'
  const items = data.experience || []
  return (
    <section id="experience" className={`experience experience-${layout}`}>
      <motion.div className="section-label" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>EXPERIENCE</motion.div>
      <motion.h2 className="section-title" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={r ? { duration: 0 } : { duration: 0.6, delay: 0.1 }}>EXPERIENCE</motion.h2>
      {layout === 'cards' ? (
        <div className="experience-cards">{items.map((e, i) => {
          const company = e.company || e.client || ''
          const duration = e.duration || e.year || ''
          return (
            <motion.div className="experience-card" key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={r ? { duration: 0 } : { duration: 0.4, delay: i * 0.05 }}>
              <div className="experience-card-company">{company}</div>
              <div className="experience-card-duration">{duration}</div>
              <div className="experience-card-role">{e.role}</div>
              {e.responsibilities && <p className="experience-card-resp">{e.responsibilities}</p>}
            </motion.div>
          )
        })}</div>
      ) : layout === 'list' ? (
        <div className="experience-list">{items.map((e, i) => {
          const company = e.company || e.client || ''
          const duration = e.duration || e.year || ''
          return (
            <motion.div className="experience-item" key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={r ? { duration: 0 } : { duration: 0.4, delay: i * 0.05 }}>
              <span className="experience-year">{duration}</span>
              <span className="experience-role">{e.role}</span>
              <span className="experience-client">{company}</span>
            </motion.div>
          )
        })}</div>
      ) : (
        <div className="experience-timeline">{items.map((e, i) => {
          const company = e.company || e.client || ''
          const duration = e.duration || e.year || ''
          return (
            <motion.div className="experience-timeline-item" key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={r ? { duration: 0 } : { duration: 0.4, delay: i * 0.05 }}>
              <div className="experience-timeline-dot" />
              <div className="experience-timeline-content">
                <div className="experience-timeline-header"><span className="experience-timeline-company">{company}</span><span className="experience-timeline-duration">{duration}</span></div>
                <div className="experience-timeline-role">{e.role}</div>
                {e.responsibilities && <p className="experience-timeline-resp">{e.responsibilities}</p>}
              </div>
            </motion.div>
          )
        })}</div>
      )}
    </section>
  )
}

/* ====== TESTIMONIALS ====== */
function Testimonials() {
  const r = useReduce()
  const { data } = usePortfolio()
  const [idx, setIdx] = useState(0)
  const t = data.testimonials
  useEffect(() => {
    if (t.length <= 1) return
    const id = setInterval(() => setIdx(i => (i + 1) % t.length), 6000)
    return () => clearInterval(id)
  }, [t.length])
  if (!t.length) return null
  return (
    <section className="testimonials">
      <motion.div className="section-label" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>TESTIMONIALS</motion.div>
      <AnimatePresence mode="wait">
        <motion.div key={idx} className="testimonials-quote" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={r ? { duration: 0 } : { duration: 0.5 }}>
          {t[idx].quote}
          <div className="testimonials-author"><strong>{t[idx].author}</strong> — {t[idx].company}</div>
        </motion.div>
      </AnimatePresence>
    </section>
  )
}

/* ====== FAQ ====== */
function Faq() {
  const r = useReduce()
  const { data } = usePortfolio()
  const [open, setOpen] = useState(null)
  return (
    <section id="faq" className="faq">
      <motion.div className="section-label" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>FAQ</motion.div>
      <motion.h2 className="section-title" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={r ? { duration: 0 } : { duration: 0.6, delay: 0.1 }}>QUESTIONS</motion.h2>
      <div className="faq-list">{data.faq.map((f, i) => (
        <motion.div className={`faq-item${open === i ? ' open' : ''}`} key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={r ? { duration: 0 } : { duration: 0.4, delay: i * 0.04 }}>
          <button className="faq-question" onClick={() => setOpen(open === i ? null : i)}><span>{f.question}</span><span className="faq-icon">+</span></button>
          <div className="faq-answer"><p>{f.answer}</p></div>
        </motion.div>
      ))}</div>
    </section>
  )
}

/* ====== CONTACT / FINAL CTA ====== */
function Contact() {
  const r = useReduce()
  const { data } = usePortfolio()
  const c = data.contact
  return (
    <section id="contact" className="contact">
      <motion.div className="contact-label" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>{c.label}</motion.div>
      <motion.h2 className="contact-title" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={r ? { duration: 0 } : { duration: 0.6, delay: 0.1 }}>{c.title}</motion.h2>
      <motion.div className="contact-subtitle" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={r ? { duration: 0 } : { duration: 0.6, delay: 0.2 }}>{c.subtitle}</motion.div>
      <motion.div className="contact-buttons" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={r ? { duration: 0 } : { duration: 0.5, delay: 0.35 }}>
        <a href={`mailto:${c.email}`} className="btn btn-primary">{c.buttonPrimary} <span className="btn-arrow">→</span></a>
        <a href={`mailto:${c.email}`} className="btn btn-outline">EMAIL ME</a>
      </motion.div>
      <motion.div className="contact-social" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={r ? { duration: 0 } : { duration: 0.5, delay: 0.5 }}>
        {c.social.map(s => <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a>)}
      </motion.div>
    </section>
  )
}

/* ====== FOOTER ====== */
function Footer() {
  const { data } = usePortfolio()
  const f = data.footer
  return (
    <footer className="footer">
      <div>{f.name} — {f.role}</div>
      <div>{f.availability}</div>
      <a href="#" className="footer-back-top">BACK TO TOP ↑</a>
      <div>{f.copyright}</div>
    </footer>
  )
}

/* ====== MARQUEES ====== */
const row1 = ['VIDEO EDITING', 'MOTION DESIGN', 'VISUAL STORYTELLING', 'CREATIVE DIRECTION']
const row2 = ['EDITING', 'ANIMATION', 'BRANDING', 'COLOR GRADING', 'TYPOGRAPHY']

/* ====== PORTFOLIO SITE ====== */
function PortfolioSite() {
  return (
    <>
      <CustomCursor />
      <Navbar />
      <main>
        <Hero />
        <MarqueeBanner items={row1} />
        <Showreel />
        <Work />
        <Services />
        <Process />
        <About />
        <Tools />
        <Experience />
        <MarqueeBanner items={row2} reverse />
        <Testimonials />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  )
}

/* ====== ADMIN ROUTES ====== */
function AdminRoutes() {
  const { isAuthenticated } = usePortfolio()
  if (isAuthenticated) {
    return (
      <Routes>
        <Route path="login" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<AdminDashboard />} />
      </Routes>
    )
  }
  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  )
}

/* ====== REDIRECT HANDLER ====== */
// Fallback for old 404.html redirect (kept for cached GH Pages 404). New deployments use 404.html = index.html so this is rarely needed.
function RedirectHandler() {
  const nav = useNavigate()
  const loc = useLocation()
  useEffect(() => {
    try {
      const redirect = sessionStorage.getItem('portfolio_redirect')
      if (!redirect) return
      sessionStorage.removeItem('portfolio_redirect')
      const base = '/showcase-portfolio'
      if (!redirect.startsWith(base)) return
      const target = redirect.slice(base.length) || '/'
      // basename stripped: at root loc.pathname === '/'
      if (loc.pathname === '/' || loc.pathname === '') {
        nav(target, { replace: true })
      }
    } catch {}
  }, [nav, loc.pathname])
  return null
}

/* ====== THEMED SHELL (applies font & layout globally) ====== */
function ThemedShell() {
  return (
    <>
      <ThemeInjector />
      <BrowserRouter basename="/showcase-portfolio">
        <RedirectHandler />
        <Routes>
          <Route path="/admin/*" element={<AdminRoutes />} />
          <Route path="/*" element={<PortfolioSite />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

/* ====== APP ====== */
function App() {
  return (
    <PortfolioProvider>
      <ThemedShell />
    </PortfolioProvider>
  )
}

export default App
