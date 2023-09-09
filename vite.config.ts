import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  build: {
    target: 'es2021'
  },
  plugins: [solid()]
});
