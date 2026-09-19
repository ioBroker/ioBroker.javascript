import type * as monacoEditor from 'monaco-editor';

type Monaco = typeof monacoEditor;

interface AmdRequire {
    (modules: string[], onLoad: () => void, onError: (error: Error) => void): void;
    config: (options: Record<string, unknown>) => void;
}

const win = window as unknown as { monaco?: Monaco; require?: AmdRequire };

let loading: Promise<Monaco> | null = null;

function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const script = window.document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Cannot load ${src}`));
        window.document.head.appendChild(script);
    });
}

/** Monaco, if it is already loaded - for the places that can do without it */
export function getMonaco(): Monaco | null {
    return win.monaco?.editor ? win.monaco : null;
}

/**
 * Loads the Monaco editor on first use.
 *
 * Monaco is not bundled: it is served from `vs/` as an AMD build of about 3 MB. Only JavaScript and
 * TypeScript scripts, the debugger and the AI diff view need it, so it is not loaded before one of
 * them is opened. Blockly and Rules users never download it.
 *
 * The AMD loader must come after socket.io, or socket.io registers itself as an AMD module and
 * `window.io` is never created. Here it always does: nothing asks for Monaco before the connection
 * is up.
 *
 * Safe to call more than once; a failed attempt is forgotten, so the next call tries again.
 */
export function loadMonaco(): Promise<Monaco> {
    const monaco = getMonaco();
    if (monaco) {
        return Promise.resolve(monaco);
    }

    loading ||= (async (): Promise<Monaco> => {
        if (!win.require?.config) {
            await loadScript('vs/loader.js');
        }
        // sets the path and the language of Monaco and starts loading `vs/editor/editor.main`
        await loadScript('vs/configure.js');
        // the module was already requested by `configure.js`, so this only waits for it
        await new Promise<void>((resolve, reject) => win.require!(['vs/editor/editor.main'], resolve, reject));
        if (!win.monaco) {
            throw new Error('Monaco was loaded, but did not register itself');
        }
        return win.monaco;
    })().catch((error: unknown) => {
        loading = null;
        throw error;
    });

    return loading;
}
