import React from 'react';
import PropTypes from 'prop-types';
import DialogMessage from './Dialogs/Message';
import DialogError from './Dialogs/Error';

import I18n from './i18n';
import DialogExport from "./Dialogs/Export";
import DialogImport from "./Dialogs/Import";

let languageBlocklyLoaded = false;
let languageOwnLoaded = false;
let toolboxText = null;
let toolboxXml;

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
            exportText: '',
            importText: false
        };
        this.originalCode = props.code || '';

        this.onResizeBind = this.onResize.bind(this);

        this.lastCommand = '';
        this.blinkBlock = null;
        this.loadLanguages();
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
        if (this.originalCode !== nextProps.code) {
            this.originalCode = nextProps.code || '';
            this.loadCode();
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
        for (let i = 0, block; block = blocks[i]; i++) {
            const connections = block.getConnections_(true);
            for (let j = 0, conn; conn = connections[j]; j++) {
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
        for (let i = 0, block; block = blocks[i]; i++) {
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
                (<div ref={el => this.blockly = el} style={{width: '100%', height: '100%', overflow: 'hidden', position: 'relative'}}/>),

                this.state.message ?
                    (<DialogMessage
                        text={typeof this.state.message === 'object' ? this.state.message.text : this.state.message}
                        title={typeof this.state.message === 'object' ? this.state.message.title : ''}
                        onClose={() => this.setState({message: ''})}
                    />) :
                    null,

                this.state.error ?
                    (<DialogError
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
                
                this.state.exportText ? (<DialogExport onClose={() => this.setState({exportText: ''})} text={this.state.exportText}/>) : null,
                
                this.state.importText ? (<DialogImport onClose={text => {
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
    onChange: PropTypes.func
};

export default BlocklyEditor;
