import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    // Escucha en todas las interfaces para que funcione dentro de Docker.
    host: true,
    port: 5173,
    strictPort: true,
    // En Docker sobre Windows los cambios de archivos no llegan como eventos;
    // con VITE_USE_POLLING=true Vite revisa los archivos periódicamente.
    watch: {
      usePolling: process.env.VITE_USE_POLLING === 'true',
    },
  },
});
