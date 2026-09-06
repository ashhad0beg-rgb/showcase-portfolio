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
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@supabase')) return 'supabase'
          if (id.includes('node_modules/react') || id.includes('node_modules/framer-motion') || id.includes('node_modules/react-router')) return 'vendor'
        },
      },
    },
  },
})