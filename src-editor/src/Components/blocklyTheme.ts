import { emphasize } from '@mui/material/styles';

import type { IobTheme } from '@iobroker/gui-components';
import type { BlocklyType } from './blockly-plugins';

type BlocklyTheme = ReturnType<BlocklyType['Theme']['defineTheme']>;

/**
 * One Blockly theme per ioBroker theme. `Theme.defineTheme` registers the theme under its name, and
 * registering a name twice throws, so each one may only ever be built once.
 */
const themes: Record<string, BlocklyTheme> = {};

/**
 * The chrome of the Blockly workspace, in the colours of the current ioBroker theme.
 *
 * Only the chrome: the theme is built on `Themes.Classic`, so every block keeps the colour of its
 * category. Before this there was one hard-coded grey palette (`#1e1e1e`/`#333`/`#252526`) for every
 * dark theme, which left a grey workspace and a grey toolbox sitting in the middle of, for example,
 * the navy `modernDark` admin.
 *
 * Do not replace this with the npm package `@blockly/theme-dark`: it bundles its own copy of Blockly,
 * and `Theme.defineTheme` checks `base instanceof Theme`, so a theme created by a second copy silently
 * loses its base. Its UMD build also does not survive bundling - it threw
 * "Cannot read properties of undefined (reading 'defineTheme')" at load time.
 *
 * @param theme the ioBroker theme the admin is currently painted in
 */
export function getBlocklyTheme(theme: IobTheme): BlocklyTheme {
    if (themes[theme.name]) {
        return themes[theme.name];
    }

    const workspace = theme.palette.background.default;
    /*
     * The toolbox and its flyout have to read as two surfaces in front of the workspace. The modern
     * themes give `paper` its own value for exactly that; the classic ones paint paper and background
     * in one colour, so there both shades are derived from the workspace instead. `emphasize` lightens
     * a dark colour and darkens a light one, so this works in either theme type and keeps the hue.
     */
    const flyout =
        theme.palette.background.paper === workspace ? emphasize(workspace, 0.07) : theme.palette.background.paper;
    const toolbox = emphasize(flyout, 0.07);

    const name = `iob-${theme.name}`;

    themes[theme.name] = window.Blockly.Theme.defineTheme(name, {
        name,
        base: window.Blockly.Themes.Classic,
        componentStyles: {
            workspaceBackgroundColour: workspace,
            toolboxBackgroundColour: toolbox,
            toolboxForegroundColour: theme.palette.text.primary,
            flyoutBackgroundColour: flyout,
            flyoutForegroundColour: theme.palette.text.secondary,
            flyoutOpacity: 1,
            // Both end up as an SVG `fill`, so they have to be opaque colours - the `text.*` entries
            // of the classic themes are `rgba()` and would come out almost invisible on top of the
            // opacity below.
            scrollbarColour: emphasize(workspace, 0.35),
            scrollbarOpacity: 0.4,
            insertionMarkerColour: emphasize(workspace, 0.9),
            insertionMarkerOpacity: 0.3,
            cursorColour: emphasize(workspace, 0.75),
        },
    });

    return themes[theme.name];
}
