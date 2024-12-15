import React, { createContext, useEffect, useState } from 'react';

import { type AdminConnection, I18n } from '@iobroker/adapter-react-v5';

import {init, loadRemote} from '@module-federation/runtime';

import ActionSayText from '../Blocks/ActionSayText';
import ActionSendEmail from '../Blocks/ActionSendEmail';
import ActionTelegram from '../Blocks/ActionTelegram';
import ActionPushover from '../Blocks/ActionPushover';
import ActionWhatsappcmb from '../Blocks/ActionWhatsappcmb';
import ActionPushsafer from '../Blocks/ActionPushsafer';
import StandardBlocks from '../StandardBlocks';
import type { GenericBlock } from '../GenericBlock';
import type { DebugMessage } from '../../types';

const ADAPTERS: Record<string, typeof GenericBlock<any> | null> = {
    telegram: ActionTelegram,
    email: ActionSendEmail,
    sayit: ActionSayText,
    pushover: ActionPushover,
    'whatsapp-cmb': ActionWhatsappcmb,
    pushsafer: ActionPushsafer,
};

interface RuleContext {
    blocks: (typeof GenericBlock<any>)[] | null;
    socket: AdminConnection | null;
    onUpdate: boolean;
    setOnUpdate: (value: boolean) => void;
    onDebugMessage: DebugMessage[];
    setOnDebugMessage: (message: DebugMessage[]) => void;
    enableSimulation: boolean;
    setEnableSimulation: (enableSimulation: boolean) => void;
}

export const ContextWrapperCreate = createContext<RuleContext>({
    blocks: null,
    socket: null,

    onUpdate: false,
    setOnUpdate: (_onUpdate: boolean): void => {},

    setOnDebugMessage: (_message: DebugMessage[]): void => {},
    onDebugMessage: [],

    enableSimulation: false,
    setEnableSimulation: (_enableSimulation: boolean): void => {},
});

const getOrLoadRemote = (
    remote: string,
    shareScope: string,
    remoteFallbackUrl: string | undefined = undefined,
): Promise<{ get: (module: string) => () => Promise<{ default: typeof GenericBlock<any> }> }> =>
    new Promise((resolve, reject) => {
        // check if remote exists on window
        if (!(window as any)[remote]) {
            // search dom to see if remote tag exists, but might still be loading (async)
            const existingRemote: HTMLScriptElement | null = document.querySelector(`[data-webpack="${remote}"]`);

            // when remote is loaded...
            const onload = async (): Promise<void> => {
                // check if it was initialized
                if (!(window as any)[remote]) {
                    reject(new Error(`Cannot load Remote "${remote}" to inject`));
                    return;
                }
                if (!(window as any)[remote].__initialized) {
                    // if share scope doesn't exist (like in webpack 4) then expect shareScope to be a manual object
                    // @ts-expect-error it is a trick and must be so
                    if (typeof __webpack_share_scopes__ === 'undefined') {
                        // use default share scope object passed in manually
                        await (window as any)[remote].init(shareScope);
                    } else {
                        // otherwise, init share scope as usual
                        // @ts-expect-error it is a trick and must be so
                        await (window as any)[remote].init(__webpack_share_scopes__[shareScope]);
                    }
                    // mark remote as initialized
                    (window as any)[remote].__initialized = true;
                }
                // resolve promise so marking remote as loaded
                resolve((window as any)[remote]);
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
                reject(new Error(`Cannot Find Remote ${remote} to inject`));
            }
        } else {
            // remote already instantiated, resolve
            resolve((window as any)[remote]);
        }
    });

function loadComponent(
    remote: string,
    sharedScope: string,
    module: string,
    url: string,
): () => Promise<{ default: typeof GenericBlock<any> }> {
    return async (): Promise<{ default: typeof GenericBlock<any> }> => {
        await getOrLoadRemote(remote, sharedScope, url);
        const container = (window as any)[remote];
        const factory = await container.get(module);
        return factory();
    };
}

