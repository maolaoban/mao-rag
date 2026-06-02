import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path, { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';
import dotenv from 'dotenv';

dotenv.config({
  path: path.resolve(__dirname, '../../.env')
})

const clientPort = parseInt(process.env.CLIENT_PORT);

const serverPort = parseInt(process.env.SERVER_PORT);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, '../shared/src'),
      '@client': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: clientPort,
    proxy: {
      '/api': {
        target: `http://localhost:${serverPort}`,
        changeOrigin: true,
      },
    },
    open: true
  }
})
