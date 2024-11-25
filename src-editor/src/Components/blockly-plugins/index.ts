// Used only types of blockly, no code
import type { WorkspaceSvg as WorkspaceSvgType } from 'blockly/core/workspace_svg';
import type { BlockSvg as BlockSvgType } from 'blockly/core/block_svg';
import type { FlyoutDefinition } from 'blockly/core/utils/toolbox';
import type { Block as BlockType, BlocklyOptions, ISelectable, Theme } from 'blockly';
import type { ConnectionType } from 'blockly/core';
import type { ITheme } from 'blockly/core/theme';
import type { JavascriptGenerator as JavascriptGeneratorType } from 'blockly/javascript';
import type { RegistrableField } from 'blockly/core/field_registry';

// Multiline is now plugin. Together with FieldColor
import { FieldMultilineInput } from './field-multilineinput/src';
import { FieldColour } from './field-colour/src';
import { toJavascript as toJavascriptMultiline } from './field-multilineinput/src/blocks/textMultiline';
import { toJavascript as toJavascriptColourBlend } from './field-colour/src/blocks/colourBlend';
import { toJavascript as toJavascriptColourRandom } from './field-colour/src/blocks/colourRandom';
import { toJavascript as toJavascriptColourPicker } from './field-colour/src/blocks/colourPicker';
import { toJavascript as toJavascriptColourRgb } from './field-colour/src/blocks/colourRgb';

export type JavascriptGenerator = JavascriptGeneratorType;
export type BlockSvg = BlockSvgType;
export type WorkspaceSvg = WorkspaceSvgType;
export type Block = BlockType;

export interface CustomBlock {
    HUE: number;
    blocks: Record<string, string>;
}

export interface BlocklyType {
    CustomBlocks: string[];
    Words: Record<string, Record<ioBroker.Languages, string>>;
    Action: CustomBlock;
    Blocks: Record<string, BlockSvgType>;
    JavaScript: JavascriptGeneratorType;
    Procedures: {
        flyoutCategoryNew: (workspace: WorkspaceSvg) => FlyoutDefinition;
    };
    Xml: {
        workspaceToDom: (workspace: WorkspaceSvg) => Element;
        domToText: (dom: Node) => string;
        blockToDom: (block: BlockType, opt_noId?: boolean) => Element | DocumentFragment;
        domToPrettyText: (dom: Node) => string;
        domToWorkspace: (xml: Element, workspace: WorkspaceSvg) => string[];
    };
    svgResize: (workspace: WorkspaceSvg) => void;
    INPUT_VALUE: ConnectionType.INPUT_VALUE;
    OUTPUT_VALUE: ConnectionType.OUTPUT_VALUE;
    NEXT_STATEMENT: ConnectionType.NEXT_STATEMENT;
    PREVIOUS_STATEMENT: ConnectionType.PREVIOUS_STATEMENT;
    getSelected(): ISelectable | null;
    utils: {
        xml: {
            textToDom: (text: string) => Element;
        };
    };
    Theme: {
        defineTheme: (name: string, themeObj: ITheme) => Theme;
    };
    inject: (container: Element | string, opt_options?: BlocklyOptions) => WorkspaceSvg;
    Themes: {
        Classic: Theme;
    };
    Events: {
        VIEWPORT_CHANGE: 'viewport_change';
        CREATE: 'create';
        UI: 'ui';
    };
    FieldMultilineInput: typeof FieldMultilineInput;
    FieldColour: typeof FieldColour;
    dialog: {
        prompt: (promptText: string, defaultText: string, callback: (p1: string | null) => void) => void;
        setPrompt: (promptFunction: (p1: string, p2: string, p3: (p1: string | null) => void) => void) => void;
    };
    fieldRegistry: {
        register: (type: string, fieldClass: RegistrableField) => void;
        unregister: (type: string) => void;
    };
    common: {
        createBlockDefinitionsFromJsonArray: (jsonArray: any[]) => Record<string, any>;
        defineBlocks: (blocks: { [key: string]: any }) => void;
    };
}

declare global {
    interface Window {
        ActiveXObject: any;
        MSG: string[];
        scripts: {
            loading?: boolean;
            blocklyWorkspace: WorkspaceSvg;
            scripts?: string[];
        };
        Blockly: BlocklyType;
    }
}

