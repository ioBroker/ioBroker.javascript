import React from 'react';

import { I18n, Message as DialogMessage, type ThemeType } from '@iobroker/adapter-react-v5';
import DialogError from '../Dialogs/Error';
import DialogExport from '../Dialogs/Export';
import DialogImport from '../Dialogs/Import';
import * as BlocklyTS from 'blockly/core';
import type { WorkspaceSvg } from 'blockly/core/workspace_svg';
import type { BlockSvg } from 'blockly/core/block_svg';
import { javascriptGenerator } from 'blockly/javascript';
import type { FlyoutDefinition } from 'blockly/core/utils/toolbox';

let languageBlocklyLoaded = false;
let languageOwnLoaded = false;
let toolboxText: string | null = null;
let toolboxXml: Element | null = null;
const scriptsLoaded: string[] = [];

interface CustomBlock {
    HUE: number;
    blocks: Record<string, string>;
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
        Blockly: {
            CustomBlocks: string[];
            Words: Record<string, Record<ioBroker.Languages, string>>;
            Action: CustomBlock;
            Blocks: Record<string, BlockSvg>;
            JavaScript: {
                forBlock: Record<string, (block: BlockSvg) => string>;
            };
            Procedures: {
                flyoutCategoryNew: (workspace: WorkspaceSvg) => FlyoutDefinition;
            };
        };
    }
}

// BF (2020-10-31) I have no Idea, why it does not work as static in BlocklyEditor, but outside BlocklyEditor it works
function searchXml(root: Element, text: string, _id?: string, _result?: string[]): string[] {
    _result = _result || [];
    if (root.tagName === 'BLOCK' || root.tagName === 'block') {
        _id = root.id;
    }
    if (root.tagName === 'FIELD' || root.tagName === 'field') {
        for (let a = 0; a < root.attributes.length; a++) {
            const val = (root.attributes[a].value || '').toLowerCase();
            if (root.attributes[a].nodeName === 'name' && (val === 'oid' || val === 'text' || val === 'var')) {
                if (_id && root.innerHTML?.toLowerCase().includes(text)) {
                    _result.push(_id);
                }
            }
        }
    }
    root.childNodes.forEach(node => searchXml(node as HTMLElement, text, _id, _result));

    return _result;
}

interface BlocklyEditorProps {
    command: '' | 'check' | 'export' | 'import';
    onChange: (code: string) => void;
    searchText: string;
    code: string;
    scriptId: string;
    themeType: ThemeType;
}

interface BlocklyEditorState {
    languageOwnLoaded: boolean;
    languageBlocklyLoaded: boolean;
    changed: boolean;
    message: string | { text: string; title: string };
    error: string | { text: string; title: string };
    themeType: ThemeType;
    exportText: string;
    importText: boolean;
    searchText: string;
}

class BlocklyEditor extends React.Component<BlocklyEditorProps, BlocklyEditorState> {
    private blockly: HTMLElement | null = null;
    private blocklyWorkspace: WorkspaceSvg | null = null;
    private originalCode: string;
    private someSelected: string[] | null = null;
    private changeTimer: ReturnType<typeof setTimeout> | null = null;
    private someSelectedTime: number = 0;
    private ignoreChanges: boolean = false;
    private darkTheme: any;
    private blinkBlock: any;
    private onResizeBind: () => void;
    private didUpdate: ReturnType<typeof setTimeout> | null = null;
    private lastCommand = '';
    private lastSearch: string;

    constructor(props: BlocklyEditorProps) {
        super(props);

        this.state = {
            languageOwnLoaded,
            languageBlocklyLoaded,
            changed: false,
            message: '',
            error: '',
            themeType: this.props.themeType,
            exportText: '',
            importText: false,
            searchText: this.props.searchText || '',
        };
        this.originalCode = props.code || '';

        this.someSelected = null;

        this.onResizeBind = this.onResize.bind(this);

        this.lastSearch = this.props.searchText || '';
        this.blinkBlock = null;
        this.loadLanguages();
    }

    static loadJS(url: string, callback: () => void, location?: HTMLElement): void {
        const scriptTag = document.createElement('script');
        try {
            scriptTag.src = url;

            scriptTag.onload = callback;
            scriptTag.onerror = callback;

            (location || window.document.body).appendChild(scriptTag);
        } catch (e) {
            console.error(`Cannot load ${url}: ${e}`);
            if (callback) {
                callback();
            }
        }
    }

