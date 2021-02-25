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
    const [state, setState] = useState({
        blocks: null,
        onUpdate: false
    });

    useEffect(() => {
        if (state.onUpdate) {
            setState({ ...state, onUpdate: false })
        }
    }, [state, state.onUpdate]);

    useEffect(() => {
        socket.getAdapterInstances()
            .then(instances => {
                const adapters = Object.keys(ADAPTERS).filter(adapter =>
                    instances.find(obj => obj?.common?.name === adapter));
                const adapterBlocksArray = adapters.map(adapter => ADAPTERS[adapter]);

                setState({
                    ...state,
                    blocks: [...StandardBlocks, ...adapterBlocksArray],
                });
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <ContextWrapperCreate.Provider value={{ state, setState, socket }}>
        {children}
    </ContextWrapperCreate.Provider>;
};