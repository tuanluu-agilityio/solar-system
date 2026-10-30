// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { analyticsEnabled, analyticsTags, GA_MEASUREMENT_ID } from '../../vite.config';

describe('analytics tag', () => {
  it('is enabled only for production deploys', () => {
    expect(analyticsEnabled({ ANALYTICS: '1' })).toBe(true);
    expect(analyticsEnabled({ CONTEXT: 'production' })).toBe(true);
    expect(analyticsEnabled({})).toBe(false);
    expect(analyticsEnabled({ CONTEXT: 'deploy-preview' })).toBe(false);
    expect(analyticsEnabled({ ANALYTICS: '0', CI: 'true' })).toBe(false);
  });

  it('loads gtag.js async and configures the measurement id', () => {
    const [loader, config] = analyticsTags(GA_MEASUREMENT_ID);
    expect(loader?.attrs).toEqual({
      async: true,
      src: 'https://www.googletagmanager.com/gtag/js?id=G-1YF8QBZ1GF',
    });
    expect(config?.children).toContain("gtag('config', 'G-1YF8QBZ1GF')");
  });
});
