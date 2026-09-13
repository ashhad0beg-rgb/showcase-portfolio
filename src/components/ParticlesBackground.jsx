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
      // Mobile: dots only, ultra-light 60fps — no lines/hover (was laggy + animations blocked)
      const cfg = isCoarse
        ? {
            ...particlesConfig,
            particles: {
              ...particlesConfig.particles,
              number: { value: 22, density: { enable: true, value_area: 1200 } },
              size: { ...particlesConfig.particles.size, value: 1.5, random: true },
              opacity: { ...particlesConfig.particles.opacity, value: 0.6, random: true },
              move: { ...particlesConfig.particles.move, speed: 0.32, random: true },
              line_linked: { ...particlesConfig.particles.line_linked, enable: true, distance: 200, opacity: 0.5 },
            },
            interactivity: { detect_on: 'window', events: { onhover: { enable: true, mode: 'grab' }, onclick: { enable: true, mode: 'repulse' }, resize: true }, modes: { grab: { distance: 200, line_linked: { opacity: 1 } }, repulse: { distance: 200, duration: 0.4 } } },
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