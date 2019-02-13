import React from 'react';
import PropTypes from 'prop-types';
import IconButton from '@material-ui/core/IconButton';
import Toolbar from '@material-ui/core/Toolbar';
import TreeDataTable from './cp-react-tree-table/src';
import {withStyles} from '@material-ui/core/styles';
import CircularProgress from '@material-ui/core/CircularProgress';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import FormControl from '@material-ui/core/FormControl';
import Input from '@material-ui/core/Input';
import secondary from '@material-ui/core/colors/orange';

import {FaFolder as IconClosed} from 'react-icons/fa';
import {FaFolderOpen as IconOpen} from 'react-icons/fa';
import {FaFileAlt as IconState} from 'react-icons/fa';
import {FaFile as IconDocument} from 'react-icons/fa';
import {MdPerson as IconExpert} from 'react-icons/md';
//import {MdContentCopy as IconCopy} from 'react-icons/md';
import IconDefaultState from './assets/state.png';
import IconDefaultChannel from './assets/channel.png';
import IconDefaultDevice from './assets/device.png';
import IconDefault from './assets/empty.png';

import I18n from '../i18n';
import Utils from './Utils';

import CopyContentImg from '../assets/copy-content.svg';

const styles = theme => ({
    toolbar: {
        minHeight: 38,//Theme.toolbar.height,
//        boxShadow: '0px 2px 4px -1px rgba(0, 0, 0, 0.2), 0px 4px 5px 0px rgba(0, 0, 0, 0.14), 0px 1px 10px 0px rgba(0, 0, 0, 0.12)'
    },
    toolbarButtons: {
        padding: 4,
        marginLeft: 4
    },
    treeTable: {
        background: '#ffffff',
        borderTop: '1px solid #999',
        borderBottom: '1px solid #999'
    },
    treeTableRow: {
        boxShadow: 'inset 0 1px 0 #eeeeee',
        display: 'block'
    },
    mainDiv: {
        width: '100%',
        height: '100%',
        overflow: 'hidden'
    },
    tableDiv: {
        width: '100%',
        height: 'calc(100% - 34px - 38px)',
        overflow: 'auto'
    },
    cellDiv: {
        display: 'inline-block',
        fontSize: 12,
        height: 26,
        verticalAlign: 'top'
    },
    cellDivId: {
        display: 'inline-block',
        height: 26,
        verticalAlign: 'top'
    },
    cellWrapper: {
        display: 'flex',
        alignItems: 'center',
        fontWeight: 300,
        fontSize: 13,
        height: '100%',
        width: '100%',
//        fontFamily: "'SF Mono', 'Segoe UI Mono', 'Roboto Mono', Menlo, Courier, monospace",
        lineHeight: '1em'
    },
    selectNone: {
        opacity: 0.5,
    },
    selectIcon: {
        width: 16,
        height: 16,
        paddingRight: 5
    },
    cellWrapperElement: {
        flexGrow: 1,
        cursor: 'default'
    },

    toggleButtonWrapper: {
        width: 16,
        flexGrow: 0,
        color: '#008fff',
        cursor: 'pointer',
        padding: 1,
        borderRadius: 3
    },
    partlyVisible: {
        opacity: 0.3
    },
    /*.toggle-button-wrapper > span:hover {
        background: #d7d7d7;
    }*/
    
    selectSpan: {
//        fontFamily: "'SF Mono', 'Segoe UI Mono', 'Roboto Mono', Menlo, Courier, monospace",
        background: '#efefef',
        border: '1px solid #e5e5e5',
        padding: 2,
        borderRadius: 3
    },
    selected: {
        background: '#008fff',
        color: 'white'
    },
    icon: {
        width: 20,
        height: 20,
        paddingTop: 2,
        paddingRight: 2
    },
    header: {
        width: '100%'
    },
    headerCell: {
        display: 'inline-block'
    },
    headerCellInput: {
        width: 'calc(100% - 5px)'
    },
    visibleButtons: {
        color: '#2196f3',
        opacity: 0.7
    },
    depth: {
        position: 'absolute',
        top: 8,
        left: 10,
        color: 'black',
        fontSize: 14
    },
    cellCopy: {
        position: 'absolute',
        top: 3,
        right: 10,
        width: 16,
        height: 16,
        background: 'lightblue',
        cursor: 'grab',
        borderRadius: 2,
        padding: 2,
    },
    cellCopyPressed: {
        cursor: 'grabbing',
        background: secondary.A700,
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

/* function walkTree(tree, func) {
    func(tree);
    if (tree.children) {
        tree.children.forEach(item => walkTree(item, func));
    }
}
*/
function applyFilter(item, filters, lang, objects, context) {
    let filteredOut = false;
    if (!context) {
        context = {};
        if (filters.id) {
            context.id = filters.id.toLowerCase();
        }
        if (filters.name) {
            context.name = filters.name.toLowerCase();
        }
        if (filters.role) {
            context.role = filters.role.toLowerCase();
        }
        if (filters.room) {
            context.room = (objects[filters.room] && objects[filters.room].common && objects[filters.room].common.members) || [];
        }
        if (filters.func) {
            context.func = (objects[filters.func] && objects[filters.func].common && objects[filters.func].common.members) || [];
        }
    }

    if (item.data.id) {
        if (!filters.expert) {
            filteredOut = item.data.id === 'system' || item.data.id.startsWith('system.') || (item.data.obj && item.data.obj.common && item.data.obj.common.expert);
        }
        if (!filteredOut && context.id) {
            if (item.data.fID === undefined) {
                item.data.fID = item.data.id.toLowerCase();
            }
            filteredOut = item.data.fID.indexOf(context.id) === -1;
        }
        if (!filteredOut && context.name) {
            if (item.data.fName === undefined) {
                item.data.fName = (item.data.obj && item.data.obj.common && getName(item.data.obj.common.name, lang)) || '';
                item.data.fName = item.data.name.toLowerCase();
            }
            filteredOut = item.data.fName.indexOf(context.name) === -1;
        }
        if (!filteredOut && filters.role) {
            filteredOut = !(item.data && item.data.obj && item.data.obj.common && item.data.obj.common.role && item.data.obj.common.role.startsWith(context.role));
        }
        if (!filteredOut && context.room) {
            filteredOut = !context.room.find(id => id === item.data.id || item.data.id.startsWith(id + '.'));
        }
        if (!filteredOut && context.func) {
            filteredOut = !context.func.find(id => id === item.data.id || item.data.id.startsWith(id + '.'));
        }
    }
    item.data.visible = !filteredOut;
    item.data.hasVisibleChildren = false;
    if (item.children) {
        item.children.forEach(_item => {
            const visible = applyFilter(_item, filters, lang, objects, context);
            if (visible) {
                item.data.hasVisibleChildren = true;
            }
        });
    }
    return item.data.visible || item.data.hasVisibleChildren;
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
            } else if (id.startsWith('enum.functions.')) {
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
                            const _croot = {data: {name: parts[k], parent: croot, id: curPath, obj: objects[curPath]}};
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

    info.roomEnums.sort();
    info.funcEnums.sort();
    info.roles.sort();

    return {info, root};
}

function findNode(root, id, _parts, _path, _level) {
    if (root.data.id === id) {
        return root;
    }
    if (!_parts) {
        _parts = id.split('.');
        _level = 0;
        _path = _parts[_level];
    }
    if (!root.children && root.data.id !== id) {
        return null;
    } else {
        let found;
        for (let i = 0; i< root.children.length; i++) {
            const _id = root.children[i].data.id;
            if (_id === _path) {
                found = root.children[i];
                break;
            } else
            if (_id < _path) continue;
            if (_id > _path) break;
        }
        if (found) {
            return findNode(found, id, _parts, _path + '.' + _parts[_level + 1], _level + 1);
        } else {
            return null;
        }
    }
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

/* function findRoomsForObjectAsIds(data, id, rooms) {
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
*/
function findFunctionsForObject(data, id, lang, withParentInfo, funcs) {
    if (!id) {
        return [];
    }
    funcs = funcs || [];
    for (let i = 0; i < data.funcEnums.length; i++) {
        const common = data.objects[data.funcEnums[i]] && data.objects[data.funcEnums[i]].common;
        const name = getName(common.name, lang);
        if (common && common.members && common.members.indexOf(id) !== -1 && funcs.indexOf(name) === -1) {
            if (!withParentInfo) {
                funcs.push(name);
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

/*function findFunctionsForObjectAsIds(data, id, funcs) {
    if (!id) {
        return [];
    }
    funcs = funcs || [];
    for (let i = 0; i < data.funcEnums.length; i++) {
        const common = data.objects[data.funcEnums[i]] && data.objects[data.funcEnums[i]].common;
        if (common && common.members && common.members.indexOf(id) !== -1 &&
            funcs.indexOf(data.funcEnums[i]) === -1) {
            funcs.push(data.funcEnums[i]);
        }
    }

    return funcs;
}
*/
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

function getSelectIdIcon(objects, id, prefix) {
    prefix = prefix || '.';//http://localhost:8081';
    let icon = '';
    let alt  = '';
    const _id_ = 'system.adapter.' + id;
    if (id && objects[_id_] && objects[_id_].common && objects[_id_].common.icon) {
        // if not BASE64
        if (!objects[_id_].common.icon.match(/^data:image\//)) {
            if (objects[_id_].common.icon.indexOf('.') !== -1) {
                icon = prefix + '/adapter/' + objects[_id_].common.name + '/' + objects[_id_].common.icon;
            } else {
                return null; //'<i class="material-icons iob-list-icon">' + objects[_id_].common.icon + '</i>';
            }
        } else {
            icon = objects[_id_].common.icon;
        }
    } else {
        const obj = objects[id];

        if (obj && obj.common) {
            if (obj.common.icon) {
                if (!obj.common.icon.match(/^data:image\//)) {
                    if (obj.common.icon.indexOf('.') !== -1) {
                        var instance;
                        if (obj.type === 'instance') {
                            icon = prefix + '/adapter/' + obj.common.name + '/' + obj.common.icon;
                        } else if (id && id.match(/^system\.adapter\./)) {
                            instance = id.split('.', 3);
                            if (obj.common.icon[0] === '/') {
                                instance[2] += obj.common.icon;
                            } else {
                                instance[2] += '/' + obj.common.icon;
                            }
                            icon = prefix + '/adapter/' + instance[2];
                        } else {
                            instance = id.split('.', 2);
                            if (obj.common.icon[0] === '/') {
                                instance[0] += obj.common.icon;
                            } else {
                                instance[0] += '/' + obj.common.icon;
                            }
                            icon = prefix + '/adapter/' + instance[0];
                        }
                    } else {
                        return null; // '<i class="material-icons iob-list-icon">' + obj.common.icon + '</i>';
                    }
                } else {
                    // base 64 image
                    icon = obj.common.icon;
                }
            } else if (obj.type === 'device') {
                icon = IconDefaultDevice;
                alt  = 'device';
            } else if (obj.type === 'channel') {
                icon = IconDefaultChannel;
                alt  = 'channel';
            } else if (obj.type === 'state') {
                icon = IconDefaultState;
                alt  = 'state';
            }
        }
    }

    if (icon) {
        return {src: icon, alt};
    } else {
        return  {src: IconDefault, alt: ''};
    }
}

class SelectID extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loaded: false,
            selected: (this.props.selected || '').replace(/["']/g, ''),
            filter: {
                id: '',
                name: '',
                room: '',
                func:  '',
                role: '',
                expert: false
            },
            depth: 0
        };
        this.selectedFound = false;
        this.copyContentImg = CopyContentImg;
        this.treeTableRef = React.createRef();
        this.mainRef = React.createRef();
        this.root = null;
        this.lang = I18n.getLanguage();

        this.props.connection.getObjects(objects => {
            this.props.connection.getStates(states => {
                this.states = states;
                this.objects = objects;
                const {info, root} = buildTree(this.objects, this.props);
                this.root = root;
                this.info = info;
                applyFilter(this.root, this.state.filter, this.lang, this.objects);
                this.setState({loaded: true});

                this.state.selected && this.onSelect(this.state.selected);
            }, true);
        }, true);

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

    onCopy(e, id) {
        const el = window.document.createElement('textarea');
        el.value = id;
        window.document.body.appendChild(el);
        el.select();
        window.document.execCommand('copy');
        window.document.body.removeChild(el);
        console.log(id);
        e.stopPropagation();
        e.preventDefault();
    }

    installCopyButtons() {
        if (!this.mainRef.current) return;
        const rows = this.mainRef.current.getElementsByClassName('add-copy-button');
        for (let i = 0; i < rows.length; i++) {
            if (!rows[i].__installed) {
                rows[i].addEventListener('mouseenter', e => {
                    const copy = e.target.getElementsByClassName(this.props.classes.cellCopy);
                    if (!copy || !copy.length) {
                        const div = document.createElement('div');
                        const img = document.createElement('img');
                        img.src = this.copyContentImg;
                        img.width = 16;
                        img.height = 16;
                        img.color = secondary.A200;
                        div.appendChild(img);
                        div.className = this.props.classes.cellCopy;
                        div.addEventListener('click', e => this.onCopy(e, e.target.parentNode.dataset.index), false);
                        div.addEventListener('mousedown', e => {
                            if (e.target.parentNode.className.indexOf(this.props.classes.cellCopyPressed) === -1) {
                                e.target.parentNode.className += ' ' + this.props.classes.cellCopyPressed;
                            }
                        }, false);
                        div.addEventListener('mouseup', e => {
                            let className = e.target.parentNode.className.split(' ');
                            let pos = className.indexOf(this.props.classes.cellCopyPressed);
                            while (pos !== -1) {
                                className.splice(pos);
                                pos = className.indexOf(this.props.classes.cellCopyPressed);
                            }
                            e.target.parentNode.className = className.join(' ');
                        }, false);
                        e.target.appendChild(div);
                    }
                }, false);
                rows[i].addEventListener('mouseleave', e => {
                    const copy = e.target.getElementsByClassName(this.props.classes.cellCopy);
                    if (copy && copy.length) {
                        e.target.removeChild(copy[0]);
                    }
                }, false);
                rows[i].__installed = true;
            }
        }
    }

    componentDidUpdate() {
        this.installCopyButtons();
        if (!this.selectedFound) {
            if (this.props.selected && this.treeTableRef.current) {
                const node = findNode(this.root, this.props.selected);
                this.treeTableRef.current.scrollIntoView(node);
                this.selectedFound = true;
            }
        }
    }

    renderIndexColumn(data, metadata, toggleChildren) {
        const selected = this.state.selected === data.id;
        const isExist = !!this.objects[data.id];
        const isState = isExist && this.objects[data.id].type === 'state';
        // const isChannel = isExist && !isState && this.objects[data.id].type === 'channel';
        // const isDevice = isExist && !isChannel && !isState && this.objects[data.id].type === 'device';

        const padding = (metadata.depth * 25) + 'px';
        const width = `calc(100% - ${padding})`;
        return (
            <div style={{paddingLeft: padding, width: width}}
                 data-index={data.id}
                 className={this.props.classes.cellWrapper + ' add-copy-button'}
            >
                <span className={(selected ? this.props.classes.selected : '') + ' ' + this.props.classes.toggleButtonWrapper}>
                  {metadata.hasChildren
                      ? (<span onClick={toggleChildren}>{metadata.hasVisibleChildren ? (<IconOpen/>) : (<IconClosed/>)}</span>)
                      : (isState ? (<IconState/>) : (<IconDocument/>))
                  }
                </span>
                <span className={this.props.classes.cellWrapperElement} style={{fontWeight: metadata.hasChildren ? 'bold' : 'normal'}}>{data.name}</span>
            </div>
        );
    }

    renderColumnName(data, metadata, toggleChildren) {
        const icon = getSelectIdIcon(this.objects, data.id, this.props.prefix);
        return (<span className={this.props.classes.cellWrapper}>
            <img src={icon.src} className={this.props.classes.icon} alt={icon.alt}/>
            {data.obj && Utils.getObjectName(this.objects, data.obj._id, null, {language: this.lang})}
            </span>);
    }
    renderColumnRole(data, metadata, toggleChildren) {
        if (!data.obj) return null;
        return (<span className={this.props.classes.cellWrapper}>{(data.obj.common && data.obj.common.role) || ''}</span>);
    }
    renderColumnRoom(data, metadata, toggleChildren) {
        if (!data.obj) return null;
        const list = findRoomsForObject(this.info, data.obj._id, this.lang) || [];
        return (<span className={this.props.classes.cellWrapper}>{list.join(', ')}</span>);
    }
    renderColumnFunc(data, metadata, toggleChildren) {
        if (!data.obj) return null;
        const list = findFunctionsForObject(this.info, data.obj._id, this.lang) || [];
        return (<span className={this.props.classes.cellWrapper}>{list.join(', ')}</span>);
    }
    renderColumnValue(data, metadata, toggleChildren) {
        if (!data.obj || !data.obj._id || this.states || !this.states[data.obj._id]) return null;
        const id = data.obj._id;
        const state = this.states[id];
        const info = formatValue(id, state, data.obj, this.texts);
        return (<span className={this.props.classes.cellWrapper} style={info.style} title={info.valFull}>{info.valText}</span>);
    }

    onFilter(name, value) {
        if (this.state.filter[name] !== value) {
            const filter = JSON.parse(JSON.stringify(this.state.filter));
            filter[name] = value;
            this.filterTimer && clearTimeout(this.filterTimer);
            this.filterTimer = setTimeout(() => {
                applyFilter(this.root, filter, this.lang, this.objects);
                this.forceUpdate();
            }, 400);
            this.setState({filter});
        }
    }

    getFilterInput(name) {
        return (<FormControl className={this.props.classes.headerCellInput} style={{marginTop: 0, marginBottom: 0}} margin="dense">
            <Input
                classes={{underline: 'no-underline'}}
                id={name}
                placeholder={I18n.t('filter_' + name)}
                value={this.state.filter[name]}
                onChange={e => this.onFilter(name, e.target.value)}
                autoComplete="off"
            />
        </FormControl>);
    }
    getFilterSelect(name, values) {
        //<!--InputLabel htmlFor="demo-controlled-open-select">Age</InputLabel-->
        return (
            <Select className={this.props.classes.headerCellInput + ' no-underline'}
                value={this.state.filter[name]}
                onChange={e => this.onFilter(name, e.target.value)}
                inputProps={{name, id: name,}}
                displayEmpty={true}
            >
                <MenuItem key="empty" value=""><span className={this.props.classes.selectNone}>{I18n.t('filter_' + name)}</span></MenuItem>
                {values.map(item => {
                    let id;
                    let name;
                    let icon;
                    if (typeof item === 'object') {
                        id = item.value;
                        name = item.name;
                        icon = getSelectIdIcon(this.objects, id, this.props.prefix);
                    } else {
                        id = item;
                        name = item;
                    }

                    return (
                        <MenuItem key={id} value={id}>
                            {icon && (<img className={this.props.classes.selectIcon} src={icon.src} alt={name}/>)}
                            {name}
                        </MenuItem>)
                })}
            </Select>);
    }
    getFilterSelectRole() {
        return this.getFilterSelect('role', this.info.roles);
    }
    getFilterSelectRoom() {
        const rooms = this.info.roomEnums.map(id => {
            return {name: getName((this.objects[id] && this.objects[id].common && this.objects[id].common.name) || id.split('.').pop()), value: id};
        });

        return this.getFilterSelect('room', rooms);

    }
    getFilterSelectFunction() {
        const func = this.info.funcEnums.map(id => {
            return {name: getName((this.objects[id] && this.objects[id].common && this.objects[id].common.name) || id.split('.').pop()), value: id};
        });
        return this.getFilterSelect('func', func);

    }
    onExpandAll() {
        this.treeTableRef.current.expandAll();
    }
    onCollapseAll() {
        this.treeTableRef.current.collapseAll();
    }
    onExpandVisible() {
        if (this.state.depth < 9) {
            const depth = this.state.depth + 1;
            this.setState({depth: depth}, () => {
                this.treeTableRef.current.expandAll(depth);
            });
        }
    }
    onCollapseVisible() {
        if (this.state.depth > 0) {
            const depth = this.state.depth - 1;
            this.setState({depth: depth}, () => {
                this.treeTableRef.current.expandAll(depth);
            });
        }
    }

    getToolbar() {
        return (
            <Toolbar variant="dense" className={this.props.classes.toolbar} key="toolbar">
                <IconButton key="expert" variant="contained" className={this.props.classes.toolbarButtons} color={this.state.filter.expert ? 'secondary' : 'primary'} onClick={() => this.onFilter('expert', !this.state.filter.expert)}><IconExpert /></IconButton>
                <IconButton key="expandAll" variant="contained" className={this.props.classes.toolbarButtons} onClick={() => this.onExpandAll()}><IconOpen /></IconButton>
                <IconButton key="collapseAll" variant="contained" className={this.props.classes.toolbarButtons} onClick={() => this.onCollapseAll()}><IconClosed /></IconButton>
                <IconButton key="expandVisible" variant="contained" className={this.props.classes.toolbarButtons + ' ' + this.props.classes.visibleButtons} onClick={() => this.onExpandVisible()}><IconOpen />{this.state.depth ? (<div className={this.props.classes.depth}>{this.state.depth}</div>) : null}</IconButton>
                <IconButton key="collapseVisible" variant="contained" className={this.props.classes.toolbarButtons + ' ' + this.props.classes.visibleButtons} onClick={() => this.onCollapseVisible()}><IconClosed />{this.state.depth ? (<div className={this.props.classes.depth}>{this.state.depth}</div>) : null}</IconButton>
            </Toolbar>);
    }

    render() {
        if (!this.state.loaded) {
            return (<CircularProgress/>);
        } else {
            const classes = this.props.classes;
            const idWidth = 300;
            const WIDTHS = [120, 180, 180, 120];
            const width = `calc(100% - ${idWidth + WIDTHS[0] + WIDTHS[1] + WIDTHS[2] + WIDTHS[3]}px)`;
            return (<div className={classes.mainDiv} ref={this.mainRef}>
                {this.getToolbar()}
                <div key="header" className={classes.header}>
                    <div className={classes.headerCell} style={{width: idWidth}}>{this.getFilterInput('id')}</div>
                    <div className={classes.headerCell} style={{width: width}}>{this.getFilterInput('name')}</div>
                    <div className={classes.headerCell} style={{width: WIDTHS[0]}}>{this.getFilterSelectRole()}</div>
                    <div className={classes.headerCell} style={{width: WIDTHS[1]}}>{this.getFilterSelectRoom()}</div>
                    <div className={classes.headerCell} style={{width: WIDTHS[2]}}>{this.getFilterSelectFunction()}</div>
                    <div className={classes.headerCell} style={{width: WIDTHS[3]}}>{I18n.t('Value')}</div>
                </div>
                <div className={classes.tableDiv}>
                <TreeDataTable
                    ref={this.treeTableRef}
                    key="table"
                    data={this.root.children}
                    height={'100%'}
                    selected={this.state.selected}
                    classNameSelected={classes.selected}
                    classNamePartlyVisible={classes.partlyVisible}
                    className={classes.treeTable}
                    classNameRow={classes.treeTableRow}
                    onRowClick={(data, metadata, toggleChildren, isDoubleClick) => isDoubleClick ?
                        this.onDoubleClick(data, metadata, toggleChildren) :
                        this.onSelect(data.id)}
                >
                    <TreeDataTable.Column grow={0} renderCell={this.renderIndexColumn.bind(this)} className={classes.cellDivId} width={idWidth} />
                    <TreeDataTable.Column grow={1} renderCell={this.renderColumnName.bind(this)}  className={classes.cellDiv} width={width}/>
                    <TreeDataTable.Column grow={1} renderCell={this.renderColumnRole.bind(this)}  className={classes.cellDiv} width={WIDTHS[0]}/>
                    <TreeDataTable.Column grow={1} renderCell={this.renderColumnRoom.bind(this)}  className={classes.cellDiv} width={WIDTHS[1]}/>
                    <TreeDataTable.Column grow={1} renderCell={this.renderColumnFunc.bind(this)}  className={classes.cellDiv} width={WIDTHS[2]}/>
                    <TreeDataTable.Column grow={1} renderCell={this.renderColumnValue.bind(this)} className={classes.cellDiv} width={WIDTHS[3]}/>
                </TreeDataTable></div>
            </div>);
        }
    }
}

SelectID.propTypes = {
    classes: PropTypes.object,
    statesOnly: PropTypes.bool,
    selected: PropTypes.string,
    onSelect: PropTypes.func,
    connection: PropTypes.object,
    prefix: PropTypes.string
};

export default withStyles(styles)(SelectID);

