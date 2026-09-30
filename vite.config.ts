import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration Vite pour le développement local et mobile
export default defineConfig({
  plugins: [react()],
  server: {
    // Permet l'accès depuis le réseau local (téléphone Wi-Fi) et le port forwarding USB
    host: true,
    port: 5173,
    // Proxy inverse : redirige automatiquement /api vers Laravel (port 8000)
    // Permet aux smartphones et navigateurs distants d'appeler l'API sans configuration d'IP ni problème CORS
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

