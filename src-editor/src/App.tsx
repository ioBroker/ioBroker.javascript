import React from 'react';
import ReactSplit, { SplitDirection } from '@devbookhq/splitter';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';

import type { IobTheme } from '@iobroker/adapter-react-v5';
import {
    I18n,
    Utils,
    AdminConnection,
    Loader,
    GenericApp,
    Message as DialogMessage,
    Confirm as DialogConfirm,
} from '@iobroker/adapter-react-v5';

import { MdMenu as IconMenuClosed, MdArrowBack as IconMenuOpened, MdVisibility as IconShowLog } from 'react-icons/md';

import SideMenu from './SideMenu';
import Log from './Log';
import Editor from './Editor';
import DialogError from './Dialogs/Error';
import DialogImportFile from './Dialogs/ImportFile';
import BlocklyEditor from './Components/BlocklyEditor';
import { ContextWrapper } from './Components/RulesEditor/components/ContextWrapper';
import { Box } from '@mui/material';
import type { GenericAppProps, GenericAppState } from '@iobroker/adapter-react-v5/build/types';

import enLang from './i18n/en.json';
import deLang from './i18n/de.json';
import esLang from './i18n/es.json';
import frLang from './i18n/fr.json';
import itLang from './i18n/it.json';
import nlLang from './i18n/nl.json';
import plLang from './i18n/pl.json';
import ptLang from './i18n/pt.json';
import ruLang from './i18n/ru.json';
import ukLang from './i18n/uk.json';
import zhCnLang from './i18n/zh-cn.json';
import type { ScriptType } from '@/types';

const styles: Record<string, any> = {
    root: {
        flexGrow: 1,
        display: 'flex',
        width: '100%',
        height: '100%',
    },
    menuDiv: {
        overflow: 'hidden',
    },
    splitterDivs: (theme: IobTheme): any => ({
        '&>div': {
            overflow: 'hidden',
            width: '100%',
            height: '100%',
        },
        '& .layout-splitter': {
            background: theme.palette.mode === 'dark' ? '#595858' : '#ccc;',
        },
    }),
    mainDiv: {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
    },
    /*
    appBarWithMenu: {
        width: `calc(100% - ${Theme.menu.width}px)`,
        marginLeft: Theme.menu.width,
    },
    appBarWithoutMenu: {
        width: `100%`,
        marginLeft: 0,
    },
    */
    content: (theme: IobTheme): React.CSSProperties => ({
        width: '100%',
        height: '100%',
        backgroundColor: theme.palette.background && theme.palette.background.default,
        position: 'relative',
    }),
    splitterDivWithMenu: {
        width: `calc(100% - 300px)`,
        height: '100%',
    },
    menuDivWithoutMenu: {
        '&>div:first-child': {
            display: 'none',
        },
        '&>.layout-splitter': {
            display: 'none',
        },
    },
    progress: {
        margin: 100,
    },
    menuOpenCloseButton: (theme: IobTheme): any => ({
        position: 'absolute',
        left: 0,
        borderRadius: '0 5px 5px 0',
        top: 6,
        pt: 1,
        cursor: 'pointer',
        zIndex: 1,
        height: 25,
        width: 20,
        background: theme.palette.secondary.main,
        color: theme.palette.primary.main,
        pl: '3px',
        '&:hover': {
            color: 'white',
        },
    }),
    showLogButton: (theme: IobTheme): any => ({
        position: 'absolute',
        right: 3,
        borderRadius: '5px 5px 0 0',
        bottom: 0,
        pt: '3px',
        cursor: 'pointer',
        zIndex: 10,
        height: 20,
        width: 25,
        background: theme.palette.secondary.main,
        color: theme.palette.primary.main,
        pl: 1,
        '&:hover': {
            color: 'white',
        },
    }),
};

interface AppProps extends GenericAppProps {
    version: string;
}

interface AppState extends GenericAppState {
    ready: boolean;
    scriptsHash: number;
    instances: number[];
    updating: boolean;
    resizing: boolean;
    selected: string | null;
    logMessage: Record<string, any>;
    editing: string[];
    menuOpened: boolean;
    menuSelectId: string;
    expertMode: boolean;
    logHorzLayout: boolean;
    runningInstances: Record<string, boolean>;
    confirm: string;
    importFile: boolean;
    message: string;
    searchText: string;
    hideLog: boolean;
    debugMode: boolean;
    debugInstance: { adapter?: string; instance?: string } | null;
    splitSizes: [number, number];
    logSizes: [number, number];
}

