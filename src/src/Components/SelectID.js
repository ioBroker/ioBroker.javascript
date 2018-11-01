import React from 'react';
import PropTypes from 'prop-types';
import Button from '@material-ui/core/Button';
import TreeDataTable from './cp-react-tree-table/src';
import {withStyles} from '@material-ui/core/styles';
import {FaFolder as IconClosed} from 'react-icons/fa';
import {FaFolderOpen as IconOpen} from 'react-icons/fa';
import I18n from '../i18n';
import CircularProgress from '@material-ui/core/CircularProgress';
import Utils from './Utils';

const styles = theme => ({
    treeTable: {
        background: '#ffffff',
        borderTop: '1px solid #999',
        borderBottom: '1px solid #999'
    },
    treeTableRow: {
        boxShadow: 'inset 0 1px 0 #eeeeee'
    },

    cellWrapper: {
        display: 'flex',
        alignItems: 'center',
        fontWeight: 300,
        fontSize: 13,
        height: '100%',
        width: '100%',
        fontFamily: "'SF Mono', 'Segoe UI Mono', 'Roboto Mono', Menlo, Courier, monospace"
    },

    cellWrapperElement: {
        flexGrow: 1
    },

    toggleButtonWrapper: {
        width: 16,
        flexGrow: 0,
        color: '#0f55eb',
        cursor: 'pointer',
        padding: 1,
        borderRadius: 3
    },
    
    /*.toggle-button-wrapper > span:hover {
        background: #d7d7d7;
    }*/
    
    selectSpan: {
        fontFamily: "'SF Mono', 'Segoe UI Mono', 'Roboto Mono', Menlo, Courier, monospace",
        background: '#efefef',
        border: '1px solid #e5e5e5',
        padding: 2,
        borderRadius: 3
    },
    selected: {
        background: '#0f55eb',
        color: 'white'
    }
});

// d=data, t=target, s=start, e=end, m=middle
function binarySearch(d, t, s, e) {
    s = s || 0;
    if (e === undefined) {
        e = d.length - 1;
        if (!e) {
            return d[0] === t;
        }
    }
    const m = Math.floor((s + e) / 2);
    if (t === d[m]) return d[m];
    if (e - 1 === s) return d[s] === t || d[e] === t;
    if (t > d[m]) return binarySearch(d, t, m, e);
    if (t < d[m]) return binarySearch(d, t, s, m);
}

function walkTree(tree, func) {
    func(tree);
    if (tree.children) {
        tree.children.forEach(item => walkTree(item, func));
    }
}

function buildTree(objects, options) {
    options = options || {};

    const ids = Object.keys(objects);
    ids.sort((a, b) => {
        if (a === b) return 0;
        a = a.replace(/\./g, '!!!');
        b = b.replace(/\./g, '!!!');
        if (a > b) return 1;
        return -1;
    });

    // find empty nodes and create names for it
    let currentPathArr = [];
    let currentPath = '';
    let currentPathLen = 0;
    let root = {data: {name: '', id: ''}, children: []};

    let info = {
        funcEnums: [],
        roomEnums: [],
        roles: [],
        ids: [],
        objects
    };

    let croot = root;
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const parts = id.split('.');

        if (objects[id]) {
            if (objects[id].common && objects[id].common.role) {
                if (info.roles.indexOf(objects[id].common.role) === -1) {
                    info.roles.push(objects[id].common.role);
                }
            } else if (id.startsWith('enum.rooms.')) {
                info.roomEnums.push(id);
            } else if (id.startsWith('enum.funcs.')) {
                info.funcEnums.push(id);
            }
        }

        if (options.statesOnly && (!objects[id] || objects[id].type !== 'state')) {
            continue;
        }
        info.ids.push(id);

        let repeat;
        // if next level
        do {
            repeat = false;
            if (!currentPath || id.substring(0, currentPath.length + 1) === currentPath + '.') {
                if (parts.length - currentPathLen > 1) {
                    let curPath = currentPath;
                    for (let k = currentPathLen; k < parts.length - 1; k++) {
                        curPath += (curPath ? '.' : '') + parts[k];
                        if (!binarySearch(info.ids, curPath)) {
                            const _croot = {data: {name: parts[k], parent: croot, id: curPath}};
                            croot.children = croot.children || [];
                            croot.children.push(_croot);
                            croot = _croot;
                            //ids.splice(i, 0, curPath);
                            info.ids.push(curPath);
                            //i++;
                        } else {
                            croot = croot.children.find(item => item.data.name === parts[k]);
                        }
                    }
                }

                const _croot = {data: {name: parts[parts.length - 1], obj: objects[id], parent: croot, id}, children: []};
                croot.children = croot.children || [];
                croot.children.push(_croot);
                croot = _croot;

                currentPathLen = parts.length;
                currentPathArr = parts;
                currentPath    = id;
            } else {
                let u = 0;
                while (currentPathArr[u] === parts[u]) u++;
                if (u > 0) {
                    let move = currentPathArr.length;
                    currentPathArr = currentPathArr.splice(0, u);
                    currentPathLen = u;
                    currentPath = currentPathArr.join('.');
                    while (move > u) {
                        croot = croot.data.parent;
                        move--;
                    }
                } else {
                    croot = root;
                    currentPathArr = [];
                    currentPath = '';
                    currentPathLen = 0;
                }
                repeat = true;
            }
        } while(repeat);
    }

    /*walkTree(root, item => {
        console.log(item.data.id);
    })*/
    return {info, root};
}

