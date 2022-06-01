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
                    const Component = await window.importFederation(
                        obj.common.name,
                        {
                            url,
                            format: 'esm',
                            from: 'vite'
                        },
                        obj.common.javascriptRules.name
                    );

                    if (Component) {
                        adapterDynamicBlocksArray.push(Component);
                        alreadyCreated.push(obj.common.name);
                        ADAPTERS[obj.common.name] = null;
                    }
                } catch (e) {
                    console.error(e);
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