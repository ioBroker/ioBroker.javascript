import React, {
    createContext,
    useEffect,
    useState,
} from 'react';

import ActionSayText from '../Blocks/ActionSayText';
import ActionSendEmail from '../Blocks/ActionSendEmail';
import ActionTelegram from '../Blocks/ActionTelegram';
import StandardBlocks from '../StandardBlocks';

const ADAPTERS = {
    telegram: ActionTelegram,
    email: ActionSendEmail,
    sayit: ActionSayText,
}

export const ContextWrapperCreate = createContext();

export const ContextWrapper = ({ children, socket }) => {
    const [blocks, setBlocks] = useState(null);
    const [onUpdate, setOnUpdate] = useState(false);

    useEffect(() => {
        onUpdate && setOnUpdate(false);
    }, [onUpdate]);

    useEffect(() => {
        socket.getAdapterInstances()
            .then(instances => {
                const adapters = Object.keys(ADAPTERS).filter(adapter =>
                    instances.find(obj => obj?.common?.name === adapter));
                const adapterBlocksArray = adapters.map(adapter => ADAPTERS[adapter]);

                setBlocks([...StandardBlocks, ...adapterBlocksArray]);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <ContextWrapperCreate.Provider value={{ blocks, socket, onUpdate, setOnUpdate }}>
        {children}
    </ContextWrapperCreate.Provider>;
};