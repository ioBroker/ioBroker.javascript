import React, { Suspense } from 'react';
import Tour from 'reactour';

import {
    Toolbar,
    Button,
    IconButton,
    Tabs,
    Tab,
    Badge,
    Snackbar,
    Menu,
    MenuItem,
    Checkbox,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Paper,
    Box,
} from '@mui/material';

import { red, green } from '@mui/material/colors';

import {
    MdSave as IconSave,
    MdCancel as IconCancel,
    MdClose as IconClose,
    MdRefresh as IconRestart,
    MdInput as IconDoEdit,
    MdGpsFixed as IconLocate,
    MdClearAll as IconCloseAll,
    MdBuild as IconDebugMenu,
    MdBugReport as IconDebug,
    MdPlaylistAddCheck as IconVerbose,
    MdBugReport as IconDebugMode,
    MdPlayArrow as IconPlay,
    MdPause as IconPause,
    MdBrightness4 as IconAstro,
    MdCode as IconCode,
} from 'react-icons/md';

import {
    FaClock as IconCron,
    FaClipboardList as IconSelectId,
    FaFileExport as IconExport,
    FaFileImport as IconImport,
    FaFlagCheckered as IconCheck,
} from 'react-icons/fa';

import ImgJS from './assets/js.svg';
import ImgBlockly from './assets/blockly.svg';
import ImgTypeScript from './assets/typescript.svg';
import ImgBlockly2Js from './assets/blockly2js.svg';
import ImgRules2Js from './assets/rules2js.svg';
import ImgRules from './assets/rules.svg';

import {
    I18n,
    DialogCron,
    DialogConfirm,
    DialogSelectID,
    type IobTheme,
    type ThemeType,
    type AdminConnection,
    type ThemeName,
} from '@iobroker/adapter-react-v5';

import steps, { STEPS } from './Components/RulesEditor/helpers/Tour';
import type { AstroTimes, ScriptType } from './types';
import Connecting from './Components/Connecting';
import { decryptText, encryptText } from './Components/crypto';

const BlocklyEditor = React.lazy(() => import('./Components/BlocklyEditor'));
const RulesEditor = React.lazy(() => import('./Components/RulesEditor'));
const Debugger = React.lazy(() => import('./Components/Debugger'));
const ScriptEditorComponent = React.lazy(() => import('./Components/ScriptEditorVanillaMonaco'));
const DialogScriptEditor = React.lazy(() => import('./Dialogs/ScriptEditor'));
const OpenAiDialog = React.lazy(() => import('./OpenAi/OpenAiDialog'));

declare global {
    interface Window {
        systemLang: ioBroker.Languages;
        main: {
            objects: Record<string, ioBroker.ScriptObject | ioBroker.InstanceObject | ioBroker.ChannelObject>;
            getObject: (id: string, cb: (err: Error | null | undefined, obj?: ioBroker.Object | null) => void) => void;
            instances: string[];
            selectIdDialog: (
                initValue: string | null,
                type: ('state' | 'all' | 'meta' | 'script' | 'enum' | null) | ((selected: string) => void),
                cb?: (selected: string) => void,
            ) => void;
            cronDialog: (initValue: string | null, cb: (selected: string) => void) => void;
            showScriptDialog: (script: string, args: any[], isReturn: boolean, cb: (newScript: string) => void) => void;
        };
    }
}

const images: Record<ScriptType | 'def', string> = {
    Blockly: ImgBlockly,
    'Javascript/js': ImgJS,
    Rules: ImgRules,
    def: ImgJS,
    'TypeScript/ts': ImgTypeScript,
};

const MENU_ITEM_HEIGHT = 48;
const COLOR_DEBUG = '#02a102';
const COLOR_VERBOSE = '#70aae9';
const COLOR_RUN = green[400];
const COLOR_PAUSE = red[400];

const styles: Record<string, any> = {
    toolbar: (theme: IobTheme): React.CSSProperties => ({
        minHeight: 38, // Theme.toolbar.height,
        boxShadow:
            '0px 2px 4px -1px rgba(0, 0, 0, 0.2), 0px 4px 5px 0px rgba(0, 0, 0, 0.14), 0px 1px 10px 0px rgba(0, 0, 0, 0.12)',
        backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#E2E2E2',
    }),
    toolbarButtons: {
        padding: 4,
        marginLeft: 4,
    },
    toolbarButtonsDisabled: {
        filter: 'grayscale(100%)',
        opacity: 0.5,
    },
    editorDiv: (theme: IobTheme): React.CSSProperties => ({
        height: `calc(100% - ${(parseInt(theme.toolbar.height as string, 10) || 48) + 38 /* Theme.toolbar.height */ + 10}px)`,
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
    }),
    textButton: {
        marginRight: 10,
        minHeight: 24,
        padding: '6px 16px',
        height: 32,
    },
    saveButton: {
        background: '#ff9900',
    },
    textIcon: {
        marginLeft: 8,
    },
    tabIcon: {
        width: 24,
        height: 24,
        verticalAlign: 'middle',
        marginBottom: 2,
        marginRight: 2,
        borderRadius: 3,
    },
    hintIcon: {
        // fontSize: 32,
        padding: '0 8px 0 8px',
    },
    hintText: {
        // fontSize: 18
    },
    hintButton: {
        marginTop: 8,
        marginLeft: 20,
    },
    tabMenuButton: {
        position: 'absolute',
        top: 0,
        right: 0,
    },
    tabChanged: (theme: IobTheme): React.CSSProperties => ({
        color: theme.palette.secondary.main,
    }),
    tabText: {
        maxWidth: 130,
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        display: 'inline-block',
        verticalAlign: 'middle',
    },
    tabChangedIcon: {
        color: '#FF0000',
        fontSize: 16,
        marginLeft: 5,
    },
    closeButton: {
        marginLeft: 5,
    },
    notRunning: {
        color: '#ffbc00',
        marginRight: 8,
        marginLeft: 8,
    },
    tabButton: {
        minHeight: 48,
    },
    tabButtonWrapper: {
        display: 'inline-block',
    },
    menuIcon: {
        width: 18,
        height: 18,
        borderRadius: 2,
        marginRight: 5,
    },
};

function ChatIcon(): React.JSX.Element {
    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 2406 2406"
        >
            <path
                d="M1 578.4C1 259.5 259.5 1 578.4 1h1249.1c319 0 577.5 258.5 577.5 577.4V2406H578.4C259.5 2406 1 2147.5 1 1828.6V578.4z"
                fill="#74aa9c"
            />
            <path
                d="M1107.3 299.1c-198 0-373.9 127.3-435.2 315.3C544.8 640.6 434.9 720.2 370.5 833c-99.3 171.4-76.6 386.9 56.4 533.8-41.1 123.1-27 257.7 38.6 369.2 98.7 172 297.3 260.2 491.6 219.2 86.1 97 209.8 152.3 339.6 151.8 198 0 373.9-127.3 435.3-315.3 127.5-26.3 237.2-105.9 301-218.5 99.9-171.4 77.2-386.9-55.8-533.9v-.6c41.1-123.1 27-257.8-38.6-369.8-98.7-171.4-297.3-259.6-491-218.6-86.6-96.8-210.5-151.8-340.3-151.2zm0 117.5-.6.6c79.7 0 156.3 27.5 217.6 78.4-2.5 1.2-7.4 4.3-11 6.1L952.8 709.3c-18.4 10.4-29.4 30-29.4 51.4V1248l-155.1-89.4V755.8c-.1-187.1 151.6-338.9 339-339.2zm434.2 141.9c121.6-.2 234 64.5 294.7 169.8 39.2 68.6 53.9 148.8 40.4 226.5-2.5-1.8-7.3-4.3-10.4-6.1l-360.4-208.2c-18.4-10.4-41-10.4-59.4 0L1024 984.2V805.4L1372.7 604c51.3-29.7 109.5-45.4 168.8-45.5zM650 743.5v427.9c0 21.4 11 40.4 29.4 51.4l421.7 243-155.7 90L597.2 1355c-162-93.8-217.4-300.9-123.8-462.8C513.1 823.6 575.5 771 650 743.5zm807.9 106 348.8 200.8c162.5 93.7 217.6 300.6 123.8 462.8l.6.6c-39.8 68.6-102.4 121.2-176.5 148.2v-428c0-21.4-11-41-29.4-51.4l-422.3-243.7 155-89.3zM1201.7 997l177.8 102.8v205.1l-177.8 102.8-177.8-102.8v-205.1L1201.7 997zm279.5 161.6 155.1 89.4v402.2c0 187.3-152 339.2-339 339.2v-.6c-79.1 0-156.3-27.6-217-78.4 2.5-1.2 8-4.3 11-6.1l360.4-207.5c18.4-10.4 30-30 29.4-51.4l.1-486.8zM1380 1421.9v178.8l-348.8 200.8c-162.5 93.1-369.6 38-463.4-123.7h.6c-39.8-68-54-148.8-40.5-226.5 2.5 1.8 7.4 4.3 10.4 6.1l360.4 208.2c18.4 10.4 41 10.4 59.4 0l421.9-243.7z"
                fill="white"
            />
        </svg>
    );
}

