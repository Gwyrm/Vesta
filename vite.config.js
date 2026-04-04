import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Nécessaire pour GitHub Pages : le site est servi sous /Vesta/
  base: '/Vesta/',
});
