import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // sanitize/clipboard 는 브라우저 DOM(document/window/ClipboardItem)이 필요하므로 jsdom 환경 사용.
    environment: 'jsdom',
    include: ['lib/**/__tests__/**/*.test.ts'],
  },
});
