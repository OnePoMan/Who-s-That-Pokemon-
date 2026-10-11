import { test as base, expect } from '@playwright/test';

// 1x1 transparent PNG, standing in for the official artwork.
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

/**
 * Every test runs hermetically: artwork and cries (raw.githubusercontent.com) are served locally and the
 * PeerJS broker is blocked, so nothing leaves the machine. Any other third-party request fails the test.
 */
export const test = base.extend<{ hermetic: void }>({
  hermetic: [
    async ({ page, baseURL }, use) => {
      const origin = new URL(baseURL!).origin;
      const unexpected: string[] = [];
      await page.route('https://raw.githubusercontent.com/**', (route) => {
        if (route.request().url().endsWith('.png')) return route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL });
        return route.fulfill({ status: 200, contentType: 'audio/ogg', body: '' });
      });
      await page.route(/peerjs\.com/, (route) => route.abort());
      await page.route(
        (url) => url.origin !== origin && url.protocol.startsWith('http') && !/raw\.githubusercontent\.com|peerjs\.com/.test(url.href),
        (route) => {
          unexpected.push(route.request().url());
          return route.abort();
        },
      );
      await use();
      expect(unexpected, 'unexpected external requests').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
