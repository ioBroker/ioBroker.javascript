import { Checkbox, FormControl, FormHelperText, Input, MenuItem, Select, withStyles } from '@material-ui/core';
import React, { useState } from 'react';
import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';

const SelectMod = withStyles({
    root: {
        '& .MuiFormControl-marginNormal': {
            marginTop: 0,
            marginBottom: 0,
        },
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

const CustomSelect = ({ multiple, value, customValue, title, attr, options, style, onChange, className }) => {
    const [inputText, setInputText] = useState(value || options[0].value);

    return <SelectMod
        className={className}
        fullWidth
        style={style}
    >
        <Select
            value={customValue ? value : inputText}
            fullWidth
            multiple={multiple}
            renderValue={selected => multiple && selected.join ? selected.join(', ') : selected}
            onChange={e => {
                !customValue && setInputText(e.target.value);
                onChange(e.target.value);
            }}
            input={<Input name={attr} id={attr + '-helper'} />}
        >
            {!multiple && options.map(item => <MenuItem style={{placeContent: 'space-between'}} key={'key-' + item.value} value={item.value || '_'}>{I18n.t(item.title)}{item.title2 && <div>{item.title2}</div>}</MenuItem>)}
            { multiple && options.map(item => <MenuItem key={'key-' + item} value={item || '_'}>{I18n.t(item)} <Checkbox checked={inputText.includes(item)} /></MenuItem>)}
        </Select>
        {title ? <FormHelperText>{I18n.t(title)}</FormHelperText> : null}
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
    onChange: PropTypes.func
};

export default CustomSelect;