function getName(name, lang) {
    if (name && typeof name === 'object') {
        return name[lang] || name.en;
    } else {
        return name || '';
    }
}

function findRoomsForObject(data, id, lang, withParentInfo, rooms) {
    if (!id) {
        return [];
    }
    rooms = rooms || [];
    for (let i = 0; i < data.roomEnums.length; i++) {
        const common = data.objects[data.roomEnums[i]] && data.objects[data.roomEnums[i]].common;
        const name = getName(common.name, lang);

        if (common.members && common.members.indexOf(id) !== -1 && rooms.indexOf(name) === -1) {
            if (!withParentInfo) {
                rooms.push(name);
            } else {
                rooms.push({name: name, origin: id});
            }
        }
    }
    const parts = id.split('.');
    parts.pop();
    id = parts.join('.');
    if (data.objects[id]) {
        findRoomsForObject(data, id, lang, withParentInfo, rooms);
    }

    return rooms;
}

function findRoomsForObjectAsIds(data, id, rooms) {
    if (!id) {
        return [];
    }
    rooms = rooms || [];
    for (let i = 0; i < data.roomEnums.length; i++) {
        const common = data.objects[data.roomEnums[i]] && data.objects[data.roomEnums[i]].common;
        if (common && common.members && common.members.indexOf(id) !== -1 &&
            rooms.indexOf(data.roomEnums[i]) === -1) {
            rooms.push(data.roomEnums[i]);
        }
    }
    return rooms;
}

function findFunctionsForObject(data, id, lang, withParentInfo, funcs) {
    if (!id) {
        return [];
    }
    funcs = funcs || [];
    for (let i = 0; i < data.funcEnums.length; i++) {
        const common = data.objects[data.funcEnums[i]] && data.objects[data.funcEnums[i]].common;
        const name = getName(common.name);
        if (common && common.members && common.members.indexOf(id) !== -1 && funcs.indexOf(name) === -1) {
            if (!withParentInfo) {
                funcs.push(name, lang);
            } else {
                funcs.push({name: name, origin: id});
            }
        }
    }
    const parts = id.split('.');
    parts.pop();
    id = parts.join('.');
    if (data.objects[id]) {
        findFunctionsForObject(data, id, lang, withParentInfo, funcs);
    }

    return funcs;
}

function findFunctionsForObjectAsIds(data, id, funcs) {
    if (!id) {
        return [];
    }
    funcs = funcs || [];
    for (var i = 0; i < data.funcEnums.length; i++) {
        var common = data.objects[data.funcEnums[i]] && data.objects[data.funcEnums[i]].common;
        if (common && common.members && common.members.indexOf(id) !== -1 &&
            funcs.indexOf(data.funcEnums[i]) === -1) {
            funcs.push(data.funcEnums[i]);
        }
    }

    return funcs;
}

function getStates(obj) {
    let states;
    if (obj &&
        obj.common &&
        obj.common.states) {
        states = obj.common.states;
    }
    if (states) {
        if (typeof states === 'string' && states[0] === '{') {
            try {
                states = JSON.parse(states);
            } catch (ex) {
                console.error('Cannot parse states: ' + states);
                states = null;
            }
        } else
        // if old format val1:text1;val2:text2
        if (typeof states === 'string') {
            const parts = states.split(';');
            states = {};
            for (let p = 0; p < parts.length; p++) {
                const s = parts[p].split(':');
                states[s[0]] = s[1];
            }
        }
    }
    return states;
}