class App extends GenericApp<AppProps, AppState> {
    private hosts: string[] = [];

    private importFile: string | null = null;

    private scripts: Record<string, ioBroker.ScriptObject | ioBroker.ChannelObject> = {};

    private confirmCallback: null | ((result: boolean) => void) = null;

    constructor(props: AppProps) {
        super(props, {
            // @ts-expect-error fix later
            Connection: AdminConnection,
            translations: {
                en: enLang,
                de: deLang,
                es: esLang,
                fr: frLang,
                it: itLang,
                nl: nlLang,
                pl: plLang,
                pt: ptLang,
                ru: ruLang,
                uk: ukLang,
                'zh-cn': zhCnLang,
            },
            bottomButtons: false,
            socket: {
                autoSubscribeLog: true,
            },
            sentryDSN: window.sentryDSN,
        });

        // this.logIndex = 0;
        const logSizesStr = window.localStorage.getItem('JS.logSizes');
        let logSizes: [number, number] = [80, 20];
        if (logSizesStr) {
            try {
                logSizes = JSON.parse(logSizesStr);
            } catch {
                // ignore
            }
        }

        const splitSizesStr = window.localStorage.getItem('JS.splitSizes');
        let splitSizes: [number, number] = [20, 80];
        if (splitSizesStr) {
            try {
                splitSizes = JSON.parse(splitSizesStr);
            } catch {
                // ignore
            }
        }
        Object.assign(this.state, { splitSizes, logSizes });

        window.alert = (message: string): void => {
            console.error(message);
            this.showJsError(message.toString());
        };
    }

    onScriptsChanged = (id: string, obj: ioBroker.Object | null | undefined): void => {
        if (!id) {
            return;
        }
        let changed = false;
        const newState: Partial<AppState> = {};
        if (id.startsWith('script.js.')) {
            if (obj) {
                if (JSON.stringify(this.scripts[id]) !== JSON.stringify(obj)) {
                    this.scripts[id] = obj as ioBroker.ScriptObject;
                    changed = true;
                    newState.scriptsHash = this.state.scriptsHash + 1;
                }
            } else if (this.scripts[id]) {
                delete this.scripts[id];
                changed = true;
                newState.scriptsHash = this.state.scriptsHash + 1;
            }
        }

        changed && this.setState(newState as AppState);
    };

    onInstanceChanged = (id: string, obj: ioBroker.Object | null | undefined): void => {
        if (!id) {
            return;
        }
        let changed = false;
        const newState: Partial<AppState> = {};

        if (id.match(/^system\.adapter\.[-_\w\d]+\$/)) {
            // update instances
            if (id.startsWith(`system.adapter.${this.adapterName}.`)) {
                const idNum = parseInt(id.split('.').pop() || '0', 10) || 0;
                if (obj?.type === 'instance') {
                    if (!this.state.instances.includes(idNum)) {
                        newState.instances = [...this.state.instances];
                        newState.instances.push(idNum);
                        newState.instances.sort();
                        changed = true;
                        // request alive
                        void this.socket.subscribeState(`${obj._id}.alive`, this.onInstanceAliveChange);
                    }
                } else if (!obj && this.state.instances.includes(idNum)) {
                    this.socket.unsubscribeState(`${id}.alive`, this.onInstanceAliveChange);
                    newState.instances = [...this.state.instances];
                    const pos = newState.instances.indexOf(idNum);
                    newState.instances.splice(pos, 1);
                    changed = true;
                }
            }

            if (obj?.common?.blockly) {
                this.confirmCallback = result => result && window.location.reload();
                newState.confirm = I18n.t('Some blocks were updated. Reload admin?');
                changed = true;
            }
        }

        changed && this.setState(newState as AppState);
    };

    onHostChanged = (id: string, obj: ioBroker.Object | null | undefined): void => {
        if (!id) {
            return;
        }
        if (id.startsWith('system.host.')) {
            if (obj?.type === 'host') {
                if (!this.hosts.includes(id)) {
                    this.hosts.push(id);
                    this.hosts.sort();
                }
            } else if (!obj && this.hosts.includes(id)) {
                const pos = this.hosts.indexOf(id);
                this.hosts.splice(pos, 1);
            }
        }
    };