interface EditorProps {
    socket: AdminConnection;
    objects: Record<string, ioBroker.ScriptObject | ioBroker.ChannelObject>;
    searchText: string;
    selected: string;
    menuOpened: boolean;
    themeType: ThemeType;
    runningInstances: Record<string, boolean>;
    onChange: (id: string, common: ioBroker.ScriptCommon) => void;
    onSelectedChange: (selected: string, editing: string[]) => void;
    onRestart?: (id: string) => void;
    debugMode: boolean;
    visible: boolean;
    onMenuOpened?: (opened: boolean) => void;
    onSearch?: (searchText: string) => void;
    onThemeChange?: (themeType: ThemeType) => void;
    debugInstance: { adapter?: string; instance?: string } | null;
    onLocate: (menuSelectId: string) => void;
    theme: IobTheme;
    themeName: ThemeName;
    onDebugModeChange: (debugMode: boolean) => void;
    adapterName: string;
    expertMode: boolean;
    isAnyRulesExists: number;
    resizing: boolean;
    onChangedChanged: (changed: { [id: string]: boolean }) => void;
    password: string;
    scriptsHash: number;
}

interface EditorState {
    selected: string;
    editing: string[];
    changed: Record<string, boolean>;
    blockly: boolean | null;
    rules: boolean | null;
    debugEnabled: boolean;
    verboseEnabled: boolean;
    showCompiledCode: boolean;
    showSelectId: boolean;
    showCron: boolean;
    showScript: boolean;
    showAstro: boolean;
    astroEvents: null | AstroTimes;
    insert: string;
    searchText: string;
    themeType: ThemeType;
    visible: boolean;
    cmdToBlockly: '' | 'export' | 'import' | 'check';
    cmdToRules: '' | 'export' | 'import';
    menuOpened: boolean;
    menuTabsOpened: boolean;
    runningInstances: Record<string, boolean>;
    showDebugMenu: boolean;
    toast: string;
    instancesLoaded: boolean;
    isTourOpen: boolean;
    tourStep: number;
    showAdapterDebug: boolean;
    confirm: string;
    askAboutDebug: boolean;
    menuDebugAnchorEl: null | HTMLElement;
    triggerPrettier: number;
    openAiDialog: boolean;
}

class Editor extends React.Component<EditorProps, EditorState> {
    private getSelect: (() => string | undefined) | null = null;
    private changedMirror: { [id: string]: boolean } = {};

    private cron: { initValue: string | null; callback: null | ((selected: string) => void); type?: string } = {
        initValue: null,
        callback: null,
    };

    private scriptDialog: {
        initValue: string | null;
        callback: null | ((selected: string) => void);
        args: null | any[];
        isReturn: boolean;
    } = {
        initValue: null,
        callback: null,
        args: null,
        isReturn: false,
    };

    private objects: Record<string, ioBroker.ScriptObject | ioBroker.ChannelObject>;

    private readonly scripts: Record<string, ioBroker.ScriptCommon>;

    // required by selectIdDialog in Blockly
    private selectId: {
        initValue: string | null;
        callback: null | ((selected: string | string[] | undefined) => void);
        type?: 'state' | 'all' | 'meta' | 'script' | 'enum' | null;
    } = {
        initValue: null,
        callback: null,
    };

    private confirmCallback: null | ((result: boolean) => void) = null;

    constructor(props: EditorProps) {
        super(props);

        let selected = window.localStorage.getItem('Editor.selected') || '';
        const editingStr = window.localStorage.getItem('Editor.editing') || '[]';
        let editing: string[];
        try {
            editing = JSON.parse(editingStr);
        } catch {
            editing = [];
        }
        if (selected && !editing.includes(selected)) {
            editing.push(selected);
        }

        if (selected && !this.props.password && this.props.objects[selected]?.native?.protected) {
            // get another tab
            selected = editing.find(id => !this.props.objects[id]?.native?.protected) || '';
        }
        if (!selected && editing.length) {
            if (this.props.password) {
                selected = editing[0];
            } else {
                selected = editing.find(id => !this.props.objects[id]?.native?.protected) || '';
            }
        }

        this.state = {
            askAboutDebug: false,
            astroEvents: null,
            blockly: null,
            changed: {}, // for every script
            cmdToBlockly: '',
            cmdToRules: '',
            confirm: '',
            debugEnabled: false,
            editing, // array of opened scripts
            insert: '',
            instancesLoaded: false,
            isTourOpen: window.localStorage.getItem('tour') !== 'true',
            menuDebugAnchorEl: null,
            menuOpened: !!this.props.menuOpened,
            menuTabsOpened: false,
            openAiDialog: false,
            triggerPrettier: 1,
            rules: null,
            runningInstances: this.props.runningInstances || {},
            searchText: '',
            selected,
            showAdapterDebug: false,
            showAstro: false,
            showCompiledCode: false,
            showCron: false,
            showDebugMenu: false,
            showScript: false,
            showSelectId: false,
            themeType: this.props.themeType,
            toast: '',
            tourStep: STEPS.selectTriggers,
            verboseEnabled: false,
            visible: props.visible,
        };

        this.setChangedInAdmin();

        window.systemLang = I18n.getLanguage();
        window.main = {
            objects: {},
            getObject: (id: string, cb: (err: null | Error | undefined, obj?: ioBroker.Object | null) => void) =>
                this.props.socket
                    .getObject(id)
                    .then(obj => cb?.(null, obj))
                    .catch(err => cb?.(err)),
            instances: [],
            selectIdDialog: (
                initValue: string | null,
                type: ('state' | 'all' | 'meta' | 'script' | 'enum' | null) | ((selected: string) => void),
                cb?: (selected: string) => void,
            ): void => {
                if (typeof type === 'function') {
                    cb = type as (selected: string) => void;
                    type = null;
                }
                this.selectId.callback = cb as (selected: string | string[] | undefined) => void;
                this.selectId.initValue = initValue;
                this.selectId.type = type;
                this.setState({ showSelectId: true });
            },
            cronDialog: (initValue, cb) => {
                this.cron.callback = cb;
                this.cron.initValue = initValue;
                this.setState({ showCron: true });
            },
            showScriptDialog: (
                value: string,
                args: any[],
                isReturn: boolean,
                cb: (newScript: string) => void,
            ): void => {
                this.scriptDialog.callback = cb;
                this.scriptDialog.initValue = value;
                this.scriptDialog.args = args;
                this.scriptDialog.isReturn = isReturn || false;
                this.setState({ showScript: true });
            },
        };

        this.objects = props.objects;

        this.scripts = {};

        void this.getAllAdapterInstances().then(() => {
            // to enable logging
            if (this.props.onSelectedChange && this.state.selected) {
                setTimeout(() => this.props.onSelectedChange(this.state.selected, this.state.editing), 100);
            }
        });
    }

    async getAllAdapterInstances(): Promise<void> {
        const instanceObjects = await this.props.socket.getAdapterInstances(true);
        const objects: Record<string, ioBroker.InstanceObject> = {};
        const instances = instanceObjects.map(obj => {
            objects[obj._id] = obj;
            return obj._id;
        });
        window.main.objects = objects;
        window.main.instances = instances;
        this.setState({ instancesLoaded: true });
    }

    static onInstanceChanged(id: string, obj: ioBroker.Object | null | undefined): void {
        if (!id) {
            return;
        }

        if (!obj && window.main.instances.includes(id)) {
            delete window.main.objects[id];
            const pos = window.main.instances.indexOf(id);
            window.main.instances.splice(pos, 1);
        } else if (obj?.type === 'instance') {
            // update instances
            if (!window.main.instances.includes(id)) {
                window.main.instances.push(id);
                window.main.instances.sort();
            }
            window.main.objects[id] = obj;
        }
    }

    setChangedInAdmin(): void {
        const isChanged = Object.keys(this.state.changed).find(id => this.state.changed[id]);

        // Sync this.state.changed and this.changedMirror
        Object.keys(this.state.changed).forEach(id => {
            this.changedMirror[id] = this.state.changed[id];
        });
        Object.keys(this.changedMirror).forEach(id => {
            if (this.state.changed[id] === undefined) {
                delete this.changedMirror[id];
            }
        });

        this.props.onChangedChanged(this.changedMirror);

        if (typeof window.parent !== 'undefined' && window.parent) {
            // @ts-expect-error by design
            window.parent.configNotSaved = !!isChanged;
        }
    }