    static loadScripts(scripts: string[], callback: () => void): void {
        if (!scripts?.length) {
            if (callback) {
                return callback();
            }
        }
        const adapter = scripts.pop();
        if (adapter && !scriptsLoaded.includes(adapter)) {
            scriptsLoaded.push(adapter);
            BlocklyEditor.loadJS(`../../adapter/${adapter}/blockly.js`, (/*data, textStatus, jqxhr*/) =>
                setTimeout(() => BlocklyEditor.loadScripts(scripts, callback), 0),);
        } else {
            setTimeout(() => BlocklyEditor.loadScripts(scripts, callback), 0);
        }
    }

    static loadCustomBlockly(adapters: Record<string, ioBroker.AdapterObject>, callback: () => void): void {
        // get all adapters, that can have blockly
        const toLoad: string[] = [];
        for (const id in adapters) {
            if (
                !Object.prototype.hasOwnProperty.call(adapters, id) ||
                !adapters[id] ||
                !id.match(/^system\.adapter\./) ||
                adapters[id].type !== 'adapter'
            ) {
                continue;
            }

            if (adapters[id].common?.blockly) {
                console.log(`Detected custom blockly: ${adapters[id].common.name}`);
                toLoad.push(adapters[id].common.name);
            }
        }

        BlocklyEditor.loadScripts(toLoad, callback);
    }

    static loadXMLDoc(text: string): Document | null {
        let parseXml;
        if (window.DOMParser) {
            parseXml = (xmlStr: string): Document => new window.DOMParser().parseFromString(xmlStr, 'text/xml');
        } else if (typeof window.ActiveXObject !== 'undefined' && new window.ActiveXObject('Microsoft.XMLDOM')) {
            parseXml = (xmlStr: string): Document => {
                const xmlDoc = new window.ActiveXObject('Microsoft.XMLDOM');
                xmlDoc.async = 'false';
                xmlDoc.loadXML(xmlStr);
                return xmlDoc;
            };
        } else {
            parseXml = () => null;
        }
        return parseXml(text);
    }

    searchBlocks(text: string): string[] {
        if (this.blocklyWorkspace) {
            const dom: Element = BlocklyTS.Xml.workspaceToDom(this.blocklyWorkspace);
            const ids = searchXml(dom, text.toLowerCase());

            console.log(`Search "${text}" found blocks: ${ids.length ? JSON.stringify(ids) : 'none'}`);

            return ids;
        }

        return [];
    }

    searchId(): void {
        const ids = this.lastSearch ? this.searchBlocks(this.lastSearch) : null;
        if (ids?.length) {
            this.someSelected = ids;
            this.someSelected.forEach(id => this.blocklyWorkspace?.highlightBlock(id, true));
            this.someSelectedTime = Date.now();
        } else if (this.someSelected) {
            // remove selection
            this.someSelected.forEach(id => this.blocklyWorkspace?.highlightBlock(id, false));
            this.someSelected = null;
        }
    }

    UNSAFE_componentWillReceiveProps(nextProps: BlocklyEditorProps): void {
        if (nextProps.command && this.lastCommand !== nextProps.command) {
            this.lastCommand = nextProps.command;
            setTimeout(() => (this.lastCommand = ''), 300);
            if (this.lastCommand === 'check') {
                this.blocklyCheckBlocks((err, badBlock) => {
                    if (!err) {
                        this.setState({ message: I18n.t('Ok') });
                    } else {
                        badBlock && BlocklyEditor.blocklyBlinkBlock(badBlock);
                        this.setState({ error: { text: I18n.t(err), title: I18n.t('Error was found') } });
                        this.blinkBlock = badBlock;
                    }
                });
            } else if (this.lastCommand === 'export') {
                this.exportBlocks();
            } else if (this.lastCommand === 'import') {
                this.importBlocks();
            }
        }

        if (nextProps.searchText !== this.lastSearch) {
            this.lastSearch = nextProps.searchText;
            this.searchId();
        }

        if (this.state.themeType !== nextProps.themeType) {
            this.setState({ themeType: nextProps.themeType }, () => this.updateBackground());
        }

        if (this.originalCode !== nextProps.code) {
            this.originalCode = nextProps.code || '';
            this.loadCode();
            this.searchId();
        }
    }