    onConnectionReady(): void {
        window.systemLang = this.socket.systemLang;
        this.setState(
            {
                ready: false,
                scriptsHash: 0,
                instances: [],
                updating: false,
                resizing: false,
                selected: null,
                logMessage: {},
                editing: [],
                menuOpened: window.localStorage.getItem('App.menuOpened') !== 'false',
                menuSelectId: '',
                expertMode: window.localStorage.getItem('App.expertMode') === 'true',
                logHorzLayout: window.localStorage.getItem('App.logHorzLayout') === 'true',
                runningInstances: {},
                confirm: '',
                importFile: false,
                message: '',
                searchText: '',
                hideLog: window.localStorage.getItem('App.hideLog') === 'true',
                debugMode: false,
                debugInstance: null,
                splitSizes: [20, 80],
            },
            async (): Promise<void> => {
                const newState: Partial<AppState> = {};

                // load instances & scripts
                // Read all instances
                const instancesResult = await this.subscribeOnInstances();
                newState.instances = instancesResult.instances;
                newState.runningInstances = instancesResult.runningInstances;

                await this.readAdaptersWithBlockly();
                const hosts = await this.socket.getHosts();
                this.hosts = hosts.map(obj => obj._id);
                // load all scripts
                const scripts = await this.readAllScripts();
                if (
                    window.localStorage.getItem('App.expertMode') !== 'true' &&
                    window.localStorage.getItem('App.expertMode') !== 'false'
                ) {
                    // detect if some global scripts exists
                    if (
                        Object.keys(scripts).find(
                            id => id.startsWith('script.js.global.') && scripts[id].type === 'script',
                        )
                    ) {
                        newState.expertMode = true;
                    }
                }
                this.scripts = scripts;

                let scriptsHash = this.state.scriptsHash;
                if (this.compareScripts(scripts)) {
                    scriptsHash++;
                }
                newState.scriptsHash = scriptsHash;
                newState.ready = true;

                this.setState(newState as AppState);

                await this.socket.subscribeObject('script.*', this.onScriptsChanged);
                await this.socket.subscribeObject('system.adapter.*', this.onInstanceChanged);
                await this.socket.subscribeObject('system.host.*', this.onHostChanged);
            },
        );
    }

    async subscribeOnInstances(): Promise<{ instances: number[]; runningInstances: Record<string, boolean> }> {
        const instancesArray = await this.socket.getAdapterInstances(this.adapterName);
        const instances: number[] = instancesArray.map(obj => parseInt(obj._id.split('.').pop() || '0')).sort();
        const runningInstances: Record<string, boolean> = {};
        instances.forEach(id => (runningInstances[`system.adapter.${this.adapterName}.${id}`] = false));

        // subscribe on instances
        for (let i = 0; i < instances.length; i++) {
            const instanceId = `system.adapter.${this.adapterName}.${instances[i]}`;
            const id = `${instanceId}.alive`;
            const state = await this.socket.getState(id);
            runningInstances[instanceId] = state ? !!state.val : false;
            await this.socket.subscribeState(id, this.onInstanceAliveChange);
        }

        return { instances, runningInstances };
    }

    async readAllScripts(): Promise<Record<string, ioBroker.ChannelObject | ioBroker.ScriptObject>> {
        const folders: Record<string, ioBroker.ChannelObject | ioBroker.ScriptObject> =
            await this.socket.getObjectViewSystem('channel', 'script.js.', 'script.js.\u9999');
        const scripts = await this.socket.getObjectViewSystem('script', 'script.js.', 'script.js.\u9999');
        Object.keys(scripts).forEach(id => (folders[id] = scripts[id]));
        return folders;
    }

    async readAdaptersWithBlockly(): Promise<void> {
        const adapters: Record<string, ioBroker.AdapterObject> = await this.socket.getObjectViewSystem(
            'adapter',
            'system.adapter.',
            'system.adapter.\u9999',
        );
        return new Promise(resolve => BlocklyEditor.loadCustomBlockly(adapters, () => resolve()));
    }

    onInstanceAliveChange = (id: string, state: ioBroker.State | null | undefined): void => {
        if (id) {
            id = id ? id.substring(0, id.length - 6) : ''; // - .alive

            if (this.state.runningInstances[id] !== (state ? state.val : false)) {
                const runningInstances: Record<string, boolean> = JSON.parse(
                    JSON.stringify(this.state.runningInstances),
                );
                runningInstances[id] = state ? !!state.val : false;
                this.setState({ runningInstances });
            }
        }
    };

    onToggleExpertMode(expertMode: boolean): void {
        this.onExpertModeChange(expertMode);
    }

