import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles';

import I18n from '@iobroker/adapter-react/i18n';
import DialogMessage from '@iobroker/adapter-react/Dialogs/Message';
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
        fill: '#515151 !important'
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
                console.log('Detected custom blockly: ' + adapters[id].common.name);
                toLoad.push(adapters[id].common.name);
            }
        }

        BlocklyEditor.loadScripts(toLoad, callback);
    }

    static loadXMLDoc(text) {
        let parseXml;
        if (window.DOMParser) {
            parseXml = function(xmlStr) {
                return ( new window.DOMParser() ).parseFromString(xmlStr, "text/xml");
            };
        } else if (typeof window.ActiveXObject != "undefined" && new window.ActiveXObject("Microsoft.XMLDOM")) {
            parseXml = function(xmlStr) {
                var xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
                xmlDoc.async = "false";
                xmlDoc.loadXML(xmlStr);
                return xmlDoc;
            };
        } else {
            parseXml = function() { return null; }
        }
        return parseXml(text);
    }

    static searchXml(root, text, _id, _result) {
        _result = _result || [];
        if (root.tagName === 'BLOCK') {
            _id = root.id;
        }
        if (root.tagName === 'FIELD') {
            for (let a = 0; a < root.attributes.length; a++) {
                const val = (root.attributes[a].value || '').toLowerCase();
                if (root.attributes[a].nodeName === 'name' && (val === 'oid' || val === 'text')) {
                    if (root.innerText.toLowerCase().indexOf(text) !== -1) {
                        _result.push(_id);
                    }
                }
            }
        }
        root.childNodes.forEach(node => BlocklyEditor.searchXml(node, text, _id, _result));
        return _result;
    }

    searchBlocks(text) {
        if (this.blocklyWorkspace) {
            const dom = this.Blockly.Xml.workspaceToDom(this.blocklyWorkspace);
            const ids = BlocklyEditor.searchXml(dom, text.toLowerCase());
            const allBlocks = this.blocklyWorkspace.getAllBlocks();
            const result = [];
            allBlocks.filter(b => ids.indexOf(b.id) !== -1).forEach(b => result.push(b));
            return result;
        }
    }

    searchId() {
        const blocks = this.lastSearch && this.searchBlocks(this.lastSearch);
        if (blocks && blocks.length) {
            this.someSelected = blocks;
            this.someSelected.forEach(b => b.addSelect());
            this.someSelectedTime = Date.now();
        } else if (this.someSelected) {
            // remove selection
            this.someSelected.forEach(b => b.removeSelect());
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
            this.searchId();
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

    blocklyRemoveOrphanedShadows() {
        if (this.blocklyWorkspace) {
            let blocks = this.blocklyWorkspace.getAllBlocks();
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
        xml = (xml || '').trim();
        if (xml) {
            try {
                if (!xml.startsWith('<xml')) {
                    xml = '<xml xmlns="http://www.w3.org/1999/xhtml">' + xml + '</xml>';
                }
                let variables = xml.replace(/[\n\r]/g, '').match(/<variables>(.*)<\/variables>/);
                if (variables) {
                    let vars = this.Blockly.utils.xml.textToDomDocument('<variables>' + variables[1] + '</variables>');
                    if (vars) {
                        let nodes = vars.childNodes && vars.childNodes[0] && vars.childNodes[0].childNodes;
                        if (nodes) {
                            for (let i = 0; i < nodes.length; i++) {
                                nodes[i].id && this.blocklyWorkspace.createVariable(nodes[i].id);
                            }
                        }
                    }
                }
                xml = xml.replace(/[\n\r]/g, '').replace(/<variables>.*<\/variables>/g, '');
                window.scripts.loading = true;
                let xmlBlocks = this.Blockly.Xml.textToDom(xml);
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
                this.setState({error: {text: e, title: I18n.t('Import error')}});
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
            const xml = this.jsCode2Blockly(this.originalCode) || '<xml xmlns="http://www.w3.org/1999/xhtml"></xml>';
            window.scripts.loading = true;
            const dom = this.Blockly.Xml.textToDom(xml);
            this.Blockly.Xml.domToWorkspace(dom, this.blocklyWorkspace);
            window.scripts.loading = false;
        } catch (e) {
            console.error(e);
            window.alert('Cannot extract Blockly code!');
        }
        setTimeout(() => this.ignoreChanges = false, 100);
    }

    onBlocklyChanged() {
        this.blocklyRemoveOrphanedShadows();
        this.setState({changed: true});
        this.onChange();
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
        toolboxXml  = toolboxXml  || this.Blockly.Xml.textToDom(toolboxText);

        this.blocklyWorkspace = this.Blockly.inject(
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
                move: {
                    scrollbars: true,
                    drag: true,
                    wheel: true
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
        // for blockly itself
        window.scripts = {
            blocklyWorkspace: this.blocklyWorkspace
        };

        // Listen to events on master workspace.
        this.blocklyWorkspace.addChangeListener(masterEvent => {
            if (this.someSelected && Date.now() - this.someSelectedTime > 500) {
                const allBlocks = this.blocklyWorkspace.getAllBlocks();
                this.someSelected = null;
                allBlocks.forEach(b => b.removeSelect());
            }

            if (masterEvent.type === this.Blockly.Events.UI || masterEvent.type === this.Blockly.Events.CREATE) {
                return;  // Don't mirror UI events.
            }
            if (this.ignoreChanges) return;
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
        this.changeTimer && clearTimeout(this.changeTimer);
        this.changeTimer = null;
        window.removeEventListener('resize', this.onResizeBind);
    }

    onChange() {
        this.originalCode = this.blocklyCode2JSCode();
        this.props.onChange && this.props.onChange(this.originalCode);
    }

    getToolbox() {
        // Interpolate translated messages into toolbox.
        let toolboxText = window.document.getElementById('toolbox').outerHTML;
        toolboxText = toolboxText.replace(/{(\w+)}/g, (m, p1) => window.MSG[p1]);

        if (this.Blockly.CustomBlocks) {
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
        }

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
                        text={typeof this.state.error === 'object' ? this.state.error.text.toString() : this.state.error}
                        title={typeof this.state.error === 'object' ? this.state.error.title : ''}
                        onClose={() => {
                            if (this.blinkBlock) {
                                this.blocklyBlinkBlock(this.blinkBlock);
                                this.blinkBlock = null;
                            }
                            this.setState({error: ''});
                        }}/>) :
                    null,

                this.state.exportText ? (<DialogExport key="dialogExport" theme={this.props.theme} onClose={() => this.setState({exportText: ''})} text={this.state.exportText}/>) : null,

                this.state.importText ? (<DialogImport key="dialogImport" theme={this.props.theme} onClose={text => {
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
