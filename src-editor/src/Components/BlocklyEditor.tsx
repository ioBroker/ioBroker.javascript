import React from 'react';

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { Cancel as IconCancel, Check as IconOk } from '@mui/icons-material';

import { I18n, Message as DialogMessage, type ThemeType } from '@iobroker/gui-components';

import DialogError from '../Dialogs/Error';
import DialogExport from '../Dialogs/Export';
import DialogImport from '../Dialogs/Import';
import { type BlocklyType, type BlockSvg, type WorkspaceSvg, type CustomBlock, initBlockly } from './blockly-plugins';
import { getBlocklyDarkTheme } from './blocklyDarkTheme';

let languageBlocklyLoaded = false;
let languageOwnLoaded = false;
let toolboxText: string | null = null;
let toolboxXml: Element | null = null;
const scriptsLoaded: string[] = [];

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
    showInputPrompt: null | {
        promptText: string;
        defaultText: string;
        callback: (p1: string | null) => void;
        value: string;
    };
}

class BlocklyEditor extends React.Component<BlocklyEditorProps, BlocklyEditorState> {
    private blockly: HTMLElement | null = null;
    private blocklyWorkspace: WorkspaceSvg | null = null;
    private originalCode: string;
    private someSelected: string[] | null = null;
    private changeTimer: ReturnType<typeof setTimeout> | null = null;
    private someSelectedTime: number = 0;
    private ignoreChanges: boolean = false;
    private blinkBlock: any;
    private readonly onResizeBind: () => void;
    private resizeObserver: ResizeObserver | null = null;
    private didUpdate: ReturnType<typeof setTimeout> | null = null;
    private lastCommand = '';
    private lastSearch: string;
    public static Blockly: BlocklyType = window.Blockly;

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
            showInputPrompt: null,
        };
        this.originalCode = props.code || '';

        this.someSelected = null;

        this.onResizeBind = this.onResize.bind(this);

        this.lastSearch = this.props.searchText || '';
        this.blinkBlock = null;

        initBlockly();
        BlocklyEditor.Blockly.dialog.setPrompt(this.onShowNameDialog);

        this.loadLanguages();
    }

    onShowNameDialog = (promptText: string, defaultText: string, callback: (p1: string | null) => void): void => {
        this.setState({ showInputPrompt: { promptText, defaultText, callback, value: defaultText } });
    };

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
                callback();
            }
            return;
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
            const dom: Element = BlocklyEditor.Blockly.Xml.workspaceToDom(this.blocklyWorkspace);
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
            BlocklyEditor.Blockly.svgResize(this.blocklyWorkspace);
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
                        ((conn.type === BlocklyEditor.Blockly.INPUT_VALUE ||
                            conn.type === BlocklyEditor.Blockly.OUTPUT_VALUE) &&
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

    /** Append Blockly XML blocks to the workspace (used by AI Chat) */
    public appendBlocksFromXml(xml: string): void {
        this.onImportBlocks(xml);
    }

    /**
     * Smart-apply AI-generated blocks: matched blocks are replaced, new blocks are appended.
     * All operations are grouped so a single Ctrl+Z undoes everything.
     */
    public applyAiBlocks(xml: string): void {
        if (!this.blocklyWorkspace) {
            return;
        }
        xml = (xml || '').trim();
        if (!xml) {
            return;
        }

        try {
            if (!xml.startsWith('<xml')) {
                xml = `<xml xmlns="https://developers.google.com/blockly/xml">${xml}</xml>`;
            }
            xml = xml.replace(/[\n\r]/g, '').replace(/<variables>.*<\/variables>/g, '');

            const aiDom = BlocklyEditor.Blockly.utils.xml.textToDom(xml);
            const aiTopBlocks = Array.from(aiDom.querySelectorAll(':scope > block'));
            if (aiTopBlocks.length === 0) {
                return;
            }

            // Create fingerprints for matching: block type + direct field values
            const fingerprint = (blockEl: Element): string => {
                const type = blockEl.getAttribute('type') || '';
                const fields: string[] = [];
                for (const child of Array.from(blockEl.children)) {
                    if (child.tagName === 'field') {
                        fields.push(`${child.getAttribute('name')}=${child.textContent}`);
                    }
                    if (child.tagName === 'mutation') {
                        fields.push(`mut:${child.outerHTML}`);
                    }
                }
                return `${type}|${fields.join(',')}`;
            };

            // Fingerprint workspace blocks via their XML serialization
            const wsFingerprint = (block: any): string => {
                const type: string = block.type || '';
                const fields: string[] = [];
                for (const input of block.inputList || []) {
                    for (const field of input.fieldRow || []) {
                        if (field.name && field.getValue) {
                            fields.push(`${field.name}=${field.getValue()}`);
                        }
                    }
                }
                if (block.mutationToDom) {
                    try {
                        const mutation = block.mutationToDom();
                        if (mutation) {
                            fields.push(`mut:${mutation.outerHTML}`);
                        }
                    } catch {
                        /* ignore */
                    }
                }
                return `${type}|${fields.join(',')}`;
            };

            // Build fingerprints for AI blocks
            const aiFps = aiTopBlocks.map(b => fingerprint(b));

            // Get current workspace top-level blocks and their fingerprints
            const wsTopBlocks = this.blocklyWorkspace.getTopBlocks(false);
            const wsFps = wsTopBlocks.map((b: any) => wsFingerprint(b));
            const wsMatched = new Array(wsTopBlocks.length).fill(false);

            // Match AI blocks to workspace blocks by fingerprint (type + fields)
            // Store the position of matched blocks for replacement
            const matchPositions: Array<{ x: number; y: number } | null> = [];
            for (let ai = 0; ai < aiFps.length; ai++) {
                let found = false;
                // First try exact fingerprint match
                for (let ws = 0; ws < wsFps.length; ws++) {
                    if (!wsMatched[ws] && aiFps[ai] === wsFps[ws]) {
                        wsMatched[ws] = true;
                        const pos = wsTopBlocks[ws].getRelativeToSurfaceXY();
                        matchPositions.push({ x: pos.x, y: pos.y });
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    // Fallback: match by block type only
                    const aiType = aiTopBlocks[ai].getAttribute('type') || '';
                    for (let ws = 0; ws < wsTopBlocks.length; ws++) {
                        if (!wsMatched[ws] && wsTopBlocks[ws].type === aiType) {
                            wsMatched[ws] = true;
                            const pos = wsTopBlocks[ws].getRelativeToSurfaceXY();
                            matchPositions.push({ x: pos.x, y: pos.y });
                            found = true;
                            break;
                        }
                    }
                }
                if (!found) {
                    matchPositions.push(null); // New block, no position yet
                }
            }

            // Start undo group - use window.Blockly for full API access
            const Blockly = (window as any).Blockly;
            const groupId = Blockly.utils.idGenerator.genUid();
            Blockly.Events.setGroup(groupId);

            window.scripts.loading = true;

            // Delete matched workspace blocks (they will be replaced)
            for (let ws = 0; ws < wsTopBlocks.length; ws++) {
                if (wsMatched[ws]) {
                    wsTopBlocks[ws].dispose(false);
                }
            }

            // Auto-arrange AI blocks that share positions
            if (aiTopBlocks.length > 1) {
                const positions = new Set<string>();
                for (const block of aiTopBlocks) {
                    positions.add(`${block.getAttribute('x') || '0'},${block.getAttribute('y') || '0'}`);
                }
                if (positions.size === 1) {
                    let yOff = 10;
                    for (const block of aiTopBlocks) {
                        block.setAttribute('x', '10');
                        block.setAttribute('y', String(yOff));
                        yOff += 200;
                    }
                }
            }

            // Append all AI blocks to workspace
            BlocklyEditor.Blockly.Xml.appendDomToWorkspace(aiDom, this.blocklyWorkspace);

            // Position the newly added blocks
            const allTopBlocks = this.blocklyWorkspace.getTopBlocks(false);
            const newBlocks = allTopBlocks.slice(-aiTopBlocks.length);

            // Calculate bottom of existing blocks for new block placement
            let maxY = 10;
            for (const block of allTopBlocks.slice(0, -aiTopBlocks.length)) {
                const pos = block.getRelativeToSurfaceXY();
                const hw = block.getHeightWidth();
                maxY = Math.max(maxY, pos.y + hw.height + 30);
            }

            for (let i = 0; i < newBlocks.length; i++) {
                const pos = matchPositions[i];
                if (pos) {
                    // Matched block: place at original position
                    const cur = newBlocks[i].getRelativeToSurfaceXY();
                    newBlocks[i].moveBy(pos.x - cur.x, pos.y - cur.y);
                } else {
                    // New block: place below existing blocks
                    const cur = newBlocks[i].getRelativeToSurfaceXY();
                    newBlocks[i].moveBy(10 - cur.x, maxY - cur.y);
                    maxY += newBlocks[i].getHeightWidth().height + 20;
                }
            }

            window.scripts.loading = false;

            // End undo group
            Blockly.Events.setGroup(false);

            this.onBlocklyChanged();
        } catch (e) {
            window.scripts.loading = false;
            (window as any).Blockly?.Events?.setGroup(false);
            console.error('Error applying AI blocks:', e);
        }
    }

    /** Get the current workspace XML (used by AI Chat) */
    public getWorkspaceXml(): string {
        if (!this.blocklyWorkspace) {
            return '';
        }
        const dom = BlocklyEditor.Blockly.Xml.workspaceToDom(this.blocklyWorkspace);
        return BlocklyEditor.Blockly.Xml.domToPrettyText(dom);
    }

    blocklyCode2JSCode(oneWay?: boolean): string {
        if (!this.blocklyWorkspace) {
            return '';
        }
        let code = BlocklyEditor.Blockly.JavaScript.workspaceToCode(this.blocklyWorkspace);
        if (!oneWay) {
            code += '\n';
            const dom = BlocklyEditor.Blockly.Xml.workspaceToDom(this.blocklyWorkspace);
            const text = BlocklyEditor.Blockly.Xml.domToText(dom);
            code += `//${btoa(encodeURIComponent(text))}`;
        }

        return code;
    }

    exportBlocks(): void {
        if (!this.blocklyWorkspace) {
            return;
        }
        let exportText: string;
        const selectedBlocks: BlockSvg | null = BlocklyEditor.Blockly.getSelected() as BlockSvg | null;
        if (selectedBlocks) {
            const xmlBlock: Element = BlocklyEditor.Blockly.Xml.blockToDom(selectedBlocks) as Element;
            // @1ts-expect-error fix later. TODO!!!!
            // if (BlocklyEditor.Blockly.dragMode_ !== BlocklyEditor.Blockly.DRAG_FREE) {
            //    BlocklyEditor.Blockly.Xml.deleteNext(xmlBlock);
            // }
            // Encode start position in XML.
            const xy = selectedBlocks.getRelativeToSurfaceXY();
            xmlBlock.setAttribute('x', (selectedBlocks.RTL ? -xy.x : xy.x).toString());
            xmlBlock.setAttribute('y', xy.y.toString());

            exportText = BlocklyEditor.Blockly.Xml.domToPrettyText(xmlBlock);
        } else {
            const dom = BlocklyEditor.Blockly.Xml.workspaceToDom(this.blocklyWorkspace);
            exportText = BlocklyEditor.Blockly.Xml.domToPrettyText(dom);
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

                const xmlBlocks = BlocklyEditor.Blockly.utils.xml.textToDom(xml);

                // Auto-arrange imported top-level blocks vertically
                // AI-generated blocks often all have x="0" y="0" causing overlap
                const topBlocksList = Array.from(xmlBlocks.querySelectorAll(':scope > block'));
                if (topBlocksList.length > 1) {
                    // Check if all blocks share the same position (likely AI-generated)
                    const positions = new Set<string>();
                    for (const block of topBlocksList) {
                        positions.add(`${block.getAttribute('x') || '0'},${block.getAttribute('y') || '0'}`);
                    }
                    if (positions.size === 1) {
                        // All at same position - space them out with rough estimates
                        let yOffset = parseInt(topBlocksList[0].getAttribute('y') || '0', 10);
                        for (const block of topBlocksList) {
                            block.setAttribute('y', String(yOffset));
                            yOffset += 200;
                        }
                    }
                }

                BlocklyEditor.Blockly.Xml.appendDomToWorkspace(xmlBlocks, this.blocklyWorkspace);

                // Refine layout: re-stack the newly added blocks with actual heights
                if (topBlocksList.length > 1) {
                    const wsTopBlocks = this.blocklyWorkspace.getTopBlocks(false);
                    // The last N blocks are the ones we just added
                    const newBlocks = wsTopBlocks.slice(-topBlocksList.length);
                    if (newBlocks.length > 1) {
                        let currentY = newBlocks[0].getRelativeToSurfaceXY().y;
                        for (const block of newBlocks) {
                            const pos = block.getRelativeToSurfaceXY();
                            block.moveBy(0, currentY - pos.y);
                            currentY += block.getHeightWidth().height + 20;
                        }
                    }
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
            const dom = BlocklyEditor.Blockly.utils.xml.textToDom(xml);
            BlocklyEditor.Blockly.Xml.domToWorkspace(dom, this.blocklyWorkspace);
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
        // Live resize when parent container changes (e.g. splitter drag)
        if (!this.resizeObserver && this.blockly) {
            this.resizeObserver = new ResizeObserver(() => this.onResize());
            this.resizeObserver.observe(this.blockly);
        }
        toolboxText = toolboxText || (await this.getToolbox());
        toolboxXml = toolboxXml || BlocklyEditor.Blockly.utils.xml.textToDom(toolboxText);

        // https://developers.google.com/blockly/reference/js/blockly.blocklyoptions_interface.md
        this.blocklyWorkspace = BlocklyEditor.Blockly.inject(this.blockly, {
            renderer: 'thrasos',
            theme: this.state.themeType === 'dark' ? getBlocklyDarkTheme() : 'classic',
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
                [
                    BlocklyEditor.Blockly.Events.UI,
                    BlocklyEditor.Blockly.Events.CREATE,
                    BlocklyEditor.Blockly.Events.VIEWPORT_CHANGE,
                ].includes(masterEvent.type as 'ui' | 'create' | 'viewport_change')
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
        // Move the toolbar to the valid position
        const toolbar = document.getElementsByClassName('blocklyToolboxDiv')[0];
        this.blockly.appendChild(toolbar);

        // Add OID display mode items to workspace context menu
        if (window.Blockly?.FieldOID?.DISPLAY_MODE_KEYS) {
            const workspace = this.blocklyWorkspace;
            const origConfigureContextMenu = workspace.configureContextMenu as unknown as
                ((options: unknown[], e: Event) => void) | undefined;
            // Blockly's configureContextMenu uses internal types not easily importable
            (
                workspace as unknown as { configureContextMenu: (options: unknown[], e: Event) => void }
            ).configureContextMenu = (menuOptions: unknown[], _e: Event) => {
                if (origConfigureContextMenu) {
                    origConfigureContextMenu.call(workspace, menuOptions, _e);
                }
                const FieldOID = window.Blockly.FieldOID!;
                const keys = FieldOID.DISPLAY_MODE_KEYS;
                for (let index = 0; index < keys.length; index++) {
                    const label =
                        BlocklyEditor.Blockly.Words?.[keys[index]]?.[I18n.getLanguage()] ||
                        BlocklyEditor.Blockly.Words?.[keys[index]]?.en ||
                        keys[index];
                    menuOptions.push({
                        text: `${FieldOID.displayMode === index ? '\u2713 ' : '   '}${label}`,
                        enabled: true,
                        callback: () => FieldOID.setDisplayMode(index, workspace),
                        scope: { workspace },
                        weight: 200 + index,
                    });
                }
            };
        }

        this.updateBackground();
        setTimeout(() => this.searchId(), 200); // select found blocks
    }

    updateBackground(): void {
        if (this.state.themeType === 'dark') {
            this.blocklyWorkspace?.setTheme(getBlocklyDarkTheme());
        } else if (this.blocklyWorkspace) {
            this.blocklyWorkspace.getThemeManager();
            this.blocklyWorkspace.setTheme(BlocklyEditor.Blockly.Themes.Classic);
        }
    }

    componentWillUnmount(): void {
        // Public methods consumed by Editor.tsx via blocklyEditorRef.
        // Referenced here so eslint's react/no-unused-class-component-methods
        // sees them as used (it can't trace cross-component ref usage).
        void this.appendBlocksFromXml;
        void this.applyAiBlocks;
        void this.getWorkspaceXml;

        if (!this.blocklyWorkspace) {
            return;
        }

        this.blocklyWorkspace.dispose();
        this.blocklyWorkspace = null;
        this.changeTimer && clearTimeout(this.changeTimer);
        this.changeTimer = null;
        window.removeEventListener('resize', this.onResizeBind);
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
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
                themeType={this.props.themeType}
                onClose={(text: string | undefined) => {
                    this.setState({ importText: false });
                    this.onImportBlocks(text);
                }}
            />
        ) : null;
    }

    renderDialogPrompt(): React.JSX.Element | null {
        if (!this.state.showInputPrompt) {
            return null;
        }
        return (
            <Dialog
                key="inputDialog"
                onClose={() => {
                    const cb = this.state.showInputPrompt?.callback;
                    if (cb) {
                        cb(null);
                    }
                    this.setState({ showInputPrompt: null });
                }}
                maxWidth="sm"
                fullWidth
                open={!0}
            >
                <DialogTitle>{this.state.showInputPrompt.promptText}</DialogTitle>
                <DialogContent>
                    <TextField
                        variant="standard"
                        fullWidth
                        autoFocus
                        value={this.state.showInputPrompt.value}
                        onKeyUp={e => {
                            if (e.key === 'Enter') {
                                const cb = this.state.showInputPrompt?.callback;
                                const value = this.state.showInputPrompt?.value;
                                if (cb) {
                                    cb(value === undefined ? null : value);
                                }
                                this.setState({ showInputPrompt: null });
                            }
                        }}
                        onChange={e => {
                            const showInputPrompt: {
                                promptText: string;
                                defaultText: string;
                                callback: (p1: string | null) => void;
                                value: string;
                            } = { ...this.state.showInputPrompt } as {
                                promptText: string;
                                defaultText: string;
                                callback: (p1: string | null) => void;
                                value: string;
                            };
                            if (this.state.showInputPrompt?.callback) {
                                showInputPrompt.callback = this.state.showInputPrompt?.callback;
                            }
                            showInputPrompt.value = e.target.value;
                            this.setState({ showInputPrompt });
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        disabled={!this.state.showInputPrompt.value}
                        onClick={() => {
                            const cb = this.state.showInputPrompt?.callback;
                            const value = this.state.showInputPrompt?.value;
                            if (cb) {
                                cb(value === undefined ? null : value);
                            }
                            this.setState({ showInputPrompt: null });
                        }}
                        color="primary"
                        startIcon={<IconOk />}
                    >
                        {I18n.t('Apply')}
                    </Button>
                    <Button
                        color="grey"
                        variant="contained"
                        onClick={() => {
                            const cb = this.state.showInputPrompt?.callback;
                            if (cb) {
                                cb(null);
                            }
                            this.setState({ showInputPrompt: null });
                        }}
                        startIcon={<IconCancel />}
                    >
                        {I18n.t('Close')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
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
                    ref={el => {
                        this.blockly = el;
                    }}
                    style={{
                        // marginLeft: 180,
                        width: '100%', // 'calc(100% - 180px)',
                        height: '100%',
                        // overflow: 'hidden',
                        position: 'relative',
                    }}
                />,

                this.renderDialogPrompt(),
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
