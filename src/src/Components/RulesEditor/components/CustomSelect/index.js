import { FormControl, FormHelperText, Input, MenuItem, Select, withStyles } from '@material-ui/core';
import React, { useState } from 'react';
import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';

const SelectMod = withStyles({
    root: {
        margin: '10px 0',
        '& > *': {
            color: '#2d0440 !important'
        },
        '& .MuiSelect-icon': {
            color: '#81688c'
        },
        '& label.Mui-focused': {
            color: '#81688c',
        },
        '& .MuiInput-underline:after': {
            borderBottomColor: '#510573',
        },
        '& .MuiInput-underline:before': {
            borderBottomColor: '#81688c',
        },
        '& .MuiInput-underline:hover:before': {
            borderBottomColor: '#81688c',
        },
    },
})(FormControl);

const CustomSelect = ({ table, value, customValue, title, attr, options, style, native, onChange, className }) => {
    const [inputText, setInputText] = useState('test1');

    return <SelectMod
        className={className}
        fullWidth
        style={Object.assign({ paddingTop: 5 }, style)}
    >
        <Select
            value={customValue ? value : inputText}
            fullWidth
            onChange={e => {
                if (!customValue) setInputText(e.target.value);
                onChange(e.target.value);
            }
            }
            input={<Input name={attr} id={attr + '-helper'} />}
        >
            {options.map(item => (<MenuItem key={'key-' + item.value} value={item.value || '_'}>{I18n.t(item.title)}</MenuItem>))}
        </Select>
        <FormHelperText>{I18n.t(title)}</FormHelperText>
    </SelectMod>;
}

CustomSelect.defaultProps = {
    value: '',
    className: null,
    table: false,
    customValue: false
};

CustomSelect.propTypes = {
    title: PropTypes.string,
    attr: PropTypes.string,
    options: PropTypes.array.isRequired,
    style: PropTypes.object,
    native: PropTypes.object.isRequired,
    onChange: PropTypes.func
};

export default CustomSelect;