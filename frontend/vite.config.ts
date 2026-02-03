import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3249,
    hmr: {
      overlay: true,
    },
    headers: {
      'Cache-Control': 'no-store',
    },
  },
  optimizeDeps: {
    force: true,
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
})
