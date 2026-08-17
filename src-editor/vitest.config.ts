import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    // The app resolves "@/..." through tsconfig paths; this config does not read vite.config.ts,
    // so a test importing a module that uses the alias needs it repeated here.
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    test: {
        environment: 'jsdom',
        include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
        globals: true,
    },
});
