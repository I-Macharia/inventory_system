import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (
            id.includes('/node_modules/react') ||
            id.includes('/node_modules/react-dom') ||
            id.includes('/node_modules/react-router-dom')
          ) {
            return 'react-vendor';
          }

          if (id.includes('@tanstack/react-query')) {
            return 'query-vendor';
          }

          if (
            id.includes('recharts') ||
            id.includes('framer-motion') ||
            id.includes('three')
          ) {
            return 'visualization-vendor';
          }

          if (
            id.includes('jspdf') ||
            id.includes('html2canvas') ||
            id.includes('pdfjs-dist')
          ) {
            return 'pdf-vendor';
          }

          if (
            id.includes('@radix-ui') ||
            id.includes('lucide-react') ||
            id.includes('class-variance-authority') ||
            id.includes('tailwind-merge') ||
            id.includes('clsx') ||
            id.includes('cmdk') ||
            id.includes('date-fns') ||
            id.includes('lodash') ||
            id.includes('zod')
          ) {
            return 'ui-vendor';
          }

          return undefined;
        },
      },
    },
  },
})
