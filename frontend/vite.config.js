import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Verifie automatiquement les nouvelles versions a chaque visite plutot
      // que de servir indefiniment une version en cache (evite le classique
      // "je dois vider le cache pour voir la mise a jour").
      registerType: 'autoUpdate',
      // Active le service worker aussi avec "npm run dev" (desactive par
      // defaut) pour pouvoir tester le PWA sans faire un build a chaque fois.
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: "CrediSense — L'Intelligence Financière",
        short_name: 'CrediSense',
        description:
          "CrediSense — L'Intelligence Financière. Simulateur de crédit intelligent, comparateur d'offres FCFA et conseils IA.",
        theme_color: '#350B4C',
        background_color: '#350B4C',
        display: 'standalone',
        start_url: '/',
        lang: 'fr',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
})
