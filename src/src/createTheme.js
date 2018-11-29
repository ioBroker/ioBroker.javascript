import {createMuiTheme} from '@material-ui/core/styles';
import Theme from './Theme';

export default type => {
    if (type === 'dark') {
        return createMuiTheme({
            palette: {
                type: type,
                primary: {
                    light: '#5F6975',
                    main: '#2978d0',
                    dark: '#053C72',
                    contrastText: '#C00',
                },
                secondary: {
                    light: '#7EB2CC',
                    main: '#3399CC',
                    dark: '#068ACC',
                    contrastText: '#ee0000',
                },
            }
        });
    } else {
        return createMuiTheme({
            palette: {
                type: type,
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
                    contrastText: '#ee0000',
                },
            }
        });

    }
}