import React from 'react';
import PropTypes from 'prop-types';
import { useDrag, useDrop, DndProvider as DragDropContext  } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import {
    Drawer,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    IconButton,
    Menu,
    MenuItem,
    Input,
    ListItemSecondaryAction, Box,
} from '@mui/material';

import {
    MdMoreVert as IconMore,
    MdContentCopy as IconCopy,
    MdDelete as IconDelete,
    MdInput as IconDoEdit,
    MdClose as IconClear,
    MdFormatClear as IconClose,
    MdPlayArrow as IconPlay,
    MdAdd as IconAdd,
    MdCreateNewFolder as IconAddFolder,
    MdPause as IconPause,
    MdSwapVert as IconReorder,
    MdEdit as IconEdit,
    MdSearch as IconFind,
    MdPersonPin as IconExpert,
    MdPalette as IconDark,
    MdUnfoldMore as IconExpandAll,
    MdUnfoldLess as IconCollapseAll,
    MdBugReport as IconDebug,
} from 'react-icons/md';

import {
    FaFolder as IconFolder,
    FaFolderOpen as IconFolderOpened,
    FaFileExport as IconExport,
    FaFileImport as IconImport,
} from 'react-icons/fa';

import { red, green, yellow } from '@mui/material/colors';

import { I18n, Utils } from '@iobroker/adapter-react-v5';

import ImgJS from './assets/js.png';
import ImgBlockly from './assets/blockly.png';
import ImgTypeScript from './assets/typescript.png';
import ImgRules from './assets/rules.png';

import DialogRename from './Dialogs/Rename';
import DialogDelete from './Dialogs/Delete';
import DialogAddNewScript from './Dialogs/AddNewScript';
import DialogNew from './Dialogs/New';
import DialogError from './Dialogs/Error';
import DialogAdapterDebug from './Dialogs/AdapterDebug';

const MENU_ITEM_HEIGHT = 48;
const COLOR_RUN = green[400];
const COLOR_PROBLEM = yellow[400];
const COLOR_PAUSE = red[400];
const ROOT_ID = 'script.js';
const COMMON_ID = `${ROOT_ID}.common`;
const GLOBAL_ID = `${ROOT_ID}.global`;
const NARROW_WIDTH = 350;
const LEVEL_PADDING = 16;

const SELECTED_STYLE = {
    background: '#164477',
    color: 'white'
};

const styles = {
    drawerPaper: {
        position: 'relative',
        width: '100%', //Theme.menu.width,
        height: '100%',
        overflow: 'hidden',
    },
    toolbar: theme => ({
        height: theme.toolbar.height,
    }),
    toolbarButtons: theme => ({
        color: theme.palette.mode === 'dark'? 'white !important' : 'black !important',
    }),
    iconButtonsDisabled: {
        filter: 'grayscale(100%)',
        opacity: 0.5,
    },
    toolbarSearch: {
        width: 'calc(100% - 105px)',
        lineHeight: '34px',
        marginLeft: 5,
    },
    iconButtons: {
        width: 32,
        height: 32,
        padding: 2,
    },
    iconDropdownMenu: {
        paddingRight: 5,
    },
    iconOnTheRight: {
        position: 'absolute',
        right: 10,
        top: 'calc(50% - 8px)',
    },
    menu: {
        width: '100%',
        height: '100%',
    },
    innerMenu: {
        width: '100%',
        height: 'calc(100% - 76px)',
        overflowX: 'hidden',
        overflowY: 'auto',
    },
    listItemIcon: {
        minWidth: 32,
    },
    filterIcon: {
        width: 18,
        height: 18,
        borderRadius: 2,
        marginRight: 5,
    },
    scriptIcon: {
        width: 18,
        height: 18,
        borderRadius: 2,
        marginTop: 4,
        marginBottom: 4,
        marginLeft: 8,
        marginRight: 4,
    },
    folder: {
        //background: theme.palette.mode === 'dark' ? '#6a6a6a' : '#e2e2e2',
        cursor: 'pointer',
        padding: 0,
        userSelect: 'none',
    },
    folderReorder: {
        opacity: 0.3,
        transitionDuration: '0.5s',
        transitionProperty: 'opacity',
    },
    folderIcon: {
        width: 20,
        height: 20,
    },
    folderIconReorder: {
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 8,
        paddingRight: 4,
    },
    folderIconNoReorder: {
        cursor: 'pointer',
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 8,
        paddingRight: 4,
    },
    script: {
        cursor: 'pointer',
        padding: 0,
        userSelect: 'none',
    },
    scriptReorder: {
        opacity: 1,
        transitionDuration: '0.5s',
        transitionProperty: 'opacity',
    },
    reorder: {
        //padding: '9px 16px 9px 9px',
    },
    expandButton: {
        width: 37,
        height: 37,
    },
    selected: SELECTED_STYLE,
    instances: {
        color: 'gray',
        fontSize: 'smaller',
    },
    childrenCount: {
        fontSize: 10,
        opacity: 0.4,
    },
    footer: {
        height: 24,
        display: 'flex',
    },
    footerButtons: theme => ({
        '& img': {
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#111111',
            cursor: 'pointer',
            mt: '1px',
            mr: '2px',
            height: 22,
            width: 22,
            '&:hover': {
                backgroundColor: '#dbdbdb',
            },
        },
        '& svg': {
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#111111',
            cursor: 'pointer',
            mt: '1px',
            mr: '2px',
            height: 22,
            width: 22,
            '&:hover': {
                backgroundColor: '#dbdbdb',
            },
        }
    }),
    footerButtonsRight: {
        float: 'right',
    },

    mainList: {
        '& .js-folder-dragover>div>li>.folder-reorder': {
            background: '#40adff',
        },
        '& .js-folder-dragging .folder-reorder': {
            opacity: 1,
        },
        '& .js-folder-dragging .script-reorder': {
            opacity: 0.3,
        },
    },
};

const images = {
    Blockly: ImgBlockly,
    'Javascript/js': ImgJS,
    def: ImgJS,
    Rules: ImgRules,
    'TypeScript/ts': ImgTypeScript,
};

const getObjectName = (id, obj, lang) => {
    lang = lang || I18n.getLanguage();
    if (obj && obj.common && obj.common.name) {
        if (typeof obj.common.name === 'object') {
            return (obj.common.name[lang] || obj.common.name.en || id.replace(/^script\.js./, '')).toString();
        }

        return obj.common.name.toString();
    }

    return id.replace(/^script\.js./, '');
};

