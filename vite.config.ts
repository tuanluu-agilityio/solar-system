import { defineConfig } from 'vite';

// Single place to change the deploy base path (override with BASE_PATH).
export default defineConfig(({ command }) => ({
  base: command === 'build' ? (process.env.BASE_PATH ?? '/solar-system/') : '/',
}));