    loadLanguages(): void {
        // load blockly language
        if (!languageBlocklyLoaded) {
            const fileLang = window.document.createElement('script');
            fileLang.setAttribute('type', 'text/javascript');
            fileLang.setAttribute('src', `google-blockly/msg/js/${I18n.getLanguage()}.js`);

            // most browsers
            fileLang.onload = () => {
                languageBlocklyLoaded = true;
                this.setState({ languageBlocklyLoaded });
            };
            window.document.getElementsByTagName('head')[0].appendChild(fileLang);
        }
        if (!languageOwnLoaded) {
            const fileCustom = window.document.createElement('script');
            fileCustom.setAttribute('type', 'text/javascript');
            fileCustom.setAttribute('src', `google-blockly/own/msg/${I18n.getLanguage()}.js`);
            // most browsers
            fileCustom.onload = () => {
                languageOwnLoaded = true;
                this.setState({ languageOwnLoaded });
            };
            window.document.getElementsByTagName('head')[0].appendChild(fileCustom);
        }
    }

    onResize(): void {
        if (this.blocklyWorkspace) {
            BlocklyTS.svgResize(this.blocklyWorkspace);
        }
    }

    static jsCode2Blockly(text: string | undefined): string | null {
        text = text || '';
        const lines = text.split(/[\r\n]+|\r|\n/g);
        let xml = '';
        for (let l = lines.length - 1; l >= 0; l--) {
            if (lines[l].substring(0, 2) === '//') {
                xml = lines[l].substring(2);
                break;
            }
        }
        if (xml.substring(0, 4) === '<xml') {
            return xml;
        }

        let code;
        try {
            code = window.decodeURIComponent(window.atob(xml));
        } catch (e) {
            code = null;
            console.error(`cannot decode: ${xml}`);
            console.error(e);
        }
        return code;
    }

    static blocklyBlinkBlock(block: BlockSvg): void {
        for (let i = 300; i < 3000; i += 300) {
            setTimeout(() => block.select(), i);
            setTimeout(() => block.unselect(), i + 150);
        }
    }

    blocklyRemoveOrphanedShadows(): void {
        if (this.blocklyWorkspace) {
            const blocks = this.blocklyWorkspace.getAllBlocks();
            let block;
            for (let i = 0; (block = blocks[i]); i++) {
                if (block.isShadow()) {
                    const connections = block.getConnections_(true);
                    let conn;
                    for (let j = 0; (conn = connections[j]); j++) {
                        if (!conn.targetConnection) {
                            // remove it
                            block.dispose();
                            break;
                        }
                    }
                }
            }
        }
    }

    blocklyCheckBlocks(cb: (warningText?: string, badBlock?: BlockSvg) => void): boolean {
        let warningText;
        if (!this.blocklyWorkspace || this.blocklyWorkspace.getAllBlocks().length === 0) {
            cb && cb('no blocks found');
            return false;
        }
        let badBlock = this.blocklyGetUnconnectedBlock();
        if (badBlock) {
            warningText = 'not properly connected';
        } else {
            badBlock = this.blocklyGetBlockWithWarning();
            if (badBlock) {
                warningText = 'warning on this block';
            }
        }

        if (badBlock) {
            if (cb) {
                cb(warningText, badBlock);
            } else {
                BlocklyEditor.blocklyBlinkBlock(badBlock);
            }
            return false;
        }

        cb();

        return true;
    }

    // get unconnected block
    blocklyGetUnconnectedBlock(): BlockSvg | null {
        const blocks: BlockSvg[] | undefined = this.blocklyWorkspace?.getAllBlocks();
        let block;
        if (blocks) {
            for (let i = 0; (block = blocks[i]); i++) {
                const connections = block.getConnections_(true);
                let conn;
                for (let j = 0; (conn = connections[j]); j++) {
                    if (
                        !conn.sourceBlock_ ||
                        ((conn.type === BlocklyTS.INPUT_VALUE || conn.type === BlocklyTS.OUTPUT_VALUE) &&
                            !conn.targetConnection &&
                            // @ts-expect-error Check it later
                            !conn._optional)
                    ) {
                        return block;
                    }
                }
            }
        }
        return null;
    }

