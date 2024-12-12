import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import commonjs from 'vite-plugin-commonjs';
import svgr from 'vite-plugin-svgr';
import vitetsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
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
  }
});