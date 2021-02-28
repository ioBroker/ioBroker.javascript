import { FormControl, FormHelperText, Input, MenuItem, Select } from '@material-ui/core';
import React, { useState } from 'react';
import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import cls from './style.module.scss';
import clsx from 'clsx';
import CustomCheckbox from '../CustomCheckbox';

const CustomSelect = ({ multiple, value, customValue, title, attr, options, style, onChange, className }) => {
    const [inputText, setInputText] = useState(value === undefined ? options[0].value : value);

    return <FormControl
        className={clsx(cls.root, className)}
        fullWidth
        style={style}
    >
        <Select
            value={(customValue ? value : inputText) || '_'}
            fullWidth
            multiple={multiple}
            renderValue={selected => {
                if (multiple && selected.join) {
                    const onlyItem = options.find(el => el.only);
                    if (selected.includes(onlyItem.value)) {
                        return onlyItem.titleShort || onlyItem.title;
                    }

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
                if (multiple) {
                    const onlyItem = options.find(el => el.only);
                    if (onlyItem) {
                        const valueOnly = onlyItem.value;
                        if (e.target.value.length === options.length - 1 && e.target.value.includes(valueOnly)) {
                            return onChange(e.target.value.filter(el => el !== valueOnly));
                        }
                        if (e.target.value.includes(valueOnly)) {
                            return onChange(options.map(el => el.value));
                        }
                    }
                }
                onChange(e.target.value);
            }}
            input={<Input name={attr} id={attr + '-helper'} />}
        >
            {!multiple && options && options.map(item => <MenuItem style={{ placeContent: 'space-between' }} key={'key-' + item.value} value={item.value || '_'}>{I18n.t(item.title)}{item.title2 && <div>{item.title2}</div>}</MenuItem>)}
            {multiple && options && options.map(item => <MenuItem style={{ placeContent: 'space-between' }} key={'key-' + item.value} value={item.value || '_'}>{I18n.t(item.title)} <CustomCheckbox customValue value={value.includes(item.value)} /></MenuItem>)}
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