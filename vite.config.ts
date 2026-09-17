import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'nojekyll',
      writeBundle() {
        writeFileSync(resolve(__dirname, 'dist', '.nojekyll'), '');
      },
    },
  ],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
});
