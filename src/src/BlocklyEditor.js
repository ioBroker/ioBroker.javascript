import React from 'react';
import PropTypes from 'prop-types';

import I18n from './i18n';

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
        };
        this.originalCode = props.code || '';
        window.systemLang = I18n.getLanguage();
        window.main = {
            objects: {},
            initSelectId: function () {}
        };

        this.onResizeBind = this.onResize.bind(this);

        this.loadLanguages();
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

    componentWillReceiveProps(nextProps) {
        if (this.originalCode !== nextProps.code) {
            this.originalCode = nextProps.code || '';
            this.loadCode();
        }
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
                this.componentDidUpdate()
            }, 100);

            return (
                <div ref={el => this.blockly = el} style={{width: '100%', height: '100%', overflow: 'hidden', position: 'relative'}}/>
            );
        } else {
            return null;
        }
    }
}

BlocklyEditor.propTypes = {
    onChange: PropTypes.func
};

export default BlocklyEditor;
