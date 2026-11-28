import type { AdminConnection } from '@iobroker/gui-components';

import type { RecipeCatalogAnswer } from './types';

let loading: Promise<RecipeCatalogAnswer> | null = null;

/**
 * The catalog of the recipes, from the adapter (message "getRecipes"). Asked once per session: the
 * adapter keeps it for an hour anyway. `force` loads it again from the internet.
 *
 * @param socket connection
 * @param instanceId the javascript instance, like system.adapter.javascript.0
 * @param force load it again
 */
export function loadCatalog(
    socket: AdminConnection,
    instanceId: string,
    force?: boolean,
): Promise<RecipeCatalogAnswer> {
    if (!loading || force) {
        loading = socket
            .sendTo(instanceId.replace(/^system\.adapter\./, ''), 'getRecipes', { force: !!force })
            .then((answer: RecipeCatalogAnswer | null) => answer || { recipes: [], error: 'no answer' })
            .catch((error: unknown): RecipeCatalogAnswer => {
                // the next try asks again
                loading = null;
                return { recipes: [], error: String(error) };
            });
    }
    return loading;
}
