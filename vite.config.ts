// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'esnext',
    minify: 'terser',
    assetsInlineLimit: 1024 * 1024,
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: undefined,
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]'
      }
    },
    sourcemap: false
  },
  base: './',
  server: {
    port: 5173,
    open: true,
    cors: true
  }
})