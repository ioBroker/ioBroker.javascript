import { TextField, withStyles } from '@material-ui/core';
import React from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
// import clsx from 'clsx';

const styles = theme => ({
    container: {
        display: 'flex',
        flexWrap: 'wrap',
    },
    textField: {
        marginLeft: theme.spacing(1),
        marginRight: theme.spacing(1),
        width: 200,
    },
});

const CustomTime = ({ table, value, title, attr, options, style, classes, native, onChange, className }) => {

    return <form className={classes.container} noValidate>
        <TextField
            id="time"
            label="Alarm clock"
            type="time"
            defaultValue="07:30"
            className={classes.textField}
            InputLabelProps={{
                shrink: true,
            }}
            inputProps={{
                step: 300, // 5 min
            }}
        />
    </form>;
}

CustomTime.defaultProps = {
    value: '',
    className: null,
    table: false
};

CustomTime.propTypes = {
    title: PropTypes.string,
    attr: PropTypes.string,
    options: PropTypes.array.isRequired,
    style: PropTypes.object,
    native: PropTypes.object.isRequired,
    onChange: PropTypes.func
};

export default withStyles(styles)(CustomTime);