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
      // Mobile: lighter config for performance + visible spider effect
      const cfg = isCoarse
        ? {
            ...particlesConfig,
            particles: {
              ...particlesConfig.particles,
              number: { value: 55, density: { enable: true, value_area: 700 } },
              size: { ...particlesConfig.particles.size, value: 2.2 },
              move: { ...particlesConfig.particles.move, speed: 0.6 },
              line_linked: { ...particlesConfig.particles.line_linked, enable: true, distance: 120, opacity: 0.25, width: 1 },
            },
            interactivity: {
              ...particlesConfig.interactivity,
              events: {
                ...particlesConfig.interactivity.events,
                onhover: { enable: true, mode: 'grab' },
                onclick: { enable: true, mode: 'push' },
              },
            },
          }
        : particlesConfig
      // enable spider lines on mobile too (grab)
      if (isCoarse) cfg.particles.line_linked.enable = true
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