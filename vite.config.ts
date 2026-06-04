import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({mode}) => {
  // Load env variables from .env files
  const env = loadEnv(mode, '.', '');
  
  // AI Studio secrets are injected into process.env
  const CLOUD_NAME = process.env.VITE_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || env.VITE_CLOUDINARY_CLOUD_NAME || env.CLOUDINARY_CLOUD_NAME || '';
  const UPLOAD_PRESET = process.env.VITE_CLOUDINARY_UPLOAD_PRESET || process.env.CLOUDINARY_UPLOAD_PRESET || env.VITE_CLOUDINARY_UPLOAD_PRESET || env.CLOUDINARY_UPLOAD_PRESET || '';
  const GEMINI_KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '';

  console.log('--- Cloudinary Build Config ---');
  console.log('CLOUD_NAME:', CLOUD_NAME ? 'DETECTED' : 'MISSING');
  console.log('UPLOAD_PRESET:', UPLOAD_PRESET ? 'DETECTED' : 'MISSING');
  console.log('-------------------------------');

  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'CampusBF',
          short_name: 'CampusBF',
          description: 'CampusBF - Plateforme pour étudiants',
          theme_color: '#059669',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'https://api.dicebear.com/7.x/initials/svg?seed=CBF&backgroundColor=059669',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'https://api.dicebear.com/7.x/initials/svg?seed=CBF&backgroundColor=059669',
              sizes: '512x512',
              type: 'image/svg+xml'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 10000000, // 10MB to accommodate robust caching
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/],
          runtimeCaching: [
            {
              // Cache document navigation to allow viewing previously visited pages offline
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'pages-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 7 // Cache for 7 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              // Cache static assets securely using StaleWhileRevalidate strategy
              urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|svg|gif|json)$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'static-assets-cache',
                expiration: {
                  maxEntries: 150,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // Cache for 30 days
                }
              }
            },
            {
              urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'unsplash-images',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/api\.dicebear\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'dicebear-avatars',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(GEMINI_KEY),
      '__CLOUDINARY_CLOUD_NAME__': JSON.stringify(CLOUD_NAME),
      '__CLOUDINARY_UPLOAD_PRESET__': JSON.stringify(UPLOAD_PRESET),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
