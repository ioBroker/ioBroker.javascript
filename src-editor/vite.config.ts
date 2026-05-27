import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import commonjs from 'vite-plugin-commonjs';
import vitetsConfigPaths from 'vite-tsconfig-paths';
import { federation } from '@module-federation/vite';

const makeShared = (pkgs: string[]): Record<string, { requiredVersion: '*', singleton: true }> => {
    const result: Record<string, { requiredVersion: '*', singleton: true }>= {};
    pkgs.forEach(packageName => {
        result[packageName] = {
            requiredVersion: '*',
            singleton: true,
        };
    });
    return result;
};

export default defineConfig({
    plugins: [
        federation({
            name: 'iobroker_javascript',
            shared: makeShared([
                'react',
                'react-dom',
                '@mui/material',
                'prop-types',
                '@iobroker/adapter-react-v5',
            ]),
            exposes: {},
            remotes: {},
            filename: 'remoteEntry.js',
            manifest: true,
        }),
        react(),
        vitetsConfigPaths(),
        commonjs(),
    ],
    server: {
        port: 3000,
        proxy: {
            '/adapter': 'http://localhost:8081',
            // Dev only: serve `_socket/info.js` (sets window.sysLang) from the real ioBroker,
            // so Monaco's UI uses the ioBroker language instead of the browser language.
            '/_socket': 'http://localhost:8081',
        },
    },
    base: './',
    build: {
        target: 'chrome89',
        outDir: './build',
    },
});
