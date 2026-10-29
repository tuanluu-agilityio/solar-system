import { defineConfig } from 'vite';

// Single place to change the deploy base path (override with BASE_PATH).
// `vite preview` serves the built output, so it must use the build base too.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? (process.env.BASE_PATH ?? '/solar-system/') : '/',
}));
