import { defineConfig } from 'vite';

// GitHub Pages serves the site from /<repo name>/, so the dev server and builds use that base path too.
export default defineConfig({
  base: '/mythology-clicker/',
});
