/**
 * Loading of the function block diagram editor.
 *
 * Most users never open a diagram, so the editor comes in its own chunk. It is fetched ahead as
 * soon as a diagram is likely to be opened - the script list contains one, or the mouse rests on
 * "add a diagram" - so it is there when it is needed.
 */
import type FbEditor from './index';

export const loadFbEditor = (): Promise<{ default: typeof FbEditor }> => import('./index');

let loading: Promise<unknown> | null = null;

export function preloadFbEditor(): void {
    loading ||= loadFbEditor().catch(() => {
        // the next attempt tries again
        loading = null;
    });
}
