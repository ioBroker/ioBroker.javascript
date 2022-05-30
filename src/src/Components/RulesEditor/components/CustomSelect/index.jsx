import { FormControl, FormHelperText, Input, MenuItem, Select } from '@mui/material';
import React, { useState } from 'react';
import I18n from '@iobroker/adapter-react-v5/i18n';
import PropTypes from 'prop-types';
import cls from './style.module.scss';
import clsx from 'clsx';
import CustomCheckbox from '../CustomCheckbox';

const CustomSelect = ({ multiple, value, customValue, title, attr, options, style, onChange, className, doNotTranslate, doNotTranslate2 }) => {
    const [inputText, setInputText] = useState(value === undefined ? options[0].value : value);

    const v = customValue ? value : inputText;
    const text = v === '' || v === null || v === undefined ? '_' : v;

    return <FormControl
        className={clsx(cls.root, className)}
        fullWidth
        style={style}
    >
        <Select
            value={text}
            fullWidth
            multiple={multiple}
            renderValue={selected => {
                if (multiple && selected.join) {
                    // sort
                    selected.sort();
                    let pos = selected.indexOf('0');
                    if (pos !== -1) {
                        selected.splice(pos, 1);
                        selected.push('0');
                    }
                    pos = selected.indexOf('_');
                    if (pos !== -1) {
                        selected.splice(pos, 1);
                        selected.unshift('_');
                    }

                    const onlyItem = options.find(el => el.only);
                    if (selected.includes(onlyItem.value)) {
                        return onlyItem.titleShort ? (doNotTranslate ? onlyItem.titleShort : I18n.t(onlyItem.titleShort)) : (doNotTranslate ? onlyItem.title : I18n.t(onlyItem.title))
                    }

                    const titles = selected
                        .map(sel => options.find(item => item.value === sel || (sel === '_' && item.value === '')) || sel)
                        .map(item => typeof item === 'object' ? (item.titleShort ? (doNotTranslate ? item.titleShort : I18n.t(item.titleShort)) : (doNotTranslate ? item.title : I18n.t(item.title))) : (doNotTranslate ? item : I18n.t(item)));

                    return titles.join(', ');
                } else {
                    const item = options ? options.find(item => item.value === selected || (selected === '_' && item.value === '')) : null;
                    return item?.title ? (doNotTranslate ? item?.title : I18n.t(item?.title)) : selected;
                }
            }}
            onChange={e => {
                !customValue && setInputText(e.target.value);
                if (multiple) {
                    const onlyItem = options.find(el => el.only);
                    if (onlyItem) {
                        const valueOnly = onlyItem.value;
                        if (e.target.value.length === options.length - 1 && e.target.value.includes(valueOnly)) {
                            return onChange(e.target.value.filter(el => el !== valueOnly), attr);
                        }
                        if (e.target.value.includes(valueOnly)) {
                            return onChange(options.map(el => el.value), attr);
                        }
                    }
                }
                onChange(e.target.value, attr);
            }}
            input={attr ? <Input name={attr} id={attr + '-helper'} /> : <Input name={attr} />}
        >
            {!multiple && options && options.map(item => <MenuItem style={{ placeContent: 'space-between' }} key={'key-' + item.value} value={item.value === '' || item.value === null || item.value === undefined ? '_' : item.value}>{doNotTranslate ? item.title : I18n.t(item.title)}{item.title2 && <div>{doNotTranslate2 ? item.title2 : I18n.t(item.title2)}</div>}</MenuItem>)}
            {multiple && options && options.map(item => <MenuItem style={{ placeContent: 'space-between' }} key={'key-' + item.value} value={item.value || '_'}>{doNotTranslate ? item.title : I18n.t(item.title)} <CustomCheckbox customValue value={value.includes(item.value)} /></MenuItem>)}
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