    // get block with warning
    blocklyGetBlockWithWarning(): BlockSvg | null {
        const blocks = this.blocklyWorkspace?.getAllBlocks();
        let block;
        if (blocks) {
            for (let i = 0; (block = blocks[i]); i++) {
                // @ts-expect-error fix later
                if (block.warning) {
                    return block;
                }
            }
        }
        return null;
    }

    blocklyCode2JSCode(oneWay?: boolean): string {
        if (!this.blocklyWorkspace) {
            return '';
        }
        let code = javascriptGenerator.workspaceToCode(this.blocklyWorkspace);
        if (!oneWay) {
            code += '\n';
            const dom = BlocklyTS.Xml.workspaceToDom(this.blocklyWorkspace);
            const text = BlocklyTS.Xml.domToText(dom);
            code += `//${btoa(encodeURIComponent(text))}`;
        }

        return code;
    }

    exportBlocks(): void {
        if (!this.blocklyWorkspace) {
            return;
        }
        let exportText: string;
        const selectedBlocks: BlocklyTS.BlockSvg | null = BlocklyTS.getSelected() as BlocklyTS.BlockSvg | null;
        if (selectedBlocks) {
            const xmlBlock: Element = BlocklyTS.Xml.blockToDom(selectedBlocks) as Element;
            // @1ts-expect-error fix later. TODO!!!!
            // if (BlocklyTS.dragMode_ !== BlocklyTS.DRAG_FREE) {
            //    BlocklyTS.Xml.deleteNext(xmlBlock);
            // }
            // Encode start position in XML.
            const xy = selectedBlocks.getRelativeToSurfaceXY();
            xmlBlock.setAttribute('x', (selectedBlocks.RTL ? -xy.x : xy.x).toString());
            xmlBlock.setAttribute('y', xy.y.toString());

            exportText = BlocklyTS.Xml.domToPrettyText(xmlBlock);
        } else {
            const dom = BlocklyTS.Xml.workspaceToDom(this.blocklyWorkspace);
            exportText = BlocklyTS.Xml.domToPrettyText(dom);
        }
        this.setState({ exportText });
    }

    importBlocks(): void {
        this.setState({ importText: true });
    }

    onImportBlocks(xml: string | undefined): void {
        if (!this.blocklyWorkspace) {
            return;
        }
        xml = (xml || '').trim();
        if (xml) {
            try {
                if (!xml.startsWith('<xml')) {
                    xml = `<xml xmlns="https://developers.google.com/blockly/xml">${xml}</xml>`;
                }
                /*
                // TODO: WHY?!
                const variables = xml.replace(/[\n\r]/g, '').match(/<variables>(.*)<\/variables>/);
                if (variables) {
                    const parser = new DOMParser();
                    const vars = parser.parseFromString(`<variables>${variables[1]}</variables>`, 'text/xml').firstChild;
                    for (const child of vars.children) {
                        if (child.tagName === 'variable') {
                            // e.g. timeout or interval
                            const varType = child.getAttribute('type');
                            if (varType) {
                                this.blocklyWorkspace.createVariable(child.getAttribute('id'), varType);
                            }
                        }
                    }
                }
                */
                xml = xml.replace(/[\n\r]/g, '').replace(/<variables>.*<\/variables>/g, '');
                window.scripts.loading = true;

                const xmlBlocks = BlocklyTS.utils.xml.textToDom(xml);
                if (xmlBlocks.nodeName === 'xml') {
                    for (let b = 0; b < xmlBlocks.children.length; b++) {
                        // @ts-expect-error fix later
                        this.blocklyWorkspace.paste(xmlBlocks.children[b]);
                    }
                } else {
                    // @ts-expect-error fix later
                    this.blocklyWorkspace.paste(xmlBlocks);
                }

                window.scripts.loading = false;

                this.onBlocklyChanged();
            } catch (e) {
                this.setState({ error: { text: (e as Error).toString(), title: I18n.t('Import error') } });
            }
        }
    }

