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

import red from '@material-ui/core/colors/red';
import green from '@material-ui/core/colors/green';

import {MdMoreVert as IconMore} from 'react-icons/md';
import {MdFolder as IconFolder} from 'react-icons/md';
import {MdDelete as IconDelete} from 'react-icons/md';
import {MdInput as IconDoEdit} from 'react-icons/md';
import {MdDragHandle as IconGrip} from 'react-icons/md';
import {MdExpandMore as IconExpand} from 'react-icons/md';
import {MdExpandLess as IconCollapse} from 'react-icons/md';
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
        width: Theme.menu.width,
    },
    toolbar: {
        height: Theme.toolbar.height
    },
    toolbarButtons: {
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
        background: '#e2e2e2',
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
            title: getObjectName(ids[i], obj, 'de'),
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

    // Fill all parentIndex
    result.forEach(item => {
        if (item.parent) {
            item.parentIndex = result.find(it => it.id === item.parent).index;
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

        this.state = {
            listItems: prepareList(props.scripts || {}),
            expanded: expanded,
            reorder: false,
            dragDepth: 0,
            draggedId: null,
            selected: window.localStorage ? window.localStorage.getItem('SideMenu.selected') || null : null,
            creatingScript: false,
            creatingFolder: false,
            renaming: null,
            deleting: null,
            choosingType: null,
            errorText: '',
            instances: props.instances || [],
            menuOpened: false,
            menuAnchorEl: null,
            expertMode: this.props.expertMode,
            runningInstances: this.props.runningInstances || {}
        };

        const newExp = this.ensureSelectedIsVisible();
        if (newExp) {
            this.state.expanded = newExp;
        }

        this.scriptsHash = props.scriptsHash;

        this.state.isAllZeroInstances = this.getIsAllZeroInstances();
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
        if (this.expertMode !== nextProps.expertMode) {
            this.setState({expertMode: nextProps.expertMode});
        }
        if (this.scriptsHash !== nextProps.scriptsHash && nextProps.scripts) {
            const listItems = prepareList(nextProps.scripts || {});
            const isAllZeroInstances = this.getIsAllZeroInstances(listItems, nextProps.instances || []);
            const newExp = this.ensureSelectedIsVisible();
            const newState = {listItems, isAllZeroInstances};
            if (newExp) {
                newState.expanded = newExp;
            }
            this.setState(newState);
        }

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
                (<IconButton className={this.props.classes.iconButtons} onClick={e => {
                    e.stopPropagation();
                    this.props.onEnableDisable && this.props.onEnableDisable(item.id, !item.enabled)
                }}
                     key="restart"
                     style={{color: item.enabled ? green[400] : red[400]}}>
                    {item.enabled ? (<IconPause/>) : (<IconPlay/>)}
                </IconButton>),
                (<IconButton key="edit" onClick={e => this.onEdit(item, e)}><IconDoEdit/></IconButton>)
            ];
        }
    }

    onDelete(item) {
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

    renderFolderButtons(item, children) {
        if (this.state.reorder) {
            if (item.type !== 'folder') {
                return (<IconGrip className={this.props.classes.gripHandle}/>);
            } else {
                return (<div className={this.props.classes.noGripHandle}/>);
            }
        }
        if (children && children.length) {
            const isExpanded = this.state.expanded.indexOf(item.id) !== -1;
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
                width: 130,
                overflow: 'hidden',
                flex: 'none',
                padding: '0 16px 0 0'
            };
        } else {
            return {
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

        if (item.id === 'script.js.global' && !this.state.expertMode) {
            return;
        }

        const depthPx = this.state.reorder ?
            8 + (this.state.draggedId === item.id ? this.state.dragDepth : item.depth) * Theme.menu.depthOffset :
            item.depth * Theme.menu.depthOffset;

        let title = item.title;
        if (!this.state.isAllZeroInstances && item.type !== 'folder') {
            title = [(<span key="instance" className={this.props.classes.instances}>[{item.instance}] </span>), (
                <span key="title">{title}</span>)];
        }

        const style = Object.assign({
            paddingLeft: depthPx,
            cursor: item.type === 'folder' && this.state.reorder ? 'default' : 'inherit'
        }, item.id === this.state.selected && !this.state.reorder ? Theme.colors.selected : {});

        if (item.id === 'script.js.global' && item.id !== this.state.selected) {
            style.color = '#00a200';
        }

        const inner = (
            <ListItem
                key={item.id}
                style={style}
                className={(item.type === 'folder' ? this.props.classes.folder : this.props.classes.element) + ' ' + (this.state.reorder ? this.props.classes.reorder : '')}
                onClick={e => this.onClick(item, e)}
                onDoubleClick={e => this.onDblClick(item, e)}
            >
                {this.renderFolderButtons(item, children)}
                <ListItemIcon>{item.type === 'folder' ? (<IconFolder/>) : (
                    <img className={this.props.classes.scriptIcon} alt={item.type}
                         src={images[item.type] || images.def}/>)}</ListItemIcon>
                <ListItemText
                    classes={{primary: item.id === this.state.selected && !this.state.reorder ? this.props.classes.selected : undefined}}
                    style={this.getTextStyle(item)} primary={title}/>
                <ListItemSecondaryAction>{this.renderItemButtons(item, children)}</ListItemSecondaryAction>
            </ListItem>
        );

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

    getUniqueName() {
        let i = 1;
        // eslint-disable-next-line
        while (this.state.listItems.find(it => it.id === this.parent + '.' + I18n.t('Script') + '_' + i)) {
            i++;
        }
        /*ignore jslint end*/
        return I18n.t('Script') + ' ' + i;
    }

    getUniqueFolderName() {
        let i = 1;
        // eslint-disable-next-line
        while (this.state.listItems.find(it => it.id === this.parent + '.' + I18n.t('Folder') + '_' + i)) {
            i++;
        }
        return I18n.t('Folder') + ' ' + i;
    }

    getToolbarButtons() {
        const result = [];
        const classes = this.props.classes;
        if (!this.state.reorder) {
            // Menu
            result.push((<IconButton
                key="menuButton"
                aria-label="More"
                aria-owns={this.state.menuOpened ? 'long-menu' : undefined}
                aria-haspopup="true"
                onClick={event => {
                    event.stopPropagation();
                    event.preventDefault();
                    this.setState({menuOpened: true, menuAnchorEl: event.currentTarget});
                }}
            >
                <IconMore />
            </IconButton>));

            result.push((<Menu
                key="menu"
                id="long-menu"
                anchorEl={this.state.menuAnchorEl}
                open={this.state.menuOpened}
                onClose={() => this.setState({menuOpened: false, menuAnchorEl: null})}
                PaperProps={{
                    style: {
                        maxHeight: MENU_ITEM_HEIGHT * 4.5,
                        width: 200,
                    },
                }}
            >
                <MenuItem
                    key="deleted"
                    disabled={!this.state.selected || this.state.selected === 'script.js.global' || this.state.selected === 'script.js.common'}
                    onClick={event => {
                        event.stopPropagation();
                        event.preventDefault();
                        if (this.state.listItems.find(item => item.parent === this.state.selected)) {
                            this.showError(I18n.t('Cannot delete non empty item!'));
                            return;
                        }

                        this.setState({menuOpened: false, menuAnchorEl: null}, () =>
                            this.onDelete(this.state.selected).then(() => {}));
                    }}><IconDelete className={this.props.classes.iconDropdownMenu}  style={{color: 'red'}}/>{I18n.t('Delete')}
                </MenuItem>
                <MenuItem key="expertMode" selected={this.state.expertMode}
                          onClick={event => {
                              event.stopPropagation();
                              event.preventDefault();
                              this.setState({menuOpened: false, menuAnchorEl: null}, () =>
                                  this.props.onExpertModeChange && this.props.onExpertModeChange(!this.state.expertMode));
                          }}><IconExpert className={this.props.classes.iconDropdownMenu} style={{color: 'orange'}}/>{I18n.t('ExpertMode')}
                </MenuItem>
                {this.props.onExport && (<MenuItem key="exportAll"
                          onClick={event => {
                              event.stopPropagation();
                              event.preventDefault();
                              this.setState({menuOpened: false, menuAnchorEl: null}, () =>
                                  this.props.onExport && this.props.onExport());
                          }}><IconExport className={this.props.classes.iconDropdownMenu} />{I18n.t('Export all scripts')}
                </MenuItem>)}
                {this.props.onImport && (<MenuItem key="import"
                          onClick={event => {
                              event.stopPropagation();
                              event.preventDefault();
                              this.setState({menuOpened: false, menuAnchorEl: null}, () =>
                                  this.props.onImport && this.props.onImport());
                          }}><IconImport className={this.props.classes.iconDropdownMenu} />{I18n.t('Import scripts')}
                </MenuItem>)}
            </Menu>));

            // New Script
            result.push((<IconButton
                key="new-script"
                className={classes.toolbarButtons}
                style={{color: this.state.reorder ? 'red' : 'inherit'}}
                onClick={e => this.onAddNew(e)}
            ><IconAdd/></IconButton>));

            // New Folder
            result.push((<IconButton
                key="new-folder"
                className={classes.toolbarButtons}
                style={{color: this.state.reorder ? 'red' : 'inherit'}}
                onClick={() => this.onAddNewFolder()}
            ><IconAddFolder/></IconButton>));
        }

        // New Reorder button
        result.push((<IconButton
            key="reorder"
            className={classes.toolbarButtons}
            style={{color: this.state.reorder ? 'red' : 'inherit', float: 'right'}}
            onClick={e => {
                e.stopPropagation();
                this.setState({reorder: !this.state.reorder, draggedId: ''});
            }}
        ><IconReorder/></IconButton>));

        // Search
        if (!this.state.reorder) {
            result.push((<IconButton
                key="search"
                className={classes.toolbarButtons}
                style={{float: 'right'}}
                onClick={e => e.stopPropagation()}
            ><IconFind/></IconButton>));
        }

        if (!this.state.reorder && this.state.selected && this.state.selected !== 'script.js.global' && this.state.selected !== 'script.js.common') {
            // Rename
            result.push((<IconButton className={classes.toolbarButtons}
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
                instance={this.props.instances[0] || 0}
                instances={this.props.instances}
                type={this.state.creatingScript}
                parent={this.parent}
                onAdd={(id, name, instance, type) => {
                    this.props.onAddNew && this.props.onAddNew(id, name, false, instance, type);
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
    onSelect: PropTypes.func,
    onAddNew: PropTypes.func,
    onRename: PropTypes.func,
    onDelete: PropTypes.func,
    onImport: PropTypes.func,
    onExport: PropTypes.func,
};

export default withStyles(styles)(SideDrawer);
