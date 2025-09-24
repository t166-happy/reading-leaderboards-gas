import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 一定要和你的 repo 名稱一致
export default defineConfig({
  plugins: [react()],
  base: '/reading-leaderboards-gas/',
  build: { outDir: 'dist', emptyOutDir: true }
})