    componentDidMount(): void {
        window.addEventListener('beforeunload', this.onBrowserClose, false);
        void this.props.socket.subscribeObject('system.adapter.*', Editor.onInstanceChanged);
    }

    componentWillUnmount(): void {
        window.removeEventListener('beforeunload', this.onBrowserClose);
        void this.props.socket.unsubscribeObject('system.adapter.*', Editor.onInstanceChanged);
    }

    onBrowserClose = (e: BeforeUnloadEvent): string | void => {
        const isChanged = Object.keys(this.scripts).find(
            id => JSON.stringify(this.scripts[id]) !== JSON.stringify(this.getScriptFromObject(id)),
        );

        if (isChanged) {
            console.log(`Script ${JSON.stringify(this.scripts[isChanged])}`);
            const message = I18n.t('Configuration not saved.');
            e = e || window.event;
            // For IE and Firefox
            if (e) {
                e.returnValue = message;
            }

            // For Safari
            return message;
        }
    };

    removeNonExistingScripts(nextProps: EditorProps | null, newState: Partial<EditorState>): boolean {
        nextProps = nextProps || this.props;
        newState = newState || {};

        let _changed = false;
        if (this.state.editing) {
            const isAnyNonExists = this.state.editing.find(id => nextProps && !nextProps.objects[id]);

            if (isAnyNonExists) {
                // remove non-existing scripts
                const editing: string[] = [...this.state.editing];
                for (let i = editing.length - 1; i >= 0; i--) {
                    if (!this.objects[editing[i]]) {
                        _changed = true;
                        editing.splice(i, 1);
                    }
                }
                if (_changed) {
                    newState.editing = editing;
                }
                if (this.state.selected && !this.objects[this.state.selected]) {
                    _changed = true;
                    newState.selected = editing[0] || '';
                    if (newState.selected && this.scripts[newState.selected]) {
                        if (this.state.blockly !== (this.scripts[newState.selected].engineType === 'Blockly')) {
                            newState.blockly = this.scripts[newState.selected].engineType === 'Blockly';
                            _changed = true;
                        }
                        if (this.state.rules !== (this.scripts[newState.selected].engineType === 'Rules')) {
                            newState.rules = this.scripts[newState.selected].engineType === 'Rules';
                            _changed = true;
                        }
                        if (this.state.verboseEnabled !== this.scripts[newState.selected].verbose) {
                            newState.verboseEnabled = this.scripts[newState.selected].verbose;
                            _changed = true;
                        }
                        if (this.state.debugEnabled !== this.scripts[newState.selected].debug) {
                            newState.debugEnabled = this.scripts[newState.selected].debug;
                            _changed = true;
                        }
                    }
                }
            }
        }
        return _changed;
    }

    UNSAFE_componentWillReceiveProps(nextProps: EditorProps): void {
        const newState: Partial<EditorState> = {};
        let _changed = false;

        if (JSON.stringify(nextProps.runningInstances) !== JSON.stringify(this.state.runningInstances)) {
            _changed = true;
            newState.runningInstances = nextProps.runningInstances;
        }

        if (this.state.menuOpened !== nextProps.menuOpened) {
            newState.menuOpened = nextProps.menuOpened;
            _changed = true;
        }

        if (this.state.themeType !== nextProps.themeType) {
            newState.themeType = nextProps.themeType;
            _changed = true;
        }

        // check if all opened files still exists
        if (this.removeNonExistingScripts(nextProps, newState)) {
            _changed = true;
        }

        // update search text
        if (this.state.searchText !== nextProps.searchText) {
            newState.searchText = nextProps.searchText;
            _changed = true;
        }

        // if objects read
        if (this.objects !== nextProps.objects) {
            this.objects = nextProps.objects;
            window.main.objects = nextProps.objects;

            // update all scripts, but keep source
            Object.keys(this.scripts).forEach(id => {
                const source = this.scripts[id].source;
                this.scripts[id] = JSON.parse(JSON.stringify(this.objects[id].common));
                this.scripts[id].source = source;
            });

            // if a script is blockly
            if (this.state.selected && this.objects[this.state.selected]) {
                this.scripts[this.state.selected] ||= JSON.parse(
                    JSON.stringify(this.objects[this.state.selected].common),
                ) as ioBroker.ScriptCommon;
                if (this.state.blockly !== (this.scripts[this.state.selected].engineType === 'Blockly')) {
                    newState.blockly = this.scripts[this.state.selected].engineType === 'Blockly';
                    _changed = true;
                }
                if (this.state.rules !== (this.scripts[this.state.selected].engineType === 'Rules')) {
                    newState.rules = this.scripts[this.state.selected].engineType === 'Rules';
                    _changed = true;
                }
                if (this.state.verboseEnabled !== this.scripts[this.state.selected].verbose) {
                    newState.verboseEnabled = this.scripts[this.state.selected].verbose;
                    _changed = true;
                }
                if (this.state.debugEnabled !== this.scripts[this.state.selected].debug) {
                    newState.debugEnabled = this.scripts[this.state.selected].debug;
                    _changed = true;
                }
            }

            // remove non-existing scripts
            const editing: string[] = [...this.state.editing];
            for (let i = editing.length - 1; i >= 0; i--) {
                if (!this.objects[editing[i]]) {
                    _changed = true;
                    editing.splice(i, 1);
                    if (this.state.changed[editing[i]] !== undefined) {
                        newState.changed ||= { ...this.state.changed };
                        if (newState.changed) {
                            delete newState.changed[editing[i]];
                        }
                    }
                }
            }
            if (this.state.selected && !this.objects[this.state.selected]) {
                newState.selected = editing[0] || '';
            }
            if (_changed) {
                newState.editing = editing;
            }
        } else {
            // update all scripts
            for (const id in this.scripts) {
                if (!Object.prototype.hasOwnProperty.call(this.scripts, id)) {
                    continue;
                }
                if (this.objects[id]?.common) {
                    if (this.objects[id].type === 'script') {
                        const oldSource: string | undefined = this.scripts[id].source;
                        const commonLocal: ioBroker.ScriptCommon = JSON.parse(
                            JSON.stringify(this.scripts[id]),
                        ) as ioBroker.ScriptCommon;

                        commonLocal.source = this.objects[id].common.source;

                        // if anything except the source was changed
                        if (JSON.stringify(commonLocal) !== JSON.stringify(this.objects[id].common)) {
                            this.scripts[id] = JSON.parse(JSON.stringify(this.objects[id].common));
                            this.scripts[id].source = oldSource;
                        }

                        if (oldSource !== this.objects[id].common.source) {
                            // take a new script if it not yet changed
                            if (!this.state.changed[id]) {
                                // just use new value
                                if (this.props.password && this.objects[id].native?.protected) {
                                    this.scripts[id].source = decryptText(
                                        this.props.password,
                                        this.objects[id].common.source,
                                    );
                                } else {
                                    this.scripts[id].source = this.objects[id].common.source;
                                }
                            } else {
                                if (this.objects[id].from?.startsWith('system.adapter.javascript.')) {
                                    this.objects[id].from = 'system.adapter.admin.0';
                                    // show that script was changed from outside
                                    this.setState({
                                        toast: I18n.t('Script %s was modified on disk.', id.split('.').pop()),
                                    });
                                }
                            }
                        } else {
                            if (this.state.changed[id]) {
                                newState.changed ||= { ...this.state.changed };
                                if (newState.changed) {
                                    newState.changed[id] = false;
                                }
                                _changed = true;
                            }
                        }
                    }
                } else if (this.scripts[id]) {
                    delete this.scripts[id];
                    if (this.state.selected === id) {
                        if (this.state.editing.indexOf(id) !== -1) {
                            const editing: string[] = [...this.state.editing];
                            const pos = editing.indexOf(id);
                            if (pos !== -1) {
                                editing.splice(pos, 1);
                                newState.editing = editing;
                                _changed = true;
                            }
                        }
                        newState.selected = this.state.editing[0] || '';
                        _changed = true;
                    }
                }
            }
        }

        if (nextProps.selected && this.state.selected !== nextProps.selected) {
            const nextCommon = this.getScriptFromObject(nextProps.selected);
            this.scripts[nextProps.selected] ||= nextCommon!;

            const changed =
                nextCommon && JSON.stringify(this.scripts[nextProps.selected]) !== JSON.stringify(nextCommon);

            const editing = [...this.state.editing];
            if (nextProps.selected && !editing.includes(nextProps.selected)) {
                editing.push(nextProps.selected);
                this.props.onSelectedChange(nextProps.selected, editing);
                window.localStorage.setItem('Editor.editing', JSON.stringify(editing));
            }

            _changed = true;
            newState.changed ||= { ...this.state.changed };
            newState.changed[nextProps.selected] = !!changed;
            newState.editing = editing;
            newState.selected = nextProps.selected;
            newState.blockly = this.scripts[nextProps.selected].engineType === 'Blockly';
            newState.rules = this.scripts[nextProps.selected].engineType === 'Rules';
            newState.verboseEnabled = this.scripts[nextProps.selected].verbose;
            newState.debugEnabled = this.scripts[nextProps.selected].debug;
            newState.showCompiledCode = false;
        }

        if (this.state.visible !== nextProps.visible) {
            _changed = true;
            newState.visible = nextProps.visible;
        }

        if (_changed) {
            this.setState(newState as EditorState, () => this.setChangedInAdmin());
        }
    }

