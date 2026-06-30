import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ВАЖНО для GitHub Pages: base = '/<repo-name>/'.
// Замени 'pricing-churn-console' на реальное имя репозитория перед деплоем.
export default defineConfig({
  plugins: [react()],
  base: process.env.GHPAGES_BASE || '/3hcloud-pricing-churn-demo/',
})
