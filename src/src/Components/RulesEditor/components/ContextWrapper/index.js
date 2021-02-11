import React, { createContext, useEffect, useState } from "react"
import StandardBlocks from "../StandardBlocks";

export const ContextWrapperCreate = createContext();

export const ContextWrapper = ({ children, socket }) => {
    const [state, setState] = useState({ blocks: StandardBlocks, GenericInputBlockMethod: {} });
    
    useEffect(() => {
        setState({
            blocks: [...state.blocks, 
                {
                    name: 'Action2222',
                    typeBlock: 'then',
                    icon: 'BatteryChargingFull',

                    // acceptedOn: ['then', 'else'],
                    type: 'action',
                    compile: (config, context) => `setState('id', obj.val);`,
                    getConfig: () => { },
                    setConfig: (config) => { },
                    _acceptedBy: 'actions', // where it could be acceped: trigger, condition, action
                    _type: 'action1',
                    _name: { en: 'context add list', ru: 'Действие' },
                    _inputs:
                        { nameRender: 'renderTextContext', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
                }
            ],
            GenericInputBlockMethod: {
                ...state.GenericInputBlockMethod,
                renderTextContext: (value, className) => {
                    return <div>render context</div>
                }
            }
        });

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <ContextWrapperCreate.Provider value={{ state, setState, socket }}>
        {children}
    </ContextWrapperCreate.Provider>;
};