    loadCode(): void {
        if (!this.blocklyWorkspace) {
            return;
        }

        this.ignoreChanges = true;
        this.blocklyWorkspace.clear();

        try {
            const xml =
                BlocklyEditor.jsCode2Blockly(this.originalCode) ||
                '<xml xmlns="https://developers.google.com/blockly/xml"></xml>';
            window.scripts.loading = true;
            const dom = BlocklyTS.utils.xml.textToDom(xml);
            BlocklyTS.Xml.domToWorkspace(dom, this.blocklyWorkspace);
            window.scripts.loading = false;
        } catch (e) {
            console.error(e);
            setTimeout(() => this.setState({ error: I18n.t('Cannot extract Blockly code!') }));
        }
        setTimeout(() => (this.ignoreChanges = false), 100);
    }

    onBlocklyChanged(): void {
        this.blocklyRemoveOrphanedShadows();
        this.setState({ changed: true });
        this.onChange();
    }

    async componentDidUpdate(): Promise<void> {
        if (!this.blockly) {
            return;
        }
        if (this.didUpdate) {
            clearTimeout(this.didUpdate);
            this.didUpdate = null;
        }

        if (this.blocklyWorkspace) {
            return;
        }

        window.addEventListener('resize', this.onResizeBind, false);
        toolboxText = toolboxText || (await this.getToolbox());
        toolboxXml = toolboxXml || BlocklyTS.utils.xml.textToDom(toolboxText);

        this.darkTheme = BlocklyTS.Theme.defineTheme('dark', {
            name: 'dark',
            base: BlocklyTS.Themes.Classic,
            componentStyles: {
                workspaceBackgroundColour: '#1e1e1e',
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
            },
        });

        // https://developers.google.com/blockly/reference/js/blockly.blocklyoptions_interface.md
        this.blocklyWorkspace = BlocklyTS.inject(this.blockly, {
            renderer: 'thrasos',
            theme: 'classic',
            media: 'google-blockly/media/',
            toolbox: toolboxXml,
            zoom: {
                controls: true,
                wheel: false,
                startScale: 1.0,
                maxScale: 3,
                minScale: 0.3,
                scaleSpeed: 1.2,
                pinch: true,
            },
            move: {
                scrollbars: {
                    horizontal: true,
                    vertical: true,
                },
                drag: true,
                wheel: true,
            },
            trashcan: true,
            grid: {
                spacing: 25,
                length: 1,
                snap: true,
            },
            sounds: false, // disable sounds
        });
        // for blockly itself
        window.scripts = {
            blocklyWorkspace: this.blocklyWorkspace,
        };

        // Workaround: Replace procedure category flyout
        this.blocklyWorkspace.registerToolboxCategoryCallback('PROCEDURE', window.Blockly.Procedures.flyoutCategoryNew);

        // Listen to events on master workspace.
        this.blocklyWorkspace.addChangeListener(masterEvent => {
            if (this.someSelected && Date.now() - this.someSelectedTime > 500) {
                const allBlocks = this.blocklyWorkspace?.getAllBlocks();
                this.someSelected = null;
                allBlocks?.forEach(b => b.removeSelect());
            }

            if (
                [BlocklyTS.Events.UI, BlocklyTS.Events.CREATE, BlocklyTS.Events.VIEWPORT_CHANGE].includes(
                    masterEvent.type,
                )
            ) {
                return; // Don't mirror UI events.
            }
            if (this.ignoreChanges) {
                return;
            }

            this.changeTimer && clearTimeout(this.changeTimer);
            this.changeTimer = setTimeout(() => {
                this.changeTimer = null;
                this.onBlocklyChanged();
            }, 200);
        });
        this.loadCode();
        this.onResize();
        // Move toolbar to the valid position
        const toolbar = document.getElementsByClassName('blocklyToolboxDiv')[0];
        this.blockly.appendChild(toolbar);

        this.updateBackground();
        setTimeout(() => this.searchId(), 200); // select found blocks
    }

    updateBackground(): void {
        if (this.state.themeType === 'dark') {
            this.blocklyWorkspace?.setTheme(this.darkTheme);
        } else if (this.blocklyWorkspace) {
            this.blocklyWorkspace.getThemeManager();
            this.blocklyWorkspace.setTheme(BlocklyTS.Themes.Classic);
        }
    }