export function initBlockly(): void {
    if (!window.Blockly.FieldMultilineInput) {
        window.Blockly.fieldRegistry.register(
            'field_multilinetext',
            FieldMultilineInput as unknown as RegistrableField,
        );
        window.Blockly.JavaScript.forBlock.text_multiline = toJavascriptMultiline;

        window.Blockly.FieldMultilineInput = FieldMultilineInput;

        Object.assign(
            window.Blockly.Blocks,
            window.Blockly.common.createBlockDefinitionsFromJsonArray([
                {
                    type: 'text_multiline',
                    message0: '%1 %2',
                    args0: [
                        {
                            type: 'field_image',
                            src:
                                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAARCAYAAADpP' +
                                'U2iAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAdhgAAHYYBXaITgQAAABh0RVh0' +
                                'U29mdHdhcmUAcGFpbnQubmV0IDQuMS42/U4J6AAAAP1JREFUOE+Vks0KQUEYhjm' +
                                'RIja4ABtZ2dm5A3t3Ia6AUm7CylYuQRaUhZSlLZJiQbFAyRnPN33y01HOW08z88' +
                                '73zpwzM4F3GWOCruvGIE4/rLaV+Nq1hVGMBqzhqlxgCys4wJA65xnogMHsQ5luj' +
                                'nYHTejBBCK2mE4abjCgMGhNxHgDFWjDSG07kdfVa2pZMf4ZyMAdWmpZMfYOsLiD' +
                                'MYMjlMB+K613QISRhTnITnsYg5yUd0DETmEoMlkFOeIT/A58iyK5E18BuTBfgYX' +
                                'fwNJv4P9/oEBerLylOnRhygmGdPpTTBZAPkde61lbQe4moWUvYUZYLfUNftIY4z' +
                                'wA5X2Z9AYnQrEAAAAASUVORK5CYII=',
                            width: 12,
                            height: 17,
                            alt: '\u00B6',
                        },
                        {
                            type: 'field_multilinetext',
                            name: 'TEXT',
                            text: '',
                        },
                    ],
                    output: 'String',
                    style: 'text_blocks',
                    helpUrl: '%{BKY_TEXT_TEXT_HELPURL}',
                    tooltip: '%{BKY_TEXT_TEXT_TOOLTIP}',
                    extensions: ['parent_tooltip_when_inline'],
                },
            ]),
        );
    }
    if (!window.Blockly.FieldColour) {
        window.Blockly.fieldRegistry.register('field_colour', FieldColour as unknown as RegistrableField);
        window.Blockly.JavaScript.forBlock.colour_picker = toJavascriptColourPicker;
        window.Blockly.JavaScript.forBlock.colour_blend = toJavascriptColourBlend;
        window.Blockly.JavaScript.forBlock.colour_random = toJavascriptColourRandom;
        window.Blockly.JavaScript.forBlock.colour_rgb = toJavascriptColourRgb;

        window.Blockly.FieldColour = FieldColour;
        Object.assign(
            window.Blockly.Blocks,
            window.Blockly.common.createBlockDefinitionsFromJsonArray([
                {
                    type: 'colour_picker',
                    message0: '%1',
                    args0: [
                        {
                            type: 'field_colour',
                            name: 'COLOUR',
                            colour: '#ff0000',
                        },
                    ],
                    output: 'Colour',
                    helpUrl: '%{BKY_COLOUR_PICKER_HELPURL}',
                    style: 'colour_blocks',
                    tooltip: '%{BKY_COLOUR_PICKER_TOOLTIP}',
                    extensions: ['parent_tooltip_when_inline'],
                },
            ]),
        );

        Object.assign(
            window.Blockly.Blocks,
            window.Blockly.common.createBlockDefinitionsFromJsonArray([
                {
                    type: 'colour_random',
                    message0: '%{BKY_COLOUR_RANDOM_TITLE}',
                    output: 'Colour',
                    helpUrl: '%{BKY_COLOUR_RANDOM_HELPURL}',
                    style: 'colour_blocks',
                    tooltip: '%{BKY_COLOUR_RANDOM_TOOLTIP}',
                },
            ]),
        );
        Object.assign(
            window.Blockly.Blocks,
            window.Blockly.common.createBlockDefinitionsFromJsonArray([
                {
                    type: 'colour_rgb',
                    message0:
                        '%{BKY_COLOUR_RGB_TITLE} %{BKY_COLOUR_RGB_RED} %1 %{BKY_COLOUR_RGB_GREEN} %2 %{BKY_COLOUR_RGB_BLUE} %3',
                    args0: [
                        {
                            type: 'input_value',
                            name: 'RED',
                            check: 'Number',
                            align: 'RIGHT',
                        },
                        {
                            type: 'input_value',
                            name: 'GREEN',
                            check: 'Number',
                            align: 'RIGHT',
                        },
                        {
                            type: 'input_value',
                            name: 'BLUE',
                            check: 'Number',
                            align: 'RIGHT',
                        },
                    ],
                    output: 'Colour',
                    helpUrl: '%{BKY_COLOUR_RGB_HELPURL}',
                    style: 'colour_blocks',
                    tooltip: '%{BKY_COLOUR_RGB_TOOLTIP}',
                },
            ]),
        );
        Object.assign(
            window.Blockly.Blocks,
            window.Blockly.common.createBlockDefinitionsFromJsonArray([
                {
                    type: 'colour_blend',
                    message0:
                        '%{BKY_COLOUR_BLEND_TITLE} %{BKY_COLOUR_BLEND_COLOUR1} ' +
                        '%1 %{BKY_COLOUR_BLEND_COLOUR2} %2 %{BKY_COLOUR_BLEND_RATIO} %3',
                    args0: [
                        {
                            type: 'input_value',
                            name: 'COLOUR1',
                            check: 'Colour',
                            align: 'RIGHT',
                        },
                        {
                            type: 'input_value',
                            name: 'COLOUR2',
                            check: 'Colour',
                            align: 'RIGHT',
                        },
                        {
                            type: 'input_value',
                            name: 'RATIO',
                            check: 'Number',
                            align: 'RIGHT',
                        },
                    ],
                    output: 'Colour',
                    helpUrl: '%{BKY_COLOUR_BLEND_HELPURL}',
                    style: 'colour_blocks',
                    tooltip: '%{BKY_COLOUR_BLEND_TOOLTIP}',
                },
            ]),
        );
    }
}
