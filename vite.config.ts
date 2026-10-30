import { defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite';

export const GA_MEASUREMENT_ID = 'G-1YF8QBZ1GF';

// Google Analytics runs only on production deploys: `ANALYTICS=1` (set in deploy.yml) or a Netlify
// production build (`CONTEXT=production`). Dev, preview, CI, e2e and deploy previews stay offline.
export function analyticsEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.ANALYTICS === '1' || env.CONTEXT === 'production';
}

export function analyticsTags(id: string): HtmlTagDescriptor[] {
  return [
    {
      tag: 'script',
      attrs: { async: true, src: `https://www.googletagmanager.com/gtag/js?id=${id}` },
      injectTo: 'head',
    },
    {
      tag: 'script',
      children:
        'window.dataLayer = window.dataLayer || [];\n' +
        'function gtag() { dataLayer.push(arguments); }\n' +
        "gtag('js', new Date());\n" +
        `gtag('config', '${id}');`,
      injectTo: 'head',
    },
  ];
}

function analytics(): Plugin {
  return {
    name: 'sse-analytics',
    apply: 'build',
    transformIndexHtml: () =>
      analyticsEnabled(process.env) ? analyticsTags(GA_MEASUREMENT_ID) : [],
  };
}

// Single place to change the deploy base path (override with BASE_PATH).
// `vite preview` serves the built output, so it must use the build base too.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? (process.env.BASE_PATH ?? '/solar-system/') : '/',
  plugins: [analytics()],
}));