    componentWillUnmount(): void {
        if (!this.blocklyWorkspace) {
            return;
        }
        this.blocklyWorkspace.dispose();
        this.blocklyWorkspace = null;
        this.changeTimer && clearTimeout(this.changeTimer);
        this.changeTimer = null;
        window.removeEventListener('resize', this.onResizeBind);
    }

    onChange(): void {
        this.originalCode = this.blocklyCode2JSCode();
        this.props.onChange && this.props.onChange(this.originalCode);
    }

    async getToolbox(retry?: boolean): Promise<string> {
        // Interpolate translated messages into toolbox.
        const el = window.document.getElementById('toolbox');
        let toolboxText = el?.outerHTML;
        if (!toolboxText) {
            if (!retry) {
                return new Promise(resolve => {
                    setTimeout(() => resolve(this.getToolbox(true)), 500);
                });
            }

            console.error('Cannot load blocks!');
            return '';
        }
        toolboxText = toolboxText.replace(/{(\w+)}/g, (m, p1) => window.MSG[p1]);

        if (window.Blockly.CustomBlocks) {
            let blocks = '';
            const lang = I18n.getLanguage();
            for (let cb = 0; cb < window.Blockly.CustomBlocks.length; cb++) {
                const name = window.Blockly.CustomBlocks[cb];
                // add blocks
                const _block: CustomBlock = (window.Blockly as unknown as Record<string, CustomBlock>)[name];
                blocks += `<category name="${window.Blockly.Words[name][lang]}" colour="${_block.HUE}">`;
                for (const _b in _block.blocks) {
                    if (Object.prototype.hasOwnProperty.call(_block.blocks, _b)) {
                        blocks += _block.blocks[_b];
                    }
                }
                blocks += '</category>';
            }
            toolboxText = toolboxText.replace('<category><block>%%CUSTOM_BLOCKS%%</block></category>', blocks);
        }

        return toolboxText;
    }

    renderMessageDialog(): React.JSX.Element | null {
        return this.state.message ? (
            <DialogMessage
                key="dialogMessage"
                text={typeof this.state.message === 'object' ? this.state.message.text : this.state.message}
                title={typeof this.state.message === 'object' ? this.state.message.title : ''}
                onClose={() => this.setState({ message: '' })}
            />
        ) : null;
    }

    renderErrorDialog(): React.JSX.Element | null {
        return this.state.error ? (
            <DialogError
                key="dialogError"
                text={typeof this.state.error === 'object' ? this.state.error.text.toString() : this.state.error}
                title={typeof this.state.error === 'object' ? this.state.error.title : ''}
                onClose={() => {
                    if (this.blinkBlock) {
                        BlocklyEditor.blocklyBlinkBlock(this.blinkBlock);
                        this.blinkBlock = null;
                    }
                    this.setState({ error: '' });
                }}
            />
        ) : null;
    }

    renderExportDialog(): React.JSX.Element | null {
        return this.state.exportText ? (
            <DialogExport
                key="dialogExport"
                themeType={this.state.themeType}
                onClose={() => this.setState({ exportText: '' })}
                text={this.state.exportText}
                scriptId={this.props.scriptId}
            />
        ) : null;
    }

    renderImportDialog(): React.JSX.Element | null {
        return this.state.importText ? (
            <DialogImport
                key="dialogImport"
                onClose={(text: string | undefined) => {
                    this.setState({ importText: false });
                    this.onImportBlocks(text);
                }}
            />
        ) : null;
    }

    render(): (React.JSX.Element | null)[] | null {
        if (this.state.languageBlocklyLoaded && this.state.languageOwnLoaded) {
            this.didUpdate = setTimeout(() => {
                this.didUpdate = null;
                void this.componentDidUpdate();
            }, 100);

            return [
                <div
                    key="blocklyDOM"
                    ref={el => (this.blockly = el)}
                    style={{
                        // marginLeft: 180,
                        width: '100%', // 'calc(100% - 180px)',
                        height: '100%',
                        // overflow: 'hidden',
                        position: 'relative',
                    }}
                />,

                this.renderMessageDialog(),
                this.renderErrorDialog(),
                this.renderExportDialog(),
                this.renderImportDialog(),
            ];
        }

        return null;
    }
}

export default BlocklyEditor;
