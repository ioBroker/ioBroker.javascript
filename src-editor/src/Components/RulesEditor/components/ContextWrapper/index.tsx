import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';

import type { AdminConnection } from '@iobroker/gui-components';

import type { GenericBlock } from '../GenericBlock';
import type { DebugMessage } from '@iobroker/javascript-rules-dev';

interface RuleContext {
    blocks: (typeof GenericBlock<any>)[] | null;
    /** Loads the blocks on the first call - nothing needs them before a rule is opened */
    loadBlocks: () => void;
    socket: AdminConnection | null;

    onUpdate: boolean;
    setOnUpdate: (value: boolean) => void;

    onDebugMessage: DebugMessage[];
    setOnDebugMessage: (message: DebugMessage[]) => void;

    enableSimulation: boolean;
    setEnableSimulation: (enableSimulation: boolean) => void;

    changedScripts: { [scriptId: string]: boolean };
    setChangedScripts: (changedScripts: { [scriptId: string]: boolean }) => void;
}

export const ContextWrapperCreate = createContext<RuleContext>({
    blocks: null,
    loadBlocks: (): void => {},
    socket: null,

    onUpdate: false,
    setOnUpdate: (_onUpdate: boolean): void => {},

    setOnDebugMessage: (_message: DebugMessage[]): void => {},
    onDebugMessage: [],

    enableSimulation: false,
    setEnableSimulation: (_enableSimulation: boolean): void => {},

    changedScripts: {},
    setChangedScripts: (_changedScripts: { [scriptId: string]: boolean }): void => {},
});

export const ContextWrapper = ({ children, socket }: { socket: AdminConnection; children: any }): React.JSX.Element => {
    const [blocks, setBlocks] = useState<(typeof GenericBlock<any>)[] | null>(null);
    const [onUpdate, setOnUpdate] = useState(false);
    const [onDebugMessage, setOnDebugMessage] = useState<DebugMessage[]>([]);
    const [enableSimulation, setEnableSimulation] = useState(false);
    const [changedScripts, setChangedScripts] = useState<{ [scriptId: string]: boolean }>({});

    useEffect(() => {
        onUpdate && setOnUpdate(false);
    }, [onUpdate]);

    const blocksRequested = useRef(false);
    const loadBlocks = useCallback((): void => {
        if (blocksRequested.current) {
            return;
        }
        blocksRequested.current = true;
        import('./loadBlocks')
            .then(({ default: load }) => load(socket))
            .then(setBlocks)
            .catch((error: unknown) => {
                // allow the next attempt
                blocksRequested.current = false;
                console.error(`Cannot load the rule blocks: ${error as Error}`);
            });
    }, [socket]);

    return (
        <ContextWrapperCreate.Provider
            value={{
                blocks,
                loadBlocks,
                socket,

                onUpdate,
                setOnUpdate,

                onDebugMessage,
                setOnDebugMessage,

                enableSimulation,
                setEnableSimulation,

                changedScripts,
                setChangedScripts,
            }}
        >
            {children}
        </ContextWrapperCreate.Provider>
    );
};
