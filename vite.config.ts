/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Pravaah runs 100% client-side so the demo can never break on a missing API.
export default defineConfig({
  // relative base so the build works both locally and on GitHub Pages (/pravaah/)
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
