import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import commonjs from 'vite-plugin-commonjs';
import svgr from 'vite-plugin-svgr';
import vitetsConfigPaths from 'vite-tsconfig-paths';
import { federation } from '@module-federation/vite';

const makeShared = pkgs => {
    const result = {};
    pkgs.forEach(
        packageName => {
            result[packageName] = {
                requiredVersion: '*',
                singleton: true,
            };
        },
    );
    return result;
};

export default defineConfig({
  plugins: [
    federation( {
      name: 'iobroker_javascript',
      shared: makeShared([
        'react', 'react-dom', '@mui/material', '@mui/styles', '@mui/icons-material', 'prop-types', '@iobroker/adapter-react-v5', 'react-ace',
      ]),
      exposes: {},
      remotes: {},
      filename: 'remoteEntry.js',
    }),
    react(),
    vitetsConfigPaths(),
    commonjs(),
    svgr({
      include: [
        'src/**/*.svg',
      ],
    }),
  ],
  server: {
    port: 3000
  },
  build: {
    target: 'chrome89',
  },
});