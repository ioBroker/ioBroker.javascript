import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles';

import I18n from '../i18n';
import DialogMessage from '../Dialogs/Message';
import DialogError from '../Dialogs/Error';
import DialogExport from '../Dialogs/Export';
import DialogImport from '../Dialogs/Import';

let languageBlocklyLoaded = false;
let languageOwnLoaded = false;
let toolboxText = null;
let toolboxXml;
let scriptsLoaded = [];
const styles = theme => ({
    darkBackground: {
        stroke: '#3a3a3a !important',
        fill: '#808080 !important'
    }
});

class BlocklyEditor extends React.Component {
    constructor(props) {
        super(props);

        this.blockly = null; //ref
        this.blocklyWorkspace = null;
        this.toolbox = null;
        this.Blockly = window.Blockly;

        this.state = {
            languageOwnLoaded,
            languageBlocklyLoaded,
            changed: false,
            message: '',
            error: '',
            theme: this.props.theme,
            exportText: '',
            importText: false,
            searchText: this.props.searchText || '',
        };
        this.originalCode = props.code || '';

        this.someSelected = false;

        this.onResizeBind = this.onResize.bind(this);

        this.lastCommand = '';
        this.blinkBlock = null;
        this.loadLanguages();
    }

    static loadJS(url, callback, location) {
        const scriptTag = document.createElement('script');
        scriptTag.src = url;

        scriptTag.onload = callback;
        scriptTag.onreadystatechange = callback;

        try {
            (location || window.document.body).appendChild(scriptTag);
        } catch (e) {
            console.error('Cannot load ' + url + ': ' + e);
            callback && callback();
        }
    };

    static loadScripts(scripts, callback) {
        if (!scripts || !scripts.length) {
            return callback && callback();
        }
        const adapter = scripts.pop();
        if (scriptsLoaded.indexOf(adapter) === -1) {
            scriptsLoaded.push(adapter);
            BlocklyEditor.loadJS('../../adapter/' + adapter + '/blockly.js', (/*data, textStatus, jqxhr*/) =>
                setTimeout(() => BlocklyEditor.loadScripts(scripts, callback), 0));
        } else {
            setTimeout(() => BlocklyEditor.loadScripts(scripts, callback), 0);
        }
    }

    static loadCustomBlockly(objects, callback) {
        // get all adapters, that can have blockly
        const toLoad = [];
        for (const id in objects) {
            if (!objects.hasOwnProperty(id) || !objects[id]) continue;
            if (!id.match(/^system\.adapter\./)) continue;
            if (objects[id].type !== 'adapter') continue;
            if (objects[id].common && objects[id].common.blockly) {
                console.log('Detected custom blockly: ' + objects[id].common.name);
                toLoad.push(objects[id].common.name);
            }
        }

        BlocklyEditor.loadScripts(toLoad, callback);
    }

