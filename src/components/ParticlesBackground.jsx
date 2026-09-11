import { useEffect, useId } from 'react'
import particlesConfig from '../data/particlesConfig.json'

function ParticlesBackground() {
  const rawId = useId()
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '')
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const isCoarse = window.matchMedia('(pointer: coarse)').matches
    const container = document.getElementById(id)
    if (!container) return
    let entry
    try {
      if (!Array.isArray(window.pJSDom)) window.pJSDom = []
      // Mobile: light spider web — 28 dots + faint lines, 60fps (no hover, retina off)
      const cfg = isCoarse
        ? {
            ...particlesConfig,
            particles: {
              ...particlesConfig.particles,
              number: { value: 32, density: { enable: true, value_area: 900 } },
              size: { ...particlesConfig.particles.size, value: 1.9, random: true },
              opacity: { ...particlesConfig.particles.opacity, value: 0.75 },
              move: { ...particlesConfig.particles.move, speed: 0.5, random: true },
              line_linked: { enable: true, distance: 110, color: '#ffffff', opacity: 0.18, width: 0.8 },
            },
            interactivity: {
              detect_on: 'canvas',
              events: { onhover: { enable: false }, onclick: { enable: false }, resize: true },
              modes: {},
            },
            retina_detect: false,
          }
        : particlesConfig
      window.particlesJS(id, cfg)
      entry = window.pJSDom[window.pJSDom.length - 1]
    } catch {
      return
    }
    return () => {
      if (!entry || !entry.pJS) return
      const canvas = entry.pJS.canvas && entry.pJS.canvas.el
      if (canvas && container.contains(canvas)) {
        entry.pJS.fn.vendors.destroypJS()
      }
    }
  }, [id])
  return <div id={id} className="particles-background" aria-hidden="true" />
}

export default ParticlesBackground