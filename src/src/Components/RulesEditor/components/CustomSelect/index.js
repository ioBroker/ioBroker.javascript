import { FormControl, FormHelperText, Input, MenuItem, Select, withStyles } from '@material-ui/core';
import React from 'react';
import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import clsx from 'clsx';

const styles = theme => ({
    input: {
        minWidth: 300
    },
    inputNumber: {
        minWidth: 150
    }
});

const CustomSelect = ({ table, value, title, attr, options, style, classes, native, onChange, className }) => {
    return <FormControl
        className={clsx(classes.input, classes.controlElement, className)}
        style={Object.assign({ paddingTop: 5 }, style)}
    >
        <Select
            value={value}
            onChange={e => {
                if (table) {
                    onChange(e.target.value);
                } else {
                    onChange(attr, e.target.value === '_' ? '' : e.target.value)
                }
            }
            }
            input={<Input name={attr} id={attr + '-helper'} />}
        >
            {options.map(item => (<MenuItem key={'key-' + item.value} value={item.value || '_'}>{I18n.t(item.title)}</MenuItem>))}
        </Select>
        <FormHelperText>{I18n.t(title)}</FormHelperText>
    </FormControl>;
}

CustomSelect.defaultProps = {
    value: '',
    className: null,
    table: false
};

CustomSelect.propTypes = {
    title: PropTypes.string,
    attr: PropTypes.string,
    options: PropTypes.array.isRequired,
    style: PropTypes.object,
    native: PropTypes.object.isRequired,
    onChange: PropTypes.func
};

export default withStyles(styles)(CustomSelect);