import React from 'react';
import PropTypes from 'prop-types';
//import Button from '@material-ui/core/Button';
import TreeDataTable from './cp-react-tree-table/src';
import {withStyles} from '@material-ui/core/styles';
import CircularProgress from '@material-ui/core/CircularProgress';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import TextField from '@material-ui/core/TextField';

import {FaFolder as IconClosed} from 'react-icons/fa';
import {FaFolderOpen as IconOpen} from 'react-icons/fa';
import {FaFileAlt as IconState} from 'react-icons/fa';
import {FaFile as IconDocument} from 'react-icons/fa';
import IconDefaultState from './assets/state.png';
import IconDefaultChannel from './assets/channel.png';
import IconDefaultDevice from './assets/device.png';
import IconDefault from './assets/empty.png';

import I18n from '../i18n';
import Utils from './Utils';

const styles = theme => ({
    treeTable: {
        background: '#ffffff',
        borderTop: '1px solid #999',
        borderBottom: '1px solid #999'
    },
    treeTableRow: {
        boxShadow: 'inset 0 1px 0 #eeeeee',
        display: 'block'
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

function getSelectIdIcon(objects, id, prefix) {
    prefix = prefix || 'http://localhost:8081';
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
            selected: this.props.selected,
            filter: {
                id: '',
                name: '',
                room: '',
                func:  '',
                role: ''
            }
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
        const isExist = !!this.objects[data.id];
        const isState = isExist && this.objects[data.id].type === 'state';
        const isChannel = isExist && !isState && this.objects[data.id].type === 'channel';
        // const isDevice = isExist && !isChannel && !isState && this.objects[data.id].type === 'device';

        const padding = (metadata.depth * 25) + 'px';
        const width = `calc(100% - ${padding})`;
        return (
            <div style={{paddingLeft: padding, width: width}}
                 className={this.props.classes.cellWrapper}
//                 onClick={() => this.onSelect(data.id)}
//                 onDoubleClick={() => this.onDoubleClick(data, metadata, toggleChildren)}
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
        const icon = getSelectIdIcon(this.objects, data.id);
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

    onFilter(name, value) {
        const filter = JSON.parse(JSON.stringify(this.state.filter));
        filter[name] = value;
        this.setState({filter});
    }

    getFilterInput(name) {
        return (<TextField
                id={name}
                placeholder={I18n.t('filter_' + name)}
                className={this.props.classes.headerCellInput}
                value={this.state.filter[name]}
                onChange={e => this.onFilter(name, e.target.value)}
                style={{marginTop: 0, marginBottom: 0}}
                autoComplete="off"
                margin="dense"
            />);
    }
    getFilterSelect(name, fields) {
        //<!--InputLabel htmlFor="demo-controlled-open-select">Age</InputLabel-->
        return (
            <Select className={this.props.classes.headerCellInput}
                value={this.state.filter[name]}
                onChange={e => this.onFilter(name, e.target.value)}
                inputProps={{name, id: name,}}
                displayEmpty={true}
            >
                <MenuItem value=""><span className={this.props.classes.selectNone}>{I18n.t('filter_' + name)}</span></MenuItem>
                <MenuItem value={10}>Ten</MenuItem>
                <MenuItem value={20}>Twenty</MenuItem>
                <MenuItem value={30}>Thirty</MenuItem>
            </Select>)
    }
    getFilterSelectRole() {
        return this.getFilterSelect('role');
    }
    getFilterSelectRoom() {
        return this.getFilterSelect('room');

    }
    getFilterSelectFunction() {
        return this.getFilterSelect('func');

    }

    render() {
        if (!this.state.loaded) {
            return (<CircularProgress/>);
        } else {
            const classes = this.props.classes;
            const idWidth = 300;
            const width = `calc(20% - ${idWidth / 5}px)`;
            return [
                (<div key="header" className={classes.header}>
                    <div className={classes.headerCell} style={{width: idWidth}}>{this.getFilterInput('id')}</div>
                    <div className={classes.headerCell} style={{width: width}}>{this.getFilterInput('name')}</div>
                    <div className={classes.headerCell} style={{width: width}}>{this.getFilterSelectRole()}</div>
                    <div className={classes.headerCell} style={{width: width}}>{this.getFilterSelectRoom()}</div>
                    <div className={classes.headerCell} style={{width: width}}>{this.getFilterSelectFunction()}</div>
                    <div className={classes.headerCell} style={{width: width}}>{this.getFilterInput('id')}</div>
                </div>),
                (
                <TreeDataTable
                    key="table"
                    data={this.root.children}
                    height={'100%'}
                    selected={this.state.selected}
                    classNameSelected={classes.selected}
                    className={classes.treeTable}
                    classNameRow={classes.treeTableRow}
                    onRowClick={(data, metadata, toggleChildren, isDoubleClick) => isDoubleClick ? this.onDoubleClick(data, metadata, toggleChildren) : this.onSelect(data.id)}
                >
                    <TreeDataTable.Column grow={0} renderCell={this.renderIndexColumn.bind(this)} className={classes.cellDivId} width={idWidth} />
                    <TreeDataTable.Column grow={1} renderCell={this.renderColumnName.bind(this)}  className={classes.cellDiv} width={width}/>
                    <TreeDataTable.Column grow={1} renderCell={this.renderColumnRole.bind(this)}  className={classes.cellDiv} width={width}/>
                    <TreeDataTable.Column grow={1} renderCell={this.renderColumnRoom.bind(this)}  className={classes.cellDiv} width={width}/>
                    <TreeDataTable.Column grow={1} renderCell={this.renderColumnFunc.bind(this)}  className={classes.cellDiv} width={width}/>
                    <TreeDataTable.Column grow={1} renderCell={this.renderColumnValue.bind(this)} className={classes.cellDiv} width={width}/>
                </TreeDataTable>
            )];
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

