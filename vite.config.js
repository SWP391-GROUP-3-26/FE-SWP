import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { basename } from 'node:path'

// Each standalone Vite test starts its own server, sometimes alongside the dev server.
const entry = process.argv[1] || ''
const isTestRunner = /[\\/]tests[\\/].+\.mjs$/.test(entry)

export default defineConfig({
  cacheDir: isTestRunner ? `node_modules/.vite-tests/${basename(entry, '.mjs')}` : 'node_modules/.vite',
  plugins: [react()],
})
