import React, {
    createContext,
    useEffect,
    useState,
} from 'react';

import ActionSayText from '../Blocks/ActionSayText';
import ActionSendEmail from '../Blocks/ActionSendEmail';
// import ActionTelegram from '../Blocks/ActionTelegram';
import ActionPushover from '../Blocks/ActionPushover';
import ActionWhatsappcmb from '../Blocks/ActionWhatsappcmb';
import ActionPushsafer from '../Blocks/ActionPushsafer';
import StandardBlocks from '../StandardBlocks';

const ADAPTERS = {
    // telegram: ActionTelegram,
    email: ActionSendEmail,
    sayit: ActionSayText,
    pushover: ActionPushover,
    'whatsapp-cmb': ActionWhatsappcmb,
    'pushsafer': ActionPushsafer,
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
            const instances = await socket.getAdapterInstances()
            const adapters = Object.keys(ADAPTERS).filter(adapter =>
                instances.find(obj => obj?.common?.name === adapter));
            const adapterBlocksArray = adapters.map(adapter => ADAPTERS[adapter]);

            const dynamicRules = instances.filter(obj => obj.common.javascriptRules);
        
            for (let k in dynamicRules){
                const obj = dynamicRules[k];
                if (!obj.common.javascriptRules.url.startsWith('http')) {
                    continue;
                }
                try {
                    const Component = await window.importFederation(obj.common.name, {url: obj.common.javascriptRules.url, format: 'esm', from: 'vite'}, obj.common.javascriptRules.name);
                    if (Component) {
                        console.log(Component);
                        adapterBlocksArray.push(Component);
                    };
                } catch (e) {
                    console.log(e);

                }
            };

            setBlocks([...StandardBlocks, ...adapterBlocksArray]);
        })()
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