    onRestart(): void {
        this.props.onRestart?.(this.state.selected);
    }

    onStartStop(): void {
        const common: ioBroker.ScriptCommon = JSON.parse(JSON.stringify(this.scripts[this.state.selected]));
        common.enabled = !common.enabled;
        if (this.props.password && this.props.objects[this.state.selected].native?.protected) {
            common.source = encryptText(this.props.password, common.source);
        }

        this.props.onChange?.(this.state.selected, common);
    }

    onSave(): void {
        if (this.state.isTourOpen && this.state.tourStep === STEPS.saveTheScript) {
            this.setState({ isTourOpen: false });
            window.localStorage.setItem('tour', 'true');
        }

        if (this.state.changed[this.state.selected]) {
            const changed: Record<string, boolean> = { ...this.state.changed };
            changed[this.state.selected] = false;
            this.setState({ changed }, () => {
                this.setChangedInAdmin();
                const common: ioBroker.ScriptCommon = JSON.parse(JSON.stringify(this.scripts[this.state.selected]));
                if (this.props.password && this.props.objects[this.state.selected].native?.protected) {
                    common.source = encryptText(this.props.password, common.source);
                }
                this.props.onChange?.(this.state.selected, common);
            });
        }
    }

    onSaveAll(): void {
        const changed: Record<string, boolean> = { ...this.state.changed };
        Object.keys(changed).forEach(id => {
            if (changed[id]) {
                changed[id] = false;
                const common: ioBroker.ScriptCommon = JSON.parse(JSON.stringify(this.scripts[id]));
                if (this.props.password && this.props.objects[id].native?.protected) {
                    common.source = encryptText(this.props.password, common.source);
                }
                this.props.onChange?.(id, common);
            }
        });

        this.setState({ changed }, () => this.setChangedInAdmin());
    }

    onCancel(): void {
        this.scripts[this.state.selected] = this.getScriptFromObject(this.state.selected)!;

        const changed: { [id: string]: boolean } = { ...this.state.changed };
        changed[this.state.selected] = false;

        this.setState({ changed }, () => this.setChangedInAdmin());
    }

    onRegisterSelect(func: (() => string | undefined) | null): void {
        this.getSelect = func;
    }

    onConvertBlockly2JS(): void {
        this.showConfirmDialog(I18n.t('It will not be possible to revert this operation.'), result => {
            if (result) {
                this.scripts[this.state.selected].engineType = 'Javascript/js';
                const source: string = this.scripts[this.state.selected].source;
                const lines = source.split('\n');
                lines.pop();
                this.scripts[this.state.selected].source = lines.join('\n');
                const nowSelected = this.state.selected;

                const changed: { [id: string]: boolean } = { ...this.state.changed };
                changed[this.state.selected] = true;

                this.setState({ changed, blockly: false, selected: '' }, () => {
                    this.setChangedInAdmin();
                    // force update of the editor
                    setTimeout(() => this.setState({ selected: nowSelected }), 100);
                });
            }
        });
    }

    onChange(options: { script?: string; debug?: boolean; verbose?: boolean }): void {
        if (options.script !== undefined) {
            if (options.script === this.scripts[this.state.selected].source) {
                return;
            }
            this.scripts[this.state.selected].source = options.script;
        }
        if (options.debug !== undefined) {
            this.scripts[this.state.selected].debug = options.debug;
        }
        if (options.verbose !== undefined) {
            this.scripts[this.state.selected].verbose = options.verbose;
        }
        const _changed =
            JSON.stringify(this.scripts[this.state.selected]) !==
            JSON.stringify(this.getScriptFromObject(this.state.selected));

        if (_changed !== !!this.state.changed[this.state.selected]) {
            const changed: { [id: string]: boolean } = { ...this.state.changed };
            changed[this.state.selected] = _changed;
            this.objects[this.state.selected].from = 'system.adapter.admin.0';
            this.setState({ changed }, () => this.setChangedInAdmin());
        }
    }

    onTabChange(selected: string): void {
        if (this.props.debugMode) {
            return;
        }
        window.localStorage.setItem('Editor.selected', selected);
        const common = this.scripts[selected] || this.getScriptFromObject(selected);
        this.setState({
            selected,
            rules: common.engineType === 'Rules',
            blockly: common.engineType === 'Blockly',
            showCompiledCode: false,
            verboseEnabled: common.verbose,
            debugEnabled: common.debug,
        });
        this.props.onSelectedChange?.(selected, this.state.editing);
    }

    isScriptChanged(id: string): boolean {
        return !!(
            this.scripts[id] &&
            this.props.objects[id] &&
            JSON.stringify(this.scripts[id]) !== JSON.stringify(this.getScriptFromObject(id))
        );
    }

    onTabClose(id: string, e?: React.MouseEvent<any>): void {
        e?.stopPropagation();

        const pos = this.state.editing.indexOf(id);
        if (this.state.editing.includes(id)) {
            if (this.isScriptChanged(id)) {
                this.showConfirmDialog(I18n.t('Discard changes for %s', this.props.objects[id].common.name), ok => {
                    if (ok) {
                        delete this.scripts[id];
                        this.onTabClose(id);
                    }
                });
            } else {
                const editing = [...this.state.editing];
                editing.splice(pos, 1);
                const newState: Partial<EditorState> = { editing };
                if (id === this.state.selected) {
                    if (editing.length) {
                        if (pos === 0 || editing.length === 1) {
                            newState.selected = editing[0];
                        } else {
                            newState.selected = editing[pos - 1];
                        }
                    } else {
                        newState.selected = '';
                    }
                } else if (this.state.selected && !editing.length) {
                    newState.selected = '';
                }
                window.localStorage.setItem('Editor.editing', JSON.stringify(editing));
                if (newState.selected !== undefined) {
                    newState.changed ||= { ...this.state.changed };
                    newState.changed[newState.selected] = this.isScriptChanged(newState.selected);
                    const common = newState.selected
                        ? this.scripts[newState.selected] || this.getScriptFromObject(newState.selected)
                        : undefined;

                    newState.blockly = common?.engineType === 'Blockly';
                    newState.rules = common?.engineType === 'Rules';
                    newState.verboseEnabled = !!common?.verbose;
                    newState.debugEnabled = !!common?.debug;
                    newState.showCompiledCode = false;
                }

                this.setState(newState as EditorState, () => {
                    this.setChangedInAdmin();

                    if (newState.selected !== undefined) {
                        this.props.onSelectedChange?.(newState.selected, this.state.editing);
                        window.localStorage.setItem('Editor.selected', newState.selected);
                    } else {
                        this.props.onSelectedChange?.(this.state.selected, this.state.editing);
                    }
                });
            }
        }
    }

    showConfirmDialog(question: string, cb: (result: boolean) => void): void {
        this.confirmCallback = cb;
        this.setState({ confirm: question });
    }

    sendCommandToBlockly(cmd: 'export' | 'import' | 'check'): void {
        this.setState({ cmdToBlockly: cmd }, () => setTimeout(() => this.setState({ cmdToBlockly: '' }), 200));
    }

    sendCommandToRules(cmd: 'export' | 'import'): void {
        this.setState({ cmdToRules: cmd }, () => setTimeout(() => this.setState({ cmdToRules: '' }), 200));
    }

    static getText(text: ioBroker.StringOrTranslated): string {
        if (typeof text === 'object') {
            return text[I18n.getLanguage()] || text.en;
        }
        return text;
    }

    getScriptFullName(id: string): string {
        const parts = id.split('.');
        parts.shift(); // remove "script."
        parts.shift(); // remove "js."
        const result = [];
        let _id = 'script.js';
        for (let i = 0; i < parts.length; i++) {
            _id += `.${parts[i]}`;
            if (this.props.objects[_id]?.common) {
                result.push(Editor.getText(this.props.objects[_id].common.name));
            } else {
                result.push(parts[i]);
            }
        }
        return `/ ${result.join(' / ')}`;
    }

