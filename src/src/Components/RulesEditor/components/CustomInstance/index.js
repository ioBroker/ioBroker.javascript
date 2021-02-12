import { Checkbox, FormControl, FormHelperText, Input, MenuItem, Select, withStyles } from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';

const SelectMod = withStyles({
    root: {
        margin: '10px 0',
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

const CustomSelect = ({ multiple, value, customValue, socket, title, attr, adapter, style, native, onChange, className }) => {
    const [inputText, setInputText] = useState(value || 'test1');
    const [options, setOptions] = useState([]);

    useEffect(() => {
        socket.getAdapterInstances(adapter)
            .then(instances => {});
    }, []);

    return <SelectMod
        className={className}
        fullWidth
        style={style}
    >
        <Select
            value={customValue ? value : inputText}
            fullWidth
            multiple={multiple}
            renderValue={(selected) => multiple && selected.join ? selected.join(', ') : selected}
            onChange={e => {
                if (!customValue) setInputText(e.target.value);
                onChange(e.target.value);
            }
            }
            input={<Input name={attr} id={attr + '-helper'} />}
        >
            {options.map(item => (<MenuItem style={{placeContent:'space-between'}} key={'key-' + item.value} value={item.value || '_'}>{I18n.t(item.title)}{item.title2 && <div>{item.title2}</div>}</MenuItem>))}
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
    socket: PropTypes.object,
    attr: PropTypes.string,
    adapter: PropTypes.string,
    style: PropTypes.object,
    onChange: PropTypes.func
};

export default CustomSelect;