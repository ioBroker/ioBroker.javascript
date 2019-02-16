import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import Divider from '@material-ui/core/Divider';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import IconButton from '@material-ui/core/IconButton';
import {DragDropContext, Droppable, Draggable} from 'react-beautiful-dnd';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Input from '@material-ui/core/Input';
import RootRef from '@material-ui/core/RootRef';

import red from '@material-ui/core/colors/red';
import green from '@material-ui/core/colors/green';

import {MdMoreVert as IconMore} from 'react-icons/md';
import {FaFolder as IconFolder} from 'react-icons/fa';
import {FaFolderOpen as IconFolderOpened} from 'react-icons/fa';
import {MdContentCopy as IconCopy} from 'react-icons/md';
import {MdDelete as IconDelete} from 'react-icons/md';
import {MdInput as IconDoEdit} from 'react-icons/md';
import {MdDragHandle as IconGrip} from 'react-icons/md';
import {MdExpandMore as IconCollapse} from 'react-icons/md';
import {MdKeyboardArrowRight as IconExpand} from 'react-icons/md';
import {MdClose as IconClear} from 'react-icons/md';
import {MdFormatClear as IconClose} from 'react-icons/md';
import {MdPlayArrow as IconPlay} from 'react-icons/md';
import {MdAdd as IconAdd} from 'react-icons/md';
import {MdCreateNewFolder as IconAddFolder} from 'react-icons/md';
import {MdPause as IconPause} from 'react-icons/md';
import {MdSwapVert as IconReorder} from 'react-icons/md';
import {MdEdit as IconEdit} from 'react-icons/md';
import {MdSearch as IconFind} from 'react-icons/md';
import {MdPersonPin as IconExpert} from 'react-icons/md';
import {FaFileExport as IconExport} from 'react-icons/fa';
import {FaFileImport as IconImport} from 'react-icons/fa';
import {MdPalette as IconDark} from 'react-icons/md';

import ImgJS from './assets/js.png';
import ImgBlockly from './assets/blockly.png';
import ImgTypeScript from './assets/typescript.png';

import Theme from './Theme';
import I18n from './i18n';
import DialogRename from './Dialogs/Rename';
import DialogDelete from './Dialogs/Delete';
import DialogAddNewScript from './Dialogs/AddNewScript';
import DialogNew from './Dialogs/New';
import DialogError from './Dialogs/Error';

const MENU_ITEM_HEIGHT = 48;

const styles = theme => ({
    drawerPaper: {
        position: 'relative',
        width: '100%'//Theme.menu.width,
    },
    toolbar: {
        height: Theme.toolbar.height
    },
    toolbarButtons: {
        color: theme.palette.type === 'dark'? 'white !important' : 'black !important'
    },
    toolbarSearch: {
        width: 'calc(100% - 105px)',
        lineHeight: '34px',
        marginLeft: 5
    },
    iconButtons: {
        width: 32,
        height: 32,
        padding: 2
    },
    iconDropdownMenu: {
        paddingRight: 5
    },
    menu: {
        width: '100%',
        height: '100%'
    },
    innerMenu: {
        width: '100%',
        height: '100%',
        overflowX: 'hidden',
        overflowY: 'auto'
    },
    scriptIcon: {
        width: 18,
        height: 18,
        borderRadius: 2
    },
    gripHandle: {
        paddingRight: 13
    },
    noGripHandle: {
        width: 29
    },
    folder: {
        background: theme.palette.type === 'dark' ? '#6a6a6a' : '#e2e2e2',
        cursor: 'pointer',
        padding: 0,
        userSelect: 'none'
    },
    element: {
        cursor: 'pointer',
        padding: 0,
        userSelect: 'none'
    },
    reorder: {
        padding: '9px 16px 9px 9px',
    },
    expandButton: {
        width: 37,
        height: 37
    },
    selected: Theme.colors.selected,
    instances: {
        color: 'gray',
        fontSize: 'smaller'
    }
});

const images = {
    'Blockly': ImgBlockly,
    'Javascript/js': ImgJS,
    def: ImgJS,
    'TypeScript/ts': ImgTypeScript,
};

const getItemStyle = (isDragging, draggableStyle) => ({
    userSelect: 'none',
    background: isDragging ? 'lightgreen' : 'inherit',
    ...draggableStyle,
});

const getObjectName = (id, obj, lang) => {
    lang = lang || I18n.getLanguage();
    if (obj && obj.common && obj.common.name) {
        if (typeof obj.common.name === 'object') {
            return obj.common.name[lang] || obj.common.name.en;
        } else {
            return obj.common.name;
        }
    } else {
        return id.replace(/^script\.js./, '');
    }
};

