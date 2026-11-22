import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative base so the build works on any static host (GitHub Pages sub-path, Netlify, Cloudflare Pages).
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt' = a new version waits until src/pwa.ts decides to apply it (right away, unless the user is typing).
      registerType: 'prompt',
      injectRegister: false, // registered in src/pwa.ts

      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Lounas – Tampere',
        short_name: 'Lounas',
        description: 'Lounaspaikat Tampereen keskustassa Kehräsaaresta katsottuna',
        lang: 'fi',
        start_url: '.',
        display: 'standalone',
        background_color: '#FBF7F2',
        theme_color: '#C8364A',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
      },
    }),
  ],
  server: { port: 5173 },
});
