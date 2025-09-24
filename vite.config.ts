import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/reading-leaderboards-gas/',   // 一定要跟 repo 名稱相同
  build: { outDir: 'dist', emptyOutDir: true }
})
