// vite.config.ts
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  // 👇 ОБЯЗАТЕЛЬНО: расширения всех ассетов
  assetsInclude: [
    '**/*.glb', '**/*.gltf', '**/*.fbx', '**/*.bin',
    '**/*.mp3', '**/*.wav', '**/*.ogg',
    '**/*.hdr', '**/*.jpg', '**/*.jpeg', '**/*.png', '**/*.webp'
  ],
  
  plugins: [viteSingleFile()],
  
  build: {
    
    target: 'esnext',
    minify: 'terser',
    assetsInlineLimit: 10000,
    outDir: 'dist',
    assetsDir: '',
    rollupOptions: {
      output: {
        manualChunks: undefined,
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
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