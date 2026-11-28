/**
 * Blockly without an editor: the recipes turn their XML into JavaScript before the script exists.
 * Loaded only with the recipe dialogs, as it pulls in Blockly.
 */
import { I18n, type AdminConnection } from '@iobroker/gui-components';

import BlocklyEditor from '../Components/BlocklyEditor';
import { initBlockly, type WorkspaceSvg } from '../Components/blockly-plugins';
import type { ObjectMap } from './devices';

/** Loads Blockly, the ioBroker blocks, the blocks of the adapters and the texts, as the editor does */
export async function prepareBlockly(socket: AdminConnection): Promise<void> {
    await BlocklyEditor.loadBlocks(socket);
    initBlockly();
    await BlocklyEditor.loadLanguagesAsync();
}

/**
 * The JavaScript of a Blockly XML, and the XML as Blockly saves it: blocks that a recipe repeated
 * get IDs of their own there.
 *
 * @param xml the Blockly XML
 * @param objects the objects of the installation: the generated code names the objects it uses in a
 *   comment, as the editor does when it saves the script. Without them it would depend on the names
 *   the open editor happened to load, and the same recipe would give different code.
 */
export function generateBlockly(xml: string, objects: ObjectMap): { js: string; xml: string } {
    const Blockly = window.Blockly;
    const workspace = new (Blockly as any).Workspace() as WorkspaceSvg;
    // some blocks look up the workspace there; an open Blockly editor gets its own back afterwards.
    // `loading` as while the editor loads a script: the blocks take what the XML has, no defaults
    const previous = window.scripts;
    const previousMain = window.main as Window['main'] | undefined;
    const previousLang = window.systemLang as ioBroker.Languages | undefined;
    // the names in the comments are in the language of the user, as the editor writes them
    window.systemLang = previousLang || I18n.getLanguage();
    window.scripts = { ...(previous || {}), blocklyWorkspace: workspace, loading: true };
    window.main = {
        ...(previousMain || {}),
        objects: { ...(previousMain?.objects || {}), ...objects },
    } as Window['main'];
    try {
        Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), workspace);
        window.scripts.loading = false;
        const js: string = Blockly.JavaScript.workspaceToCode(workspace);
        const saved: string = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
        return { js, xml: saved };
    } finally {
        window.scripts = previous;
        window.main = previousMain as Window['main'];
        window.systemLang = previousLang as ioBroker.Languages;
        workspace.dispose();
    }
}
