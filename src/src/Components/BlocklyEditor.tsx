import React from 'react';
import PropTypes from 'prop-types';

import { I18n, Message as DialogMessage } from '@iobroker/adapter-react-v5';
import DialogError from '../Dialogs/Error';
import DialogExport from '../Dialogs/Export';
import DialogImport from '../Dialogs/Import';

let languageBlocklyLoaded = false;
let languageOwnLoaded = false;
let toolboxText = null;
let toolboxXml;
let scriptsLoaded = [];

// BF (2020-10-31) I have no Idea, why it does not work as static in BlocklyEditor, but outside of BlocklyEditor it works
function searchXml(root, text, _id, _result) {
    _result = _result || [];
    if (root.tagName === 'BLOCK' || root.tagName === 'block') {
        _id = root.id;
    }
    if (root.tagName === 'FIELD' || root.tagName === 'field') {
        for (let a = 0; a < root.attributes.length; a++) {
            const val = (root.attributes[a].value || '').toLowerCase();
            if (root.attributes[a].nodeName === 'name' && (val === 'oid' || val === 'text' || val === 'var')) {
                if ((root.innerHTML || root.innerText || '').toLowerCase().includes(text)) {
                    _result.push(_id);
                }
            }
        }
    }
    root.childNodes.forEach(node =>
        searchXml(node, text, _id, _result));

    return _result;
}

class BlocklyEditor extends React.Component {
    constructor(props) {
        super(props);

        this.blockly = null;
        this.blocklyWorkspace = null;
        this.toolbox = null;
        this.Blockly = window.Blockly;

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
        this.changeTimer = null;

        this.onResizeBind = this.onResize.bind(this);

        this.lastCommand = '';
        this.lastSearch = this.props.searchText || '';
        this.blinkBlock = null;
        this.loadLanguages();
    }

    static loadJS(url, callback, location) {
        const scriptTag = document.createElement('script');
        try {
            scriptTag.src = url;

            scriptTag.onload = callback;
            scriptTag.onreadystatechange = callback;
            scriptTag.onerror = callback;

            (location || window.document.body).appendChild(scriptTag);
        } catch (e) {
            console.error(`Cannot load ${url}: ${e}`);
            callback && callback();
        }
    }

    static loadScripts(scripts, callback) {
        if (!scripts || !scripts.length) {
            return callback && callback();
        }
        const adapter = scripts.pop();
        if (!scriptsLoaded.includes(adapter)) {
            scriptsLoaded.push(adapter);
            BlocklyEditor.loadJS(`../../adapter/${adapter}/blockly.js`, (/*data, textStatus, jqxhr*/) =>
                setTimeout(() => BlocklyEditor.loadScripts(scripts, callback), 0));
        } else {
            setTimeout(() => BlocklyEditor.loadScripts(scripts, callback), 0);
        }
    }

    static loadCustomBlockly(adapters, callback) {
        // get all adapters, that can have blockly
        const toLoad = [];
        for (const id in adapters) {
            if (!adapters.hasOwnProperty(id) ||
                !adapters[id] ||
                !id.match(/^system\.adapter\./) ||
                adapters[id].type !== 'adapter'
            ) {
                continue;
            }

            if (adapters[id].common && adapters[id].common.blockly) {
                console.log(`Detected custom blockly: ${adapters[id].common.name}`);
                toLoad.push(adapters[id].common.name);
            }
        }

        BlocklyEditor.loadScripts(toLoad, callback);
    }

