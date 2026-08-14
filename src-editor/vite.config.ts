import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import commonjs from 'vite-plugin-commonjs';
import { federation } from '@module-federation/vite';

/**
 * Matches the `typeof define === 'function' && define.amd` test of a UMD wrapper.
 *
 * The ioBroker admin loads Monaco's AMD loader, which puts a global `define.amd` on the page. A UMD
 * wrapper evaluated after that takes its AMD branch, so two things go wrong: it calls an anonymous
 * `define()`, which Monaco's loader rejects with "Can only have one anonymous define call per script
 * file", and it never assigns `module.exports` - leaving the bundle with an empty module.
 *
 * For anything the bundler resolves statically the AMD branch is dead code, so it is dropped - for
 * every UMD dependency, not just the two that were observed to break: `blockly` (its `.mjs` entry
 * points only re-export from the compressed UMD files) and `suncalc2`, which the Rules editor pulls
 * in through TriggerSchedule.
 *
 * `monaco-editor` is skipped: it is the one package that legitimately deals in AMD.
 */
const AMD_CHECK =
    /typeof define\s*===?\s*['"]function['"]\s*&&\s*(?:typeof\s*define\.amd\s*===?\s*['"]object['"]\s*&&\s*)?define\.amd/g;

function shouldPatch(filePath: string, code: string): boolean {
    const path = filePath.replace(/\\/g, '/');
    if (!path.includes('/node_modules/') || path.includes('/monaco-editor/')) {
        return false;
    }
    AMD_CHECK.lastIndex = 0;
    return AMD_CHECK.test(code);
}

function withoutAmdBranch(code: string): string {
    AMD_CHECK.lastIndex = 0;
    return code.replace(AMD_CHECK, 'false');
}

/** Removes the AMD branch while Vite/rolldown builds - see AMD_CHECK. */
function dropAmdBranch(): Plugin {
    const patched: string[] = [];

    return {
        name: 'drop-amd-branch',
        enforce: 'pre',
        transform(code: string, id: string) {
            if (!shouldPatch(id, code)) {
                return null;
            }
            const path = id.replace(/\\/g, '/');
            patched.push(path.slice(path.lastIndexOf('/node_modules/') + 14));
            return { code: withoutAmdBranch(code), map: null };
        },
        buildEnd() {
            if (patched.length) {
                this.info(`removed the AMD branch from: ${patched.join(', ')}`);
            }
        },
    };
}

/**
 * The same removal for the dependency optimizer, which pre-bundles in dev and does not run the
 * plugin above. Excluding the packages from pre-bundling instead is not an option: their entry
 * points are UMD, and the browser cannot import those as ESM.
 */
const dropAmdBranchOptimizer = {
    name: 'drop-amd-branch',
    transform(code: string, id: string): { code: string; map: null } | null {
        return shouldPatch(id, code) ? { code: withoutAmdBranch(code), map: null } : null;
    },
};

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
                '@iobroker/gui-components',
            ]),
            exposes: {},
            remotes: {},
            filename: 'remoteEntry.js',
            manifest: true,
        }),
        react(),
        commonjs(),
        dropAmdBranch(),
    ],
    optimizeDeps: {
        rolldownOptions: {
            plugins: [dropAmdBranchOptimizer],
        },
    },
    resolve: {
        tsconfigPaths: true,
    },
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
