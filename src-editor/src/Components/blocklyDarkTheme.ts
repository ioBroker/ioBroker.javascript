import type { ITheme } from 'blockly/core/theme';
import type { BlocklyType } from './blockly-plugins';

type BlocklyTheme = ReturnType<BlocklyType['Theme']['defineTheme']>;

let darkTheme: BlocklyTheme | null = null;

/**
 * Dark theme for Blockly, built from the global that `blockly-plugins/bridge.ts` installs.
 *
 * Do not replace this with the npm package `@blockly/theme-dark`: it bundles its own copy of Blockly,
 * and `Theme.defineTheme` checks `base instanceof Theme`, so a theme created by a second copy silently
 * loses its base. Its UMD build also does not survive bundling - it threw
 * "Cannot read properties of undefined (reading 'defineTheme')" at load time.
 */
export function getBlocklyDarkTheme(): BlocklyTheme {
    darkTheme ||= window.Blockly.Theme.defineTheme('dark', {
        name: 'dark',
        base: window.Blockly.Themes.Classic,
        componentStyles: {
            workspaceBackgroundColour: '#1e1e1e',
            // "blackBackground" is not a colour but the name of the custom entry below.
            // Blockly resolves such indirections in "Theme.getComponentStyle", but the custom
            // key is not part of its "ComponentStyle" type, hence the cast.
            toolboxBackgroundColour: 'blackBackground',
            toolboxForegroundColour: '#fff',
            flyoutBackgroundColour: '#252526',
            flyoutForegroundColour: '#ccc',
            flyoutOpacity: 1,
            scrollbarColour: '#797979',
            insertionMarkerColour: '#fff',
            insertionMarkerOpacity: 0.3,
            scrollbarOpacity: 0.4,
            cursorColour: '#d0d0d0',
            blackBackground: '#333',
        } as ITheme['componentStyles'],
    });

    return darkTheme;
}
