import React, { useState } from 'react';
import { FormControl, FormHelperText, Input, MenuItem, Select } from '@mui/material';

import { I18n, Utils } from '@iobroker/adapter-react-v5';

import cls from './style.module.scss';
import CustomCheckbox from '../CustomCheckbox';

interface CustomSelectProps {
    multiple?: boolean;
    value?: string | string[] | number;
    customValue?: boolean;
    title?: string;
    attr: string;
    options: { title: string; titleShort?: string; title2?: string; value: string | number; only?: boolean }[];
    style?: React.CSSProperties;
    onChange: (value: string | string[] | number, attr: string) => void;
    className?: string;
    doNotTranslate?: boolean;
    doNotTranslate2?: boolean;
}

const CustomSelect = ({
    multiple,
    value,
    customValue,
    title,
    attr,
    options,
    style,
    onChange,
    className,
    doNotTranslate,
    doNotTranslate2,
}: CustomSelectProps): React.JSX.Element => {
    const [inputText, setInputText] = useState(value === undefined ? options[0].value : value);

    const v = customValue ? value : inputText;
    const text = v === '' || v === null || v === undefined ? '_' : v;

    return (
        <FormControl
            variant="standard"
            className={Utils.clsx(cls.root, className)}
            fullWidth
            style={style}
        >
            <Select
                variant="standard"
                value={text}
                fullWidth
                multiple={multiple}
                renderValue={selected => {
                    if (multiple && Array.isArray(selected)) {
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

                        if (onlyItem && selected.includes(onlyItem.value as string)) {
                            return onlyItem.titleShort
                                ? doNotTranslate
                                    ? onlyItem.titleShort
                                    : I18n.t(onlyItem.titleShort)
                                : doNotTranslate
                                  ? onlyItem.title
                                  : I18n.t(onlyItem.title);
                        }

                        const titles = selected
                            .map(
                                sel =>
                                    options.find(item => item.value === sel || (sel === '_' && item.value === '')) ||
                                    sel,
                            )
                            .map(item =>
                                typeof item === 'object'
                                    ? item.titleShort
                                        ? doNotTranslate
                                            ? item.titleShort
                                            : I18n.t(item.titleShort)
                                        : doNotTranslate
                                          ? item.title
                                          : I18n.t(item.title)
                                    : doNotTranslate
                                      ? item
                                      : I18n.t(item),
                            );

                        return titles.join(', ');
                    }
                    const item = options
                        ? options.find(item => item.value === selected || (selected === '_' && item.value === ''))
                        : null;
                    return item?.title ? (doNotTranslate ? item?.title : I18n.t(item?.title)) : selected;
                }}
                onChange={e => {
                    !customValue && setInputText(e.target.value);
                    if (multiple) {
                        const values = e.target.value as string[];
                        const onlyItem = options.find(el => el.only);

                        if (onlyItem) {
                            const valueOnly = onlyItem.value as string;

                            if (values.length === options.length - 1 && values.includes(valueOnly)) {
                                return onChange(
                                    values.filter(el => el !== valueOnly),
                                    attr,
                                );
                            }

                            if (values.includes(valueOnly)) {
                                return onChange(options.map(el => el.value) as string[], attr);
                            }
                        }
                    }
                    onChange(e.target.value, attr);
                }}
                input={
                    attr ? (
                        <Input
                            name={attr}
                            id={`${attr}-helper`}
                        />
                    ) : (
                        <Input name={attr} />
                    )
                }
            >
                {!multiple &&
                    options &&
                    options.map(item => (
                        <MenuItem
                            style={{ placeContent: 'space-between' }}
                            key={`key-${item.value}`}
                            value={
                                item.value === '' || item.value === null || item.value === undefined ? '_' : item.value
                            }
                        >
                            {doNotTranslate ? item.title : I18n.t(item.title)}
                            {item.title2 && <div>{doNotTranslate2 ? item.title2 : I18n.t(item.title2)}</div>}
                        </MenuItem>
                    ))}
                {multiple &&
                    options?.map(item => (
                        <MenuItem
                            style={{ placeContent: 'space-between' }}
                            key={`key-${item.value}`}
                            value={item.value || '_'}
                        >
                            {doNotTranslate ? item.title : I18n.t(item.title)}{' '}
                            <CustomCheckbox
                                customValue
                                value={(value as string[])?.includes(item.value as string)}
                            />
                        </MenuItem>
                    ))}
            </Select>
            {title ? <FormHelperText>{I18n.t(title)}</FormHelperText> : null}
        </FormControl>
    );
};

export default CustomSelect;
