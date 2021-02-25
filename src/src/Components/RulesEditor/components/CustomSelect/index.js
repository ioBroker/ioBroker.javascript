import { FormControl, FormHelperText, Input, MenuItem, Select } from '@material-ui/core';
import React, { useState } from 'react';
import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import cls from './style.module.scss';
import clsx from 'clsx';
import CustomCheckbox from '../CustomCheckbox';

const CustomSelect = ({ multiple, value, customValue, title, attr, options, style, onChange, className }) => {
    const [inputText, setInputText] = useState(value || options[0].value);
    return <FormControl
        className={clsx(cls.root, className)}
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
                if (multiple && !!options.find(el => el.only)) {
                    debugger
                    const valueOnly = options.find(el => el.only).value;
                    if (e.target.value.length === options.length - 1 && e.target.value.includes(valueOnly)) {
                        return onChange(e.target.value.filter(el => el !== valueOnly));
                    }
                    if (e.target.value.includes(valueOnly)) {
                        return onChange(options.map(el => el.value));
                    }
                }
                onChange(e.target.value);
            }}
            input={<Input name={attr} id={attr + '-helper'} />}
        >
            {!multiple && options.map(item => <MenuItem style={{ placeContent: 'space-between' }} key={'key-' + item.value} value={item.value || '_'}>{I18n.t(item.title)}{item.title2 && <div>{item.title2}</div>}</MenuItem>)}
            {multiple && options.map(item => <MenuItem style={{ placeContent: 'space-between' }} key={'key-' + item.value} value={item.value || '_'}>{I18n.t(item.value)} <CustomCheckbox customValue value={value.includes(item.value)} /></MenuItem>)}
        </Select>
        {title ? <FormHelperText>{I18n.t(title)}</FormHelperText> : null}
    </FormControl>;
}

CustomSelect.defaultProps = {
    value: '',
    className: null,
    table: false,
    customValue: false,
    multiple: false
};

CustomSelect.propTypes = {
    title: PropTypes.string,
    attr: PropTypes.string,
    options: PropTypes.array.isRequired,
    style: PropTypes.object,
    onChange: PropTypes.func
};

export default CustomSelect;