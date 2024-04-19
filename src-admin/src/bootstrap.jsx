// this file used only for simulation and not used in end build

/* eslint-disable */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import Utils from '@iobroker/adapter-react-v5/Components/Utils';
import App from './App';
import theme from './theme';

window.adapterName = 'adapter-component-template';
let themeName = Utils.getThemeName();

function build() {
    const container = document.getElementById('root');
    const root = createRoot(container);
    return root.render(<React.StrictMode>
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme(themeName)}>
                <App
                    socket={{port: 8081}}
                    onThemeChange={(_theme) => {
                        themeName = _theme;
                        build();
                    }}
                    adapterName="backitup"
                />
            </ThemeProvider>
        </StyledEngineProvider>
    </React.StrictMode>);
}

build();