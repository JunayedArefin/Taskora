import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Taskora - Productivity & Momentum',
        short_name: 'Taskora',
        description: 'Master your workflow with clarity and quiet momentum.',
        theme_color: '#fcf8ff',
        background_color: '#fcf8ff',
        display: 'standalone',
        icons: [
          {
            src: '/assets/Taskora_Icon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/assets/Taskora_Icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
});
