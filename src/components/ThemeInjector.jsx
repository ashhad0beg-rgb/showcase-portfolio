import { useEffect } from 'react'
import { usePortfolio } from '../context/PortfolioContext.jsx'

const FONT_URL = (font) => `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, '+')}:wght@300;400;500;600;700;800;900&display=swap`

const LAYOUT_CONFIG = {
  compact: { spaceScale: 0.82, heroScale: 0.88, sectionScale: 0.85, label: 'Compact — denser, tighter' },
  default: { spaceScale: 1, heroScale: 1, sectionScale: 1, label: 'Default — balanced' },
  wide: { spaceScale: 1.18, heroScale: 1.08, sectionScale: 1.15, label: 'Wide — airier' },
  minimal: { spaceScale: 1.35, heroScale: 1.15, sectionScale: 1.3, label: 'Minimal — editorial whitespace' },
  // aliases for backward compat
  spacious: { spaceScale: 1.18, heroScale: 1.08, sectionScale: 1.15, label: 'Wide — airier' },
  cinematic: { spaceScale: 1.35, heroScale: 1.15, sectionScale: 1.3, label: 'Minimal — editorial' },
}

const RADIUS_CONFIG = {
  sharp: { lg: '4px', md: '2px', xl: '6px', full: '9999px' },
  default: { lg: '12px', md: '8px', xl: '16px', full: '9999px' },
  round: { lg: '20px', md: '12px', xl: '24px', full: '9999px' },
  rounded: { lg: '20px', md: '12px', xl: '24px', full: '9999px' },
  pill: { lg: '28px', md: '20px', xl: '32px', full: '9999px' },
}

function hexToRgb(hex) {
  const h = hex.replace('#', '').trim()
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const num = parseInt(full, 16)
  if (isNaN(num) || full.length !== 6) return null
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

export default function ThemeInjector() {
  const { data } = usePortfolio()
  const theme = data.theme || { fontDisplay: 'Poppins', fontBody: 'Open Sans', layout: 'default', accentColor: '#00ff88', borderRadius: 'default' }

  useEffect(() => {
    const root = document.documentElement

    // ---- Fonts ----
    const display = theme.fontDisplay || 'Poppins'
    const body = theme.fontBody || 'Open Sans'

    const ensureLink = (id, font) => {
      let link = document.getElementById(id)
      if (!link) {
        link = document.createElement('link')
        link.id = id
        link.rel = 'stylesheet'
        document.head.appendChild(link)
      }
      const desired = FONT_URL(font)
      if (link.getAttribute('href') !== desired) link.href = desired
    }
    ensureLink('theme-font-display', display)
    ensureLink('theme-font-body', body)

    // Apply font vars
    root.style.setProperty('--font-display', `'${display}', 'Helvetica Neue', system-ui, sans-serif`)
    root.style.setProperty('--font-body', `'${body}', 'Helvetica Neue', system-ui, sans-serif`)

    // ---- Accent color ----
    const accent = theme.accentColor || '#00ff88'
    root.style.setProperty('--color-accent', accent)
    root.style.setProperty('--color-focus', accent)
    const rgb = hexToRgb(accent)
    if (rgb) {
      root.style.setProperty('--color-accent-muted', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`)
      root.style.setProperty('--color-accent-dim', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`)
      root.style.setProperty('--color-border-hover', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`)
      root.style.setProperty('--shadow-glow', `0 0 30px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`)
    }

    // ---- Layout (spacing + hero + section) ----
    const layout = LAYOUT_CONFIG[theme.layout] || LAYOUT_CONFIG.default
    // Base spacing map from index.css
    const baseSpaces = {
      '1': 4, '2': 8, '3': 12, '4': 16, '5': 20, '6': 24, '7': 32, '8': 40, '9': 48, '10': 64, '12': 80, '16': 96, '20': 128, '24': 160,
    }
    Object.entries(baseSpaces).forEach(([k, v]) => {
      root.style.setProperty(`--space-${k}`, `${Math.round(v * layout.spaceScale)}px`)
    })
    // Hero size scaling — stretch clamp values proportionally
    // We override --text-hero directly to scaled value
    const heroScale = layout.heroScale
    // Recompute hero clamp: original clamp(4rem, 12vw, 10rem) -> scale rem part
    // Keep vw same, scale min and max
    const heroMin = (4 * heroScale).toFixed(2)
    const heroMax = (10 * heroScale).toFixed(2)
    root.style.setProperty('--text-hero', `clamp(${heroMin}rem, 12vw, ${heroMax}rem)`)

    // Keep body text stable, only headers affected via CSS if needed — we set a var for consumers
    root.style.setProperty('--layout-hero-scale', String(heroScale))
    root.style.setProperty('--layout-space-scale', String(layout.spaceScale))
    root.style.setProperty('--layout-section-scale', String(layout.sectionScale))

    // Apply data attribute for layout-specific CSS hooks
    root.setAttribute('data-layout', theme.layout || 'default')

    // ---- Border radius ----
    const radius = RADIUS_CONFIG[theme.borderRadius] || RADIUS_CONFIG.default
    root.style.setProperty('--radius-lg', radius.lg)
    root.style.setProperty('--radius-md', radius.md)
    root.style.setProperty('--radius-xl', radius.xl)
    root.style.setProperty('--radius-full', radius.full)

    // ---- Text scale if provided (optional) ----
    if (theme.textScale && theme.textScale !== 1) {
      root.style.setProperty('--text-scale', String(theme.textScale))
    } else {
      root.style.removeProperty('--text-scale')
    }
  }, [theme.fontDisplay, theme.fontBody, theme.layout, theme.accentColor, theme.borderRadius, theme.textScale])

  return null
}

export { FONT_URL, LAYOUT_CONFIG, RADIUS_CONFIG }