    compareScripts(newScripts: Record<string, ioBroker.ScriptObject | ioBroker.ChannelObject>): boolean {
        const oldIds = Object.keys(this.scripts);
        const newIds = Object.keys(newScripts);
        if (oldIds.length !== newIds.length) {
            this.scripts = newScripts;
            return true;
        }
        if (JSON.stringify(oldIds) !== JSON.stringify(newIds)) {
            this.scripts = newScripts;
            return true;
        }
        for (let i = 0; i < oldIds.length; i++) {
            const oldScript = this.scripts[oldIds[i]].common;
            const newScript = newScripts[oldIds[i]].common;

            if (oldScript.name !== newScript.name) {
                this.scripts = newScripts;
                return true;
            }
            if ((oldScript as ioBroker.ScriptCommon).engine !== (newScript as ioBroker.ScriptCommon).engine) {
                this.scripts = newScripts;
                return true;
            }
            if ((oldScript as ioBroker.ScriptCommon).engineType !== (newScript as ioBroker.ScriptCommon).engineType) {
                this.scripts = newScripts;
                return true;
            }
            if ((oldScript as ioBroker.ScriptCommon).enabled !== (newScript as ioBroker.ScriptCommon).enabled) {
                this.scripts = newScripts;
                return true;
            }
        }
        return false;
    }

    async onRename(oldId: string, newId: string, newName?: string, newInstance?: number): Promise<void> {
        if (newId.trim().endsWith('.')) {
            newId = newId.replace(/\.\s*$/, '_');
        }
        console.log(`Rename ${oldId} => ${newId}`);
        this.setState({ updating: true });

        // Rename script.js.common.Skript_1 => script.js.common.New folder.Skript_1

        try {
            if (this.scripts[oldId]?.type === 'script') {
                const common = JSON.parse(JSON.stringify(this.scripts[oldId].common));
                common.name = newName || common.name;
                if (newInstance !== undefined) {
                    common.engine = `system.adapter.javascript.${newInstance}`;
                }
                // Check if the script is not a children of other script
                const parts = newId.split('.');
                parts.pop();
                const parentID = parts.join('.');

                if (this.scripts[parentID] && this.scripts[parentID].type === 'script') {
                    parts.pop();
                    newId = `${parts.join('.')}.${newId.split('.').pop()}`;
                }

                await this.updateScript(oldId, newId, common);
            } else {
                await this.renameGroup(oldId, newId, newName);
            }
        } catch (err) {
            if (!(err as Error).toString().includes('canceled')) {
                this.showJsError(err as Error);
            }
        }

        this.setState({ updating: false });
    }

    async renameGroup(id: string, newId: string, newName?: string, _list?: string[]): Promise<void> {
        if (!_list) {
            _list = [];

            // collect all elements to rename
            // find all elements
            _list = Object.keys(this.scripts).filter(_id => _id.startsWith(`${id}.`));

            let obj = await this.socket.getObject(id);
            obj = obj || ({ common: {}, type: 'channel' } as ioBroker.ChannelObject);
            obj.common.name = newName || obj.common.name || id.split('.').pop() || '';
            obj._id = newId;

            // Delete root object/folder
            try {
                await this.socket.delObject(id);
            } catch {
                // ignore
            }

            // recreate same object with new name
            try {
                await this.socket.setObject(newId, obj);
                await this.renameGroup(id, newId, newName, _list);
            } catch (err) {
                console.log(err);
                const obj: ioBroker.ChannelObject = {
                    _id: newId,
                    type: 'channel',
                    common: {
                        name: newName || id.split('.').pop() || '',
                        expert: true,
                    },
                    native: {},
                };
                // may be it is virtual folder
                await this.socket.setObject(newId, obj);
                await this.renameGroup(id, newId, newName, _list);
            }
        } else if (_list.length) {
            let nId = _list.pop();

            if (nId) {
                const obj = await this.socket.getObject(nId);
                if (obj) {
                    try {
                        await this.socket.delObject(nId);
                    } catch {
                        // ignore
                    }
                    nId = newId + nId.substring(id.length);
                    obj._id = nId;
                    obj.common = obj.common || {};
                    obj.common.expert = true;
                    await this.socket.setObject(nId, obj);
                    await this.renameGroup(id, newId, newName, _list);
                }
            }
        }
    }

