import React, {
    createContext,
    useEffect,
    useState
} from 'react';
import ActionSayText from '../Blocks/ActionSayText';
import ActionSendEmail from '../Blocks/ActionSendEmail';
import ActionTelegram from '../Blocks/ActionTelegram';
import StandardBlocks from '../StandardBlocks';

export const ContextWrapperCreate = createContext();

export const ContextWrapper = ({ children, socket }) => {
    const [state, setState] = useState({
        blocks: StandardBlocks,
        onUpdate: false
    });

    const [adapterBlocksArray, setAdapterBlocksArray] = useState([]);

    useEffect(() => {
        if (state.onUpdate) {
            setState({ ...state, onUpdate: false })
        }
    }, [state, state.onUpdate]);

    useEffect(() => {
        setAdapterBlocksArray([ActionSendEmail, ActionSayText, ActionTelegram]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setState({
            ...state,
            blocks: [...state.blocks, ...adapterBlocksArray],
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adapterBlocksArray]);

    return <ContextWrapperCreate.Provider value={{ state, setState, socket }}>
        {children}
    </ContextWrapperCreate.Provider>;
};