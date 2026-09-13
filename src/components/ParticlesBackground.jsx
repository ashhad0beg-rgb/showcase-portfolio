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
    let cleanupTouch = null
    try {
      if (!Array.isArray(window.pJSDom)) window.pJSDom = []
      // Mobile: fewer dots for 60fps, but keep grab+repulse so touch stays interactive.
      // detect_on window: canvas has pointer-events:none (buttons stay tappable), window still gets the events.
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
      // Touch bridge: this particles.js build only listens to mousemove/click,
      // so feed finger position into its mouse state — drag = hover-grab, tap = repulse.
      const pJS = entry && entry.pJS
      if (pJS) {
        const setPos = (cx, cy) => {
          const canvas = pJS.canvas && pJS.canvas.el
          if (!canvas) return
          const rect = canvas.getBoundingClientRect()
          let x = cx - rect.left
          let y = cy - rect.top
          if (pJS.tmp.retina) {
            x *= pJS.canvas.pxratio
            y *= pJS.canvas.pxratio
          }
          pJS.interactivity.mouse.pos_x = x
          pJS.interactivity.mouse.pos_y = y
          pJS.interactivity.status = 'mousemove'
        }
        const onTouchStart = (e) => {
          const t = e.touches && e.touches[0]
          if (t) setPos(t.clientX, t.clientY)
        }
        const onTouchMove = (e) => {
          const t = e.touches && e.touches[0]
          if (t) setPos(t.clientX, t.clientY)
        }
        const onTouchEnd = () => {
          pJS.interactivity.mouse.pos_x = null
          pJS.interactivity.mouse.pos_y = null
          pJS.interactivity.status = 'mouseleave'
        }
        window.addEventListener('touchstart', onTouchStart, { passive: true })
        window.addEventListener('touchmove', onTouchMove, { passive: true })
        window.addEventListener('touchend', onTouchEnd)
        cleanupTouch = () => {
          window.removeEventListener('touchstart', onTouchStart)
          window.removeEventListener('touchmove', onTouchMove)
          window.removeEventListener('touchend', onTouchEnd)
        }
      }
    } catch {
      return
    }
    return () => {
      if (cleanupTouch) cleanupTouch()
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