import React from 'react';
import ReactDOM from 'react-dom';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';

import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { version } from '../package.json';
import theme from '@iobroker/adapter-react-v5/Theme';
import Utils from '@iobroker/adapter-react-v5/Components/Utils';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';

window.adapterName = 'javascript';
window.sentryDSN = 'https://504499a725eb4898930d3b9e9da95740@sentry.iobroker.net/56';

let themeName = Utils.getThemeName();

console.log('iobroker.' + window.adapterName + '@' + version + ' using theme "' + themeName + '"');

function build() {
    const isMobile = window.innerWidth < 600;
    return ReactDOM.render(<StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme(themeName)}>
            <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
                <App onThemeChange={_theme => {
                    themeName = _theme;
                    build();
                }} />
            </DndProvider>
        </ThemeProvider>
    </StyledEngineProvider>, document.getElementById('root'));

}

build();
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
loadDynamicScript(window.location.port === '3000' ? window.location.protocol + '//' + window.location.hostname + ':8081/lib/js/socket.io.js' : './../../lib/js/socket.io.js', function () {
        
    loadDynamicScript('vs/loader.js', function () {
        loadDynamicScript('vs/configure.js', function () {
        typeof window.socketLoadedHandler === 'function' && window.socketLoadedHandler();
        });
    });
});