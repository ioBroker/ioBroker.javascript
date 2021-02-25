import { Checkbox, FormControl, FormHelperText, Input, MenuItem, Select } from '@material-ui/core';
import React, { useState } from 'react';
import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import cls from './style.module.scss';
import clsx from 'clsx';

const CustomSelect = ({ multiple, value, customValue, title, attr, options, style, onChange, className }) => {
    const [inputText, setInputText] = useState(value || options[0].value);

    return <FormControl
        className={clsx(cls.root,className)}
        fullWidth
        style={style}
    >
        <Select
            value={customValue ? value : inputText}
            fullWidth
            multiple={multiple}
            renderValue={selected => {
                if (multiple && selected.join) {
                    const titles = selected
                        .map(sel => options.find(item => item.value === sel || (sel === '_' && item.value === '')) || sel)
                        .map(item => typeof item === 'object' ? item.titleShort || item.title : item);

                    return titles.join(', ');
                } else {
                    const item = options ? options.find(item => item.value === selected || (selected === '_' && item.value === '')) : null;
                    return item?.title || selected;
                }
            }}
            onChange={e => {
                !customValue && setInputText(e.target.value);
                onChange(e.target.value);
            }}
            input={<Input name={attr} id={attr + '-helper'} />}
        >
            {!multiple && options && options.map(item => <MenuItem style={{placeContent: 'space-between'}} key={'key-' + item.value} value={item.value || '_'}>{I18n.t(item.title)}{item.title2 && <span>{item.title2}</span>}</MenuItem>)}
            { multiple && options && options.map(item => <MenuItem key={'key-' + item} value={item || '_'}>{I18n.t(item)} <Checkbox checked={inputText.includes(item)} /></MenuItem>)}
        </Select>
        {title ? <FormHelperText>{I18n.t(title)}</FormHelperText> : null}
    </FormControl>;
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