import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { copyFileSync } from 'node:fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-404-for-spa',
      closeBundle() {
        try {
          copyFileSync('dist/index.html', 'dist/404.html')
          console.log('✓ SPA fallback: copied dist/index.html → dist/404.html')
        } catch {}
      },
    },
  ],
  base: '/showcase-portfolio/',
})