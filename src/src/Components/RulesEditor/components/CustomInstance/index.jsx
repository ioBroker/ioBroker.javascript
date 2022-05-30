import { FormControl, FormHelperText, Input, MenuItem, Select } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import React, { useEffect, useState } from 'react';
import I18n from '@iobroker/adapter-react-v5/i18n';
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

const CustomInstance = ({ multiple, value, customValue, socket, title, attr, adapter, style, onChange, className, onInstanceHide }) => {
    const [inputText, setInputText] = useState(value || 'test1');
    const [options, setOptions] = useState([]);

    useEffect(() => {
        socket && socket.getAdapterInstances(adapter)
            .then(instances => {
                const _options = instances.map(obj => ({value: obj._id.replace('system.adapter.', ''), title: obj._id.replace('system.adapter.', '')}));
                if (_options.length === 1) {
                    onInstanceHide(_options[0].value);
                } else {
                    _options.unshift({value: adapter, title: I18n.t('All')});
                }
                setOptions(_options);
            });
    }, [socket, adapter, onInstanceHide]);

    return <SelectMod
        className={className}
        fullWidth
        style={style}
    >
        <Select
            value={(customValue ? value : inputText) || '_'}
            fullWidth
            multiple={multiple}
            renderValue={(selected) => multiple && selected.join ? selected.join(', ') : selected}
            onChange={e => {
                !customValue && setInputText(e.target.value);
                onChange(e.target.value);
            }}
            input={attr ? <Input name={attr} id={attr + '-helper'} /> : <Input name={attr} />}
        >
            {options.map(item =>
                <MenuItem style={{placeContent:'space-between'}} key={'key-' + item.value} value={item.value || '_'}>{I18n.t(item.title)}{item.title2 && <div>{item.title2}</div>}</MenuItem>)}
        </Select>
        <FormHelperText>{I18n.t(title)}</FormHelperText>
    </SelectMod>;
}

CustomInstance.defaultProps = {
    value: '',
    className: null,
    table: false,
    customValue: false
};

CustomInstance.propTypes = {
    title: PropTypes.string,
    socket: PropTypes.object,
    attr: PropTypes.string,
    adapter: PropTypes.string,
    style: PropTypes.object,
    onChange: PropTypes.func,
};

export default CustomInstance;