    onUpdateScript(id: string, common: ioBroker.ScriptCommon): void {
        if (this.scripts[id] && this.scripts[id].type === 'script') {
            this.updateScript(id, id, common)
                .then(() => {})
                .catch(err => !(err as Error).toString().includes('canceled') && this.showJsError(err));
        }
    }

    onSelect(selected: string): void {
        if (this.scripts[selected] && this.scripts[selected].common && this.scripts[selected].type === 'script') {
            this.setState({ selected, menuSelectId: selected }, () =>
                setTimeout(() => this.setState({ menuSelectId: '' }), 300),
            );
        }
    }

    onExpertModeChange(expertMode: boolean): void {
        if (this.state.expertMode !== expertMode) {
            window.localStorage.setItem('App.expertMode', expertMode ? 'true' : 'false');
            this.setState({ expertMode });
        }
    }

    showJsError(err: Error | string): void {
        this.setState({ errorText: err ? err.toString() : '' });
    }

    showMessage(message: string): void {
        this.setState({ message: message ? message.toString() : '' });
    }

    onDelete(id: string): void {
        this.socket.delObject(id).catch(err => this.showJsError(err));
    }

    onEdit(id: string): void {
        if (this.state.selected !== id) {
            this.setState({ selected: id });
        }
    }

    onAddNew(
        id: string,
        name: string,
        isFolder: boolean,
        instance?: number,
        type?: ScriptType | 'folder',
        source?: string,
    ): void {
        const reg = new RegExp(`^${id}\\.`);

        if (Object.keys(this.scripts).find(_id => id === _id || reg.test(id))) {
            return this.showJsError(I18n.t('Yet exists!'));
        }

        if (isFolder) {
            this.socket
                .setObject(id, {
                    _id: id,
                    type: 'channel',
                    common: {
                        name,
                        expert: true,
                    },
                    native: {},
                })
                .then(() =>
                    setTimeout(
                        () =>
                            this.setState({ menuSelectId: id }, () =>
                                setTimeout(() => this.setState({ menuSelectId: '' }), 300),
                            ),
                        1000,
                    ),
                )
                .catch(err => this.showJsError(err));
        } else {
            if (type === 'Blockly' && !source) {
                // Default Blockly XML for new scripts
                source = `\n//${btoa(encodeURIComponent('<xml xmlns="https://developers.google.com/blockly/xml"></xml>'))}`;
            }

            this.socket
                .setObject(id, {
                    _id: id,
                    type: 'script',
                    common: {
                        name,
                        expert: true,
                        engineType: type || 'Javascript/js',
                        enabled: false,
                        engine: `system.adapter.javascript.${instance || 0}`,
                        source: source || '',
                        debug: false,
                        verbose: false,
                    },
                    native: {},
                })
                .then(() => setTimeout(() => this.onSelect(id), 1000))
                .catch(err => this.showJsError(err));
        }
    }

    async updateScript(oldId: string, newId: string, newCommon: ioBroker.ScriptCommon): Promise<void> {
        let _obj = await this.socket.getObject(oldId);
        const obj: ioBroker.ScriptObject = { common: {} } as ioBroker.ScriptObject;

        if (newCommon.engine !== undefined) {
            obj.common.engine = newCommon.engine;
        }
        if (newCommon.enabled !== undefined) {
            obj.common.enabled = newCommon.enabled;
        }
        if (newCommon.source !== undefined) {
            obj.common.source = newCommon.source;
        }
        if (newCommon.debug !== undefined) {
            obj.common.debug = newCommon.debug;
        }
        if (newCommon.verbose !== undefined) {
            obj.common.verbose = newCommon.verbose;
        }

        obj.from = 'system.adapter.admin.0'; // we must distinguish between GUI(admin.0) and disk(javascript.0)

        if (oldId === newId && _obj?.common && newCommon.name === _obj.common.name) {
            if (!newCommon.engineType || newCommon.engineType !== _obj.common.engineType) {
                if (newCommon.engineType !== undefined) {
                    obj.common.engineType = newCommon.engineType || 'Javascript/js';
                }
            }
            obj.type = 'script';
            return this.socket.extendObject(oldId, obj);
        }
        // let prefix;

        // let parts = _obj.common.engineType.split('/');

        // prefix = 'script.' + (parts[1] || parts[0]) + '.';

        if (_obj?.common) {
            _obj.common.engineType = newCommon.engineType || _obj.common.engineType || 'Javascript/js';
            await this.socket.delObject(oldId);
            if (obj.common.engine !== undefined) {
                _obj.common.engine = obj.common.engine;
            }
            if (obj.common.enabled !== undefined) {
                _obj.common.enabled = obj.common.enabled;
            }
            if (obj.common.source !== undefined) {
                _obj.common.source = obj.common.source;
            }
            if (obj.common.name !== undefined) {
                _obj.common.name = obj.common.name;
            }
            if (obj.common.debug !== undefined) {
                _obj.common.debug = obj.common.debug;
            }
            if (obj.common.verbose !== undefined) {
                _obj.common.verbose = obj.common.verbose;
            }

            // @ts-expect-error deprecated
            if (_obj._rev !== undefined) {
                // @ts-expect-error deprecated
                delete _obj._rev;
            }

            // Name must always exist
            _obj.common.name = newCommon.name;
            _obj.common.expert = true;
            _obj.type = 'script';

            _obj._id = newId; // prefix + newCommon.name.replace(/[\s"']/g, '_');

            await this.socket.setObject(newId, _obj);
            return;
        }
        _obj = obj;

        // Name must always exist
        _obj.common.name = newCommon.name;
        _obj.common.expert = true;
        _obj.type = 'script';
        _obj._id = newId; // prefix + newCommon.name.replace(/[\s"']/g, '_');

        return this.socket.setObject(newId, _obj);
    }

