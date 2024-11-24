import React, { useEffect, useState } from 'react';

import { FormControl, FormHelperText, Input, MenuItem, Select } from '@mui/material';

import { type AdminConnection, I18n } from '@iobroker/adapter-react-v5';

const styles: Record<string, any> = {
    formControl: {
        m: '10px 0',
        '& .MuiFormControl-marginNormal': {
            mt: 0,
            mb: 0,
        },
        '& > *': {
            color: '#2d0440 !important',
        },
        '& .MuiSelect-icon': {
            color: '#81688c',
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
};

interface CustomInstanceProps {
    multiple?: boolean;
    value: string | string[];
    customValue: boolean;
    socket: AdminConnection;
    title?: string;
    attr: string;
    adapter: string;
    style?: React.CSSProperties;
    onChange: (value: string | string[]) => void;
    onInstanceHide: (value: string) => void;
}

const CustomInstance = ({
    multiple,
    value,
    customValue,
    socket,
    title,
    attr,
    adapter,
    style,
    onChange,
    onInstanceHide,
}: CustomInstanceProps): React.JSX.Element => {
    const [inputText, setInputText] = useState(value || 'test1');
    const [options, setOptions] = useState<{ value: string; title: string }[]>([]);

    useEffect(() => {
        void socket?.getAdapterInstances(adapter).then(instances => {
            const _options = instances.map(obj => ({
                value: obj._id.replace('system.adapter.', ''),
                title: obj._id.replace('system.adapter.', ''),
            }));
            if (_options.length === 1) {
                onInstanceHide(_options[0].value);
            } else {
                _options.unshift({ value: adapter, title: I18n.t('All') });
            }
            setOptions(_options);
        });
    }, [socket, adapter, onInstanceHide]);

    return (
        <FormControl
            sx={styles.formControl}
            fullWidth
            style={style}
        >
            <Select
                variant="standard"
                value={(customValue ? value : inputText) || '_'}
                fullWidth
                multiple={multiple}
                renderValue={(selected: string | string[]): React.JSX.Element | string =>
                    multiple && Array.isArray(selected) ? selected.join(', ') : (selected as string)
                }
                onChange={e => {
                    !customValue && setInputText(e.target.value);
                    onChange(e.target.value);
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
                {options.map(item => (
                    <MenuItem
                        style={{ placeContent: 'space-between' }}
                        key={`key-${item.value}`}
                        value={item.value || '_'}
                    >
                        {I18n.t(item.title)}
                    </MenuItem>
                ))}
            </Select>
            {title ? <FormHelperText>{I18n.t(title)}</FormHelperText> : null}
        </FormControl>
    );
};

export default CustomInstance;
