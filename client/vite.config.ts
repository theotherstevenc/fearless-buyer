import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true },
  build: {
    rolldownOptions: {
      output: {
        // Vendor chunks stay cached across app deploys; Firestore alone is ~490 kB.
        codeSplitting: {
          groups: [
            { name: 'firestore', test: /node_modules[\\/]@firebase[\\/](firestore|webchannel-wrapper)[\\/]/ },
            { name: 'firebase', test: /node_modules[\\/](@firebase|firebase|idb)[\\/]/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'vendor', test: /node_modules[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
})