    onEnableDisable(id: string, enabled: boolean): void {
        if (this.scripts[id] && this.scripts[id].type === 'script') {
            const common = this.scripts[id].common;
            common.enabled = enabled;
            common.expert = true;
            this.updateScript(id, id, common).catch(err => err !== 'canceled' && this.showJsError(err));
        }
    }

    async getLiveHost(): Promise<string | undefined> {
        for (let h = 0; h < this.hosts.length; h++) {
            const id = this.hosts[h];
            const state = await this.socket.getState(`${id}.alive`);
            if (state && state?.val) {
                return id;
            }
        }
        return undefined;
    }

    async onExport(): Promise<void> {
        const host = await this.getLiveHost();
        if (!host) {
            this.showJsError(I18n.t('No active host found'));
            return;
        }

        const d = new Date();
        let date = d.getFullYear().toString();
        let m: number | string = d.getMonth() + 1;
        if (m < 10) {
            m = `0${m}`;
        }
        date += `-${m}`;
        m = d.getDate();
        if (m < 10) {
            m = `0${m}`;
        }
        date += `-${m}-`;

        this.socket.getRawSocket().emit(
            'sendToHost',
            host,
            'readObjectsAsZip',
            {
                adapter: 'javascript',
                id: 'script.js',
                link: `${date}scripts.zip`, // request link to file and not the data itself
                fileStorageNamespace: `admin.${this.instance}`, // new controller 5.x understands this and saves ZIP in the file store
            },
            (data: string | { data?: string; error?: string }) => {
                if (typeof data === 'string') {
                    // it is a link to the created file
                    const a = document.createElement('a');
                    // actual position is http://IP:8081/adapter/javascript/index.html
                    // we need http://IP:8081/files/admin.0/zip/2023-06-20-scripts.zip
                    a.href = `../../files/${data}`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                } else {
                    data.error && this.showJsError(data.error);
                    if (data.data) {
                        const a = document.createElement('a');
                        a.href = `data: application/zip;base64,${data.data}`;
                        a.download = `${date}scripts.zip`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    }
                }
            },
        );
    }

    onImport(data: string | undefined): void {
        this.importFile = data || null;
        if (data) {
            this.confirmCallback = this.onImportConfirmed.bind(this);
            this.setState({ importFile: false, confirm: I18n.t('Existing scripts will be overwritten.') });
        } else {
            this.setState({ importFile: false });
        }
    }

    async onImportConfirmed(ok: boolean): Promise<void> {
        let data = this.importFile;
        this.importFile = null;
        if (ok && data) {
            data = data.split(',')[1];
            const host = await this.getLiveHost();
            if (!host) {
                this.showJsError(I18n.t('No active host found'));
                return;
            }
            this.socket.getRawSocket().emit(
                'sendToHost',
                host,
                'writeObjectsAsZip',
                {
                    data: data,
                    adapter: 'javascript',
                    id: 'script.js',
                },
                (data: string | { error?: string }) => {
                    if (data === 'permissionError') {
                        this.showJsError(I18n.t(data));
                    } else if (!data || (data as { error?: string }).error) {
                        this.showJsError(
                            data ? I18n.t((data as { error?: string }).error || '') : I18n.t('Unknown error'),
                        );
                    } else {
                        this.showMessage(I18n.t('Done'));
                    }
                },
            );
        }
    }

