import React, {
    createContext,
    useEffect,
    useState,
} from 'react';

import I18n from '@iobroker/adapter-react-v5/i18n';

import ActionSayText from '../Blocks/ActionSayText';
import ActionSendEmail from '../Blocks/ActionSendEmail';
import ActionTelegram from '../Blocks/ActionTelegram';
import ActionPushover from '../Blocks/ActionPushover';
import ActionWhatsappcmb from '../Blocks/ActionWhatsappcmb';
import ActionPushsafer from '../Blocks/ActionPushsafer';
import StandardBlocks from '../StandardBlocks';

const ADAPTERS = {
    telegram: ActionTelegram,
    email: ActionSendEmail,
    sayit: ActionSayText,
    pushover: ActionPushover,
    'whatsapp-cmb': ActionWhatsappcmb,
    pushsafer: ActionPushsafer,
};

export const ContextWrapperCreate = createContext();

const getOrLoadRemote = (remote, shareScope, remoteFallbackUrl = undefined) =>
    new Promise((resolve, reject) => {
    // check if remote exists on window
        if (!window[remote]) {
            // search dom to see if remote tag exists, but might still be loading (async)
            const existingRemote = document.querySelector(`[data-webpack="${remote}"]`);
            // when remote is loaded...
            const onload = async () => {
                // check if it was initialized
                if (!window[remote]) {
                    return reject(`Cannot load Remote "${remote}" to inject`);
                }
                if (!window[remote].__initialized) {
                    // if share scope doesn't exist (like in webpack 4) then expect shareScope to be a manual object
                    if (typeof __webpack_share_scopes__ === 'undefined') {
                        // use default share scope object passed in manually
                        await window[remote].init(shareScope.default);
                    } else {
                        // otherwise, init share scope as usual
                        // eslint-disable-next-line
                        await window[remote].init(__webpack_share_scopes__[shareScope]);
                    }
                    // mark remote as initialized
                    window[remote].__initialized = true;
                }
                // resolve promise so marking remote as loaded
                resolve();
            };
            if (existingRemote) {
                // if existing remote but not loaded, hook into its onload and wait for it to be ready
                existingRemote.onload = onload;
                existingRemote.onerror = reject;
                // check if remote fallback exists as param passed to function
                // TODO: should scan public config for a matching key if no override exists
            } else if (remoteFallbackUrl) {
                // inject remote if a fallback exists and call the same onload function
                const d = document;
                const script = d.createElement('script');
                script.type = 'text/javascript';
                // mark as data-webpack so runtime can track it internally
                script.setAttribute('data-webpack', `${remote}`);
                script.async = true;
                script.onerror = reject;
                script.onload = onload;
                script.src = remoteFallbackUrl;
                d.getElementsByTagName('head')[0].appendChild(script);
            } else {
                // no remote and no fallback exist, reject
                reject(`Cannot Find Remote ${remote} to inject`);
            }
        } else {
            // remote already instantiated, resolve
            resolve();
        }
    });

const loadComponent = (remote, sharedScope, module, url) => async () => {
    await getOrLoadRemote(remote, sharedScope, url);
    const container = window[remote];
    const factory = await container.get(module);
    const Module = factory();
    return Module;
};

export const ContextWrapper = ({ children, socket }) => {
    const [blocks, setBlocks] = useState(null);
    const [onUpdate, setOnUpdate] = useState(false);
    const [onDebugMessage, setOnDebugMessage] = useState(false);
    const [enableSimulation, setEnableSimulation] = useState(false);

    useEffect(() => {
        onUpdate && setOnUpdate(false);
    }, [onUpdate]);

    useEffect(() => {
        (async () => {
            const instances = await socket.getAdapterInstances();
            const adapters = Object.keys(ADAPTERS).filter(adapter =>
                instances.find(obj => obj?.common?.name === adapter));

            const adapterDynamicBlocksArray = [];

            // find all adapters, that have custom rule blocks
            const dynamicRules = instances.filter(obj => obj.common.javascriptRules);

            const alreadyCreated = [];
            for (let k in dynamicRules) {
                const obj = dynamicRules[k];
                if (alreadyCreated.includes(obj.common.name)) {
                    continue;
                }

                let url;
                if (obj.common.javascriptRules.url.startsWith('http:') || obj.common.javascriptRules.url.startsWith('https:')) {
                    url = obj.common.javascriptRules.url;
                } else if (obj.common.javascriptRules.url.startsWith('./')) {
                    url = `${window.location.protocol}//${window.location.host}${obj.common.javascriptRules.url.replace(/^\./, '')}`;
                } else {
                    url = `${window.location.protocol}//${window.location.host}/adapter/${obj.common.name}/${obj.common.javascriptRules.url}`;
                }

                if (obj.common.javascriptRules.i18n === true) {
                    // load i18n from files
                    const pos = url.lastIndexOf('/');
                    let i18nURL;
                    if (pos !== -1) {
                        i18nURL = url.substring(0, pos);
                    } else {
                        i18nURL = url;
                    }
                    const lang = I18n.getLanguage();
                    const file = `${i18nURL}/i18n/${lang}.json`;

                    await fetch(file)
                        .then(data => data.json())
                        .then(json => I18n.extendTranslations(json, lang))
                        .catch(error => console.log(`Cannot load i18n "${file}": ${error}`));
                } else if (obj.common.javascriptRules.i18n && typeof obj.common.javascriptRules.i18n === 'object') {
                    try {
                        I18n.extendTranslations(obj.common.javascriptRules.i18n);
                    } catch (error) {
                        console.error(`Cannot import i18n: ${error}`);
                    }
                }

                try {
                    const Component = (await loadComponent(obj.common.javascriptRules.name, 'default', `./${obj.common.javascriptRules.name}`, url)()).default;

                    if (Component) {
                        adapterDynamicBlocksArray.push(Component);
                        alreadyCreated.push(obj.common.name);
                        ADAPTERS[obj.common.name] = null;
                    }
                } catch (e) {
                    console.error(`Cannot load component: ${e}`);
                }
            }

            const adapterBlocksArray = adapters.filter(adapter => ADAPTERS[adapter]).map(adapter => ADAPTERS[adapter]);

            setBlocks([...StandardBlocks, ...adapterBlocksArray, ...adapterDynamicBlocksArray]);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <ContextWrapperCreate.Provider value={{
        blocks,
        socket,
        onUpdate,
        setOnUpdate,
        onDebugMessage,
        setOnDebugMessage,
        enableSimulation,
        setEnableSimulation
    }}>
        {children}
    </ContextWrapperCreate.Provider>;
};