const prepareList = data => {
    const result = [];
    const ids = Object.keys(data);
    ids.sort((a, b) => {
        if ((a === 'script.js.common' || a === 'script.js.global') && (b === 'script.js.common' || b === 'script.js.global')) {
            return a > b ? 1 : -1;
        } else if (a === 'script.js.common' || a === 'script.js.global' || b === 'script.js.common' || b === 'script.js.global') {
            return 1;
        } else {
            return a > b ? 1 : -1;
        }
    });

    for (let i = 0; i < ids.length; i++) {
        const obj = data[ids[i]];
        const parts = ids[i].split('.');
        parts.pop();
        result.push({
            id: ids[i],
            title: getObjectName(ids[i], obj),
            enabled: obj && obj.common && obj.common.enabled,
            depth: parts.length - 2,
            type: obj.type === 'script' ? obj.common.engineType : 'folder',
            parent: parts.length > 2 ? parts.join('.') : null,
            instance: obj.common.engine ? parseInt(obj.common.engine.split('.').pop(), 10) || 0 : null
        });
    }

    // Place all folder-less scripts at start
    result.sort((a, b) => {
        // without folders => always at start
        if (!a.parent && a.type !== 'folder' && !b.parent && b.type !== 'folder') {
            if (a.id === b.id) return 0;
            return a.id > b.id ? 1 : -1;
        } else if (!a.parent && a.type !== 'folder') {
            return -1;
        } else if (!b.parent && b.type !== 'folder') {
            return 1;
        } else {
            // common and global are always at the end
            if ((a.id.startsWith('script.js.common') || a.id.startsWith('script.js.global')) &&
                (a.id.startsWith('script.js.common') || a.id.startsWith('script.js.global'))) {
                if (a.id === b.id) return 0;
                return a.id > b.id ? 1 : -1;
            } else if (a.id.startsWith('script.js.common') || a.id.startsWith('script.js.global')) {
                return 1;
            } else if (b.id.startsWith('script.js.common') || b.id.startsWith('script.js.global')) {
                return -1;
            } else {
                if (a.id === b.id) return 0;
                return a.id > b.id ? 1 : -1;
            }
        }
    });

    // Fill all index
    result.forEach((item, i) => item.index = i);

    let modified;
    do {
        modified = false;
        // check if all parents exists
        result.forEach(item => {
            if (item.parent) {
                const parent = result.find(it => it.id === item.parent);
                if (!parent) {
                    const parts = item.parent.split('.');
                    parts.pop();
                    result.push({
                        id: item.parent,
                        title: item.parent.replace(/^script\.js./, ''),
                        depth: parts.length - 2,
                        type: 'folder',
                        parent: parts.length > 2 ? parts.join('.') : null
                    });
                    modified = true;
                }
            }
        });
    } while(modified);


    // Fill all parentIndex
    result.forEach(item => {
        if (item.parent) {
            const parent = result.find(it => it.id === item.parent);
            if (parent) {
                item.parentIndex = parent.index;
            }
        }
    });

    return result;
};

class SideDrawer extends React.Component {
    constructor(props) {
        super(props);

        let expanded = window.localStorage ? window.localStorage.getItem('SideMenu.expanded') : '[]';
        try {
            expanded = JSON.parse(expanded) || [];
        } catch (e) {
            expanded = [];
        }
        let statusFilter = window.localStorage ? window.localStorage.getItem('SideMenu.statusFilter') : null;
        if (statusFilter === 'true') {
            statusFilter = true;
        } else
        if (statusFilter === 'false') {
            statusFilter = false;
        }

        this.inputRef = new React.createRef();

        this.state = {
            listItems: prepareList(props.scripts || {}),
            expanded: expanded,
            reorder: false,
            theme: this.props.theme,
            dragDepth: 0,
            draggedId: null,
            selected: window.localStorage ? window.localStorage.getItem('SideMenu.selected') || null : null,
            creatingScript: false,
            creatingFolder: false,
            copingScript: '',
            renaming: null,
            deleting: null,
            choosingType: null,
            errorText: '',
            instances: props.instances || [],
            menuOpened: false,
            menuAnchorEl: null,
            searchMode: false,
            expertMode: this.props.expertMode,
            searchText: '',
            width: this.props.width || 300,
            filterMenuOpened: false,
            typeFiler: window.localStorage ? window.localStorage.getItem('SideMenu.typeFiler') || '' : '', // blockly, js, ts
            statusFilter: statusFilter, // running, stopped => true/false/null
            runningInstances: this.props.runningInstances || {}
        };

        const newExp = this.ensureSelectedIsVisible();
        if (newExp) {
            this.state.expanded = newExp;
        }

        this.scriptsHash = props.scriptsHash;

        // debounce search process
        this.filterTimer = null;

        this.state.isAllZeroInstances = this.getIsAllZeroInstances();
    }

    filterList(isDisable, listItems, cb) {
        const noUpdate = !!listItems;
        listItems = listItems || JSON.parse(JSON.stringify(this.state.listItems));
        let changed = false;
        let newState = {listItems};
        if (isDisable !== false && this.state.searchMode && this.state.searchText) {
            const text = this.state.searchText.toLowerCase();
            listItems.forEach(item => {
                const id = item.title.toLowerCase();
                item.filteredPartly = false;
                let found = id.indexOf(text) !== -1;
                if (!found && (this.props.objects && this.props.objects[item.id] && this.props.objects[item.id].common && this.props.objects[item.id].common.source)) {
                    if (this.props.objects[item.id].common.engineType === 'Blockly') {
                        const pos = this.props.objects[item.id].common.source.lastIndexOf('//');
                        found = this.props.objects[item.id].common.source.substring(0, pos).toLowerCase().indexOf(text) !== -1;
                    } else {
                        found = this.props.objects[item.id].common.source.toLowerCase().indexOf(text) !== -1;
                    }
                }
                if (found) {
                    if (item.filtered) {
                        item.filtered = false;
                        changed = true;
                    }
                } else if (!item.filtered) {
                    item.filtered = true;
                    changed = true;
                }
            });

            if (changed) {
                // check that all parents of every non-filtered item are visible
                for (let i = listItems.length - 1; i >= 0; i--) {
                    const item = listItems[i];
                    if (!item.filtered || item.filteredPartly) {
                        let it = item;
                        do {
                            if (it.parent) {
                                changed = true;
                                listItems[it.parentIndex].filteredPartly = true;
                            }
                            it = it.parent ? listItems[it.parentIndex] : null;
                        } while(it);
                    }
                }
            }
        } else {
            listItems.forEach(item => {
                if (item.filtered || item.filteredPartly) {
                    item.filtered = false;
                    item.filteredPartly = false;
                    changed = true;
                }
            });
            if (isDisable === false) {
                newState.searchText = '';
                newState.searchMode = false;
                changed = true;
            }
        }

        if (this.state.typeFiler) {
            listItems.forEach(item => {
                if (!item.filtered && item.type !== this.state.typeFiler) {
                    item.filtered = true;
                    changed = true;
                }
            });
        }
        if (this.state.statusFilter !== null) {
            listItems.forEach(item => {
                if (!item.filtered && item.enabled !== this.state.statusFilter) {
                    item.filtered = true;
                    changed = true;
                }
            });
        }
        if (!noUpdate && changed) {
            this.setState(newState, () => cb && cb());
        } else {
            cb && cb()
        }
    }