const prepareList = data => {
    const result = [{
        id: ROOT_ID,
        depth: 0,
        index: 0,
        parent: null,
        title: 'root',
        type: 'folder',
    }];
    const ids = Object.keys(data);

    /*ids.sort((a, b) => {
        if ((a === 'script.js.common' || a === 'script.js.global') && (b === 'script.js.common' || b === 'script.js.global')) {
            return a > b ? 1 : -1;
        } else if (a === 'script.js.common' || a === 'script.js.global' || b === 'script.js.common' || b === 'script.js.global') {
            return 1;
        } else {
            return a > b ? 1 : -1;
        }
    });*/

    for (let i = 0; i < ids.length; i++) {
        const obj = data[ids[i]];
        const parts = ids[i].split('.');
        parts.pop();
        result.push({
            id: ids[i],
            title: getObjectName(ids[i], obj),
            enabled: obj && obj.common && obj.common.enabled,
            depth: parts.length - 1,
            type: obj.type === 'script' ? obj.common.engineType : 'folder',
            parent: parts.length > 1 ? parts.join('.') : null,
            instance: obj.common.engine ? parseInt(obj.common.engine.split('.').pop(), 10) || 0 : null,
        });
    }

    // Place all folder-less scripts at start
    /*result.sort((a, b) => {
        // without folders => always at start
        if (!a.parent && a.type !== 'folder' && !b.parent && b.type !== 'folder') {
            if (a.id === b.id) {
                return 0;
            } else {
                return a.id > b.id ? 1 : -1;
            }
        } else if (!a.parent && a.type !== 'folder') {
            return -1;
        } else if (!b.parent && b.type !== 'folder') {
            return 1;
        } else {
            // common and global are always at the end
            if ((a.id.startsWith('script.js.common') || a.id.startsWith('script.js.global')) &&
                (b.id.startsWith('script.js.common') || b.id.startsWith('script.js.global'))) {
                if (a.id === b.id) {
                    return 0;
                } else {
                    return a.id > b.id ? 1 : -1;
                }
            } else if (a.id.startsWith('script.js.common') || a.id.startsWith('script.js.global')) {
                return 1;
            } else if (b.id.startsWith('script.js.common') || b.id.startsWith('script.js.global')) {
                return -1;
            } else {
                if (a.id === b.id) {
                    return 0;
                } else {
                    return a.id > b.id ? 1 : -1;
                }
            }
        }
    });*/

    let modified;
    do {
        modified = false;
        // check if all parents exist
        // eslint-disable-next-line
        result.forEach(item => {
            if (item.parent) {
                const parent = result.find(it => it.id === item.parent);
                if (!parent) {
                    const parts = item.parent.split('.');
                    parts.pop();
                    result.push({
                        id: item.parent,
                        title: item.parent.split('.').pop(),
                        depth: parts.length - 1,
                        type: 'folder',
                        parent: parts.length > 1 ? parts.join('.') : null
                    });
                    modified = true;
                }
            }
        });
    } while (modified);

    // Folders first
    result.sort((a, b) => {
        const idA = a.id.toLowerCase();
        const idB = b.id.toLowerCase();
        if (a.type === 'folder' && b.type !== 'folder') {
            return -1;
        } else if (b.type === 'folder' && a.type !== 'folder') {
            return 1;
        }

        if (idA > idB) {
            return 1;
        } else if (idA < idB) {
            return -1;
        } else {
            return 0;
        }
    });

    // Fill all indexes
    result.forEach((item, i) => item.index = i);

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

export const Droppable = (props) => {
    const { onDrop} = props;

    const [{ isOver, isOverAny}, drop] = useDrop({
        accept: ['script'],
        drop: e => isOver ? onDrop(e) : undefined,
        collect: monitor => ({
            isOver: monitor.isOver({ shallow: true }),
            isOverAny: monitor.isOver(),
        }),
    });

    return <div ref={drop} className={Utils.clsx(isOver && 'js-folder-dragover', isOverAny && 'js-folder-dragging')}>
        {props.children}
    </div>;
};

export const Draggable = props => {
    const { name } = props;
    const [{ opacity }, drag] = useDrag({
        type: 'script',
        item: () => ({name}),
        collect: monitor => ({opacity: monitor.isDragging() ? 0.3 : 1,}),
    });
    // About transform: https://github.com/react-dnd/react-dnd/issues/832#issuecomment-442071628
    return <div ref={drag} style={{ opacity, transform: 'translate3d(0, 0, 0)' }}>
        {props.children}
    </div>;
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

        this.inputRef = new React.createRef();

        this.state = {
            listItems: prepareList(props.scripts || {}),
            expanded,
            problems: [],
            reorder: false,
            themeName: this.props.themeName,
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
            typeFilter: window.localStorage ? window.localStorage.getItem('SideMenu.typeFilter') || '' : '', // blockly, js, ts
            statusFilter: window.localStorage ? window.localStorage.getItem('SideMenu.statusFilter') || '' : '',
            runningInstances: this.props.runningInstances || {},
            scriptsHash: props.scriptsHash,
            showAdapterDebug: false,
        };

        const newExp = this.ensureSelectedIsVisible();
        if (newExp) {
            this.state.expanded = newExp;
        }

        // debounce search process
        this.filterTimer = null;

        this.state.isAllZeroInstances = this.getIsAllZeroInstances();

        this.problems = null; //cache
        this.problemsTimer = null;
        this.onProblemUpdatedBound = this.onProblemUpdated.bind(this);
    }

    readProblems(cb, tasks) {
        if (!tasks) {
            tasks = Object.keys(this.props.scripts);
        }
        if (!tasks || !tasks.length) {
            cb && cb();
        } else {
            const id = tasks.shift();
            if (this.props.scripts[id] &&
                this.props.scripts[id].type === 'script' &&
                this.props.scripts[id].common &&
                this.props.scripts[id].common.enabled &&
                !id.match(/^script\.js\.global\./) // GLOBAL_ID
            ) {
                const instance = this.props.scripts[id].common.engine.split('.').pop();
                const that = this; // sometimes lambda does not work
                const _id = `javascript.${instance}.scriptProblem.${id.substring(ROOT_ID.length + 1)}`;

                this.props.socket.getState(_id, (err, state) => {
                    that.onProblemUpdated(_id, state);
                    setTimeout(() => that.readProblems(cb, tasks), 0);
                });
            } else {
                setTimeout(() => this.readProblems(cb, tasks), 0);
            }
        }
    }

    componentDidMount() {
        this.readProblems(() =>  {
            this.props.instances.forEach(instance => {
                this.props.socket.subscribeState(`javascript.${instance}.scriptProblem.*`, this.onProblemUpdatedBound);
            });
        });
    }

    componentWillUnmount() {
        this.props.instances.forEach(instance => {
            this.props.socket.unsubscribeState(`javascript.${instance}.scriptProblem.*`, this.onProblemUpdatedBound);
        });
    }

    onProblemUpdated(id, state) {
        if (!state || !id) return;
        id = `${ROOT_ID}.${id.replace(/^javascript\.\d+\.scriptProblem\./, '')}`;

        if (!this.problems) {
            this.problems = JSON.parse(JSON.stringify(this.state.problems));
        }
        let changed = false;

        if (state.val) {
            if (this.problems.indexOf(id) === -1) {
                this.problems.push(id);
                changed = true;
            }
        } else {
            const pos = this.problems.indexOf(id);
            if (pos !== -1) {
                this.problems.splice(pos, 1);
                changed = true;
            }
        }

        if (changed && !this.problemsTimer) {
            this.problemsTimer = setTimeout(() => {
                this.problemsTimer = null;
                this.setState({ problems: this.problems });
                this.problems = null;
            }, 300);
        }
    }

    static filterListStatic(isSearchEnabled, listItems, searchMode, searchText, objects) {
        listItems = JSON.parse(JSON.stringify(listItems));
        let changed = false;
        let newState = {listItems};
        if (isSearchEnabled !== false && searchMode && searchText) {
            const text = searchText.toLowerCase();
            listItems.forEach(item => {
                const id = item.title.toLowerCase();
                item.filteredPartly = false;
                let found = id.includes(text);
                if (!found && (objects && objects[item.id] && objects[item.id].common && objects[item.id].common.source)) {
                    if (objects[item.id].common.engineType === 'Blockly') {
                        const pos = objects[item.id].common.source.lastIndexOf('//');
                        found = objects[item.id].common.source.substring(0, pos).toLowerCase().includes(text);
                    } else {
                        found = objects[item.id].common.source.toLowerCase().includes(text);
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
                            if (it.parent && listItems[it.parentIndex]) {
                                changed = true;
                                listItems[it.parentIndex].filteredPartly = true;
                            }
                            it = it.parent && listItems[it.parentIndex] ? listItems[it.parentIndex] : null;
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
            if (isSearchEnabled === false) {
                newState.searchText = '';
                newState.searchMode = false;
                changed = true;
            }
        }

        return changed ? newState : null;
    }

    filterList(isSearchEnabled, cb) {
        const newState = SideDrawer.filterListStatic(
            isSearchEnabled,
            this.state.listItems,
            this.state.searchMode,
            this.state.searchText,
            this.props.scripts,
        );

        if (newState) {
            this.setState(newState, () => cb && cb());
        } else if (cb) {
            cb();
        }
    }

    static ensureSelectedIsVisibleStatic(selected, expanded, listItems) {
        expanded = JSON.parse(JSON.stringify(expanded));
        let changed = false;

        // ensure that the item is visible
        let el = typeof selected === 'object' ? selected : listItems.find(it => it.id === selected);
        do {
            // eslint-disable-next-line
            el = el && el.parent && listItems.find(it => it.id === el.parent);
            if (el) {
                if (!expanded.includes(el.id)) {
                    expanded.push(el.id);
                    changed = true;
                }
            }
        } while(el);

        return changed && expanded;
    }

    ensureSelectedIsVisible(selected, expanded) {
        return SideDrawer.ensureSelectedIsVisibleStatic(selected || this.state.selected, expanded || this.state.expanded, this.state.listItems);
    }

    static getDerivedStateFromProps(props, state) {
        const newState = {};
        let changed = false;
        if (state.expertMode !== props.expertMode) {
            changed = true;
            newState.expertMode = props.expertMode;
        }
        if (state.scriptsHash !== props.scriptsHash && props.scripts) {
            const listItems = prepareList(props.scripts || {});

            newState.listItems = listItems;

            if (state.searchText) {
                const nState = SideDrawer.filterListStatic(true, listItems, state.searchMode, state.searchText, props.scripts);
                nState && Object.assign(newState, nState);
            }

            const isAllZeroInstances = SideDrawer.getIsAllZeroInstancesStatic(listItems, props.instances || []);

            const newExp = SideDrawer.ensureSelectedIsVisibleStatic(state.selected, state.expanded, state.listItems);

            newState.isAllZeroInstances = isAllZeroInstances;
            if (newExp) {
                newState.expanded = newExp;
            }
            changed = true;
        }

        if (state.width !== props.width) {
            changed = true;
            newState.width = props.width;
        }
        if (state.themeName !== props.themeName) {
            changed = true;
            newState.themeName = props.themeName;
        }

        if (props.selectId && state.selected !== props.selectId) {
            const item = state.listItems.find(item => item.id === props.selectId);

            if (!state.reorder && item) {
                const expanded = SideDrawer.ensureSelectedIsVisibleStatic(item, state.expanded, state.listItems);
                newState.selected = item.id;
                if (expanded) {
                    newState.expanded = expanded;
                }
                changed = true;
                window.localStorage && window.localStorage.setItem('SideMenu.selected', item.id);
            }
        }

        if (changed) {
            return newState;
        } else {
            return null;
        }
    }

    static getIsAllZeroInstancesStatic(listItems, instances) {
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

    getIsAllZeroInstances(listItems, instances) {
        listItems = listItems || this.state.listItems;
        instances = instances || this.state.instances;
        return SideDrawer.getIsAllZeroInstancesStatic(listItems || this.state.listItems, instances || this.state.instances);
    }

    saveExpanded(expanded) {
        window.localStorage.setItem('SideMenu.expanded', JSON.stringify(expanded || this.state.expanded));
    }

    showError(errorText) {
        this.setState({ errorText });
    }

    onToggle(id, e) {
        e && e.stopPropagation();
        if (id === ROOT_ID) {
            return;
        }
        const expanded = [...this.state.expanded];
        const newState = {expanded};
        const pos = expanded.indexOf(id);
        if (pos !== -1) {
            expanded.splice(pos, 1);
            if (this.state.selected && this.state.selected.startsWith(`${id}.`)) {
                newState.selected = id;
                window.localStorage && window.localStorage.setItem('SideMenu.selected', id);
            }
        } else {
            expanded.push(id);
            expanded.sort();
        }
        this.setState({ expanded });
        this.saveExpanded(expanded);
    }

    renderItemButtonsOnEnd(item, children) {
        if (this.state.reorder) {
            return null;
        }
        if (item.type !== 'folder') {
            let color = item.enabled ? COLOR_RUN : COLOR_PAUSE;
            if (item.enabled && this.state.problems.includes(item.id)) {
                color = COLOR_PROBLEM;
            }

            return [
                <IconButton
                    onClick={e => {
                        e.stopPropagation();
                        this.props.onEnableDisable && this.props.onEnableDisable(item.id, !item.enabled)
                    }}
                    title={item.enabled ? I18n.t('Pause script') : I18n.t('Run script')}
                    disabled={this.props.debugMode}
                    key="startStop"
                    style={{
                        ...styles.iconButtons,
                        ...(this.props.debugMode ? styles.iconButtonsDisabled : undefined),
                        color,
                    }}
                    size="medium"
                >
                    {item.enabled ? <IconPause /> : <IconPlay />}
                </IconButton>,
                this.state.width > NARROW_WIDTH ? <IconButton
                    key="delete"
                    style={this.props.debugMode ? styles.iconButtonsDisabled : undefined}
                    title={I18n.t('Delete script')}
                    disabled={item.id === GLOBAL_ID || item.id === COMMON_ID || this.props.debugMode}
                    onClick={e => this.onDelete(item, e)}
                    size="medium"
                >
                    <IconDelete/>
                </IconButton> : null,
                <IconButton
                    style={this.props.debugMode ? styles.iconButtonsDisabled : undefined}
                    disabled={this.props.debugMode}
                    key="openInEdit"
                    title={I18n.t('Edit script or just double click')}
                    onClick={e => this.onEdit(item, e)}
                    size="medium">
                    <IconDoEdit/>
                </IconButton>,
            ];
        } else if (this.state.width > NARROW_WIDTH) {
            if (item.id !== ROOT_ID && item.id !== COMMON_ID && item.id !== GLOBAL_ID && (!children || !children.length)) {
                return <IconButton
                    style={this.props.debugMode ? styles.iconButtonsDisabled : undefined}
                    key="delete"
                    title={I18n.t('Delete folder')}
                    disabled={item.id === GLOBAL_ID || item.id === COMMON_ID || this.props.debugMode}
                    onClick={e => this.onDelete(item, e)}
                    size="medium"
                >
                    <IconDelete />
                </IconButton>;
            } else {
                return null;
            }
        }
    }

    onDelete(item, e) {
        e && e.stopPropagation();
        return new Promise(resolve => {
            if (typeof item !== 'object') {
                this.setState({ deleting: item }, () => resolve());
            } else {
                this.setState({ deleting: item.id }, () => resolve());
            }
        });
    }

    onEdit(item, e) {
        this.onClick(item, e);
        this.props.onEdit && this.props.onEdit(item.id);
    }

    getTextStyle(item) {
        if (!this.state.reorder && item.type !== 'folder') {
            return {
                //width: 130,
                width: `calc(100% - ${this.state.width > NARROW_WIDTH ? 185 : 137}px)`,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                flex: 'none',
                padding: '0 16px 0 0',
            };
        }

        return {
            whiteSpace: 'nowrap',
            padding: '0 16px 0 0',
        };
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
        if (this.state.reorder) {
            return;
        }
        if (item.type === 'folder') {
            this.onToggle(item.id);
        } else {
            this.onEdit(item);
        }
    }

    isFilteredOut(item) {
        if (item.filtered && !item.filteredPartly) {
            return true;
        }

        if (this.state.typeFilter && item.type !== 'folder' && item.type !== this.state.typeFilter) {
            return true;
        }

        if (this.state.statusFilter &&
            item.type !== 'folder' &&
            (
                (this.state.statusFilter === 'running' && !item.enabled) ||
                (this.state.statusFilter === 'paused' && item.enabled) ||
                (this.state.statusFilter === 'problems' && (!item.enabled || this.state.problems.indexOf(item.id) === -1)))
        ) {
            return true;
        }

        return item.id === GLOBAL_ID && !this.state.expertMode;
    }

    renderListItem(item, children, childrenFiltered) {
        if (item.id === ROOT_ID && !this.state.reorder) {
            return null;
        }

        const depthPx = (this.state.reorder ? item.depth : item.depth - 1) * LEVEL_PADDING;

        let title = item.title;

        if (this.state.searchText) {
            const pos = title.toLowerCase().indexOf(this.state.searchText.toLowerCase());
            if (pos !== -1) {
                title = [
                    <span key="first">{title.substring(0, pos)}</span>,
                    <span key="second" style={{ color: 'orange' }}>{title.substring(pos, pos + this.state.searchText.length)}</span>,
                    <span key="third">{title.substring(pos + this.state.searchText.length)}</span>,
                ];
            }
        }

        if (!this.state.isAllZeroInstances && item.type !== 'folder') {
            title = [
                <span key="instance" title={I18n.t('Instance')} style={styles.instances}>[{item.instance}] </span>,
                <span key="title">{title}</span>,
            ];
        }
        const reorder = this.state.reorder && !this.props.debugMode;

        const style = Object.assign({
            marginLeft: depthPx,
            cursor:     item.type === 'folder' && reorder ? 'default' : 'inherit',
            width:      `calc(100% - ${depthPx}px)`,
        }, item.id === this.state.selected && !reorder ? SELECTED_STYLE : undefined);

        if (!reorder) {
            style.opacity = item.filteredPartly ? 0.5 : 1;
        }

        if (item.id === GLOBAL_ID && item.id !== this.state.selected) {
            style.color = '#00a200';
        }

        let isExpanded = item.id === ROOT_ID;
        if (!isExpanded && children) {
            isExpanded = this.state.expanded.includes(item.id);
        }

        let iconStyle;
        if (item.type === 'folder') {
            iconStyle = {
                ...styles.folderIcon,
                ...(reorder ? styles.folderIconReorder : styles.folderIconNoReorder),
            };
        } else {
            iconStyle = {
                ...styles.scriptIcon,
                // ...(reorder ? styles.scriptIconReorder : styles.scriptIconNoReorder),
            };
        }
        if (item.id === GLOBAL_ID) {
            iconStyle.color = '#356956';
        } else if (item.id === COMMON_ID) {
            iconStyle.color = '#4899e1';
        }

        let childrenCount = null;
        if ((childrenFiltered && childrenFiltered.length) || (children && children.length)) {
            childrenCount = <span style={styles.childrenCount}>{childrenFiltered && childrenFiltered.length !== children.length ? `${childrenFiltered.length}(${children.length})` : children.length}</span>;
        }

        const combinedStyle = {
            ...(item.type === 'folder' ? styles.folder : styles.script),
            ...(reorder ? styles.reorder : undefined),
            ...(reorder && item.type !== 'folder' ? styles.scriptReorder : undefined),
            ...(reorder && item.type === 'folder' ? styles.folderReorder: undefined),
            ...style,
        };

        return <ListItem
            key={item.id}
            style={combinedStyle}
            className={Utils.clsx(
                reorder && item.type === 'folder' && 'folder-reorder',
                reorder && item.type !== 'folder' && 'script-reorder',
            )}
            onClick={e => this.onClick(item, e)}
            onDoubleClick={e => this.onDblClick(item, e)}
        >
            <ListItemIcon
                style={styles.listItemIcon}
            >{
                item.type === 'folder' ? (
                        reorder || isExpanded ?
                            <IconFolderOpened style={iconStyle} onClick={e => !reorder && this.onToggle(item.id, e)} /> :
                            <IconFolder       style={iconStyle} onClick={e => !reorder && this.onToggle(item.id, e)} />
                    )
                    :
                    <img
                        style={iconStyle}
                        alt={item.type}
                        src={images[item.type] || images.def}
                    />
            }</ListItemIcon>
            <ListItemText
                sx={{ '& .MuiListItemText-primary': item.id === this.state.selected && !reorder ? styles.selected : undefined }}
                style={this.getTextStyle(item)}
                primary={<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>{title}{childrenCount}</span>}
            />
            <ListItemSecondaryAction>
                {this.renderItemButtonsOnEnd(item, children)}
            </ListItemSecondaryAction>
        </ListItem>;
    }

    onDragFinish(source, target) {
        let newId = `${target}.${source.split('.').pop()}`;
        if (newId !== source) {
            // If target yet exists => add Copy to
            if (this.state.listItems.find(item => item.id === newId)) {
                newId += `_${I18n.t('copy')}`;
            }

            this.props.onRename && this.props.onRename(source, newId);
        }
        return undefined;
    }

    renderOneItem(items, item /* , dragging */) {
        let childrenFiltered = (this.state.statusFilter || this.state.typeFilter) && items.filter(i => i.parent === item.id ? !this.isFilteredOut(i) : false);
        let children = items.filter(i => i.parent === item.id);

        if (this.isFilteredOut(item)) {
            return;
        }

        if (item.type === 'folder' && (this.state.statusFilter || this.state.typeFilter) && !childrenFiltered.length) {
            return;
        }
        const reorder = this.state.reorder && !this.props.debugMode;

        const element = this.renderListItem(item, children, childrenFiltered);
        const result = [];
        let reactChildren;
        if (children && (reorder || this.state.expanded.includes(item.id) || item.id === ROOT_ID)) {
            reactChildren = children.map(it => this.renderOneItem(items, it));
        }

        if (reorder) {
            if (item.type === 'folder') {
                result.push(<Droppable key={`droppable_${item.id}`} onDrop={e => this.onDragFinish(e.name, item.id)}>
                    <Draggable key={`draggable_${item.id}`} name={item.id}>{element}</Draggable>
                    {reactChildren || null}
                </Droppable>);
            } else {
                result.push(<Draggable key={`draggable_${item.id}`} name={item.id}>
                    {element}
                    {reactChildren || null}
                </Draggable>);
            }
        } else {
            result.push(element);
            reactChildren && reactChildren.forEach(e => result.push(e));
        }

        return result;
    }

    renderAllItems(items) {
        const result = items
            .filter(item => !item.parent)
            .map(item =>
                this.renderOneItem(items, item));

        return <List
            dense
            disablePadding
            sx={styles.mainList}
        >
            {result}
        </List>;
    }

    onAddNew(e) {
        e && e.stopPropagation();
        let item = this.state.listItems.find(i => i.id === this.state.selected);
        let parent = ROOT_ID;
        while (item && item.type !== 'folder') {
            item = this.state.listItems[item.parentIndex];
        }
        if (item) {
            parent = item.id;
        }

        this.parent = parent;
        this.setState({ choosingType: true });
    }

    onCopy(e, id) {
        e && e.stopPropagation();
        let item = this.state.listItems.find(i => i.id === id);
        let parent = ROOT_ID;
        while (item && item.type !== 'folder') {
            item = this.state.listItems[item.parentIndex];
        }
        if (item) {
            parent = item.id;
        }

        this.parent = parent;
        this.setState({ copingScript: id });
    }

    onAddNewFolder(e) {
        e && e.stopPropagation();
        let item = this.state.listItems.find(i => i.id === this.state.selected);
        let parent = ROOT_ID;
        while (item && item.type !== 'folder') {
            item = this.state.listItems[item.parentIndex];
        }
        if (item) {
            parent = item.id;
        }

        this.parent = parent;
        this.setState({ creatingFolder: true });
    }

    onRename(e) {
        e && e.stopPropagation();
        this.setState({ renaming: this.state.selected });
    }

    getUniqueName(copyId) {
        let i = 1;
        let word = `${I18n.t('Script')} `;
        if (copyId) {
            const name = getObjectName(copyId, this.props.scripts[copyId]);
            const m = name.match(/\d+$/);
            if (m) {
                word = name.replace(/\d+$/, '');
                i = parseInt(m[0], 10) + 1;
            } else {
                word = name;
            }
        }

        // eslint-disable-next-line
        while (this.state.listItems.find(it => it.id === `${this.parent}.${word.replace(/\.\s/g, '_')}${i}`)) {
            i++;
        }

        return word + i;
    }

    getUniqueFolderName() {
        let i = 1;
        // eslint-disable-next-line
        while (this.state.listItems.find(it => it.id === `${this.parent}.${I18n.t('Folder')}_${i}`)) {
            i++;
        }
        return `${I18n.t('Folder')} ${i}`;
    }

    onCloseMenu(cb) {
        this.setState({ menuOpened: false, menuAnchorEl: null, menuAnchorFilterEl: null }, cb);
    }

    getFilterBadge() {
        return [
            this.state.statusFilter === true && <IconPlay style={{ ...styles.filterIcon, color: COLOR_RUN }} />,
            this.state.statusFilter === false && <IconPause style={{ ...styles.filterIcon, color: COLOR_PAUSE }} />,
            this.state.typeFilter === 'Blockly' && 'Bl',
            this.state.typeFilter === 'Javascript/js' && 'JS',
            this.state.typeFilter === 'TypeScript/ts' && 'TS',
        ];
    }

    getMainMenu(children, selectedItem) {
        return <Menu
            key="menu"
            id="long-menu"
            anchorEl={this.state.menuAnchorEl}
            open={this.state.menuOpened}
            onClose={() => this.setState({ menuOpened: false, menuAnchorEl: null })}
            PaperProps={{
                style: {
                    maxHeight: MENU_ITEM_HEIGHT * 7.5,
                    // width: 200,
                },
            }}
        >
            {this.state.width <= NARROW_WIDTH ? <MenuItem
                key="delete"
                disabled={this.props.debugMode || !this.state.selected || this.state.selected === GLOBAL_ID || this.state.selected === COMMON_ID || (children && children.length)}
                onClick={event => {
                    event.stopPropagation();
                    event.preventDefault();
                    if (this.state.listItems.find(item => item.parent === this.state.selected)) {
                        this.showError(I18n.t('Cannot delete non empty item!'));
                        return;
                    }

                    this.setState({ menuOpened: false, menuAnchorEl: null }, () =>
                        this.onDelete(this.state.selected).then(() => {}));
                }}
            >
                <IconDelete style={{ ...styles.iconDropdownMenu, color: 'red' }} />
                {I18n.t('Delete')}
            </MenuItem> : null}
            <MenuItem
                key="expertMode"
                disabled={this.props.debugMode}
                selected={this.state.expertMode}
                onClick={event => {
                    event.stopPropagation();
                    event.preventDefault();
                    this.onCloseMenu(() =>
                        this.props.onExpertModeChange && this.props.onExpertModeChange(!this.state.expertMode));
                }}>
                <IconExpert style={{ ...styles.iconDropdownMenu, color: this.state.expertMode ? 'orange' : 'inherit' }}/>{I18n.t('Expert mode')}
            </MenuItem>
            {this.props.onExport && <MenuItem
                key="exportAll"
                onClick={event => {
                    event.stopPropagation();
                    event.preventDefault();
                    this.onCloseMenu(() => this.props.onExport());
                }}
            >
                <IconExport style={styles.iconDropdownMenu} />{I18n.t('Export all scripts')}
            </MenuItem>}
            {this.props.onImport && <MenuItem
                disabled={this.props.debugMode}
                key="import"
                onClick={event => {
                    event.stopPropagation();
                    event.preventDefault();
                    this.onCloseMenu(() => this.props.onImport());
                }}>
                <IconImport style={styles.iconDropdownMenu} />{I18n.t('Import scripts')}
            </MenuItem>}
            {this.props.onThemeChange && <MenuItem
                key="dark"
                onClick={() => this.onCloseMenu(() => {
                    // TODO: use Utils.toggleTheme(themeName)
                    // newThemeName = Utils.toggleTheme(themeName);
                    const newThemeName = this.state.themeName === 'dark' ? 'blue' :
                        this.state.themeName === 'blue' ? 'colored' : this.state.themeName === 'colored' ? 'light' :
                            this.state.themeName === 'light' ? 'dark' : 'colored';
                    this.props.onThemeChange(newThemeName);
                })}
            >
                <IconDark style={styles.iconDropdownMenu} />
                {I18n.t('Change theme (actual "%s")', this.state.themeName)}
            </MenuItem>}
            {this.props.onAddNew && <MenuItem
                key="copy"
                disabled={!this.state.selected || !selectedItem || selectedItem.type === 'folder'}
                onClick={event => {
                    const selected = this.state.selected;
                    this.onCloseMenu(() => this.onCopy(event, selected));
                }}
            >
                <IconCopy style={styles.iconDropdownMenu} />
                {I18n.t('Copy script')}
            </MenuItem>}
            {this.state.expertMode && <MenuItem
                disabled={this.props.debugMode}
                key="debugInstance"
                onClick={event => {
                    event.stopPropagation();
                    event.preventDefault();
                    this.onCloseMenu(() =>
                        this.setState({ showAdapterDebug: true }));
                }}
            >
                <IconDebug style={styles.iconDropdownMenu} />
                {I18n.t('Debug instance')}
            </MenuItem>}
        </Menu>;
    }

    // render menu and toolbar
    getToolbarButtons() {
        const result = [];
        const reorder = this.state.reorder && !this.props.debugMode;
        if (this.state.searchMode && !this.props.debugMode) {
            result.push(<Input
                key="searchInput"
                value={this.state.searchText}
                style={styles.toolbarSearch}
                ref={this.inputRef}
                autoFocus
                placeholder={I18n.t('Search...')}
                onChange={e => {
                    this.setState({ searchText: e.target.value });
                    this.filterTimer && clearTimeout(this.filterTimer);
                    this.filterTimer = setTimeout(() => {
                        this.filterTimer = null;
                        this.filterList(true);
                        this.props.onSearch && this.props.onSearch(this.state.searchText);
                    }, 400);
                }}
            />);

            result.push(<IconButton
                key="disableSearch"
                sx={styles.toolbarButtons}
                style={{ float: 'right' }}
                title={I18n.t('End search mode')}
                onClick={e => {
                    e.stopPropagation();
                    this.filterList(false, () => this.props.onSearch && this.props.onSearch(this.state.searchText));
                }}
                size="medium"><IconClose /></IconButton>);

            this.state.searchText && result.push(<IconButton
                key="cleanSearch"
                mini="true"
                title={I18n.t('Clear search input')}
                sx={styles.toolbarButtons}
                style={{ marginTop: 7, float: 'right' }}
                onClick={e => {
                    e.stopPropagation();
                    this.setState({ searchText: '' }, () => {
                        this.filterList(true);
                        this.props.onSearch && this.props.onSearch(this.state.searchText);
                    });
                }}
                size="medium"
            >
                <IconClear fontSize="small"/>
            </IconButton>);
        } else {
            if (!reorder) {
                // Open Menu
                result.push(<IconButton
                    key="menuButton"
                    aria-label="More"
                    aria-owns={this.state.menuOpened ? 'long-menu' : undefined}
                    title={I18n.t('Menu')}
                    aria-haspopup="true"
                    onClick={event => {
                        event.stopPropagation();
                        event.preventDefault();
                        this.setState({ menuOpened: true, menuAnchorEl: event.currentTarget });
                    }}
                    size="medium"
                >
                    {/*<Badge style={styles.margin} badgeContent={this.getFilterBadge()}>*/}
                    <IconMore />
                    {/*</Badge>*/}
                </IconButton>);

                const selectedItem = this.state.listItems.find(it => it.id === this.state.selected);
                let children;
                if (selectedItem && this.state.width <= NARROW_WIDTH && selectedItem.type === 'folder') {
                    children = this.state.listItems.filter(i => i.parent === this.state.selected);
                }

                // Menu
                result.push(this.getMainMenu(children, selectedItem));

                // New Script
                result.push(<IconButton
                    disabled={this.props.debugMode}
                    key="new-script"
                    title={I18n.t('Create new script')}
                    sx={{
                        ...styles.toolbarButtons,
                        ...(this.props.debugMode ? styles.iconButtonsDisabled : undefined),
                    }}
                    style={{ color: reorder ? 'red' : 'inherit' }}
                    onClick={e => this.onAddNew(e)}
                    size="medium"
                >
                    <IconAdd />
                </IconButton>);

                // New Folder
                result.push(<IconButton
                    disabled={this.props.debugMode}
                    key="new-folder"
                    title={I18n.t('Create new folder')}
                    sx={{
                        ...styles.toolbarButtons,
                        ...(this.props.debugMode ? styles.iconButtonsDisabled : undefined),
                    }}
                    style={{ color: reorder ? 'red' : 'inherit' }}
                    onClick={() => this.onAddNewFolder()}
                    size="medium"
                >
                    <IconAddFolder />
                </IconButton>);
            }

            // Search
            result.push(<IconButton
                key="search"
                disabled={reorder || this.props.debugMode}
                sx={{
                    ...styles.toolbarButtons,
                    ...(this.props.debugMode ? styles.iconButtonsDisabled : undefined),
                }}
                title={I18n.t('Search in scripts')}
                style={{ float: 'right', opacity: this.props.debugMode ? 0.5 : (reorder ? 0 : 1) }}
                onClick={e => {
                    e.stopPropagation();
                    this.setState({ searchMode: true });
                }}
                size="medium"
            >
                <IconFind />
            </IconButton>);

            // Reorder button
            result.push(<IconButton
                disabled={this.props.debugMode}
                key="reorder"
                title={I18n.t('Reorder scripts in folders')}
                sx={{
                    ...styles.toolbarButtons,
                    ...(this.props.debugMode ? styles.iconButtonsDisabled : undefined),
                }}
                style={{ color: reorder ? 'red' : 'inherit', float: 'right' }}
                onClick={e => {
                    e.stopPropagation();
                    this.setState({ reorder: !this.state.reorder });
                }}
                size="medium"
            >
                <IconReorder />
            </IconButton>);

            if (!reorder && this.state.selected && this.state.selected !== GLOBAL_ID && this.state.selected !== COMMON_ID) {
                // Rename
                result.push(<IconButton
                    sx={{
                        ...styles.toolbarButtons,
                        ...(this.props.debugMode ? styles.iconButtonsDisabled : undefined),
                    }}
                    disabled={this.props.debugMode}
                    title={I18n.t('Rename')}
                    key="rename"
                    onClick={e => this.onRename(e)}
                    size="medium"
                >
                    <IconEdit />
                </IconButton>);

                // const selectedItem = this.state.listItems.find(i => i.id === this.state.selected);
                // if (selectedItem && selectedItem.type !== 'folder') {
                //     // Restart
                //     result.push((<IconButton sx={styles.toolbarButtons}
                //          key="restart"
                //          onClick={e => {
                //              e.stopPropagation();
                //              this.props.onEnableDisable && this.props.onEnableDisable();
                //          }}
                //     ><IconRestart/></IconButton>));
                // }
            }
            result.push(<span key="version" style={{ opacity: 0.5, fontSize: 10 }}>v{this.props.version}</span>);
        }
        return result;
    }

    getFolders() {
        const folders = [{ id: ROOT_ID, name: I18n.t('Root folder') }];
        this.state.listItems.forEach(item => {
            if (item.type === 'folder' && item.id !== ROOT_ID) { // root has been added above
                if (!item.id.startsWith(GLOBAL_ID) || this.state.expertMode) {
                    folders.push({ id: item.id, name: item.title });
                }
            }
        });
        return folders;
    }

    onCollapseAll() {
        this.setState({ expanded: [] });
        this.saveExpanded([]);
    }

    onExpandAll() {
        const expanded = [];
        this.state.listItems.forEach(item =>
            this.state.listItems.find(it => it.parent === item.id) && expanded.push(item.id));
        this.setState({ expanded });
        this.saveExpanded(expanded);
    }

    getBottomButtons() {
        if (this.state.reorder || this.props.debugMode) {
            return null;
        }
        return [
            <Box
                key="filterByRunning"
                sx={styles.footerButtons}
            >
                <IconPause
                    style={{ color: COLOR_RUN, opacity: this.state.statusFilter === 'running' ? 1 : 0.3, background: this.state.statusFilter === 'running' ? 'gray' : 'inherit' }}
                    title={I18n.t('Show only running scripts')}
                    onClick={event => {
                        event.stopPropagation();
                        event.preventDefault();
                        const statusFilter = this.state.statusFilter === 'running' ? '' : 'running';
                        window.localStorage && window.localStorage.setItem('SideMenu.statusFilter', statusFilter);
                        this.setState({ statusFilter });
                    }}
                />
            </Box>,
            <Box
                key="filterByPaused"
                sx={styles.footerButtons}
            >
                <IconPlay
                    title={I18n.t('Show only paused scripts')}
                    style={{ color: COLOR_PAUSE, opacity: this.state.statusFilter === 'paused' ? 1 : 0.3, background: this.state.statusFilter === 'paused' ? 'gray' : 'inherit' }}
                    onClick={() => {
                        const statusFilter = this.state.statusFilter === 'paused' ? '' : 'paused';
                        window.localStorage && window.localStorage.setItem('SideMenu.statusFilter', statusFilter);
                        this.setState({ statusFilter });
                    }}
                />
            </Box>,
            <Box
                sx={styles.footerButtons}
                style={{ marginRight: 16 }}
                key="filterByProblem"
            >
                <IconPause
                    title={I18n.t('Show only scripts with problems')}
                    style={{ color: COLOR_PROBLEM, opacity: this.state.statusFilter === 'problems' ? 1 : 0.3, background: this.state.statusFilter === 'problems' ? 'gray' : 'inherit' }}
                    onClick={() => {
                        const statusFilter = this.state.statusFilter === 'problems' ? '' : 'problems';
                        window.localStorage && window.localStorage.setItem('SideMenu.statusFilter', statusFilter);
                        this.setState({ statusFilter });
                    }}
                />
            </Box>,
            <Box
                sx={styles.footerButtons}
                key="filterBlockly"
            >
                <img
                    alt="Blockly"
                    style={{ opacity: this.state.typeFilter === 'Blockly' ? 1 : 0.3, background: this.state.typeFilter === 'Blockly' ? 'gray' : 'inherit' }}
                    src={images.Blockly || images.def}
                    onClick={() => {
                        const typeFilter = this.state.typeFilter === 'Blockly' ? '' : 'Blockly';
                        window.localStorage && window.localStorage.setItem('SideMenu.typeFilter', typeFilter);
                        this.setState({ typeFilter });
                    }}
                />
            </Box>,
            <Box
                key="filterJS"
                sx={styles.footerButtons}
            >
                <img
                    alt="Javascript"
                    style={{ opacity: this.state.typeFilter === 'Javascript/js' ? 1 : 0.3, background: this.state.typeFilter === 'Javascript/js' ? 'gray' : 'inherit' }}
                    src={images['Javascript/js'] || images.def}
                    onClick={() => {
                        const typeFilter = this.state.typeFilter === 'Javascript/js' ? '' : 'Javascript/js';
                        window.localStorage && window.localStorage.setItem('SideMenu.typeFilter', typeFilter);
                        this.setState({ typeFilter });
                    }}
                />
            </Box>,
            <Box
                key="filterTS"
                sx={styles.footerButtons}
            >
                <img
                    alt="TypeScript"
                    style={{ opacity: this.state.typeFilter === 'TypeScript/ts' ? 1 : 0.3, background: this.state.typeFilter === 'TypeScript/ts' ? 'gray' : 'inherit' }}
                    src={images['TypeScript/ts'] || images.def}
                    onClick={() => {
                        const typeFilter = this.state.typeFilter === 'TypeScript/ts' ? '' : 'TypeScript/ts';
                        window.localStorage && window.localStorage.setItem('SideMenu.typeFilter', typeFilter);
                    this.setState({ typeFilter });
                    }}
                />
            </Box>,
            <Box
                key="filterRules"
                sx={styles.footerButtons}
            >
                <img
                    alt="Rules"
                    style={{ opacity: this.state.typeFilter === 'Rules' ? 1 : 0.3, background: this.state.typeFilter === 'Rules' ? 'gray' : 'inherit' }}
                    src={images['Rules'] || images.def}
                    onClick={() => {
                        const typeFilter = this.state.typeFilter === 'Rules' ? '' : 'Rules';
                        window.localStorage && window.localStorage.setItem('SideMenu.typeFilter', typeFilter);
                        this.setState({ typeFilter });
                    }}
                />
            </Box>,
            <div key="padding" style={{ flexGrow: 1 }} />,
            <Box
                key="expandAll"
                sx={styles.footerButtons}
            >
                <IconExpandAll
                    style={styles.footerButtonsRight}
                    title={I18n.t('Expand all')}
                    onClick={() => this.onExpandAll()}
                />
            </Box>,
            this.state.expanded.length ? <Box
                key="collapseAll"
                sx={styles.footerButtons}
            >
                <IconCollapseAll
                    style={styles.footerButtonsRight}
                    title={I18n.t('Collapse all')}
                    onClick={() => this.onCollapseAll()}
                />
            </Box> : <div style={{ height: 22, width: 24 }} />,
        ];
    }

    getAdapterDebugDialog() {
        if (this.state.showAdapterDebug) {
            return <DialogAdapterDebug
                key="debug"
                socket={this.props.socket}
                onClose={() => this.setState({ showAdapterDebug: false })}
                onDebug={(instance, adapter) => this.setState({ showAdapterDebug: false }, () => this.props.onDebugInstance({instance, adapter}))}
            />;
        }
    }

    render() {
        const renamingItem = this.state.renaming && this.state.listItems.find(i => i.id === this.state.renaming);
        const copingItem = this.state.copingScript && this.props.scripts[this.state.copingScript];

        return [
            <Drawer
                key="drawer"
                variant="permanent"
                style={styles.menu}
                sx={{ '& .MuiDrawer-paper': styles.drawerPaper }}
                anchor='left'
                onClick={() => this.onClick({id: ''})}
            >
                <Box sx={styles.toolbar}>
                    {this.getToolbarButtons()}
                </Box>

                <Divider/>

                <DragDropContext backend={HTML5Backend}>
                    <div style={styles.innerMenu}>
                        {this.renderAllItems(this.state.listItems)}
                    </div>
                </DragDropContext>

                <Divider />

                <div style={styles.footer}>{this.getBottomButtons()}</div>
            </Drawer>,

            renamingItem ? <DialogRename
                key="dialog-rename"
                name={renamingItem.title}
                title={I18n.t('Rename')}
                id={this.state.renaming}
                folder={renamingItem.type === 'folder'}
                instance={renamingItem.instance}
                instances={this.props.instances}
                onClose={() => this.setState({ renaming: false })}
                onRename={(oldId, newName, newId, newInstance) => this.props.onRename && this.props.onRename(oldId, newName, newId, newInstance)}
            /> : null,

            this.state.deleting ? <DialogDelete
                key="dialog-delete"
                name={this.state.listItems.find(i => i.id === this.state.deleting).title}
                id={this.state.deleting}
                onClose={() => this.setState({ deleting: false })}
                onDelete={id => this.props.onDelete && this.props.onDelete(id)}
            /> : null,

            this.state.choosingType ? <DialogAddNewScript
                key="dialog-script-type"
                onClose={type => {
                    const newState = { choosingType: false };
                    if (type) {
                        newState.creatingScript = type;
                    }
                    this.setState(newState);
                }}
            /> : null,

            this.state.creatingScript ? <DialogNew
                key="dialog-new-script"
                onClose={() => this.setState({ creatingScript: false })}
                title={I18n.t('Create new script')}
                name={this.getUniqueName()}
                parents={this.getFolders()}
                folder={false}
                existingItems={this.state.listItems.map(item => item.id)}
                instance={this.props.instances[0] || 0}
                instances={this.props.instances}
                type={this.state.creatingScript}
                parent={this.parent}
                onAdd={(id, name, instance, type) =>
                    this.props.onAddNew && this.props.onAddNew(id, name, false, instance, type)}
            /> : null,

            this.state.copingScript ? <DialogNew
                key="dialog-copy-script"
                onClose={() => this.setState({ copingScript: '' })}
                title={I18n.t('Copy script')}
                name={this.getUniqueName(this.state.copingScript)}
                parents={this.getFolders()}
                folder={false}
                instance={parseInt((copingItem && copingItem.common && copingItem.common.engine && copingItem.common.engine.split('.').pop()) || 0, 10)}
                instances={this.props.instances}
                type={(copingItem && copingItem.common && copingItem.common.engineType) || 'Javascript/js'}
                parent={this.parent}
                onAdd={(id, name, instance, type) => {
                    const copingItem = this.state.copingScript && this.props.scripts[this.state.copingScript];
                    if (copingItem && copingItem.common) {
                        // disable script by coping
                        copingItem.common.enabled = false;
                    }
                    this.props.onAddNew && this.props.onAddNew(id, name, false, instance, type, copingItem && copingItem.common && copingItem.common.source);
                }}
            /> : null,

            this.state.creatingFolder ? <DialogNew
                key="dialog-new-folder"
                onClose={() => this.setState({ creatingFolder: false })}
                title={I18n.t('Create new folder')}
                parents={this.getFolders()}
                name={this.getUniqueFolderName()}
                parent={this.parent}
                onAdd={(id, name) => this.props.onAddNew && this.props.onAddNew(id, name, true)}
            /> : null,

            this.state.errorText ? <DialogError key="error" onClose={() => this.setState({ errorText: '' })} text={this.state.errorText} /> : null,

            this.getAdapterDebugDialog(),
        ];
    }
}

SideDrawer.propTypes = {
    instances: PropTypes.array.isRequired,
    scripts: PropTypes.object.isRequired,
    scriptsHash: PropTypes.number,
    onEdit: PropTypes.func,
    selectId: PropTypes.string,
    expertMode: PropTypes.bool,
    onExpertModeChange: PropTypes.func,
    onEnableDisable: PropTypes.func,
    runningInstances: PropTypes.object,
    socket: PropTypes.object,
    themeName: PropTypes.string,
    themeType: PropTypes.string,
    onSelect: PropTypes.func,
    onAddNew: PropTypes.func,
    onRename: PropTypes.func,
    onDelete: PropTypes.func,
    onImport: PropTypes.func,
    onExport: PropTypes.func,
    onSearch: PropTypes.func,
    onThemeChange: PropTypes.func,
    onDebugInstance: PropTypes.func,
    width: PropTypes.number,
    debugMode: PropTypes.bool,
    version: PropTypes.string,
};

export default SideDrawer;
