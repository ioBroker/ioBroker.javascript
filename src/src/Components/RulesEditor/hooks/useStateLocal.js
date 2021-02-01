import * as React from "react";


export function useStateLocal(events, nameEvents) {
    const [state, setState] = React.useState(
        localStorage.getItem(nameEvents) ? JSON.parse(localStorage.getItem(nameEvents)) : events
    );

    const eventsToInstall = (newHeadCells) => {
        localStorage.setItem(nameEvents, JSON.stringify(newHeadCells));
        setState(newHeadCells);
    };
    return [state, eventsToInstall];
}
