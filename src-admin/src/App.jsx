// this file used only for simulation and not used in end build

import React from 'react';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';

import withStyles from '@mui/styles/withStyles';

import GenericApp from '@iobroker/adapter-react-v5/GenericApp';
import { I18n, Loader } from '@iobroker/adapter-react-v5';

import Astro from './Astro';

const styles = theme => ({
    app: {
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
        height: '100%',
    },
    item: {
        padding: 50,
        width: 400,
    },
});

class App extends GenericApp {
    constructor(props) {
        const extendedProps = { ...props };
        super(props, extendedProps);

        this.state = {
            data: {
                // useSystemGPS: true,
                latitude: 3.16211200,
                longitude: 101.69876480,

                sunriseEvent: 'nightEnd',
                sunriseOffset: 0,
                sunriseLimitStart: '6:00',
                sunriseLimitEnd: '9:00',

                sunsetEvent: 'goldenHour',
                sunsetOffset: 0,
                sunsetLimitStart: '18:00',
                sunsetLimitEnd: '23:00',
            },
            theme: this.createTheme('dark'),
            themeName: 'dark',
            themeType: 'dark',
        };
        const translations = {
            en: require('./i18n/en'),
            de: require('./i18n/de'),
            ru: require('./i18n/ru'),
            pt: require('./i18n/pt'),
            nl: require('./i18n/nl'),
            fr: require('./i18n/fr'),
            it: require('./i18n/it'),
            es: require('./i18n/es'),
            pl: require('./i18n/pl'),
            uk: require('./i18n/uk'),
            'zh-cn': require('./i18n/zh-cn'),
        };

        I18n.setTranslations(translations);
        I18n.setLanguage((navigator.language || navigator.userLanguage || 'en').substring(0, 2).toLowerCase());
    }

    render() {
        if (!this.state.loaded) {
            return <StyledEngineProvider injectFirst>
                <ThemeProvider theme={this.state.theme}>
                    <Loader theme={this.state.themeType} />
                </ThemeProvider>
            </StyledEngineProvider>;
        }

        return <StyledEngineProvider injectFirst>
            <ThemeProvider theme={this.state.theme}>
                <div style={{ width: '100%', backgroundColor: this.state.themeType ? '#000' : '#FFF', color: this.state.themeType ? '#FFF' : '#000' }}>
                    <div style={{ width: '100%' }}>
                        <Astro
                            alive
                            socket={this.socket}
                            theme={this.state.theme}
                            themeType={this.state.themeType || 'light'}
                            themeName={this.state.themeName || this.state.themeType || 'light'}
                            attr="myCustomAttribute"
                            systemConfig={{ dateFormat: 'DD/MM/YYYY', longitude: 10, latitude: 20 }}
                            data={this.state.data}
                            onError={() => {}}
                            instance={0}
                            schema={{
                                name: 'ConfigCustomJavascriptSet/Components/Astro',
                                type: 'custom',
                            }}
                            onChange={data => {
                                this.setState({ data });
                            }}
                            adapterName="javascript"
                            common={this.common}
                        />
                    </div>
                </div>
            </ThemeProvider>
        </StyledEngineProvider>;
    }
}

export default withStyles(styles)(App);