    ensureSelectedIsVisible(selected, expanded) {
        expanded = JSON.parse(JSON.stringify(expanded || this.state.expanded));
        selected = selected || this.state.selected;
        let changed = false;
        // ensure that the item is visible
        let el = typeof selected === 'object' ? selected : this.state.listItems.find(it => it.id === selected);
        do {
            // eslint-disable-next-line
            el = el && el.parent && this.state.listItems.find(it => it.id === el.parent);
            if (el) {
                if (expanded.indexOf(el.id) === -1) {
                    expanded.push(el.id);
                    changed = true;
                }
            }
        } while (el);
        return changed && expanded;
    }

    componentWillReceiveProps(nextProps) {
        const newState = {};
        let changed = false;
        if (this.expertMode !== nextProps.expertMode) {
            changed = true;
            newState.expertMode = nextProps.expertMode;
        }
        if (this.scriptsHash !== nextProps.scriptsHash && nextProps.scripts) {
            const listItems = prepareList(nextProps.scripts || {});
            this.state.searchText && this.filterList(true, listItems);

            const isAllZeroInstances = this.getIsAllZeroInstances(listItems, nextProps.instances || []);
            const newExp = this.ensureSelectedIsVisible();
            newState.listItems = listItems;
            newState.isAllZeroInstances = isAllZeroInstances;
            if (newExp) {
                newState.expanded = newExp;
            }
            changed = true;
            this.setState(newState);
        }

        if (this.state.width !== nextProps.width) {
            changed = true;
            newState.width = nextProps.width;
        }
        if (this.state.theme !== nextProps.theme) {
            changed = true;
            newState.theme = nextProps.theme;
        }
        changed && this.setState(newState);

        if (nextProps.selectId && this.state.selected !== nextProps.selectId) {
            this.onClick(this.state.listItems.find(item => item.id === nextProps.selectId));
        }
        /*
        const newState = {};
        let changed = false;
        if (this.expertMode !== nextProps.expertMode) {
            changed = true;
            newState.expertMode = nextProps.expertMode;
        }
        if (JSON.stringify(nextProps.runningInstances) !== JSON.stringify(this.state.runningInstances)) {
            changed = true;
            newState.runningInstances = nextProps.runningInstances;
        }
        if (this.scriptsHash !== nextProps.scriptsHash && nextProps.scripts) {
            const listItems = prepareList(nextProps.scripts || {});
            const isAllZeroInstances = this.getIsAllZeroInstances(listItems, nextProps.instances || []);
            const newExp = this.ensureSelectedIsVisible();
            if (newExp) {
                newState.expanded = newExp;
            }
            this.setState(newState);
            newState.listItems = nextProps.listItems;
            newState.isAllZeroInstances = nextProps.isAllZeroInstances;
            changed = true;
        }

        if (nextProps.selectId && this.state.selected !== nextProps.selectId) {
            this.onClick(this.state.listItems.find(item => item.id === nextProps.selectId));
        }
        changed && this.setState(newState);*/
    }

    getIsAllZeroInstances(listItems, instances) {
        listItems = listItems || this.state.listItems;
        instances = instances || this.state.instances;
        let isAllZeroInstances = !instances[0] && instances.length <= 1;

        if (isAllZeroInstances) {
            listItems.forEach(item => {
                if (item.type !== 'folder' && item.instance !== 0) {
                    isAllZeroInstances = false;
                }
            });
        }
        return isAllZeroInstances;
    }

    saveExpanded(expanded) {
        window.localStorage.setItem('SideMenu.expanded', JSON.stringify(expanded || this.state.expanded));
    }

    showError(err) {
        this.setState({errorText: err});
    }

    onExpand(id, e) {
        e && e.stopPropagation();
        if (this.state.expanded.indexOf(id) === -1) {
            const expanded = this.state.expanded.concat([id]);
            this.setState({expanded});
            this.saveExpanded(expanded);
        }
    }

    onCollapse(id, e) {
        e && e.stopPropagation();
        const pos = this.state.expanded.indexOf(id);
        if (pos !== -1) {
            const expanded = this.state.expanded.concat([]);
            expanded.splice(pos, 1);
            if (this.state.selected && this.state.selected.startsWith(id + '.')) {
                this.setState({expanded, selected: id});
                window.localStorage && window.localStorage.setItem('SideMenu.selected', id);
            } else {
                this.setState({expanded});
            }
            this.saveExpanded(expanded);
        }
    }

