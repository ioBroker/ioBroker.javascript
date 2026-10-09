import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    // The app resolves "@/..." through tsconfig paths; this config does not read vite.config.ts,
    // so a test importing a module that uses the alias needs it repeated here.
    resolve: {
        alias: [
            { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
            { find: '@fb-core', replacement: fileURLToPath(new URL('../src/lib/fb/index.ts', import.meta.url)) },
        ],
    },
    server: {
        fs: {
            // The documentation test reads `docs/en/javascript.md`, which is outside this package.
            allow: ['.', '../docs', '../src/lib/fb'],
        },
    },
    test: {
        environment: 'jsdom',
        // ai-gui is built for a bundler (imports without extensions), so vite transforms it instead of Node
        server: { deps: { inline: [/@iobroker\/ai-gui/] } },
        include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
        globals: true,
    },
});