    getTabs(): (React.JSX.Element | null)[] | React.JSX.Element {
        if (this.state.editing.length) {
            return [
                <Tabs
                    component="div"
                    key="tabs1"
                    value={this.props.debugInstance ? this.props.debugInstance.adapter : this.state.selected}
                    onChange={(_event: any, value: string) => this.onTabChange(value)}
                    indicatorColor="primary"
                    style={{
                        position: 'relative',
                        marginLeft: 10,
                        width: this.state.editing.length > 1 ? 'calc(100% - 50px)' : '100%',
                        display: 'inline-block',
                    }}
                    textColor="primary"
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                >
                    {this.state.editing.map(id => {
                        if (!this.props.objects[id]) {
                            const label = [
                                <Box
                                    key="text"
                                    sx={this.isScriptChanged(id) ? styles.tabChanged : undefined}
                                    style={styles.tabText}
                                >
                                    {id.split('.').pop()}
                                </Box>,
                                <IconButton
                                    onClick={e => this.onTabClose(id, e)}
                                    style={styles.closeButton}
                                    key="icon"
                                    size="small"
                                    component="span"
                                >
                                    <IconClose />
                                </IconButton>,
                            ];
                            return (
                                <Tab
                                    wrapped
                                    href={`#${id}`}
                                    key={id}
                                    label={label}
                                    value={id}
                                    sx={{ '& .MuiTab-wrapper': styles.tabButtonWrapper }}
                                />
                            );
                        }
                        if (!this.props.password && this.props.objects[id].native?.protected) {
                            return null;
                        }

                        let text = Editor.getText(this.props.objects[id].common.name) || '';
                        const title = this.getScriptFullName(id);
                        if (text.length > 18) {
                            text = `${text.substring(0, 15)}...`;
                        }
                        const source = this.getScriptFromObject(id)?.source;
                        const changed = this.scripts[id] && source !== this.scripts[id].source;

                        const label = [
                            <Box
                                key="text"
                                sx={this.isScriptChanged(id) ? styles.tabChanged : undefined}
                                style={styles.tabText}
                            >
                                {text}
                            </Box>,
                            changed ? (
                                <span
                                    key="changedSign"
                                    style={styles.tabChangedIcon}
                                >
                                    ▣
                                </span>
                            ) : null,
                            !this.props.debugInstance && (!this.props.debugMode || this.state.selected !== id) && (
                                <IconButton
                                    onClick={e => this.onTabClose(id, e)}
                                    style={styles.closeButton}
                                    key="icon"
                                    size="small"
                                    component="span"
                                >
                                    <IconClose />
                                </IconButton>
                            ),
                        ];

                        return (
                            <Tab
                                disabled={
                                    !!this.props.debugInstance || (this.state.selected !== id && this.props.debugMode)
                                }
                                wrapped
                                iconPosition="start"
                                icon={
                                    <img
                                        key="icon"
                                        alt=""
                                        src={
                                            (images as Record<string, string>)[
                                                (this.props.objects[id].common as ioBroker.ScriptCommon).engineType
                                            ] || images.def
                                        }
                                        style={styles.tabIcon}
                                    />
                                }
                                href={`#${id}`}
                                key={id}
                                label={label}
                                style={styles.tabButton}
                                value={id}
                                title={title}
                                sx={{ '& .MuiTab-wrapper': styles.tabButtonWrapper }}
                            />
                        );
                    })}
                    {this.props.debugInstance ? (
                        <Tab
                            disabled={false}
                            wrapped
                            href={`#${this.props.debugInstance.adapter}`}
                            key={this.props.debugInstance.adapter}
                            label={this.props.debugInstance.adapter}
                            style={styles.tabButton}
                            value={this.props.debugInstance.adapter}
                            title={this.props.debugInstance.adapter}
                            sx={{ '& .MuiTab-wrapper': styles.tabButtonWrapper }}
                        />
                    ) : (
                        ''
                    )}
                </Tabs>,
                this.state.editing.length > 1 ? (
                    <IconButton
                        key="menuButton"
                        href="#"
                        aria-label="Close all but current"
                        style={styles.tabMenuButton}
                        title={I18n.t('Close all but current')}
                        aria-haspopup="false"
                        onClick={_event => {
                            const editing = [this.state.selected];
                            // Do not close not saved tabs
                            Object.keys(this.scripts).forEach(
                                id =>
                                    id !== this.state.selected &&
                                    JSON.stringify(this.scripts[id]) !== JSON.stringify(this.getScriptFromObject(id)) &&
                                    editing.push(id),
                            );

                            window.localStorage.setItem('Editor.editing', JSON.stringify(editing));
                            this.setState({ menuTabsOpened: false, editing });
                        }}
                        size="medium"
                    >
                        <IconCloseAll />
                    </IconButton>
                ) : null,
            ];
        }
        return (
            <Box
                key="tabs2"
                sx={styles.toolbar}
            >
                <Button
                    color="grey"
                    key="select1"
                    disabled
                    style={styles.hintButton}
                    href=""
                >
                    <span key="select2">{I18n.t('Click on this icon')}</span>
                    <IconDoEdit
                        key="select3"
                        style={styles.hintIcon}
                    />
                    <span key="select4">{I18n.t('for edit or create script')}</span>
                </Button>
            </Box>
        );
    }

    getDebugMenu(): React.JSX.Element | null {
        if (!this.state.showDebugMenu) {
            return null;
        }

        return (
            <Menu
                key="menuDebug"
                id="menu-debug"
                anchorEl={this.state.menuDebugAnchorEl}
                open={this.state.showDebugMenu}
                onClose={() => this.setState({ showDebugMenu: false, menuDebugAnchorEl: null })}
                slotProps={{
                    root: {
                        style: {
                            maxHeight: MENU_ITEM_HEIGHT * 7.5,
                        },
                    },
                }}
            >
                <MenuItem
                    key="debugEnabled"
                    title={I18n.t('debug_help')}
                    onClick={event => {
                        event.stopPropagation();
                        event.preventDefault();
                        this.setState(
                            { showDebugMenu: false, menuDebugAnchorEl: null, debugEnabled: !this.state.debugEnabled },
                            () => this.onChange({ debug: this.state.debugEnabled }),
                        );
                    }}
                >
                    <Checkbox checked={this.state.debugEnabled} />
                    <IconDebug style={{ ...styles.menuIcon, color: COLOR_DEBUG }} />
                    {I18n.t('debug_label')}
                </MenuItem>
                <MenuItem
                    key="verboseEnabled"
                    title={I18n.t('verbose_help')}
                    onClick={event => {
                        event.stopPropagation();
                        event.preventDefault();
                        this.setState(
                            {
                                showDebugMenu: false,
                                menuDebugAnchorEl: null,
                                verboseEnabled: !this.state.verboseEnabled,
                            },
                            () => this.onChange({ verbose: this.state.verboseEnabled }),
                        );
                    }}
                >
                    <Checkbox checked={this.state.verboseEnabled} />
                    <IconVerbose style={{ ...styles.menuIcon, color: COLOR_VERBOSE }} />
                    {I18n.t('verbose_label')}
                </MenuItem>
            </Menu>
        );
    }

    getDebugBadge(): (React.JSX.Element | null)[] {
        return [
            this.state.debugEnabled && this.state.verboseEnabled ? (
                <IconDebug
                    key="DebugVerbose"
                    style={{ ...styles.menuIcon, color: COLOR_VERBOSE }}
                />
            ) : null,
            this.state.debugEnabled && !this.state.verboseEnabled ? (
                <IconDebug
                    key="DebugNoVerbose"
                    style={{ ...styles.menuIcon, color: COLOR_DEBUG }}
                />
            ) : null,
            !this.state.debugEnabled && this.state.verboseEnabled ? (
                <IconVerbose
                    key="noDebugVerbose"
                    style={{ ...styles.menuIcon, color: COLOR_VERBOSE }}
                />
            ) : null,
        ];
    }

    getAskAboutDebug(): React.JSX.Element | null {
        if (this.state.askAboutDebug) {
            return (
                <DialogConfirm
                    onClose={() => {
                        this.setState({ askAboutDebug: false }, () => this.props.onDebugModeChange(true));
                    }}
                    ok={I18n.t('Yes')}
                    cancel={I18n.t('Cancel')}
                    text={I18n.t(
                        'The script will be stopped and must be activated manually after debugging. Continue?',
                    )}
                />
            );
        }
        return null;
    }

    renderOpenAiDialog(): React.JSX.Element | null {
        if (!this.state.openAiDialog) {
            return null;
        }
        return (
            <Suspense fallback={<Connecting />}>
                <OpenAiDialog
                    adapterName={this.props.adapterName}
                    socket={this.props.socket}
                    runningInstances={this.state.runningInstances}
                    themeType={this.state.themeType}
                    onClose={() => this.setState({ openAiDialog: false })}
                    language={
                        this.scripts[this.state.selected].engineType === 'TypeScript/ts' ? 'typescript' : 'javascript'
                    }
                    onAddCode={code => this.setState({ insert: code })}
                />
            </Suspense>
        );
    }