    onDragEnd(result) {
        // dropped outside the list
        if (!result.destination) {
            return;
        }
        let item = result.destination.index > result.source.index ? this.state.listItems[result.destination.index] : this.state.listItems[result.destination.index - 1];
        while (item && (item.type !== 'folder' && item.parent)) {
            item = this.state.listItems[item.parentIndex];
        }
        let parent = item ? item.id : 'script.js';
        let newId = parent + '.' + result.draggableId.split('.').pop();
        if (this.props.scripts[newId]) {
            newId += '_' + I18n.t('copy');
        }
        this.props.onRename && this.props.onRename(result.draggableId, newId);
    }

    onDragStart(event) {
        // fill the drag depth
        this.setState({
            dragDepth: this.state.listItems.find(i => i.id === event.draggableId).depth,
            draggedId: event.draggableId
        });
    }

    onDragUpdate = (update, provided) => {
        if (!update.destination) return;
        let item = this.state.listItems[update.destination.index - 1];
        while (item && (item.type !== 'folder' || item.parent)) {
            item = this.state.listItems[item.parentIndex];
        }
        if (item) {
            this.setState({dragDepth: item.depth + 1});
            console.log(`depth ${item.depth + 1}`);
        } else {
            console.log(`depth 0`);
            this.setState({dragDepth: 0});
        }
    };

    renderItemButtons(item, children) {
        if (this.state.reorder) return null;
        if (item.type !== 'folder') {
            return [
                (<IconButton className={this.props.classes.iconButtons}
                             onClick={e => {
                                e.stopPropagation();
                                this.props.onEnableDisable && this.props.onEnableDisable(item.id, !item.enabled)
                             }}
                            title={item.enabled ? I18n.t('Pause script') : I18n.t('Run script')}
                            key="startStop"
                            style={{color: item.enabled ? green[400] : red[400]}}>
                            {item.enabled ? (<IconPause/>) : (<IconPlay/>)}
                </IconButton>),
                this.state.width > 350 ? (<IconButton
                    key="delete"
                    title={I18n.t('Delete script')}
                    disabled={item.id === 'script.js.global' || item.id === 'script.js.common'}
                    onClick={e => this.onDelete(item, e)}><IconDelete/></IconButton>) : null,
                (<IconButton key="openInEdit" title={I18n.t('Edit script or just double click')} onClick={e => this.onEdit(item, e)}><IconDoEdit/></IconButton>),
            ];
        } else if (this.state.width > 350) {
            if (item.id !== 'script.js' && item.id !== 'script.js.common' && item.id !== 'script.js.global' && (!children || !children.length)) {
                return (<IconButton
                    key="delete"
                    title={I18n.t('Delete folder')}
                    disabled={item.id === 'script.js.global' || item.id === 'script.js.common'}
                    onClick={e => this.onDelete(item, e)}><IconDelete/></IconButton>);
            } else {
                return null;
            }
        }
    }

    onDelete(item, e) {
        e && e.stopPropagation();
        return new Promise(resolve => {
            if (typeof item !== 'object') {
                this.setState({deleting: item});
            } else {
                this.setState({deleting: item.id});
            }
        });
    }

    onEdit(item, e) {
        this.onClick(item, e);
        this.props.onEdit && this.props.onEdit(item.id);
    }

    renderFolderButtons(item, children, isExpanded) {
        if (this.state.reorder) {
            if (item.type !== 'folder') {
                return (<IconGrip className={this.props.classes.gripHandle}/>);
            } else {
                return (<div className={this.props.classes.noGripHandle}/>);
            }
        }
        if (children && children.length) {
            return (
                <IconButton className={this.props.classes.expandButton}
                            onClick={isExpanded ? e => this.onCollapse(item.id, e) : e => this.onExpand(item.id, e)}>
                    {isExpanded ? (<IconCollapse fontSize="small"/>) : (<IconExpand fontSize="small"/>)}
                </IconButton>
            );
        } else {
            return (<div className={this.props.classes.expandButton}/>);
        }
    }

    getTextStyle(item) {
        if (!this.state.reorder && item.type !== 'folder') {
            return {
                //width: 130,
                width: `calc(100% - ${this.state.width > 350 ? 210 : 165}px)`,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                flex: 'none',
                padding: '0 16px 0 0'
            };
        } else {
            return {
                whiteSpace: 'nowrap',
                padding: '0 16px 0 0'
            };
        }
    }

    onClick(item, e) {
        e && e.stopPropagation();
        if (!this.state.reorder && item) {
            const expanded = this.ensureSelectedIsVisible(item);
            const newState = {selected: item.id};
            if (expanded) {
                newState.expanded = expanded;
            }
            this.setState(newState);
            window.localStorage && window.localStorage.setItem('SideMenu.selected', item.id);
        }
    }

    onDblClick(item, e) {
        e && e.stopPropagation();
        if (this.state.reorder) return;
        if (item.type === 'folder') {
            const isExpanded = this.state.expanded.indexOf(item.id) !== -1;
            if (isExpanded) {
                this.onCollapse(item.id);
            } else {
                this.onExpand(item.id);
            }
        } else {
            this.onEdit(item);
        }
    }

