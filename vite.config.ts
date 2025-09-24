import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

# 如果存在 vite.config.js，刪掉避免重複 default export
git rm -f vite.config.js 2>/dev/null || true

cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 這裡要等於 repo 名稱
  base: '/reading-leaderboards-gas/',
  build: { outDir: 'dist', emptyOutDir: true }
})
