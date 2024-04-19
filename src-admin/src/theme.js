// this file used only for simulation and not used in end build
import Theme from '@iobroker/adapter-react-v5/Theme';

export default type => {
    const danger = '#dd5325';
    const success = '#73b6a8';
    const theme = { ...Theme(type) };
    if (!theme) {
        return theme;
    }
    theme.palette.text.danger = {
        color: danger,
    };
    theme.palette.text.success = {
        color: success,
    };

    return theme;
};