    renderOneItem(items, item) {
        let children = items.filter(i => i.parent === item.id);

        if (item.filtered && !item.filteredPartly) return;

        if (item.id === 'script.js.global' && !this.state.expertMode) {
            return;
        }

        const depthPx = this.state.reorder ?
            8 + (this.state.draggedId === item.id ? this.state.dragDepth : item.depth) * Theme.menu.depthOffset :
            item.depth * Theme.menu.depthOffset;

        let title = item.title;

        if (this.state.searchText) {
            const pos = title.toLowerCase().indexOf(this.state.searchText.toLowerCase());
            if (pos !== -1) {
                title = [
                    (<span>{title.substring(0, pos)}</span>),
                    (<span style={{color: 'orange'}}>{title.substring(pos, pos + this.state.searchText.length)}</span>),
                    (<span>{title.substring(pos + this.state.searchText.length)}</span>),
                ];
            }
        }

        if (!this.state.isAllZeroInstances && item.type !== 'folder') {
            title = [(<span key="instance" className={this.props.classes.instances}>[{item.instance}] </span>), (
                <span key="title">{title}</span>)];
        }

        const style = Object.assign({
            marginLeft: depthPx,
            cursor: item.type === 'folder' && this.state.reorder ? 'default' : 'inherit',
            opacity: item.filteredPartly ? 0.5 : 1
        }, item.id === this.state.selected && !this.state.reorder ? Theme.colors.selected : {});

        if (item.id === 'script.js.global' && item.id !== this.state.selected) {
            style.color = '#00a200';
        }

        let isExpanded = false;
        if (children && children.length) {
            isExpanded = this.state.expanded.indexOf(item.id) !== -1;
        }

        let iconStyle = {};
        if (item.id === 'script.js.global') {
            iconStyle.color = '#356956';
        } else if (item.id === 'script.js.common') {
            iconStyle.color = '#4899e1';
        }

        const inner =
            (<ListItem
                key={item.id}
                style={style}
                className={(item.type === 'folder' ? this.props.classes.folder : this.props.classes.element) + ' ' + (this.state.reorder ? this.props.classes.reorder : '')}
                onClick={e => this.onClick(item, e)}
                onDoubleClick={e => this.onDblClick(item, e)}
            >
                {this.renderFolderButtons(item, children, isExpanded)}
                <ListItemIcon>{item.type === 'folder' ? (isExpanded ? (<IconFolderOpened style={iconStyle}/>) : (<IconFolder style={iconStyle}/>)) : (
                    <img className={this.props.classes.scriptIcon} alt={item.type} src={images[item.type] || images.def}/>)}</ListItemIcon>
                <ListItemText
                    classes={{primary: item.id === this.state.selected && !this.state.reorder ? this.props.classes.selected : undefined}}
                    style={this.getTextStyle(item)} primary={title}/>
                <ListItemSecondaryAction>{this.renderItemButtons(item, children)}</ListItemSecondaryAction>
            </ListItem>);

        const result = [this.state.reorder ? (
            <Draggable key={item.id} draggableId={item.id} index={item.index} isDragDisabled={item.type === 'folder'}>
                {(provided, snapshot) => (
                    <div ref={provided.innerRef}
                         {...provided.draggableProps}
                         {...provided.dragHandleProps}
                         style={getItemStyle(
                             snapshot.isDragging,
                             provided.draggableProps.style
                         )}>
                        {inner}
                    </div>
                )}
            </Draggable>) : inner];

        if (children && (this.state.reorder || this.state.expanded.indexOf(item.id) !== -1)) {
            children.forEach(it => result.push(this.renderOneItem(items, it)));
        }
        return result;
    }

    renderAllItems(items, dragging) {
        const result = [];
        items.forEach(item => !item.parent && result.push(this.renderOneItem(items, item, dragging)));

        return (<List dense={true} disablePadding={true}>{result}</List>);
    }

    onAddNew(e) {
        e && e.stopPropagation();
        let item = this.state.listItems.find(i => i.id === this.state.selected);
        let parent = 'script.js';
        while (item && item.type !== 'folder') {
            item = this.state.listItems[item.parentIndex];
        }
        if (item) {
            parent = item.id;
        }

        this.parent = parent;
        this.setState({choosingType: true});
    }

    onCopy(e, id) {
        e && e.stopPropagation();
        let item = this.state.listItems.find(i => i.id === id);
        let parent = 'script.js';
        while (item && item.type !== 'folder') {
            item = this.state.listItems[item.parentIndex];
        }
        if (item) {
            parent = item.id;
        }

        this.parent = parent;
        this.setState({copingScript: id});
    }

    onAddNewFolder(e) {
        e && e.stopPropagation();
        let item = this.state.listItems.find(i => i.id === this.state.selected);
        let parent = 'script.js';
        while (item && item.type !== 'folder') {
            item = this.state.listItems[item.parentIndex];
        }
        if (item) {
            parent = item.id;
        }

        this.parent = parent;
        this.setState({creatingFolder: true});
    }

    onRename(e) {
        e && e.stopPropagation();
        this.setState({renaming: this.state.selected});
    }

    getUniqueName(copyId) {
        let i = 1;
        let word = I18n.t('Script') + ' ';
        if (copyId) {
            let name = getObjectName(copyId, this.props.objects[copyId]);
            const m = name.match(/\d+$/);
            if (m) {
                word = name.replace(/\d+$/, '');
                i = parseInt(m[0], 10) + 1;
            } else {
                word = name;
            }
        }

        // eslint-disable-next-line
        while (this.state.listItems.find(it => it.id === this.parent + '.' + word.replace(/\s/g, '_') + i)) {
            i++;
        }
        /*ignore jslint end*/
        return word + i;
    }

    getUniqueFolderName() {
        let i = 1;
        // eslint-disable-next-line
        while (this.state.listItems.find(it => it.id === this.parent + '.' + I18n.t('Folder') + '_' + i)) {
            i++;
        }
        return I18n.t('Folder') + ' ' + i;
    }

    onCloseMenu(cb) {
        this.setState({menuOpened: false, menuAnchorEl: null, filterMenuOpened: false, menuAnchorFilterEl: null}, cb);
    }

