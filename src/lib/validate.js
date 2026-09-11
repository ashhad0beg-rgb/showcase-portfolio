// Super-safe validation & sanitization for portfolio data — Supabase edition
// Prevents XSS, oversized payloads, injection, and malformed writes
// Free-tier safe: payload <400KB, array caps, URL allowlist

const MAX_STR = 5000
const MAX_ARRAY = 50
const MAX_URL_LEN = 2048

function sanitizeString(str, max = MAX_STR) {
  if (typeof str !== 'string') return ''
  let s = str.trim().slice(0, max)
  s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
  s = s.replace(/javascript:/gi, '')
  s = s.replace(/on\w+\s*=/gi, '')
  return s
}

function sanitizeUrl(url) {
  if (typeof url !== 'string') return ''
  const u = url.trim().slice(0, MAX_URL_LEN)
  if (!u) return ''
  const safe = /^(https?:\/\/|mailto:|tel:|\/|#|data:image\/)/i
  if (!safe.test(u)) return ''
  if (/javascript:/i.test(u) || /data:text\/html/i.test(u)) return ''
  return sanitizeString(u, MAX_URL_LEN)
}

function sanitizeArray(arr, mapper, max = MAX_ARRAY) {
  if (!Array.isArray(arr)) return []
  return arr.slice(0, max).map(mapper).filter(Boolean)
}

const ALLOWED_FONTS = [
  'Poppins', 'Open Sans', 'Inter', 'Roboto', 'Playfair Display', 'Montserrat',
  'Space Grotesk', 'Outfit', 'DM Sans', 'Manrope', 'JetBrains Mono', 'Syne'
]
const ALLOWED_LAYOUTS = ['default', 'compact', 'wide', 'minimal']
const ALLOWED_RADIUS = ['default', 'sharp', 'round', 'pill']
const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export function validatePortfolioData(input) {
  if (!input || typeof input !== 'object') throw new Error('Invalid data: must be object')

  const out = {}
  const ver = Number(input._version)
  if (!Number.isInteger(ver) || ver < 0 || ver > 1_000_000) throw new Error('Invalid _version')
  out._version = ver

  // theme — optional but validated if present (v6)
  if (input.theme && typeof input.theme === 'object') {
    const t = input.theme
    const fontDisplay = sanitizeString(t.fontDisplay, 40)
    const fontBody = sanitizeString(t.fontBody, 40)
    out.theme = {
      fontDisplay: ALLOWED_FONTS.includes(fontDisplay) ? fontDisplay : 'Poppins',
      fontBody: ALLOWED_FONTS.includes(fontBody) ? fontBody : 'Open Sans',
      layout: ALLOWED_LAYOUTS.includes(t.layout) ? t.layout : 'default',
      accentColor: HEX_COLOR.test(String(t.accentColor || '').trim()) ? String(t.accentColor).trim().toLowerCase() : '#00ff88',
      borderRadius: ALLOWED_RADIUS.includes(t.borderRadius) ? t.borderRadius : 'default',
    }
  } else {
    out.theme = {
      fontDisplay: 'Poppins',
      fontBody: 'Open Sans',
      layout: 'default',
      accentColor: '#00ff88',
      borderRadius: 'default',
    }
  }

  // hero
  if (!input.hero || typeof input.hero !== 'object') throw new Error('Missing hero')
  out.hero = {
    eyebrow: sanitizeString(input.hero.eyebrow, 120),
    title: sanitizeString(input.hero.title, 500),
    description: sanitizeString(input.hero.description, 1000),
    buttonPrimary: sanitizeString(input.hero.buttonPrimary, 80),
    buttonSecondary: sanitizeString(input.hero.buttonSecondary, 80),
    image: sanitizeUrl(input.hero.image || ''),
  }
  if (!out.hero.title) throw new Error('hero.title required')

  // showreel — enabled toggle (also synced with visibility.showreel)
  if (!input.showreel) throw new Error('Missing showreel')
  out.showreel = {
    enabled: input.showreel.enabled !== false,
    label: sanitizeString(input.showreel.label, 100),
    title: sanitizeString(input.showreel.title, 100),
    videoUrl: sanitizeUrl(input.showreel.videoUrl || ''),
    posterUrl: sanitizeUrl(input.showreel.posterUrl || ''),
    tags: sanitizeArray(input.showreel.tags, t => sanitizeString(t, 60), 20),
  }
  // visibility — toggles for each section (top of admin page)
  const visKeys = ['hero','showreel','work','services','process','about','tools','experience','education','testimonials','faq','contact']
  out.visibility = {}
  for (const k of visKeys) {
    let v = true
    if (input.visibility && typeof input.visibility[k] === 'boolean') v = input.visibility[k]
    else if (k === 'showreel' && typeof input.showreel?.enabled === 'boolean') v = input.showreel.enabled
    out.visibility[k] = v
  }
  out.showreel.enabled = out.visibility.showreel

  // work
  out.work = sanitizeArray(input.work, p => {
    if (!p || typeof p !== 'object') return null
    return {
      title: sanitizeString(p.title, 120),
      client: sanitizeString(p.client, 100),
      year: sanitizeString(p.year, 10),
      role: sanitizeString(p.role, 120),
      category: sanitizeString(p.category, 80),
      image: sanitizeUrl(p.image || ''),
      description: sanitizeString(p.description, 2000),
    }
  }, 50)
  out.work = out.work.filter(w => w.title)

  // services
  out.services = sanitizeArray(input.services, s => ({
    number: sanitizeString(s.number, 10),
    name: sanitizeString(s.name, 120),
    description: sanitizeString(s.description, 2000),
  }), 20)

  // process
  out.process = sanitizeArray(input.process, s => ({
    number: sanitizeString(s.number, 10),
    name: sanitizeString(s.name, 120),
    description: sanitizeString(s.description, 1000),
  }), 20)

  // about
  if (!input.about) throw new Error('Missing about')
  out.about = {
    title: sanitizeString(input.about.title, 300),
    highlight: sanitizeString(input.about.highlight, 300),
    content: sanitizeString(input.about.content, 5000),
    image: sanitizeUrl(input.about.image || ''),
    details: sanitizeArray(input.about.details, d => ({
      label: sanitizeString(d.label, 60),
      value: sanitizeString(d.value, 200),
    }), 20),
  }

  // tools
  out.tools = sanitizeArray(input.tools, t => sanitizeString(t, 80), 30)

  // experience — supports new: company, duration, responsibilities + layout; keeps year/client compat
  out.experience = sanitizeArray(input.experience, e => ({
    company: sanitizeString(e.company || e.client || '', 100),
    duration: sanitizeString(e.duration || e.year || '', 40),
    role: sanitizeString(e.role, 150),
    responsibilities: sanitizeString(e.responsibilities || '', 2000),
    // legacy kept for old data
    year: sanitizeString(e.year || e.duration || '', 10),
    client: sanitizeString(e.client || e.company || '', 100),
  }), 50)
  out.experienceLayout = ['timeline', 'cards', 'list'].includes(input.experienceLayout) ? input.experienceLayout : (input.experienceLayout === 'compact' ? 'list' : 'timeline')
  out.education = sanitizeArray(input.education, e => ({
    institution: sanitizeString(e.institution, 150),
    degree: sanitizeString(e.degree, 150),
    duration: sanitizeString(e.duration, 40),
    details: sanitizeString(e.details || e.description || '', 2000),
  }), 20)

  // testimonials
  out.testimonials = sanitizeArray(input.testimonials, t => ({
    quote: sanitizeString(t.quote, 2000),
    author: sanitizeString(t.author, 120),
    company: sanitizeString(t.company, 120),
  }), 20)

  // faq
  out.faq = sanitizeArray(input.faq, f => ({
    question: sanitizeString(f.question, 500),
    answer: sanitizeString(f.answer, 3000),
  }), 30)

  // contact — with custom actions (label+url) that redirect on click
  if (!input.contact) throw new Error('Missing contact')
  out.contact = {
    label: sanitizeString(input.contact.label, 150),
    title: sanitizeString(input.contact.title, 150),
    subtitle: sanitizeString(input.contact.subtitle, 150),
    buttonPrimary: sanitizeString(input.contact.buttonPrimary, 80),
    email: sanitizeString(input.contact.email, 254),
    actions: sanitizeArray(input.contact.actions || [], a => {
      if (!a || typeof a !== 'object') return null
      const label = sanitizeString(a.label, 60)
      const url = sanitizeUrl(a.url || '')
      if (!label || !url) return null
      return { label, url }
    }, 10),
    social: sanitizeArray(input.contact.social, s => ({
      name: sanitizeString(s.name, 80),
      url: sanitizeUrl(s.url || '#'),
    }), 10),
  }

  // footer
  if (!input.footer) throw new Error('Missing footer')
  out.footer = {
    name: sanitizeString(input.footer.name, 120),
    role: sanitizeString(input.footer.role, 150),
    availability: sanitizeString(input.footer.availability, 300),
    copyright: sanitizeString(input.footer.copyright, 300),
  }

  out.siteName = sanitizeString(input.siteName, 150)
  out.siteDescription = sanitizeString(input.siteDescription, 300)

  const jsonLen = JSON.stringify(out).length
  if (jsonLen > 400_000) throw new Error(`Payload too large: ${jsonLen} bytes > 400KB`)

  return out
}

export function sanitizeField(key, value) {
  const allowed = ['hero', 'showreel', 'work', 'services', 'process', 'about', 'tools', 'experience', 'experienceLayout', 'education', 'visibility', 'testimonials', 'faq', 'contact', 'footer', 'siteName', 'siteDescription', '_version', 'theme']
  if (!allowed.includes(key)) throw new Error(`Forbidden key: ${key}`)
  return value
}