    searchBlocks(text) {
        const dom = this.Blockly.Xml.workspaceToDom(this.blocklyWorkspace);
        let exportText = this.Blockly.Xml.domToPrettyText(dom).toLowerCase();
        const blocks = exportText.match(/<shadow type="field_oid" id="[^"]+">\n\s*<field name="oid">[^<]+<\/field>/gi);
        if (blocks) {
            const ids = blocks.map(b => {
                const m = b.match(/id="([^"]+)"/g);
                return m && m[0].substring(4, m[0].length - 1);
            }).filter(id => !!id);
            const allBlocks = this.blocklyWorkspace.getAllBlocks();
            return allBlocks.filter(b => {
                return ids.indexOf(b.id.toLowerCase()) !== -1;
            });
        } else {
            return [];
        }
    }

    searchId() {
        const blocks = this.lastSearch && this.searchBlocks(this.lastSearch);
        if (blocks && blocks.length) {
            this.someSelected = true;
            blocks.forEach(b => b.addSelect());
        }
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.command && this.lastCommand !== nextProps.command) {
            this.lastCommand = nextProps.command;
            setTimeout(() => this.lastCommand = '', 300);
            if (this.lastCommand === 'check') {
                this.blocklyCheckBlocks((err, badBlock) => {
                    if (!err) {
                        this.setState({message: I18n.t('Ok')});
                    } else {
                        badBlock && this.blocklyBlinkBlock(badBlock);
                        this.setState({error: {text: I18n.t(err), title: I18n.t('Error was found')}});
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
        if (this.state.theme !== nextProps.theme) {
            this.setState({theme: nextProps.theme}, () => this.updateBackground());
        }

        if (this.originalCode !== nextProps.code) {
            this.originalCode = nextProps.code || '';
            this.loadCode();
            this.lastSearch && this.searchId();
        }
    }

    loadLanguages() {
        // load blockly language
        if (!languageBlocklyLoaded) {
            const fileLang = window.document.createElement('script');
            fileLang.setAttribute('type', 'text/javascript');
            fileLang.setAttribute('src', 'google-blockly/msg/js/' + I18n.getLanguage() + '.js');

            // most browsers
            fileLang.onload = () => {
                languageBlocklyLoaded = true;
                this.setState({languageBlocklyLoaded});
            };
            // IE 6 & 7
            fileLang.onreadystatechange = () => {
                if (this.readyState === 'complete') {
                    languageBlocklyLoaded = true;
                    this.setState({languageBlocklyLoaded});
                }
            };
            window.document.getElementsByTagName('head')[0].appendChild(fileLang);
        }
        if (!languageOwnLoaded) {
            const fileCustom = window.document.createElement('script');
            fileCustom.setAttribute('type', 'text/javascript');
            fileCustom.setAttribute('src', 'google-blockly/own/msg/' + I18n.getLanguage() + '.js');
            // most browsers
            fileCustom.onload = () => {
                languageOwnLoaded = true;
                this.setState({languageOwnLoaded});
            };
            // IE 6 & 7
            fileCustom.onreadystatechange = () => {
                if (this.readyState === 'complete') {
                    languageOwnLoaded = true;
                    this.setState({languageOwnLoaded});
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
        } else {
            let code;
            try {
                code = window.decodeURIComponent(window.atob(xml));
            } catch (e) {
                code = null;
                console.error('cannot decode: ' + xml);
                console.error(e);
            }
            return code;
        }
    }

    blocklyBlinkBlock(block) {
        for (let i = 300; i < 3000; i = i + 300) {
            setTimeout(() => block.select(), i);
            setTimeout(() => block.unselect(), i + 150);
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
            if (badBlock) warningText = 'warning on this block';
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
    blocklyGetUnconnectedBlock () {
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
            code += '//' + btoa(encodeURIComponent(text));
        }

        return code;
    }

    exportBlocks() {
        let exportText;
        if (this.Blockly.selected) {
            const xmlBlock = this.Blockly.Xml.blockToDom(this.Blockly.selected);
            if (this.Blockly.dragMode_ !== this.Blockly.DRAG_FREE) {
                this.Blockly.Xml.deleteNext(xmlBlock);
            }
            // Encode start position in XML.
            const xy = this.Blockly.selected.getRelativeToSurfaceXY();
            xmlBlock.setAttribute('x', this.Blockly.selected.RTL ? -xy.x : xy.x);
            xmlBlock.setAttribute('y', xy.y);

            exportText = this.Blockly.Xml.domToPrettyText(xmlBlock);
        } else {
            const dom = this.Blockly.Xml.workspaceToDom(this.blocklyWorkspace);
            exportText = this.Blockly.Xml.domToPrettyText(dom);
        }
        this.setState({exportText});
    }
    
    importBlocks() {
        this.setState({importText: true});
    }
    
    onImportBlocks(xml) {
        if ((xml || '').trim()) {
            try {
                let xmlBlocks = this.Blockly.Xml.textToDom(xml);
                if (xmlBlocks.nodeName === 'xml') {
                    for (let b = 0; b < xmlBlocks.children.length; b++) {
                        this.blocklyWorkspace.paste(xmlBlocks.children[b]);
                    }
                } else {
                    this.blocklyWorkspace.paste(xmlBlocks);
                }
            } catch (e) {
                this.setState({error: {text: e, title: I18n.t('Import error')}});
            }
        }
    }

    loadCode() {
        if (!this.blocklyWorkspace) return;

        this.ignoreChanges = true;
        this.blocklyWorkspace.clear();

        try {
            const xml = this.jsCode2Blockly(this.originalCode) || '<xml xmlns="http://www.w3.org/1999/xhtml"></xml>';
            const dom = this.Blockly.Xml.textToDom(xml);
            this.Blockly.Xml.domToWorkspace(dom, this.blocklyWorkspace);
        } catch (e) {
            console.error(e);
            window.alert('Cannot extract Blockly code!');
        }
        setTimeout(() => this.ignoreChanges = false, 100);
    }

    componentDidUpdate() {
        if (!this.blockly) return;
        if (this.didUpdate) {
            clearTimeout(this.didUpdate);
            this.didUpdate = null;
        }

        if (this.blocklyWorkspace) return;

        window.addEventListener('resize', this.onResizeBind, false);
        toolboxText = toolboxText || this.getToolbox();
        toolboxXml = toolboxXml || window.Blockly.Xml.textToDom(toolboxText);

        this.blocklyWorkspace = window.Blockly.inject(
            this.blockly,
            {
                media: 'google-blockly/media/',
                toolbox: toolboxXml,
                zoom: {
                    controls:   true,
                    wheel:      false,
                    startScale: 1.0,
                    maxScale:   3,
                    minScale:   0.3,
                    scaleSpeed: 1.2
                },
                trashcan: true,
                grid: {
                    spacing:    25,
                    length:     3,
                    colour:     '#ccc',
                    snap:       true
                }
            }
        );
        // Listen to events on master workspace.
        this.blocklyWorkspace.addChangeListener(masterEvent => {
            if (this.someSelected) {
                const allBlocks = this.blocklyWorkspace.getAllBlocks();
                this.someSelected = false;
                allBlocks.forEach(b => b.removeSelect());
            }

            if (masterEvent.type === window.Blockly.Events.UI || masterEvent.type === window.Blockly.Events.CREATE) {
                return;  // Don't mirror UI events.
            }
            if (this.ignoreChanges) return;
            this.setState({changed: true});
            this.onChange();
        });
        this.loadCode();
        this.onResize();
        // Move toolbar to the valid position
        const toolbar = document.getElementsByClassName('blocklyToolboxDiv')[0];
        this.blockly.appendChild(toolbar);

        // for blockly itself
        window.scripts = {
            blocklyWorkspace: this.blocklyWorkspace
        };

        this.updateBackground();
    }

    updateBackground() {
        const background = document.getElementsByClassName('blocklyMainBackground')[0];
        if (this.state.theme === 'dark') {
            let found = 0;
            for (let i = 0; i < background.classList.length; i++) {
                if (background.classList[i] === this.props.classes.darkBackground) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                background.classList.add(this.props.classes.darkBackground);
            }
        } else {
            background.classList.remove(this.props.classes.darkBackground);
        }
    }

    componentWillUnmount() {
        if (!this.blocklyWorkspace) return;
        this.blocklyWorkspace.dispose();
        this.blocklyWorkspace = null;
        window.removeEventListener('resize', this.onResizeBind);
    }

    onChange() {
        this.props.onChange && this.props.onChange(this.blocklyCode2JSCode());
    }

    getToolbox() {
        // Interpolate translated messages into toolbox.
        let toolboxText = window.document.getElementById('toolbox').outerHTML;
        toolboxText = toolboxText.replace(/{(\w+)}/g, (m, p1) => window.MSG[p1]);

        let blocks = '';
        const lang = I18n.getLanguage();
        for (let cb = 0; cb < this.Blockly.CustomBlocks.length; cb++) {
            const name = this.Blockly.CustomBlocks[cb];
            // add blocks
            blocks += '<category name="' + this.Blockly.Words[name][lang] + '" colour="' + this.Blockly[name].HUE + '">';
            for (const _b in this.Blockly[name].blocks) {
                if (this.Blockly[name].blocks.hasOwnProperty(_b)) {
                    blocks += this.Blockly[name].blocks[_b];
                }
            }
            blocks += '</category>';
        }
        toolboxText = toolboxText.replace('<category><block>%%CUSTOM_BLOCKS%%</block></category>', blocks);
        return toolboxText;
    }

    render() {
        if (this.state.languageBlocklyLoaded && this.state.languageOwnLoaded) {
            this.didUpdate = setTimeout(() => {
                this.didUpdate = null;
                this.componentDidUpdate();
            }, 100);

            return [
                (<div key="blocklyDOM" ref={el => this.blockly = el} style={{
                    //marginLeft: 180,
                    width: '100%',//'calc(100% - 180px)',
                    height: '100%',
                    //overflow: 'hidden',
                    position: 'relative'}}/>),

                this.state.message ?
                    (<DialogMessage
                        key="dialogMessage"
                        text={typeof this.state.message === 'object' ? this.state.message.text : this.state.message}
                        title={typeof this.state.message === 'object' ? this.state.message.title : ''}
                        onClose={() => this.setState({message: ''})}
                    />) :
                    null,

                this.state.error ?
                    (<DialogError
                        key="dialogError"
                        text={typeof this.state.error === 'object' ? this.state.error.text : this.state.error}
                        title={typeof this.state.error === 'object' ? this.state.error.title : ''}
                        onClose={() => {
                            if (this.blinkBlock) {
                                this.blocklyBlinkBlock(this.blinkBlock);
                                this.blinkBlock = null;
                            }
                            this.setState({error: ''});
                        }}/>) :
                    null,
                
                this.state.exportText ? (<DialogExport key="dialogExport" onClose={() => this.setState({exportText: ''})} text={this.state.exportText}/>) : null,
                
                this.state.importText ? (<DialogImport key="dialogImport" onClose={text => {
                    this.setState({importText: false});
                    this.onImportBlocks(text);
                }}/>) : null
            ];
        } else {
            return null;
        }
    }
}

BlocklyEditor.propTypes = {
    command: PropTypes.string,
    onChange: PropTypes.func,
    searchText: PropTypes.string,
    theme: PropTypes.string
};

export default withStyles(styles)(BlocklyEditor);
