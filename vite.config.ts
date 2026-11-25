import { execSync } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

/** "2026-11-25 · 51bfe4a" for builds, "dev" for the dev server. Shown in Asetukset and compared with version.json. */
function buildVersion(command: string): string {
  if (command !== 'build') return 'dev';
  let sha = 'local';
  try {
    sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    /* not a git checkout */
  }
  return `${new Date().toISOString().slice(0, 10)} · ${sha}`;
}

/** Publishes version.json next to index.html; src/pwa.ts reads it (uncached) to spot a newer deploy. */
const versionFile = (version: string): Plugin => ({
  name: 'lounas-version-json',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) + '\n' });
  },
});

export default defineConfig(({ command }) => {
  const version = buildVersion(command);
  return {
    // Relative base so the build works on any static host (GitHub Pages sub-path, Netlify, Cloudflare Pages).
    base: './',
    define: { __APP_VERSION__: JSON.stringify(version) },
    plugins: [
      react(),
      tailwindcss(),
      versionFile(version),
      VitePWA({
        // 'prompt' = a new version waits until src/pwa.ts decides to apply it (right away, unless the user is typing).
        registerType: 'prompt',
        injectRegister: false, // registered in src/pwa.ts

        includeAssets: ['icon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Lounas – Tampere',
          short_name: 'Lounas',
          description: 'Lounaspaikat Tampereella – etäisyydet valitsemastasi lähtöpisteestä',
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
          // Must always come from the network, or the version check could never see a new deploy.
          globIgnores: ['version.json'],
        },
      }),
    ],
    server: { port: 5173 },
  };
});
