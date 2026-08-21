import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        websiteRedesign: resolve(rootDir, 'website-redesign.html'),
      },
    },
  },
  optimizeDeps: {
    entries: ['index.html', 'website-redesign.html'],
  },
})
