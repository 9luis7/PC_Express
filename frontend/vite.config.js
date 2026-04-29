import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// VITE_API_URL é exposto automaticamente pelo Vite via import.meta.env
// (qualquer var prefixada com VITE_). Sem define hack.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0', // Permite acesso externo (Docker)
    open: false,
    watch: {
      usePolling: true // Necessário para Docker
    }
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
});
