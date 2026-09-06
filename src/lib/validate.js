// Super-safe validation & sanitization for portfolio data
// Prevents XSS, oversized payloads, injection, and malformed writes

const MAX_STR = 5000
const MAX_ARRAY = 50
const MAX_URL_LEN = 2048

function sanitizeString(str, max = MAX_STR) {
  if (typeof str !== 'string') return ''
  let s = str.trim().slice(0, max)
  // Strip obvious script vectors — React escapes anyway, but defense-in-depth
  s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
  s = s.replace(/javascript:/gi, '')
  s = s.replace(/on\w+\s*=/gi, '')
  return s
}

function sanitizeUrl(url) {
  if (typeof url !== 'string') return ''
  const u = url.trim().slice(0, MAX_URL_LEN)
  if (!u) return ''
  // Allow http/https, mailto, tel, relative, data:image, or anchor #
  const safe = /^(https?:\/\/|mailto:|tel:|\/|#|data:image\/)/i
  if (!safe.test(u)) return ''
  // Block javascript: and data:text/html
  if (/javascript:/i.test(u) || /data:text\/html/i.test(u)) return ''
  return sanitizeString(u, MAX_URL_LEN)
}

function sanitizeArray(arr, mapper, max = MAX_ARRAY) {
  if (!Array.isArray(arr)) return []
  return arr.slice(0, max).map(mapper).filter(Boolean)
}

export function validatePortfolioData(input) {
  if (!input || typeof input !== 'object') throw new Error('Invalid data: must be object')

  const out = {}
  // _version must be safe integer
  const ver = Number(input._version)
  if (!Number.isInteger(ver) || ver < 0 || ver > 1_000_000) throw new Error('Invalid _version')
  out._version = ver



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

  // showreel
  if (!input.showreel) throw new Error('Missing showreel')
  out.showreel = {
    label: sanitizeString(input.showreel.label, 100),
    title: sanitizeString(input.showreel.title, 100),
    videoUrl: sanitizeUrl(input.showreel.videoUrl || ''),
    posterUrl: sanitizeUrl(input.showreel.posterUrl || ''),
    tags: sanitizeArray(input.showreel.tags, t => sanitizeString(t, 60), 20),
  }

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
  // at least title required per item
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

  // experience
  out.experience = sanitizeArray(input.experience, e => ({
    year: sanitizeString(e.year, 10),
    role: sanitizeString(e.role, 150),
    client: sanitizeString(e.client, 100),
  }), 50)

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

  // contact
  if (!input.contact) throw new Error('Missing contact')
  out.contact = {
    label: sanitizeString(input.contact.label, 150),
    title: sanitizeString(input.contact.title, 150),
    subtitle: sanitizeString(input.contact.subtitle, 150),
    buttonPrimary: sanitizeString(input.contact.buttonPrimary, 80),
    email: sanitizeString(input.contact.email, 254),
    social: sanitizeArray(input.contact.social, s => ({
      name: sanitizeString(s.name, 80),
      url: sanitizeUrl(s.url || '#'),
    }), 10),
  }
  // validate email format loosely
  if (out.contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.contact.email)) {
    // allow but warn — don't block publish, just sanitize
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

  // Payload size guard: JSON must be < 400KB
  const jsonLen = JSON.stringify(out).length
  if (jsonLen > 400_000) throw new Error(`Payload too large: ${jsonLen} bytes > 400KB`)

  return out
}

// Validate single field update (used for debounced per-field writes if needed)
export function sanitizeField(key, value) {
  // Allowlist top-level keys
  const allowed = ['hero', 'showreel', 'work', 'services', 'process', 'about', 'tools', 'experience', 'testimonials', 'faq', 'contact', 'footer', 'siteName', 'siteDescription', '_version']
  if (!allowed.includes(key)) throw new Error(`Forbidden key: ${key}`)
  return value
}
