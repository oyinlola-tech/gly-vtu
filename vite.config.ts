import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('motion') || id.includes('lucide-react') || id.includes('class-variance-authority') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'ui-vendor';
            }
            if (id.includes('react-hook-form') || id.includes('input-otp')) {
              return 'form-vendor';
            }
            if (id.includes('recharts')) {
              return 'chart-vendor';
            }
            if (id.includes('date-fns')) {
              return 'date-vendor';
            }
            if (id.includes('react-slick') || id.includes('embla-carousel-react')) {
              return 'admin-vendor';
            }
            if (id.includes('pdfkit') || id.includes('qrcode')) {
              return 'heavy-vendor';
            }
            // Other node_modules go to vendor
            return 'vendor';
          }
        },
      },
    },
  },

  server: {
    proxy: {
      '/app': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
})
