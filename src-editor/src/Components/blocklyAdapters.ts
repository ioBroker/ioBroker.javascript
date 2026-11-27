/**
 * The blocks of the adapters with `common.blockly` (their `admin/blockly.js`) are loaded once, when the
 * first Blockly script is opened. A newer version of such a file, or the blocks of an adapter installed
 * afterwards, come only with a reload of the page - so that is what the editor asks for then.
 *
 * It asked on every change of any object under `system.adapter.*` with `common.blockly`, also of an
 * *instance*: starting or stopping one changes its object, and the instance carries `common.blockly` of
 * its adapter. Writing `system.adapter.cloud.0.alive` from a script made the question pop up (#2469).
 *
 * Kept apart from BlocklyEditor, so that App can check it without loading Blockly.
 */

/** adapter name -> the version whose blocks the page has, or was already asked to reload for */
const known: Record<string, string> = {};
let loaded = false;

/**
 * Notes the versions whose blocks are loaded now.
 *
 * @param adapters all adapter objects, as the blocks are loaded from
 */
export function rememberLoadedBlocks(adapters: Record<string, ioBroker.AdapterObject | null | undefined>): void {
    for (const adapter of Object.values(adapters)) {
        if (adapter?.type === 'adapter' && adapter.common?.blockly && adapter.common.name) {
            known[adapter.common.name] = adapter.common.version || '';
        }
    }
    loaded = true;
}

/**
 * Whether a changed object means the page has to be reloaded to get the current blocks - asked once per
 * new version.
 *
 * @param obj the changed object under `system.adapter.*`
 */
export function blocksNeedReload(obj: ioBroker.Object | null | undefined): boolean {
    if (
        // no Blockly script opened so far: the blocks will be loaded as they are now
        !loaded ||
        // an instance says nothing about the blocks, only its adapter does
        obj?.type !== 'adapter' ||
        !obj.common?.blockly ||
        !obj.common.name
    ) {
        return false;
    }
    const version = obj.common.version || '';
    if (known[obj.common.name] === version) {
        return false;
    }
    known[obj.common.name] = version;
    return true;
}

/** Only for the tests: forgets everything */
export function resetLoadedBlocks(): void {
    for (const name of Object.keys(known)) {
        delete known[name];
    }
    loaded = false;
}
