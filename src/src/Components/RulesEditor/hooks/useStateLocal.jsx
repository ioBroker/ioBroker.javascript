import * as React from 'react';

export function useStateLocal(events, nameEvents) {
    const [state, setState] = React.useState(
        window.localStorage.getItem(nameEvents) ? JSON.parse(window.localStorage.getItem(nameEvents)) : events,
    );

    const eventsToInstall = newHeadCells => {
        window.localStorage.setItem(nameEvents, JSON.stringify(newHeadCells));
        setState(newHeadCells);
    };
    return [state, eventsToInstall, !!window.localStorage.getItem(nameEvents)];
}