    // render menu and toolbar
    getToolbarButtons() {
        const result = [];
        const classes = this.props.classes;
        if (this.state.searchMode) {
            result.push((<RootRef rootRef={this.inputRef}><Input
                key="searchInput"
                value={this.state.searchText}
                className={classes.toolbarSearch}
                ref={this.inputRef}
                autoFocus={true}
                placeholder={I18n.t('Search...')}
                onChange={e => {
                    this.setState({searchText: e.target.value});
                    this.filterTimer && clearTimeout(this.filterTimer);
                    this.filterTimer = setTimeout(() => {
                        this.props.onSearch && this.props.onSearch(this.state.searchText);
                    }, 400);
                }}
            /></RootRef>));
            result.push((<IconButton
                key="disableSearch"
                className={classes.toolbarButtons}
                style={{float: 'right'}}
                title={I18n.t('End search mode')}
                onClick={e => {
                    e.stopPropagation();
                    this.filterList(false, null, () => this.props.onSearch && this.props.onSearch(this.state.searchText));
                }}
            ><IconClose /></IconButton>));
            this.state.searchText && result.push((<IconButton
                key="cleanSearch"
                mini="true"
                title={I18n.t('Clear search input')}
                className={classes.toolbarButtons}
                style={{marginTop: 7, float: 'right'}}
                onClick={e => {
                    e.stopPropagation();
                    this.setState({searchText: ''}, () => this.props.onSearch && this.props.onSearch(this.state.searchText));
                }}
            ><IconClear fontSize="small"/></IconButton>));
        } else {
            if (!this.state.reorder) {
                // Open Menu
                result.push((<IconButton
                    key="menuButton"
                    aria-label="More"
                    aria-owns={this.state.menuOpened ? 'long-menu' : undefined}
                    title={I18n.t('Menu')}
                    aria-haspopup="true"
                    onClick={event => {
                        event.stopPropagation();
                        event.preventDefault();
                        this.setState({menuOpened: true, menuAnchorEl: event.currentTarget});
                    }}
                >
                    <IconMore />
                </IconButton>));

                const selectedItem = this.state.listItems.find(it => it.id === this.state.selected);
                let children;
                if (selectedItem && this.state.width <= 350 && selectedItem.type === 'folder') {
                    children = this.state.listItems.filter(i => i.parent === this.state.selected);
                }

                // Menu
                result.push((<Menu
                    key="menu"
                    id="long-menu"
                    anchorEl={this.state.menuAnchorEl}
                    open={this.state.menuOpened}
                    onClose={() => this.setState({menuOpened: false, menuAnchorEl: null})}
                    PaperProps={{
                        style: {
                            maxHeight: MENU_ITEM_HEIGHT * 6.5,
                            //width: 200,
                        },
                    }}
                >
                    {this.state.width <= 350 ? (<MenuItem
                        key="deleted"
                        disabled={!this.state.selected || this.state.selected === 'script.js.global' || this.state.selected === 'script.js.common' || (children && children.length)}
                        onClick={event => {
                            event.stopPropagation();
                            event.preventDefault();
                            if (this.state.listItems.find(item => item.parent === this.state.selected)) {
                                this.showError(I18n.t('Cannot delete non empty item!'));
                                return;
                            }

                            this.setState({menuOpened: false, menuAnchorEl: null, filterMenuOpened: false}, () =>
                                this.onDelete(this.state.selected).then(() => {}));
                        }}><IconDelete className={this.props.classes.iconDropdownMenu}  style={{color: 'red'}}/>{I18n.t('Delete')}
                    </MenuItem>) : null}
                    <MenuItem key="expertMode" selected={this.state.expertMode}
                              onClick={event => {
                                  event.stopPropagation();
                                  event.preventDefault();
                                  this.onCloseMenu(() =>
                                      this.props.onExpertModeChange && this.props.onExpertModeChange(!this.state.expertMode));
                              }}><IconExpert className={this.props.classes.iconDropdownMenu} style={{color: 'orange'}}/>{I18n.t('Expert mode')}
                    </MenuItem>
                    {this.props.onExport && (<MenuItem key="exportAll"
                                                       onClick={event => {
                                                           event.stopPropagation();
                                                           event.preventDefault();
                                                           this.onCloseMenu(() => this.props.onExport());
                                                       }}><IconExport className={this.props.classes.iconDropdownMenu} />{I18n.t('Export all scripts')}
                    </MenuItem>)}
                    {this.props.onImport && (<MenuItem key="import"
                                                       onClick={event => {
                                                           event.stopPropagation();
                                                           event.preventDefault();
                                                           this.onCloseMenu(() => this.props.onImport());
                                                       }}><IconImport className={this.props.classes.iconDropdownMenu} />{I18n.t('Import scripts')}
                    </MenuItem>)}
                    {this.props.onThemeChange && (<MenuItem key="dark"
                                                       onClick={event => {
                                                           //event.stopPropagation();
                                                           //event.preventDefault();
                                                           this.onCloseMenu(() =>
                                                               this.props.onThemeChange(this.state.theme === 'dark' ? 'light' : 'dark'));
                                                       }}><IconDark className={this.props.classes.iconDropdownMenu} />{this.state.theme === 'dark' ? I18n.t('Light style') : I18n.t('Dark style')}
                    </MenuItem>)}
                    {this.props.onAddNew && (<MenuItem key="copy"
                                         disabled={!this.state.selected || !selectedItem || selectedItem.type === 'folder'}
                                         onClick={event => {
                                             const selected = this.state.selected;
                                             this.onCloseMenu(() => this.onCopy(event, selected))
                                         }}>
                            <IconCopy className={this.props.classes.iconDropdownMenu} />{I18n.t('Copy script')}
                    </MenuItem>)}
                    {<MenuItem key="filter"
                                         onClick={event => {
                                             this.setState({filterMenuOpened: !this.state.filterMenuOpened, menuAnchorFilterEl: this.state.filterMenuOpened ? null : event.currentTarget})
                                         }}>
                            <IconCopy className={this.props.classes.iconDropdownMenu} />{I18n.t('Filter by')}
                    </MenuItem>}
                </Menu>));

                if (this.props.filterMenuOpened) {
                    result.push((<Menu
                        key="menuFilter"
                        id="long-menu-filter"
                        anchorEl={this.state.menuAnchorFilterEl}
                        open={this.state.filterMenuOpened}
                        onClose={() => this.setState({filterMenuOpened: false, menuAnchorFilterEl: null})}
                        PaperProps={{
                            style: {
                                maxHeight: MENU_ITEM_HEIGHT * 6.5,
                                //width: 200,
                            },
                        }}
                    >
                        <MenuItem key="filterByRunning" selected={this.state.statusFilter === true}
                                  onClick={event => {
                                      event.stopPropagation();
                                      event.preventDefault();
                                      this.onCloseMenu(() => this.setState({statusFilter: this.state.statusFilter === true ? null : true}));
                                  }}><IconExpert className={this.props.classes.iconDropdownMenu}
                                                 style={{color: 'orange'}}/>{I18n.t('only running')}
                        </MenuItem>

                        <MenuItem key="filterByStopped" selected={this.state.statusFilter === false}
                                  onClick={event => {
                                      event.stopPropagation();
                                      event.preventDefault();
                                      this.onCloseMenu(() => this.setState({statusFilter: this.state.statusFilter === false ? null : true}));
                                  }}><IconExpert className={this.props.classes.iconDropdownMenu}
                                                 style={{color: 'orange'}}/>{I18n.t('only paused')}
                        </MenuItem>

                        <MenuItem key="filterByStopped" selected={this.state.typeFiler === 'Blockly'}
                                  onClick={event => {
                                      event.stopPropagation();
                                      event.preventDefault();
                                      this.onCloseMenu(() => this.setState({statusFilter: this.state.typeFiler === 'Blockly' ? '' : 'Blockly'}));
                                  }}><IconExpert className={this.props.classes.iconDropdownMenu}
                                                 style={{color: 'orange'}}/>{I18n.t('only blockly')}
                        </MenuItem>
                        <MenuItem key="filterByStopped" selected={this.state.typeFiler === 'JS'}
                                  onClick={event => {
                                      event.stopPropagation();
                                      event.preventDefault();
                                      this.onCloseMenu(() => this.setState({statusFilter: this.state.typeFiler === 'JS' ? '' : 'JS'}));
                                  }}><IconExpert className={this.props.classes.iconDropdownMenu}
                                                 style={{color: 'orange'}}/>{I18n.t('only JS')}
                        </MenuItem>
                        <MenuItem key="filterByStopped" selected={this.state.typeFiler === 'TS'}
                                  onClick={event => {
                                      event.stopPropagation();
                                      event.preventDefault();
                                      this.onCloseMenu(() => this.setState({statusFilter: this.state.typeFiler === 'TS' ? '' : 'TS'}));
                                  }}><IconExpert className={this.props.classes.iconDropdownMenu}
                                                 style={{color: 'orange'}}/>{I18n.t('only TS')}
                        </MenuItem>
                    </Menu>));
                }

                        // New Script
                result.push((<IconButton
                    key="new-script"
                    title={I18n.t('Create new script')}
                    className={classes.toolbarButtons}
                    style={{color: this.state.reorder ? 'red' : 'inherit'}}
                    onClick={e => this.onAddNew(e)}
                ><IconAdd/></IconButton>));

                // New Folder
                result.push((<IconButton
                    key="new-folder"
                    title={I18n.t('Create new folder')}
                    className={classes.toolbarButtons}
                    style={{color: this.state.reorder ? 'red' : 'inherit'}}
                    onClick={() => this.onAddNewFolder()}
                ><IconAddFolder/></IconButton>));
            }

            // Search
            result.push((<IconButton
                key="search"
                disabled={this.state.reorder}
                className={classes.toolbarButtons}
                title={I18n.t('Search in scripts')}
                style={{float: 'right'}}
                onClick={e => {
                    e.stopPropagation();
                    this.setState({searchMode: true});
                }}
            ><IconFind/></IconButton>));

            // Reorder button
            result.push((<IconButton
                key="reorder"
                title={I18n.t('Reorder scripts in folders')}
                className={classes.toolbarButtons}
                style={{color: this.state.reorder ? 'red' : 'inherit', float: 'right'}}
                onClick={e => {
                    e.stopPropagation();
                    this.setState({reorder: !this.state.reorder, draggedId: ''});
                }}
            ><IconReorder/></IconButton>));

            if (!this.state.reorder && this.state.selected && this.state.selected !== 'script.js.global' && this.state.selected !== 'script.js.common') {
                // Rename
                result.push((<IconButton className={classes.toolbarButtons}
                                         title={I18n.t('Rename')}
                                         key="rename"
                                         onClick={e => this.onRename(e)}
                ><IconEdit/></IconButton>));


                // const selectedItem = this.state.listItems.find(i => i.id === this.state.selected);
                // if (selectedItem && selectedItem.type !== 'folder') {
                //     // Restart
                //     result.push((<IconButton className={classes.toolbarButtons}
                //          key="restart"
                //          onClick={e => {
                //              e.stopPropagation();
                //              this.props.onEnableDisable && this.props.onEnableDisable();
                //          }}
                //     ><IconRestart/></IconButton>));
                // }
            }

        }
        return result;
    }

