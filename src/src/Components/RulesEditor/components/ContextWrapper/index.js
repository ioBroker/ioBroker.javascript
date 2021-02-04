import React, { createContext, useState } from "react"

export const ContextWrapperCreate = createContext()

export const ContextWrapper = ({ children }) => {
    const [active, setActive] = useState(false);
    
    return (
        <ContextWrapperCreate.Provider value={{ active, setActive }}>
            {children}
        </ContextWrapperCreate.Provider>
    );
};