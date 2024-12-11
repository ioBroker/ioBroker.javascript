import * as React from 'react';

export function useStateLocal<T>(value: T, valueName: string): [T, (newHeadCells: T) => void, boolean] {
    const [state, setState] = React.useState(
        window.localStorage.getItem(valueName) ? JSON.parse(window.localStorage.getItem(valueName) || '') : value,
    );

    const eventsToInstall = (newValue: T): void => {
        window.localStorage.setItem(valueName, JSON.stringify(newValue));
        setState(newValue);
    };
    return [state, eventsToInstall, !!window.localStorage.getItem(valueName)];
}
