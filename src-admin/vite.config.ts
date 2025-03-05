import react from '@vitejs/plugin-react';
import commonjs from 'vite-plugin-commonjs';
import vitetsConfigPaths from 'vite-tsconfig-paths';
import { federation } from '@module-federation/vite';
import { ModuleFederationShared } from './modulefederation.admin.config';

const config = {
    plugins: [
        federation({
            manifest: true,
            name: 'ConfigCustomJavascriptSet',
            filename: 'customComponents.js',
            exposes: {
                './Components': './src/Components.tsx',
            },
            remotes: {},
            shared: ModuleFederationShared,
        }),
        // react(),
        vitetsConfigPaths(),
        commonjs(),
    ],
    server: {
        port: 3000,
        proxy: {
            '/files': 'http://localhost:8081',
            '/adapter': 'http://localhost:8081',
            '/session': 'http://localhost:8081',
            '/log': 'http://localhost:8081',
            '/lib': 'http://localhost:8081',        },
    },
    base: './',
    build: {
        target: 'chrome89',
        outDir: './build',
        rollupOptions: {
            onwarn(warning, warn) {
            // Suppress "Module level directives cause errors when bundled" warnings
            if (warning.code === "MODULE_LEVEL_DIRECTIVE") {
                return;
            }
            warn(warning);
            },
        },
    },
};

export default config;