    getFolders() {
        const folders = [{id: 'script.js', name: I18n.t('Root folder')}];
        this.state.listItems.forEach(item => item.type === 'folder' && folders.push({id: item.id, name: item.title}));
        return folders;
    }

    render() {
        const {classes} = this.props;

        const renamingItem = this.state.renaming && this.state.listItems.find(i => i.id === this.state.renaming);
        const copingItem = this.state.copingScript && this.props.objects[this.state.copingScript];

        return [(
            <Drawer
                key="drawer"
                variant="permanent"
                className={classes.menu}
                classes={{paper: classes.drawerPaper}}
                anchor='left'
                onClick={() => this.onClick({id: ''})}
            >
                <div className={classes.toolbar}>
                    {this.getToolbarButtons()}
                </div>
                <Divider/>
                <DragDropContext
                    onDragStart={e => this.onDragStart(e)}
                    onDragEnd={e => this.onDragEnd(e)}
                    onDragUpdate={e => this.onDragUpdate(e)}
                >
                    <Droppable droppableId="droppable">
                        {(provided, snapshot) => (
                            <div ref={provided.innerRef}
                                //style={getListStyle(snapshot.isDraggingOver)}
                                 className={classes.innerMenu}>
                                {this.renderAllItems(this.state.listItems)}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </Drawer>),
            renamingItem ? (<DialogRename
                key="dialog-rename"
                name={renamingItem.title}
                title={I18n.t('Rename')}
                id={this.state.renaming}
                folder={renamingItem.type === 'folder'}
                instance={renamingItem.instance}
                instances={this.props.instances}
                onClose={() => this.setState({renaming: false})}
                onRename={(oldId, newName, newId, newInstance) => this.props.onRename && this.props.onRename(oldId, newName, newId, newInstance)}
            />) : null,
            this.state.deleting ? (<DialogDelete
                key="dialog-delete"
                name={this.state.listItems.find(i => i.id === this.state.deleting).title}
                id={this.state.deleting}
                onClose={() => this.setState({deleting: false})}
                onDelete={id => this.props.onDelete && this.props.onDelete(id)}
            />) : null,
            this.state.choosingType ? (<DialogAddNewScript
                key="dialog-script-type"
                onClose={type => {
                    this.setState({choosingType: false});
                    type && this.setState({creatingScript: type})
                }}
            />) : null,
            this.state.creatingScript ? (<DialogNew
                key="dialog-new-script"
                onClose={() => this.setState({creatingScript: false})}
                title={I18n.t('Create new script')}
                name={this.getUniqueName()}
                parents={this.getFolders()}
                folder={false}
                existingItems={this.state.listItems.map(item => item.id)}
                instance={this.props.instances[0] || 0}
                instances={this.props.instances}
                type={this.state.creatingScript}
                parent={this.parent}
                onAdd={(id, name, instance, type) => {
                    this.props.onAddNew && this.props.onAddNew(id, name, false, instance, type);
                }}
            />) : null,
            this.state.copingScript ? (<DialogNew
                key="dialog-copy-script"
                onClose={() => this.setState({copingScript: ''})}
                title={I18n.t('Copy script')}
                name={this.getUniqueName(this.state.copingScript)}
                parents={this.getFolders()}
                folder={false}
                instance={parseInt((copingItem && copingItem.common && copingItem.common.engine && copingItem.common.engine.split('.').pop()) || 0, 10)}
                instances={this.props.instances}
                type={(copingItem && copingItem.common && copingItem.common.engineType) || 'Javascript/js'}
                parent={this.parent}
                onAdd={(id, name, instance, type) => {
                    const copingItem = this.state.copingScript && this.props.objects[this.state.copingScript];
                    this.props.onAddNew && this.props.onAddNew(id, name, false, instance, type, copingItem && copingItem.common && copingItem.common.source);
                }}
            />) : null,
            this.state.creatingFolder ? (<DialogNew
                key="dialog-new-folder"
                onClose={() => this.setState({creatingFolder: false})}
                title={I18n.t('Create new folder')}
                parents={this.getFolders()}
                name={this.getUniqueFolderName()}
                parent={this.parent}
                onAdd={(id, name) => {
                    this.props.onAddNew && this.props.onAddNew(id, name, true);
                }}
            />) : null,
            this.state.errorText ? (<DialogError onClose={() => this.setState({errorText: ''})} text={this.state.errorText}/>) : null
        ];
    }
}

SideDrawer.propTypes = {
    classes: PropTypes.object.isRequired,
    instances: PropTypes.array.isRequired,
    scripts: PropTypes.object.isRequired,
    scriptsHash: PropTypes.number,
    onEdit: PropTypes.func,
    selectId: PropTypes.string,
    expertMode: PropTypes.bool,
    onExpertModeChange: PropTypes.func,
    onEnableDisable: PropTypes.func,
    runningInstances: PropTypes.object,
    theme: PropTypes.string,
    onSelect: PropTypes.func,
    onAddNew: PropTypes.func,
    onRename: PropTypes.func,
    onDelete: PropTypes.func,
    onImport: PropTypes.func,
    onExport: PropTypes.func,
    objects: PropTypes.object,
    onSearch: PropTypes.func,
    onThemeChange: PropTypes.func,
    width: PropTypes.number
};

export default withStyles(styles)(SideDrawer);