function quality2text(q) {
    if (!q) return 'ok';
    const custom = q & 0xFFFF0000;
    let text = '';
    if (q & 0x40) text += 'device';
    if (q & 0x80) text += 'sensor';
    if (q & 0x01) text += ' bad';
    if (q & 0x02) text += ' not connected';
    if (q & 0x04) text += ' error';

    return text + (custom ? '|0x' + (custom >> 16).toString(16).toUpperCase() : '') + ' [0x' + q.toString(16).toUpperCase() + ']';
}

function formatDate(dateObj) {
    //return dateObj.getFullYear() + '-' +
    //    ('0' + (dateObj.getMonth() + 1).toString(10)).slice(-2) + '-' +
    //    ('0' + (dateObj.getDate()).toString(10)).slice(-2) + ' ' +
    //    ('0' + (dateObj.getHours()).toString(10)).slice(-2) + ':' +
    //    ('0' + (dateObj.getMinutes()).toString(10)).slice(-2) + ':' +
    //    ('0' + (dateObj.getSeconds()).toString(10)).slice(-2);
    // Following implementation is 5 times faster
    if (!dateObj) return '';

    var text = dateObj.getFullYear();
    var v = dateObj.getMonth() + 1;
    if (v < 10) {
        text += '-0' + v;
    } else {
        text += '-' + v;
    }

    v = dateObj.getDate();
    if (v < 10) {
        text += '-0' + v;
    } else {
        text += '-' + v;
    }

    v = dateObj.getHours();
    if (v < 10) {
        text += ' 0' + v;
    } else {
        text += ' ' + v;
    }
    v = dateObj.getMinutes();
    if (v < 10) {
        text += ':0' + v;
    } else {
        text += ':' + v;
    }

    v = dateObj.getSeconds();
    if (v < 10) {
        text += ':0' + v;
    } else {
        text += ':' + v;
    }

    v = dateObj.getMilliseconds();
    if (v < 10) {
        text += '.00' + v;
    } else if (v < 100) {
        text += '.0' + v;
    } else {
        text += '.' + v;
    }

    return text;
}