    getToolbar(): React.JSX.Element | null {
        const isInstanceRunning = !!(
            this.state.selected &&
            this.scripts[this.state.selected]?.engine &&
            this.state.runningInstances[this.scripts[this.state.selected].engine]
        );
        const isScriptRunning = !!(this.state.selected && this.scripts[this.state.selected]?.enabled);

        if (this.state.selected) {
            const changedAll = Object.keys(this.state.changed).filter(id => this.state.changed[id]).length;
            const changed = this.state.changed[this.state.selected];
            return (
                <Toolbar
                    variant="dense"
                    sx={styles.toolbar}
                    key="toolbar1"
                >
                    {!this.props.debugInstance && this.state.menuOpened && this.props.onLocate && (
                        <IconButton
                            style={styles.toolbarButtons}
                            key="locate"
                            title={I18n.t('Locate file')}
                            onClick={() => this.props.onLocate(this.state.selected)}
                            size="medium"
                        >
                            <IconLocate />
                        </IconButton>
                    )}
                    {!this.props.debugInstance && !changed && isInstanceRunning ? (
                        <IconButton
                            key="restart"
                            disabled={this.props.debugMode}
                            style={styles.toolbarButtons}
                            onClick={() => this.onRestart()}
                            title={I18n.t('Restart')}
                            size="medium"
                        >
                            <IconRestart />
                        </IconButton>
                    ) : null}
                    {!this.props.debugInstance && !changed ? (
                        <IconButton
                            key="start-stop"
                            disabled={this.props.debugMode}
                            onClick={() => this.onStartStop()}
                            title={isScriptRunning ? I18n.t('Pause script') : I18n.t('Run script')}
                            size="medium"
                            style={{
                                ...styles.toolbarButtons,
                                color: isScriptRunning ? COLOR_RUN : COLOR_PAUSE,
                            }}
                        >
                            {isScriptRunning ? <IconPause /> : <IconPlay />}
                        </IconButton>
                    ) : null}
                    {!this.props.debugInstance && !changed && !isScriptRunning ? (
                        <span style={styles.notRunning}>{I18n.t('Script is not running')}</span>
                    ) : null}
                    {!changed && isScriptRunning && !isInstanceRunning ? (
                        <span style={styles.notRunning}>{I18n.t('Instance is disabled')}</span>
                    ) : null}
                    {changed ? (
                        <Button
                            color="grey"
                            key="save"
                            variant="contained"
                            style={{ ...styles.textButton, ...styles.saveButton }}
                            className="button-save"
                            onClick={() => this.onSave()}
                            endIcon={<IconSave />}
                        >
                            {I18n.t('Save')}
                        </Button>
                    ) : null}
                    {changedAll > 1 || (changedAll === 1 && !changed) ? (
                        <Button
                            color="grey"
                            key="saveall"
                            variant="contained"
                            style={styles.textButton}
                            onClick={() => this.onSaveAll()}
                            endIcon={<IconSave />}
                        >
                            {I18n.t('Save all')}
                        </Button>
                    ) : null}
                    {changed ? (
                        <Button
                            color="grey"
                            key="cancel"
                            variant="contained"
                            style={styles.textButton}
                            onClick={() => this.onCancel()}
                            endIcon={<IconCancel />}
                        >
                            {I18n.t('Cancel')}
                        </Button>
                    ) : null}
                    <div style={{ flex: 2 }} />
                    {!this.props.debugInstance && !this.state.showCompiledCode && (
                        <IconButton
                            style={styles.toolbarButtons}
                            key="prettier"
                            title={I18n.t('Prettify the script')}
                            onClick={() => this.setState({ triggerPrettier: this.state.triggerPrettier + 1 })}
                            size="medium"
                        >
                            <IconCode />
                        </IconButton>
                    )}
                    {this.state.blockly && !this.state.showCompiledCode ? (
                        <IconButton
                            key="export"
                            aria-label="Export Blocks"
                            title={I18n.t('Export blocks')}
                            style={styles.toolbarButtons}
                            onClick={() => this.sendCommandToBlockly('export')}
                            size="medium"
                        >
                            <IconExport />
                        </IconButton>
                    ) : null}

                    {this.state.blockly && !this.state.showCompiledCode && (
                        <IconButton
                            key="import"
                            aria-label="Import Blocks"
                            title={I18n.t('Import blocks')}
                            style={styles.toolbarButtons}
                            onClick={() => this.sendCommandToBlockly('import')}
                            size="medium"
                        >
                            <IconImport />
                        </IconButton>
                    )}

                    {this.state.blockly && !this.state.showCompiledCode && (
                        <IconButton
                            key="check"
                            aria-label="Check code"
                            title={I18n.t('Check blocks')}
                            style={styles.toolbarButtons}
                            onClick={() => this.sendCommandToBlockly('check')}
                            size="medium"
                        >
                            <IconCheck />
                        </IconButton>
                    )}

                    {!this.props.debugMode &&
                    !this.state.blockly &&
                    !this.state.rules &&
                    !this.state.showCompiledCode ? (
                        <IconButton
                            key="select-cron"
                            aria-label="create CRON"
                            title={I18n.t('Create or edit CRON or time wizard')}
                            style={styles.toolbarButtons}
                            onClick={() => this.setState({ showCron: true })}
                            size="medium"
                        >
                            <IconCron />
                        </IconButton>
                    ) : null}
                    {this.scripts[this.state.selected] &&
                    this.scripts[this.state.selected].engineType !== 'Blockly' &&
                    this.scripts[this.state.selected].engineType !== 'Rules' ? (
                        <IconButton
                            key="ai"
                            aria-label="AI"
                            title={I18n.t('AI code generator')}
                            style={styles.toolbarButtons}
                            size="medium"
                            onClick={() => this.setState({ openAiDialog: true })}
                        >
                            <ChatIcon />
                        </IconButton>
                    ) : null}
                    <IconButton
                        key="show-astro"
                        aria-label="Show astronomical events"
                        title={I18n.t('Show astronomical events')}
                        style={styles.toolbarButtons}
                        disabled={!isInstanceRunning}
                        onClick={() => {
                            this.setState({ showAstro: true, astroEvents: null });

                            void this.props.socket
                                .sendTo(
                                    this.scripts[this.state.selected].engine.replace('system.adapter.', ''),
                                    'calcAstroAll',
                                    {},
                                )
                                .then(astroEvents => this.setState({ astroEvents }));
                        }}
                        size="medium"
                    >
                        <IconAstro />
                    </IconButton>

                    {!this.props.debugMode &&
                        !this.state.blockly &&
                        !this.state.rules &&
                        !this.state.showCompiledCode && (
                            <IconButton
                                key="select-id"
                                aria-label="select ID"
                                title={I18n.t('Insert object ID')}
                                style={styles.toolbarButtons}
                                onClick={() => this.setState({ showSelectId: true })}
                                size="medium"
                            >
                                <IconSelectId />
                            </IconButton>
                        )}

                    {this.state.blockly && !this.state.rules && this.state.showCompiledCode && (
                        <Button
                            color="grey"
                            key="convert2js"
                            aria-label="convert to javascript"
                            title={I18n.t('Convert blockly to javascript for ever.')}
                            onClick={() => this.onConvertBlockly2JS()}
                        >
                            Blockly=&gt;JS
                        </Button>
                    )}
                    {this.state.rules && !this.state.showCompiledCode && (
                        <IconButton
                            key="export"
                            aria-label="Export Blocks"
                            title={I18n.t('Export blocks')}
                            style={styles.toolbarButtons}
                            onClick={() => this.sendCommandToRules('export')}
                            size="medium"
                        >
                            <IconExport />
                        </IconButton>
                    )}
                    {this.state.rules && !this.state.showCompiledCode && (
                        <IconButton
                            key="import"
                            aria-label="Import Blocks"
                            title={I18n.t('Import blocks')}
                            style={styles.toolbarButtons}
                            onClick={() => this.sendCommandToRules('import')}
                            size="medium"
                        >
                            <IconImport />
                        </IconButton>
                    )}

                    {this.props.expertMode &&
                        !changed &&
                        (this.props.debugMode ||
                            (!this.state.blockly && !this.state.rules) ||
                            ((this.state.blockly || this.state.rules) && this.state.showCompiledCode)) && (
                            <IconButton
                                style={styles.toolbarButtons}
                                color={this.props.debugMode ? 'primary' : 'default'}
                                disabled={!this.props.debugMode && !isInstanceRunning}
                                onClick={() => {
                                    if (!this.props.debugMode && isScriptRunning) {
                                        this.setState({ askAboutDebug: true });
                                    } else {
                                        this.props.onDebugModeChange(!this.props.debugMode);
                                    }
                                }}
                                size="medium"
                            >
                                <IconDebugMode style={{ fontSize: 32 }} />
                            </IconButton>
                        )}

                    {(this.state.blockly || this.state.rules) && (
                        <Button
                            key="blockly-code"
                            aria-label="blockly"
                            title={I18n.t('Show javascript code')}
                            className="button-js-code"
                            color={this.state.showCompiledCode ? 'secondary' : 'inherit'}
                            disabled={this.props.debugMode}
                            style={{
                                ...styles.toolbarButtons,
                                ...(this.props.debugMode ? styles.toolbarButtonsDisabled : undefined),
                                padding: '0 5px',
                            }}
                            onClick={() => {
                                if (this.props.debugMode) {
                                    return;
                                }
                                this.setState({ showCompiledCode: !this.state.showCompiledCode });
                                this.state.isTourOpen &&
                                    this.state.tourStep === STEPS.showJavascript &&
                                    this.setState({ tourStep: STEPS.switchBackToRules });
                                this.state.isTourOpen &&
                                    this.state.tourStep === STEPS.switchBackToRules &&
                                    this.setState({ tourStep: STEPS.saveTheScript });
                            }}
                        >
                            <img
                                alt={this.state.blockly ? 'blockly2js' : 'rules2js'}
                                src={this.state.blockly ? ImgBlockly2Js : ImgRules2Js}
                            />
                        </Button>
                    )}
                    <IconButton
                        key="debug"
                        disabled={this.props.debugMode}
                        aria-label="Debug menu"
                        title={I18n.t('Debug options')}
                        style={styles.toolbarButtons}
                        onClick={e => this.setState({ showDebugMenu: true, menuDebugAnchorEl: e.currentTarget })}
                        size="medium"
                    >
                        <Badge
                            style={styles.badgeMargin}
                            badgeContent={this.getDebugBadge()}
                        >
                            <IconDebugMenu />
                        </Badge>
                    </IconButton>
                </Toolbar>
            );
        }
        return null;
    }

