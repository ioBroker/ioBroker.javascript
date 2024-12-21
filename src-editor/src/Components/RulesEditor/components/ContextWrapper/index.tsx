import React, { createContext, useEffect, useState } from 'react';

import { type AdminConnection, I18n } from '@iobroker/adapter-react-v5';

import {registerRemotes, loadRemote} from '@module-federation/runtime';

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
    // telegram: ActionTelegram,
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
                    registerRemotes(
                        [
                          {
                            name: obj.common.javascriptRules!.name,
                            entry: url,
                            type: (obj.common.javascriptRules! as any).type
                          }
                        ],
                        // force: true // may be needed to sideload remotes after the fact.
                      )
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