export const ContextWrapper = ({ children, socket }: { socket: AdminConnection; children: any }): React.JSX.Element => {
    const [blocks, setBlocks] = useState<(typeof GenericBlock<any>)[] | null>(null);
    const [onUpdate, setOnUpdate] = useState(false);
    const [onDebugMessage, setOnDebugMessage] = useState<DebugMessage[]>([]);
    const [enableSimulation, setEnableSimulation] = useState(false);

    useEffect(() => {
        onUpdate && setOnUpdate(false);
    }, [onUpdate]);

    useEffect(() => {
        void (async () => {
            const instances = await socket.getAdapterInstances();
            const adapters = Object.keys(ADAPTERS).filter(adapter =>
                instances.find(obj => obj?.common?.name === adapter),
            );

            const adapterDynamicBlocksArray: (typeof GenericBlock<any>)[] = [];

            // find all adapters, that have custom rule blocks
            const dynamicRules = instances.filter(obj => obj.common.javascriptRules);

            const alreadyCreated: string[] = [];
            for (const k in dynamicRules) {
                const obj = dynamicRules[k];
                if (alreadyCreated.includes(obj.common.name)) {
                    continue;
                }

                let url;
                if (
                    // @ts-expect-error javascriptRules in js-controller
                    obj.common.javascriptRules.url.startsWith('http:') ||
                    // @ts-expect-error javascriptRules in js-controller
                    obj.common.javascriptRules.url.startsWith('https:')
                ) {
                    // @ts-expect-error javascriptRules in js-controller
                    url = obj.common.javascriptRules.url;
                    // @ts-expect-error javascriptRules in js-controller
                } else if (obj.common.javascriptRules.url.startsWith('./')) {
                    // @ts-expect-error javascriptRules in js-controller
                    url = `${window.location.protocol}//${window.location.host}${obj.common.javascriptRules.url.replace(/^\./, '')}`;
                } else {
                    // @ts-expect-error javascriptRules in js-controller
                    url = `${window.location.protocol}//${window.location.host}/adapter/${obj.common.name}/${obj.common.javascriptRules.url}`;
                }

                // @ts-expect-error javascriptRules in js-controller
                if (obj.common.javascriptRules.i18n === true) {
                    // load i18n from files
                    const pos: number = url.lastIndexOf('/');
                    let i18nURL: string;
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
                        .catch(error => {
                            if (lang !== 'en') {
                                // try to load english
                                return fetch(`${i18nURL}/i18n/en.json`)
                                    .then(data => data.json())
                                    .then(json => I18n.extendTranslations(json, lang))
                                    .catch(error => console.error(`Cannot load i18n "${file}": ${error}`));
                            }
                            console.log(`Cannot load i18n "${file}": ${error}`);
                        });
                    // @ts-expect-error javascriptRules in js-controller
                } else if (obj.common.javascriptRules.i18n && typeof obj.common.javascriptRules.i18n === 'object') {
                    try {
                        // @ts-expect-error javascriptRules in js-controller
                        I18n.extendTranslations(obj.common.javascriptRules.i18n);
                    } catch (error) {
                        // @ts-expect-error javascriptRules in js-controller
                        console.error(`Cannot import i18n for "${obj.common.javascriptRules.name}": ${error}`);
                    }
                }

                try {
                    init({
                        name: obj.common.javascriptRules!.name,
                        remotes: [
                          {
                            name: obj.common.javascriptRules!.name,
                            entry: url
                          }
                        ],
                        // force: true // may be needed to sideload remotes after the fact.
                      })
                    const Component = (
                        await loadRemote(obj.common.javascriptRules!.name + '/' + obj.common.javascriptRules!.name) as any
                    ).default;

                    if (Component) {
                        adapterDynamicBlocksArray.push(Component);
                        alreadyCreated.push(obj.common.name);
                        ADAPTERS[obj.common.name] = null;
                    }
                } catch (e) {
                    // @ts-expect-error javascriptRules in js-controller
                    console.error(`Cannot load component "${obj.common.javascriptRules.name}": ${e}`);
                }
            }

            const adapterBlocksArray: (typeof GenericBlock<any>)[] = adapters
                .filter(adapter => ADAPTERS[adapter])
                .map(adapter => ADAPTERS[adapter]) as (typeof GenericBlock<any>)[];

            setBlocks([...StandardBlocks, ...adapterBlocksArray, ...adapterDynamicBlocksArray]);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <ContextWrapperCreate.Provider
            value={{
                blocks,
                socket,
                onUpdate,
                setOnUpdate,
                onDebugMessage,
                setOnDebugMessage,
                enableSimulation,
                setEnableSimulation,
            }}
        >
            {children}
        </ContextWrapperCreate.Provider>
    );
};