    toggleLogLayout(): void {
        window.localStorage.setItem('App.logHorzLayout', this.state.logHorzLayout ? 'false' : 'true');
        this.setState({ logHorzLayout: !this.state.logHorzLayout });
    }

    renderEditor(): React.JSX.Element {
        const isAnyRulesExists = Object.keys(this.scripts).reduce(
            (sum, id) => sum + ((this.scripts[id].common as ioBroker.ScriptCommon).engineType === 'Rules' ? 1 : 0),
            0,
        );

        return (
            <Editor
                key="editor"
                debugMode={this.state.debugMode}
                onDebugModeChange={value => {
                    if (!value) {
                        this.setState({ debugMode: false, debugInstance: null });
                    } else {
                        this.setState({ debugMode: true });
                    }
                }}
                visible={!this.state.resizing}
                socket={this.socket}
                adapterName={this.adapterName}
                onLocate={menuSelectId => this.setState({ menuSelectId })}
                runningInstances={this.state.runningInstances}
                menuOpened={this.state.menuOpened}
                searchText={this.state.searchText}
                themeType={this.state.themeType}
                themeName={this.state.themeName}
                theme={this.state.theme}
                expertMode={this.state.expertMode}
                onChange={(id, common) => this.onUpdateScript(id, common)}
                isAnyRulesExists={isAnyRulesExists}
                debugInstance={this.state.debugInstance}
                onSelectedChange={(id, editing) => {
                    const newState: Partial<AppState> = {};
                    let changed = false;
                    if (id !== this.state.selected) {
                        changed = true;
                        newState.selected = id;
                    }
                    if (JSON.stringify(editing) !== JSON.stringify(this.state.editing)) {
                        changed = true;
                        newState.editing = JSON.parse(JSON.stringify(editing));
                    }
                    changed && this.setState(newState as AppState);
                }}
                onRestart={id => this.socket.extendObject(id, { common: { enabled: true } })}
                selected={
                    this.state.selected &&
                    this.scripts[this.state.selected] &&
                    this.scripts[this.state.selected].type === 'script'
                        ? this.state.selected
                        : ''
                }
                objects={this.scripts}
                resizing={this.state.resizing}
            />
        );
    }

    showLogButton(): React.JSX.Element {
        return (
            <Box
                key="showLog"
                title={I18n.t('Show logs')}
                sx={styles.showLogButton}
                onClick={() => {
                    window.localStorage.setItem('App.hideLog', 'false');
                    this.setState({ hideLog: false, resizing: true });
                    setTimeout(() => this.setState({ resizing: false }), 300);
                }}
            >
                <IconShowLog />
            </Box>
        );
    }

    renderErrorDialog(): React.JSX.Element | null {
        return this.state.errorText ? (
            <DialogError
                key="dialogError"
                onClose={() => this.setState({ errorText: '' })}
                text={this.state.errorText}
            />
        ) : null;
    }

