import { describe, expect, it } from 'vitest';
import { getLayout } from '../../src/ui/layout';

describe('getLayout', () => {
  it('phone portrait is mobile', () => expect(getLayout(390, 844)).toBe('mobile'));
  it('tablet portrait is mobile', () => expect(getLayout(1024, 1366)).toBe('mobile'));
  it('desktop landscape is desktop', () => expect(getLayout(1440, 900)).toBe('desktop'));
  it('narrow width is mobile', () => expect(getLayout(767, 500)).toBe('mobile'));
});
