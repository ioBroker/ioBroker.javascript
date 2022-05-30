import React from 'react';
import ReactDOM from 'react-dom';
import { MuiThemeProvider } from '@material-ui/core/styles';

import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { version } from '../package.json';
import theme from '@iobroker/adapter-react/Theme';
import Utils from '@iobroker/adapter-react/Components/Utils';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';

window.adapterName = 'javascript';
window.sentryDSN = 'https://504499a725eb4898930d3b9e9da95740@sentry.iobroker.net/56';

let themeName = Utils.getThemeName();

console.log('iobroker.' + window.adapterName + '@' + version + ' using theme "' + themeName + '"');

function build() {
    const isMobile = window.innerWidth < 600;
    return ReactDOM.render(<MuiThemeProvider theme={theme(themeName)}>
        <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
            <App onThemeChange={_theme => {
                themeName = _theme;
                build();
            }} />
        </DndProvider>
    </MuiThemeProvider>, document.getElementById('root'));

}

build();
// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
