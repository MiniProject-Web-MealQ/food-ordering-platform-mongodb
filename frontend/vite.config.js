import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/socket.io': { target: 'http://127.0.0.1:5000', changeOrigin: true, ws: true },
      // Catalogue images live next to the API in production; forward them in dev too.
      '/catalogue': { target: 'http://127.0.0.1:5000', changeOrigin: true },
    },
    allowedHosts: ['bid-depot-home-moore.trycloudflare.com', 'straight-percentage-polls-thriller.trycloudflare.com'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
