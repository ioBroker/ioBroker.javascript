import React from 'react';
import ReactDOM from 'react-dom';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';

import primary from '@material-ui/core/colors/blue';
import secondary from '@material-ui/core/colors/orange';

import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';

const theme = createMuiTheme({
    palette: {
        primary: {
            light: '#5F6975',
            main: '#164477',
            dark: '#053C72',
            contrastText: '#C00',
        },
        secondary: {
            light: '#7EB2CC',
            main: '#3399CC',
            dark: '#068ACC',
            contrastText: '#E00',
        },
    }
});

ReactDOM.render(<MuiThemeProvider theme={theme}><App /></MuiThemeProvider>, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
