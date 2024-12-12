import React from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import pgk from '../package.json';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';

import { GenericBlock } from './Components/RulesEditor/components/GenericBlock';

declare global {
    interface Window {
        GenericBlock: any;
        sentryDSN: string;
        loadDynamicScript: (url: string, callback: () => void) => void;
        socketLoadedHandler: () => void;
    }
}
window.GenericBlock = GenericBlock;

window.adapterName = 'javascript';
window.sentryDSN = 'https://504499a725eb4898930d3b9e9da95740@sentry.iobroker.net/56';

console.log(`iobroker.${window.adapterName}@${pgk.version}`);

const isMobile = window.innerWidth < 600;
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
            <App version={pgk.version} />
        </DndProvider>,
    );
}

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();

/*
    improved VSCode editor. This has to be down here, or we get conflicts
    between loader.js and require calls in jQuery and other loaded modules
*/
// loader must be after socket.io, elsewise there is no window.io
const loadDynamicScript = window.loadDynamicScript;
loadDynamicScript &&
    loadDynamicScript(
        window.location.port === '3000'
            ? `${window.location.protocol}//${window.location.hostname}:8081/lib/js/socket.io.js`
            : './../../lib/js/socket.io.js',
        () =>
            loadDynamicScript('vs/loader.js', () =>
                loadDynamicScript(
                    'vs/configure.js',
                    () => typeof window.socketLoadedHandler === 'function' && window.socketLoadedHandler(),
                ),
            ),
    );
