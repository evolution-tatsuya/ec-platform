import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3247,
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
    rollupOptions: {
      output: {
        // node_modules を用途別に分割し、単一巨大チャンク（2.4MB）を解消する
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (id.includes('@mui/icons-material')) return 'mui-icons';
          if (id.includes('@mui/x-data-grid')) return 'mui-datagrid';
          if (id.includes('@mui/x-date-pickers')) return 'mui-datepickers';
          if (id.includes('@mui/material') || id.includes('@mui/system')) return 'mui-material';
          if (id.includes('@emotion')) return 'emotion';
          if (id.includes('recharts') || id.includes('d3-')) return 'recharts';
          if (id.includes('swiper')) return 'swiper';
          if (id.includes('@tanstack/react-query')) return 'react-query';
          if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) return 'forms';
          if (id.includes('date-fns')) return 'dates';
          if (id.includes('qrcode') || id.includes('html5-qrcode')) return 'qrcode';
          if (id.includes('axios')) return 'http';
          if (id.includes('zustand')) return 'state';
          if (id.includes('react-router')) return 'router';
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react-base';
          return 'vendor';
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
})
