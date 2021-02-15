import React, {
    createContext,
    // useEffect,
    useState
} from 'react';
import StandardBlocks from '../StandardBlocks';

export const ContextWrapperCreate = createContext();

export const ContextWrapper = ({ children, socket }) => {
    const [state, setState] = useState({
        blocks: [ ...StandardBlocks]
    });

    // useEffect(() => {
    //     setState({
    //         blocks: [...state.blocks,
    //             {}
    //         ],
    //     });
    //     // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, []);

    return <ContextWrapperCreate.Provider value={{ state, setState, socket }}>
        {children}
    </ContextWrapperCreate.Provider>;
};