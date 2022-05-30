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