function formatValue(id, state, obj, texts) {
    const states = getStates(obj);
    const isCommon = obj.common;

    let valText = state.val;
    if (isCommon && isCommon.role && isCommon.role.match(/^value\.time|^date/)) {
        valText = valText ? (new Date(valText)).toString() : valText;
    }

    if (states && states[valText] !== undefined) {
        valText = states[valText] + '(' + valText + ')';
    }

    let valFull;
    if (valText === undefined) {
        valText = '&nbsp;';
    } else {
        // if less 2000.01.01 00:00:00
        if (state.ts < 946681200000) state.ts *= 1000;
        if (state.lc < 946681200000) state.lc *= 1000;

        if (isCommon && isCommon.unit) {
             valText += ' ' + isCommon.unit;
        }
        valFull =           texts.value   + ': ' + state.val;
        valFull += '\x0A' + texts.ack     + ': ' + state.ack;
        valFull += '\x0A' + texts.ts      + ': ' + (state.ts ? formatDate(new Date(state.ts)) : '');
        valFull += '\x0A' + texts.lc      + ': ' + (state.lc ? formatDate(new Date(state.lc)) : '');
        valFull += '\x0A' + texts.from    + ': ' + (state.from || '');
        if (state.user) {
            valFull += '\x0A' + texts.user    + ': ' + (state.user || '');
        }
        valFull += '\x0A' + texts.quality + ': ' + quality2text(state.q || 0);
    }
    if (valText === null || valText === '') {
        valText = '&nbsp;';
    }
    if (typeof valText === 'string' && valText !== '&nbsp;') {
        valText = valText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    return {
        valText: valText,
        valFull: valFull,
        style: {color: state.ack ? (state.q ? 'orange' : '') : '#c00000'}
    };
}

class SelectID extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loaded: false,
            selected: this.props.selected
        };
        this.root = null;
        this.lang = I18n.getLanguage();

        this.props.connection.getObjects(objects => {
            this.props.connection.getStates(states => {
                this.states = states;
                this.objects = objects;
                const {info, root} = buildTree(this.objects, this.props);
                this.root = root;
                this.info = info;
                this.setState({loaded: true});

                this.state.selected && this.onSelect(this.state.selected);
            });
        });

        this.texts = {
            value:   I18n.t('tooltip_value'),
            ack:     I18n.t('tooltip_ack'),
            ts:      I18n.t('tooltip_ts'),
            lc:      I18n.t('tooltip_lc'),
            from:    I18n.t('tooltip_from'),
            user:    I18n.t('tooltip_user'),
            quality: I18n.t('tooltip_quality')
        };
    }

    onSelect(selected, isDouble) {
        selected !== this.state.selected && this.setState({selected});
        const name = selected ? Utils.getObjectName(this.objects, selected, null, {language: this.lang}) : '';
        this.props.onSelect && this.props.onSelect(selected, name, isDouble);
    }

    onDoubleClick(data, metadata, toggleChildren) {
        if (metadata.hasChildren) {
            toggleChildren();
        } else if (data.obj && data.obj.type === 'state') {
            this.onSelect(data.obj._id, true);
        }
    }

    renderIndexColumn(data, metadata, toggleChildren) {
        const selected = this.state.selected === data.id;
        return (
            <div style={{paddingLeft: (metadata.depth * 25) + 'px'}}
                 className={this.props.classes.cellWrapper}
                 onClick={() => this.onSelect(data.id)}
                 onDoubleClick={() => this.onDoubleClick(data, metadata, toggleChildren)}
            >
                <span className={(selected ? this.props.classes.selected : '') + ' ' + this.props.classes.toggleButtonWrapper}>
                  {metadata.hasChildren
                      ? (<span onClick={toggleChildren}>{metadata.hasVisibleChildren ? (<IconOpen/>) : (<IconClosed/>)}</span>)
                      : ''
                  }
                </span>
                <span className={this.props.classes.cellWrapperElement}>{data.name}</span>
            </div>
        );
    }

    renderColumnName(data, metadata, toggleChildren) {
        if (!data.obj) return null;
        return (<span className={this.props.classes.cellWrapper}>{Utils.getObjectName(this.objects, data.obj._id, null, {language: this.lang})}</span>);
    }
    renderColumnRole(data, metadata, toggleChildren) {
        if (!data.obj) return null;
        return (<span className={this.props.classes.cellWrapper}>{(data.obj.common && data.obj.common.role) || ''}</span>);
    }
    renderColumnRoom(data, metadata, toggleChildren) {
        if (!data.obj) return null;
        const list = findRoomsForObject(this.info, data.obj._id, this.lang, true) || [];
        return (<span className={this.props.classes.cellWrapper}>{list.join(', ')}</span>);
    }

    renderColumnFunc(data, metadata, toggleChildren) {
        if (!data.obj) return null;
        const list = findFunctionsForObject(this.info, data.obj._id, this.lang, true) || [];
        return (<span className={this.props.classes.cellWrapper}>{list.join(', ')}</span>);
    }
    renderColumnValue(data, metadata, toggleChildren) {
        if (!data.obj || !data.obj._id || this.states || !this.states[data.obj._id]) return null;
        const id = data.obj._id;
        const state = this.states[id];
        const info = formatValue(id, state, data.obj, this.texts);
        return (<span className={this.props.classes.cellWrapper} style={info.style} title={info.valFull}>{info.valText}</span>);
    }

    render() {
        if (!this.state.loaded) {
            return (<CircularProgress/>);
        } else {
            const classes = this.props.classes;
            return (
                <TreeDataTable
                    data={this.root.children}
                    height={'100%'}
                    selected={this.state.selected}
                    classNameSelected={classes.selected}
                    className={classes.treeTable}
                    classNameRow={classes.treeTableRow}
                >
                    <TreeDataTable.Column grow={0} renderCell={this.renderIndexColumn.bind(this)} basis="300px" />
                    <TreeDataTable.Column grow={1} renderCell={this.renderColumnName.bind(this)}/>
                    <TreeDataTable.Column grow={1} renderCell={this.renderColumnRole.bind(this)}/>
                    <TreeDataTable.Column grow={1} renderCell={this.renderColumnRoom.bind(this)}/>
                    <TreeDataTable.Column grow={1} renderCell={this.renderColumnFunc.bind(this)}/>
                    <TreeDataTable.Column grow={1} renderCell={this.renderColumnValue.bind(this)}/>
                </TreeDataTable>
            );
        }
    }
}

SelectID.propTypes = {
    classes: PropTypes.object,
    statesOnly: PropTypes.boolean,
    selected: PropTypes.string,
    onSelect: PropTypes.string,
    connection: PropTypes.object.isRequire,
};

export default withStyles(styles)(SelectID);