    getScriptEditor(): React.JSX.Element | null {
        if (
            !this.props.debugMode &&
            this.state.selected &&
            this.props.objects[this.state.selected] &&
            this.state.blockly !== null &&
            (!this.state.blockly || this.state.showCompiledCode) &&
            (!this.state.rules || this.state.showCompiledCode)
        ) {
            this.scripts[this.state.selected] ||= this.getScriptFromObject(this.state.selected)!;

            return (
                <Box
                    sx={styles.editorDiv}
                    key="scriptEditorDiv"
                >
                    <Suspense fallback={<Connecting />}>
                        <ScriptEditorComponent
                            key="scriptEditor1"
                            name={this.state.selected}
                            adapterName={this.props.adapterName}
                            insert={this.state.insert}
                            onInserted={() => this.setState({ insert: '' })}
                            onForceSave={() => this.onSave()}
                            searchText={this.state.searchText}
                            onRegisterSelect={(func: (() => string | undefined) | null) => this.onRegisterSelect(func)}
                            readOnly={this.state.showCompiledCode}
                            changed={this.state.changed[this.state.selected]}
                            code={this.scripts[this.state.selected].source || ''}
                            isDark={this.state.themeType === 'dark'}
                            socket={this.props.socket}
                            runningInstances={this.state.runningInstances}
                            triggerPrettier={this.state.triggerPrettier}
                            onChange={newValue => this.onChange({ script: newValue })}
                            language={
                                this.scripts[this.state.selected].engineType === 'TypeScript/ts'
                                    ? 'typescript'
                                    : 'javascript'
                            }
                        />
                    </Suspense>
                </Box>
            );
        }
        return null;
    }

    getBlocklyEditor(): React.JSX.Element | null {
        if (
            !this.props.debugMode &&
            this.state.instancesLoaded &&
            this.state.selected &&
            this.props.objects[this.state.selected] &&
            this.state.blockly &&
            !this.state.showCompiledCode &&
            this.state.visible
        ) {
            this.scripts[this.state.selected] ||= this.getScriptFromObject(this.state.selected)!;

            return (
                <Box
                    sx={styles.editorDiv}
                    key="blocklyEditorDiv"
                >
                    <Suspense fallback={<Connecting />}>
                        <BlocklyEditor
                            command={this.state.cmdToBlockly}
                            key="BlocklyEditor"
                            themeType={this.state.themeType}
                            searchText={this.state.searchText}
                            code={this.scripts[this.state.selected].source || ''}
                            scriptId={this.state.selected}
                            onChange={newValue => this.onChange({ script: newValue })}
                        />
                    </Suspense>
                </Box>
            );
        }
        return null;
    }

    getRulesEditor(): React.JSX.Element | null {
        if (
            !this.props.debugMode &&
            this.state.instancesLoaded &&
            this.state.selected &&
            this.props.objects[this.state.selected] &&
            this.state.rules &&
            !this.state.showCompiledCode &&
            this.state.visible
        ) {
            this.scripts[this.state.selected] ||= this.getScriptFromObject(this.state.selected)!;
            const isInstanceRunning: boolean =
                !!this.state.selected &&
                !!this.scripts[this.state.selected]?.engine &&
                this.state.runningInstances[this.scripts[this.state.selected].engine];
            const isScriptRunning: boolean = !!this.state.selected && this.scripts[this.state.selected]?.enabled;

            return (
                <Box
                    sx={styles.editorDiv}
                    key="flowEditorDiv"
                >
                    <Suspense fallback={<Connecting />}>
                        <RulesEditor
                            scriptId={this.state.selected}
                            setTourStep={this.setTourStep}
                            tourStep={this.state.tourStep}
                            isTourOpen={this.state.isTourOpen}
                            changed={this.state.changed[this.state.selected]}
                            running={isInstanceRunning && isScriptRunning}
                            command={this.state.cmdToRules}
                            key="flowEditor"
                            themeType={this.state.themeType}
                            themeName={this.props.themeName}
                            theme={this.props.theme}
                            searchText={this.state.searchText}
                            resizing={this.props.resizing}
                            code={this.scripts[this.state.selected].source || ''}
                            onChange={newValue => this.onChange({ script: newValue })}
                        />
                    </Suspense>
                </Box>
            );
        }
        return null;
    }

    getConfirmDialog(): React.JSX.Element | null {
        if (this.state.confirm) {
            return (
                <DialogConfirm
                    key="dialogConfirm1"
                    text={this.state.confirm}
                    onClose={result => {
                        if (this.confirmCallback) {
                            const cb = this.confirmCallback;
                            this.confirmCallback = null;
                            cb(result);
                        }
                        this.setState({ confirm: '' });
                    }}
                />
            );
        }
        return null;
    }

    getSelectIdDialog(): React.JSX.Element | null {
        if (this.state.showSelectId) {
            const allObjectTypes: ioBroker.ObjectType[] = [
                'state',
                'channel',
                'device',
                'adapter',
                'instance',
                'enum',
                'host',
                //'meta',
                'config',
                'script',
                'user',
                'group',
                //'chart',
                //'folder',
                //'schedule',
                //'design',
            ];

            const expertModeTypes: ioBroker.ObjectType[] = [
                'adapter',
                'instance',
                'enum',
                'host',
                'config',
                'script',
                'user',
                'group',
                //'chart',
                //'folder',
                //'schedule',
                //'design',
            ];

            let selectedId: string = this.selectId.callback
                ? this.selectId.initValue || ''
                : this.getSelect
                  ? this.getSelect() || ''
                  : '';
            // it could be:
            // - 'id.xx'/* aksjdhsdf*/
            // - "id.xx"/* aksjdhsdf*/
            // - "id.xx"//
            let pos = selectedId.indexOf('/*');
            if (pos !== -1) {
                selectedId = selectedId.substring(0, pos);
            }
            pos = selectedId.indexOf('//');
            if (pos !== -1) {
                selectedId = selectedId.substring(0, pos);
            }
            let m = selectedId.match(/"([^"]+)"/);
            if (m) {
                selectedId = m[1];
            }
            m = selectedId.match(/'([^']+)'/);
            if (m) {
                selectedId = m[1];
            }

