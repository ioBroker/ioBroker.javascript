import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import commonjs from 'vite-plugin-commonjs';
import svgr from 'vite-plugin-svgr';
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
                //'@mui/styles',
                //'@mui/icons-material',
                'prop-types',
                '@iobroker/adapter-react-v5',
                'react-ace',
            ]),
            exposes: {},
            remotes: {},
            filename: 'remoteEntry.js',
            manifest: true,
        }),
        react(),
        vitetsConfigPaths(),
        commonjs(),
        svgr({
            include: ['src/**/*.svg'],
        }),
    ],
    server: {
        port: 3000,
    },
    base: './',
    build: {
        target: 'chrome89',
        outDir: './build',
    },
});
