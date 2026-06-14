import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
            if (id.includes('zustand')) return 'vendor-state';
            if (id.includes('lucide-react') || id.includes('motion') || id.includes('framer-motion')) return 'vendor-ui';
            if (id.includes('react-simple-maps') || id.includes('d3-') || id.includes('topojson')) return 'vendor-maps';
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify') || id.includes('papaparse')) return 'vendor-docs';
            if (id.includes('socket.io-client') || id.includes('engine.io-client')) return 'vendor-realtime';
            return 'vendor';
          },
        },
      },
      chunkSizeWarningLimit: 900,
    },
  };
});
