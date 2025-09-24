import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ⚠️ 注意：這裡的 base 必須和你的 repo 名稱一致
// 你的 repo 是 "reading-leaderboards-gas"
export default defineConfig({
  plugins: [react()],
  base: '/reading-leaderboards-gas/', // 確保 GitHub Pages 不會出現白畫面
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
