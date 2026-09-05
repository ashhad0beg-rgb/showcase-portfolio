import { useEffect, useId } from 'react'
import 'particles.js'
import particlesConfig from '../data/particlesConfig.json'

function ParticlesBackground() {
  const rawId = useId()
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '')
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(pointer: coarse)').matches) return
    const container = document.getElementById(id)
    if (!container) return
    let entry
    try {
      if (!Array.isArray(window.pJSDom)) window.pJSDom = []
      window.particlesJS(id, particlesConfig)
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