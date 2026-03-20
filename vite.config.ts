import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  // Load env variables from .env files
  const env = loadEnv(mode, '.', '');
  
  // AI Studio secrets are injected into process.env
  const CLOUD_NAME = process.env.VITE_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || env.VITE_CLOUDINARY_CLOUD_NAME || env.CLOUDINARY_CLOUD_NAME || '';
  const UPLOAD_PRESET = process.env.VITE_CLOUDINARY_UPLOAD_PRESET || env.VITE_CLOUDINARY_UPLOAD_PRESET || '';
  const GEMINI_KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '';

  console.log('--- Cloudinary Build Config ---');
  console.log('CLOUD_NAME:', CLOUD_NAME ? 'DETECTED' : 'MISSING');
  console.log('UPLOAD_PRESET:', UPLOAD_PRESET ? 'DETECTED' : 'MISSING');
  console.log('-------------------------------');

  return {
    plugins: [react(), tailwindcss()],
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