    renderMain(): (React.JSX.Element | null)[] | null {
        let content;
        if (this.state.debugMode || this.state.hideLog) {
            content = (
                <>
                    {!this.state.debugMode && this.state.hideLog ? this.showLogButton() : undefined}
                    {this.renderEditor()}
                </>
            );
        } else {
            content = (
                <ReactSplit
                    direction={this.state.logHorzLayout ? SplitDirection.Horizontal : SplitDirection.Vertical}
                    initialSizes={this.state.logSizes}
                    minWidths={[500, 100]}
                    minHeights={[150, 50]}
                    onResizeStarted={() => this.setState({ resizing: true })}
                    onResizeFinished={(_gutterIdx, logSizes) => {
                        this.setState({ logSizes: logSizes as [number, number], resizing: false });
                        window.localStorage.setItem('JS.logSizes', JSON.stringify(logSizes));
                    }}
                    gutterClassName={this.state.themeType === 'dark' ? 'Dark visGutter' : 'Light visGutter'}
                >
                    {this.renderEditor()}
                    <Log
                        key="log"
                        verticalLayout={!this.state.logHorzLayout}
                        onLayoutChange={() => this.toggleLogLayout()}
                        editing={this.state.editing}
                        socket={this.socket}
                        selected={this.state.selected}
                        onHideLog={() => {
                            window.localStorage.setItem('App.hideLog', 'true');
                            this.setState({ hideLog: true, resizing: true });
                            setTimeout(() => this.setState({ resizing: false }), 300);
                        }}
                    />
                </ReactSplit>
            );
        }

        return [
            this.state.message ? (
                <DialogMessage
                    key="dialogMessage"
                    onClose={() => this.setState({ message: '' })}
                    text={this.state.message}
                />
            ) : null,
            this.renderErrorDialog(),
            this.state.importFile ? (
                <DialogImportFile
                    key="dialogImportFile"
                    onClose={data => this.onImport(data)}
                />
            ) : null,
            this.state.confirm ? (
                <DialogConfirm
                    key="dialogConfirm"
                    onClose={result => {
                        this.state.confirm && this.setState({ confirm: '' });
                        this.confirmCallback && this.confirmCallback(result);
                        this.confirmCallback = null;
                    }}
                    text={this.state.confirm}
                />
            ) : null,
            <Box
                sx={styles.content}
                className="iobVerticalSplitter"
                key="main"
            >
                <Box
                    key="closeMenu"
                    sx={styles.menuOpenCloseButton}
                    onClick={() => {
                        window.localStorage.setItem('App.menuOpened', this.state.menuOpened ? 'false' : 'true');
                        this.setState({ menuOpened: !this.state.menuOpened, resizing: true });
                        setTimeout(() => this.setState({ resizing: false }), 300);
                    }}
                >
                    {this.state.menuOpened ? <IconMenuOpened /> : <IconMenuClosed />}
                </Box>
                {content}
            </Box>,
        ];
    }

    render(): React.JSX.Element {
        if (!this.state.ready) {
            // return (<CircularProgress style={styles.progress} size={50} />);
            return (
                <StyledEngineProvider injectFirst>
                    <ThemeProvider theme={this.state.theme}>
                        <Loader themeType={this.state.themeType} />
                    </ThemeProvider>
                </StyledEngineProvider>
            );
        }

        let context;
        if (this.state.menuOpened) {
            context = (
                <ReactSplit
                    direction={SplitDirection.Horizontal}
                    initialSizes={this.state.splitSizes}
                    minWidths={[270, 400]}
                    onResizeFinished={(_gutterIdx, splitSizes): void => {
                        this.setState({ splitSizes: splitSizes as [number, number] });
                        window.localStorage.setItem('JS.splitSizes', JSON.stringify(splitSizes));
                    }}
                    gutterClassName={this.state.themeType === 'dark' ? 'Dark visGutter' : 'Light visGutter'}
                >
                    <div
                        style={styles.mainDiv}
                        key="menu"
                    >
                        <SideMenu
                            debugMode={this.state.debugMode}
                            onDebugInstance={data => this.setState({ debugInstance: data, debugMode: !!data })}
                            key="sidemenu"
                            scripts={this.scripts}
                            scriptsHash={this.state.scriptsHash}
                            instances={this.state.instances}
                            onRename={this.onRename.bind(this)}
                            socket={this.socket}
                            selectId={this.state.menuSelectId}
                            onEdit={this.onEdit.bind(this)}
                            expertMode={this.state.expertMode}
                            themeName={this.state.themeName}
                            onThemeChange={themeName => {
                                Utils.setThemeName(themeName);
                                const themeType = Utils.getThemeType(themeName);
                                this.setState({ themeName, themeType }, () => this.toggleTheme(themeName));
                            }}
                            runningInstances={this.state.runningInstances}
                            onExpertModeChange={this.onExpertModeChange.bind(this)}
                            onDelete={this.onDelete.bind(this)}
                            onAddNew={this.onAddNew.bind(this)}
                            onEnableDisable={this.onEnableDisable.bind(this)}
                            onExport={this.onExport.bind(this)}
                            width={500} // TODO: https://github.com/ioBroker/ioBroker.javascript/issues/1643
                            onImport={() => this.setState({ importFile: true })}
                            onSearch={searchText => this.setState({ searchText })}
                            version={this.props.version}
                        />
                    </div>
                    {this.renderMain()}
                </ReactSplit>
            );
        } else {
            context = this.renderMain();
        }

        return (
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={this.state.theme}>
                    <div style={styles.root}>
                        <ContextWrapper socket={this.socket}>{context}</ContextWrapper>
                    </div>
                </ThemeProvider>
            </StyledEngineProvider>
        );
    }
}

export default App;