    static loadXMLDoc(text) {
        let parseXml;
        if (window.DOMParser) {
            parseXml = xmlStr => (new window.DOMParser()).parseFromString(xmlStr, 'text/xml');
        } else if (typeof window.ActiveXObject !== 'undefined' && new window.ActiveXObject('Microsoft.XMLDOM')) {
            parseXml = xmlStr => {
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

    searchBlocks(text) {
        if (this.blocklyWorkspace) {
            const dom = this.Blockly.Xml.workspaceToDom(this.blocklyWorkspace);
            const ids = searchXml(dom, text.toLowerCase());

            console.log(`Search "${text}" found blocks: ${ids.length ? JSON.stringify(ids) : 'none'}`);

            return ids;
        }

        return [];
    }

    searchId() {
        const ids = this.lastSearch && this.searchBlocks(this.lastSearch);
        if (ids && ids.length) {
            this.someSelected = ids;
            this.someSelected.forEach(id => this.blocklyWorkspace.highlightBlock(id, true));
            this.someSelectedTime = Date.now();
        } else if (this.someSelected) {
            // remove selection
            this.someSelected.forEach(id => this.blocklyWorkspace.highlightBlock(id, false));
            this.someSelected = null;
        }
    }

    UNSAFE_componentWillReceiveProps(nextProps) {
        if (nextProps.command && this.lastCommand !== nextProps.command) {
            this.lastCommand = nextProps.command;
            setTimeout(() => this.lastCommand = '', 300);
            if (this.lastCommand === 'check') {
                this.blocklyCheckBlocks((err, badBlock) => {
                    if (!err) {
                        this.setState({ message: I18n.t('Ok') });
                    } else {
                        badBlock && this.blocklyBlinkBlock(badBlock);
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

    loadLanguages() {
        // load blockly language
        if (!languageBlocklyLoaded) {
            const fileLang = window.document.createElement('script');
            fileLang.setAttribute('type', 'text/javascript');
            fileLang.setAttribute('src', `google-blockly/msg/js/${I18n.getLanguage()}.js`);

            // most browsers
            fileLang.onload = () => {
                languageBlocklyLoaded = true;
                this.setState({languageBlocklyLoaded});
            };
            // IE 6 & 7
            fileLang.onreadystatechange = () => {
                if (this.readyState === 'complete') {
                    languageBlocklyLoaded = true;
                    this.setState({ languageBlocklyLoaded });
                }
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
                this.setState({languageOwnLoaded});
            };
            // IE 6 & 7
            fileCustom.onreadystatechange = () => {
                if (this.readyState === 'complete') {
                    languageOwnLoaded = true;
                    this.setState({ languageOwnLoaded });
                }
            };
            window.document.getElementsByTagName('head')[0].appendChild(fileCustom);
        }
    }

    onResize() {
        this.Blockly.svgResize(this.blocklyWorkspace);
    }

    jsCode2Blockly(text) {
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

    blocklyBlinkBlock(block) {
        for (let i = 300; i < 3000; i += 300) {
            setTimeout(() => block.select(), i);
            setTimeout(() => block.unselect(), i + 150);
        }
    }

    blocklyRemoveOrphanedShadows() {
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

    blocklyCheckBlocks(cb) {
        let warningText;
        if (!this.blocklyWorkspace || this.blocklyWorkspace.getAllBlocks().length === 0) {
            cb && cb('no blocks found');
            return;
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
                this.blocklyBlinkBlock(badBlock);
            }
            return false;
        }

        cb();

        return true;
    }

    // get unconnected block
    blocklyGetUnconnectedBlock() {
        const blocks = this.blocklyWorkspace.getAllBlocks();
        let block;
        for (let i = 0; (block = blocks[i]); i++) {
            const connections = block.getConnections_(true);
            let conn;
            for (let j = 0; (conn = connections[j]); j++) {
                if (!conn.sourceBlock_ || ((conn.type === this.Blockly.INPUT_VALUE || conn.type === this.Blockly.OUTPUT_VALUE) && !conn.targetConnection && !conn._optional)) {
                    return block;
                }
            }
        }
        return null;
    }

    // get block with warning
    blocklyGetBlockWithWarning() {
        const blocks = this.blocklyWorkspace.getAllBlocks();
        let block;
        for (let i = 0; (block = blocks[i]); i++) {
            if (block.warning) {
                return block;
            }
        }
        return null;
    }

    blocklyCode2JSCode(oneWay) {
        let code = this.Blockly.JavaScript.workspaceToCode(this.blocklyWorkspace);
        if (!oneWay) {
            code += '\n';
            const dom = this.Blockly.Xml.workspaceToDom(this.blocklyWorkspace);
            const text = this.Blockly.Xml.domToText(dom);
            code += `//${btoa(encodeURIComponent(text))}`;
        }

        return code;
    }

    exportBlocks() {
        let exportText;
        const selectedBlocks = this.Blockly.getSelected();
        if (selectedBlocks) {
            const xmlBlock = this.Blockly.Xml.blockToDom(selectedBlocks);
            if (this.Blockly.dragMode_ !== this.Blockly.DRAG_FREE) {
                this.Blockly.Xml.deleteNext(xmlBlock);
            }
            // Encode start position in XML.
            const xy = selectedBlocks.getRelativeToSurfaceXY();
            xmlBlock.setAttribute('x', selectedBlocks.RTL ? -xy.x : xy.x);
            xmlBlock.setAttribute('y', xy.y);

            exportText = this.Blockly.Xml.domToPrettyText(xmlBlock);
        } else {
            const dom = this.Blockly.Xml.workspaceToDom(this.blocklyWorkspace);
            exportText = this.Blockly.Xml.domToPrettyText(dom);
        }
        this.setState({ exportText });
    }

    importBlocks() {
        this.setState({ importText: true });
    }

    onImportBlocks(xml) {
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

                const xmlBlocks = this.Blockly.utils.xml.textToDom(xml);
                if (xmlBlocks.nodeName === 'xml') {
                    for (let b = 0; b < xmlBlocks.children.length; b++) {
                        this.blocklyWorkspace.paste(xmlBlocks.children[b]);
                    }
                } else {
                    this.blocklyWorkspace.paste(xmlBlocks);
                }

                window.scripts.loading = false;

                this.onBlocklyChanged();
            } catch (e) {
                this.setState({ error: { text: e, title: I18n.t('Import error') } });
            }
        }
    }

    loadCode() {
        if (!this.blocklyWorkspace) {
            return;
        }

        this.ignoreChanges = true;
        this.blocklyWorkspace.clear();

        try {
            const xml = this.jsCode2Blockly(this.originalCode) || '<xml xmlns="https://developers.google.com/blockly/xml"></xml>';
            window.scripts.loading = true;
            const dom = this.Blockly.utils.xml.textToDom(xml);
            this.Blockly.Xml.domToWorkspace(dom, this.blocklyWorkspace);
            window.scripts.loading = false;
        } catch (e) {
            console.error(e);
            setTimeout(() => this.setState({ error: I18n.t('Cannot extract Blockly code!') }));
        }
        setTimeout(() => this.ignoreChanges = false, 100);
    }

    onBlocklyChanged() {
        this.blocklyRemoveOrphanedShadows();
        this.setState({ changed: true });
        this.onChange();
    }

    async componentDidUpdate() {
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
        toolboxXml  = toolboxXml  || this.Blockly.utils.xml.textToDom(toolboxText);

        this.darkTheme = this.Blockly.Theme.defineTheme('dark', {
            base: this.Blockly.Themes.Classic,
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
                blackBackground: '#333',
            },
        });

        // https://developers.google.com/blockly/reference/js/blockly.blocklyoptions_interface.md
        this.blocklyWorkspace = this.Blockly.inject(
            this.blockly,
            {
                renderer: 'thrasos',
                theme: 'classic',
                media: 'google-blockly/media/',
                toolbox: toolboxXml,
                zoom: {
                    controls:   true,
                    wheel:      false,
                    startScale: 1.0,
                    maxScale:   3,
                    minScale:   0.3,
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
                    spacing:    25,
                    length:     1,
                    snap:       true,
                },
                sounds: false, // disable sounds
            },
        );
        // for blockly itself
        window.scripts = {
            blocklyWorkspace: this.blocklyWorkspace,
        };

        // Workaround: Replace procedure category flyout
        this.blocklyWorkspace.registerToolboxCategoryCallback('PROCEDURE', this.Blockly.Procedures.flyoutCategoryNew);

        // Listen to events on master workspace.
        this.blocklyWorkspace.addChangeListener(masterEvent => {
            if (this.someSelected && Date.now() - this.someSelectedTime > 500) {
                const allBlocks = this.blocklyWorkspace.getAllBlocks();
                this.someSelected = null;
                allBlocks.forEach(b => b.removeSelect());
            }

            if ([this.Blockly.Events.UI, this.Blockly.Events.CREATE, this.Blockly.Events.VIEWPORT_CHANGE].includes(masterEvent.type)) {
                return;  // Don't mirror UI events.
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

    updateBackground() {
        if (this.state.themeType === 'dark' || this.state.themeType === 'blue') {
            this.blocklyWorkspace.setTheme(this.darkTheme);
        } else {
            this.blocklyWorkspace.getThemeManager();
            this.blocklyWorkspace.setTheme(this.Blockly.Themes.Classic);
        }
    }

    componentWillUnmount() {
        if (!this.blocklyWorkspace) {
            return;
        }
        this.blocklyWorkspace.dispose();
        this.blocklyWorkspace = null;
        this.changeTimer && clearTimeout(this.changeTimer);
        this.changeTimer = null;
        window.removeEventListener('resize', this.onResizeBind);
    }

    onChange() {
        this.originalCode = this.blocklyCode2JSCode();
        this.props.onChange && this.props.onChange(this.originalCode);
    }

    async getToolbox(retry) {
        // Interpolate translated messages into toolbox.
        const el =  window.document.getElementById('toolbox');
        let toolboxText = el && el.outerHTML;
        if (!toolboxText) {
            if (!retry) {
                return new Promise(resolve => { setTimeout(() => resolve(this.getToolbox(true)), 500); });
            }

            console.error('Cannot load blocks!');
            return '';
        }
        toolboxText = toolboxText.replace(/{(\w+)}/g, (m, p1) => window.MSG[p1]);

        if (this.Blockly.CustomBlocks) {
            let blocks = '';
            const lang = I18n.getLanguage();
            for (let cb = 0; cb < this.Blockly.CustomBlocks.length; cb++) {
                const name = this.Blockly.CustomBlocks[cb];
                // add blocks
                blocks += `<category name="${this.Blockly.Words[name][lang]}" colour="${this.Blockly[name].HUE}">`;
                for (const _b in this.Blockly[name].blocks) {
                    if (Object.prototype.hasOwnProperty.call(this.Blockly[name].blocks, _b)) {
                        blocks += this.Blockly[name].blocks[_b];
                    }
                }
                blocks += '</category>';
            }
            toolboxText = toolboxText.replace('<category><block>%%CUSTOM_BLOCKS%%</block></category>', blocks);
        }

        return toolboxText;
    }

    renderMessageDialog() {
        return this.state.message ?
            <DialogMessage
                key="dialogMessage"
                text={typeof this.state.message === 'object' ? this.state.message.text : this.state.message}
                title={typeof this.state.message === 'object' ? this.state.message.title : ''}
                onClose={() => this.setState({ message: '' })}
            /> :
            null;
    }

    renderErrorDialog() {
        return this.state.error ?
            <DialogError
                key="dialogError"
                text={typeof this.state.error === 'object' ? this.state.error.text.toString() : this.state.error}
                title={typeof this.state.error === 'object' ? this.state.error.title : ''}
                onClose={() => {
                    if (this.blinkBlock) {
                        this.blocklyBlinkBlock(this.blinkBlock);
                        this.blinkBlock = null;
                    }
                    this.setState({ error: '' });
                }}/> :
            null;
    }

    renderExportDialog() {
        return this.state.exportText ? <DialogExport key="dialogExport" theme={this.state.themeType} onClose={() => this.setState({ exportText: '' })} text={this.state.exportText} scriptId={this.props.scriptId} /> : null;
    }

    renderImportDialog() {
        return this.state.importText ? <DialogImport
            key="dialogImport"
            onClose={text => {
                this.setState({ importText: false });
                this.onImportBlocks(text);
            }}
        /> : null;
    }

    render() {
        if (this.state.languageBlocklyLoaded && this.state.languageOwnLoaded) {
            this.didUpdate = setTimeout(() => {
                this.didUpdate = null;
                this.componentDidUpdate();
            }, 100);

            return [
                <div
                    key="blocklyDOM"
                    ref={el => this.blockly = el}
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

BlocklyEditor.propTypes = {
    command: PropTypes.string,
    onChange: PropTypes.func,
    searchText: PropTypes.string,
    scriptId: PropTypes.string,
    themeType: PropTypes.string,
};

export default BlocklyEditor;
