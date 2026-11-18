import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:3000' },
  },
  test: {
    projects: [
      // Lógica pura (dominio, scoring, helpers): Node, rápido.
      { extends: true, test: { name: 'unit', include: ['src/**/*.test.ts'], environment: 'node' } },
      // Componentes React: DOM simulado con happy-dom + Testing Library.
      {
        extends: true,
        test: { name: 'dom', include: ['src/**/*.test.tsx'], environment: 'happy-dom', setupFiles: ['src/web/test/setup.ts'] },
      },
    ],
  },
} as never)