            return (
                <DialogSelectID
                    theme={this.props.theme}
                    key="dialogSelectID1"
                    imagePrefix="../.."
                    themeName={this.props.themeName}
                    themeType={this.state.themeType}
                    socket={this.props.socket}
                    selected={selectedId}
                    expertMode={
                        this.selectId.type &&
                        this.selectId.type !== 'all' &&
                        expertModeTypes.includes(this.selectId.type)
                            ? true
                            : undefined
                    }
                    // statesOnly={!this.selectId.type || this.selectId.type === 'state'}
                    types={this.selectId?.type === 'all' ? allObjectTypes : [this.selectId.type || 'state']}
                    onClose={() => {
                        this.setState({ showSelectId: false });
                        if (this.selectId.callback) {
                            this.selectId.callback = null;
                        }
                    }}
                    onOk={(selected, name) => {
                        this.selectId.initValue = null;
                        if (this.selectId.callback) {
                            this.selectId.callback(selected);
                            this.selectId.callback = null;
                        } else {
                            this.setState({ insert: `'${selected}'/*${name}*/` });
                        }
                    }}
                />
            );
        }
        return null;
    }

    getCronDialog(): React.JSX.Element | null {
        if (this.state.showCron) {
            return (
                <DialogCron
                    theme={this.props.theme}
                    key="dialogCron1"
                    cron={
                        this.cron.callback ? this.cron.initValue || '' : this.getSelect ? this.getSelect() : '* * * * *'
                    }
                    onClose={() => this.setState({ showCron: false })}
                    onOk={cron => {
                        this.cron.initValue = null;
                        if (this.cron.callback) {
                            this.cron.callback(cron);
                            this.cron.callback = null;
                        } else {
                            this.setState({ insert: `'${cron}'` });
                        }
                    }}
                />
            );
        }

        return null;
    }

    getAstroDialog(): React.JSX.Element | null {
        if (this.state.showAstro) {
            return (
                <Dialog
                    open={!0}
                    onClose={() => this.setState({ showAstro: false })}
                    key="dialogAstro"
                >
                    <DialogTitle>{I18n.t('Astronomical events today')}</DialogTitle>
                    <DialogContent>
                        {!this.state.astroEvents ? (
                            <LinearProgress />
                        ) : (
                            <TableContainer component={Paper}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>{I18n.t('Name')}</TableCell>
                                            <TableCell>{I18n.t('Server time')}</TableCell>
                                            <TableCell>{I18n.t('Description')}</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Object.keys(this.state.astroEvents).map(id => (
                                            <TableRow key={id}>
                                                <TableCell
                                                    component="th"
                                                    scope="row"
                                                >
                                                    {id.startsWith('next') ? '' : id}
                                                </TableCell>
                                                <Tooltip
                                                    title={`${I18n.t('Local time')}: ${
                                                        this.state.astroEvents?.[id].isValidDate
                                                            ? new Date(
                                                                  this.state.astroEvents?.[id].date,
                                                              ).toLocaleTimeString()
                                                            : 'n/a'
                                                    }`}
                                                >
                                                    <TableCell align="right">
                                                        {this.state.astroEvents?.[id].isValidDate
                                                            ? this.state.astroEvents?.[id].serverTime
                                                            : 'n/a'}
                                                    </TableCell>
                                                </Tooltip>
                                                <TableCell>{I18n.t(id)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button
                            variant="contained"
                            onClick={() => this.setState({ showAstro: false })}
                            color="primary"
                            startIcon={<IconClose />}
                        >
                            {I18n.t('Close')}
                        </Button>
                    </DialogActions>
                </Dialog>
            );
        }
        return null;
    }

    getEditorDialog(): React.JSX.Element | null {
        if (this.state.showScript) {
            return (
                <Suspense fallback={<Connecting />}>
                    <DialogScriptEditor
                        key="scriptEditorDialog"
                        adapterName={this.props.adapterName}
                        source={this.scriptDialog.initValue || ''}
                        args={this.scriptDialog.args ? this.scriptDialog.args.join(', ') : ''}
                        isReturn={this.scriptDialog.isReturn}
                        socket={this.props.socket}
                        runningInstances={this.state.runningInstances}
                        themeType={this.state.themeType}
                        onClose={result => {
                            this.scriptDialog.initValue = null;
                            if (this.scriptDialog.callback) {
                                result !== false && this.scriptDialog.callback(result || '');
                                this.scriptDialog.callback = null;
                            }
                            this.setState({ showScript: false });
                        }}
                    />
                </Suspense>
            );
        }
        return null;
    }

    getToast(): React.JSX.Element {
        return (
            <Snackbar
                key="toast"
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                open={!!this.state.toast}
                autoHideDuration={6000}
                onClose={() => this.setState({ toast: '' })}
                slotProps={{
                    content: {
                        'aria-describedby': 'message-id',
                    },
                }}
                message={<span id="message-id">{this.state.toast}</span>}
                action={[
                    <IconButton
                        key="close"
                        aria-label="close"
                        color="inherit"
                        style={styles.closeToast}
                        onClick={() => this.setState({ toast: '' })}
                        size="medium"
                    >
                        <IconClose />
                    </IconButton>,
                ]}
            />
        );
    }

    setTourStep = (tourStep: number): void => this.setState({ tourStep });

    getTour(): React.JSX.Element | null {
        if (
            this.state.instancesLoaded &&
            this.state.selected &&
            this.props.isAnyRulesExists === 1 &&
            this.props.objects[this.state.selected] &&
            this.state.rules &&
            this.state.visible
        ) {
            return (
                <Tour
                    key="tour"
                    steps={steps}
                    isOpen={this.state.isTourOpen}
                    onRequestClose={() => {
                        this.setState({ isTourOpen: false });
                        window.localStorage.setItem('tour', 'true');
                        void this.props.socket.setState('javascript.0.variables.rulesTour', { val: true, ack: true });
                    }}
                    // getCurrentStep={tourStep => this.setTourStep(tourStep)}
                    goToStep={this.state.tourStep}
                />
            );
        }
        return null;
    }

    getDebug(): React.JSX.Element | null {
        if (this.props.debugMode) {
            const isInstanceRunning =
                this.state.selected &&
                this.scripts[this.state.selected] &&
                this.scripts[this.state.selected].engine &&
                this.state.runningInstances[this.scripts[this.state.selected].engine];
            if (isInstanceRunning) {
                return (
                    <Suspense fallback={<Connecting />}>
                        <Debugger
                            key="debugger"
                            runningInstances={this.state.runningInstances}
                            adapterName={this.props.adapterName}
                            socket={this.props.socket}
                            themeName={this.props.themeName}
                            themeType={this.props.themeType}
                            src={this.props.debugInstance ? this.props.debugInstance.adapter! : this.state.selected}
                            debugInstance={this.props.debugInstance}
                        />
                    </Suspense>
                );
            }
            setTimeout(() => this.props.onDebugModeChange(false));
            return null;
        }
        return null;
    }

    getScriptFromObject(id: string): ioBroker.ScriptCommon | undefined {
        if (!this.props.objects[id]?.common) {
            return undefined;
        }
        const result = JSON.parse(JSON.stringify(this.props.objects[id].common)) as ioBroker.ScriptCommon;
        if (this.props.objects[id].native?.protected && this.props.password) {
            result.source = decryptText(this.props.password, result.source);
        }
        return result;
    }

    render(): (React.JSX.Element | null | (React.JSX.Element | null)[])[] | React.JSX.Element {
        if (
            this.state.selected &&
            this.props.objects[this.state.selected] &&
            this.state.blockly === null &&
            this.state.rules === null
        ) {
            this.scripts[this.state.selected] ||= this.getScriptFromObject(this.state.selected)!;

            setTimeout(() => {
                const newState = {
                    blockly: this.scripts[this.state.selected].engineType === 'Blockly',
                    rules: this.scripts[this.state.selected].engineType === 'Rules',
                    showCompiledCode: false,
                    debugEnabled: this.scripts[this.state.selected].debug,
                    verboseEnabled: this.scripts[this.state.selected].verbose,
                };

                // check if all opened files still exists
                this.removeNonExistingScripts(null, newState);
                this.setState(newState);
            }, 100);
        }

        // if expert mode disabled, but the active script is protected
        if (this.state.selected && !this.props.password && this.props.objects[this.state.selected]?.native?.protected) {
            setTimeout(() => {
                // get another tab
                const selected = this.state.editing.find(id => !this.props.objects[id]?.native?.protected) || '';
                // remove all protected scripts
                Object.keys(this.scripts).forEach(id => {
                    if (this.props.objects[id]?.native?.protected) {
                        delete this.scripts[id];
                    }
                });
                this.setState({ selected }, () => {
                    this.props.onSelectedChange?.(selected, this.state.editing);
                    if (this.state.selected) {
                        window.localStorage.setItem('Editor.selected', this.state.selected);
                    } else {
                        window.localStorage.removeItem('Editor.selected');
                    }
                });
            }, 50);
        }
        if (!this.state.selected && this.props.password && this.state.editing.length) {
            setTimeout(() => {
                const selected = this.state.editing[0];
                this.setState({ selected }, () => {
                    this.props.onSelectedChange?.(selected, this.state.editing);
                    window.localStorage.setItem('Editor.selected', this.state.selected);
                });
            }, 50);
        }

        return [
            this.getTabs(),
            this.getToolbar(),
            this.getScriptEditor(),
            this.getAskAboutDebug(),
            this.getBlocklyEditor(),
            this.getRulesEditor(),
            this.getDebug(),
            this.getConfirmDialog(),
            this.getSelectIdDialog(),
            this.getCronDialog(),
            this.getEditorDialog(),
            this.getAstroDialog(),
            this.getDebugMenu(),
            this.renderOpenAiDialog(),
            this.getToast(),
            this.getTour(),
        ];
    }
}

export default Editor;
