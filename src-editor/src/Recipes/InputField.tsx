/**
 * The field for one input of a recipe: devices, states, numbers, times, ...
 */
import React, { useState } from 'react';

import {
    Autocomplete,
    Box,
    Checkbox,
    Chip,
    FormControl,
    FormControlLabel,
    FormHelperText,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import { Clear as IconClear, MoreHoriz as IconSelect } from '@mui/icons-material';

import { type AdminConnection, DialogSelectID, I18n, type IobTheme } from '@iobroker/gui-components';

import { stateFits, type FoundDevice } from './devices';
import { i18nText } from './logic';
import type { RecipeDevice, RecipeInput, RecipeValue, StateInput } from './types';

interface InputFieldProps {
    name: string;
    input: RecipeInput;
    value: RecipeValue;
    onChange: (value: RecipeValue) => void;
    /** For device inputs: the devices that fit */
    devices?: FoundDevice[];
    /** The value is missing or does not fit any more */
    error?: string;
    socket: AdminConnection;
    theme: IobTheme;
    lang: ioBroker.Languages;
}

/** "120 s" as "2 min" */
function durationText(seconds: number): string {
    if (!seconds || seconds < 60) {
        return '';
    }
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    if (minutes < 60) {
        return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
}

function StateField(props: InputFieldProps & { input: StateInput }): React.JSX.Element {
    const [selecting, setSelecting] = useState(false);
    const { input } = props;
    const ids = Array.isArray(props.value) ? (props.value as string[]) : props.value ? [props.value as string] : [];
    const hints = [
        input.role ? `${I18n.t('recipe_role')}: ${input.role}` : '',
        input.commonType ? `${I18n.t('recipe_type')}: ${input.commonType}` : '',
        input.write ? I18n.t('recipe_writable') : '',
    ].filter(Boolean);

    return (
        <>
            <TextField
                fullWidth
                variant="standard"
                label={i18nText(input.title, props.lang) || props.name}
                value={ids.join(', ')}
                error={!!props.error}
                helperText={props.error || i18nText(input.description, props.lang) || hints.join(', ')}
                onClick={() => setSelecting(true)}
                slotProps={{
                    htmlInput: { readOnly: true, style: { cursor: 'pointer' } },
                    input: {
                        endAdornment: (
                            <InputAdornment position="end">
                                {ids.length && input.optional ? (
                                    <IconButton
                                        size="small"
                                        title={I18n.t('recipe_clear')}
                                        onClick={e => {
                                            e.stopPropagation();
                                            props.onChange(input.multiple ? [] : undefined);
                                        }}
                                    >
                                        <IconClear fontSize="small" />
                                    </IconButton>
                                ) : null}
                                <IconButton
                                    size="small"
                                    title={I18n.t('recipe_select_state')}
                                >
                                    <IconSelect fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ),
                    },
                }}
            />
            {selecting ? (
                <DialogSelectID
                    imagePrefix="../.."
                    dialogName="javascriptRecipes"
                    themeType={props.theme.palette.mode}
                    theme={props.theme}
                    socket={props.socket}
                    multiSelect={!!input.multiple}
                    selected={ids}
                    filterFunc={(obj: ioBroker.Object) => stateFits(input, obj)}
                    onOk={selected => {
                        const list = (Array.isArray(selected) ? selected : [selected]).filter(Boolean) as string[];
                        props.onChange(input.multiple ? list : list[0]);
                        setSelecting(false);
                    }}
                    onClose={() => setSelecting(false)}
                />
            ) : null}
        </>
    );
}

function DeviceField(props: InputFieldProps): React.JSX.Element {
    const input = props.input as Extract<RecipeInput, { type: 'device' }>;
    const options = props.devices || [];
    const byId = (device: RecipeDevice | undefined): FoundDevice | undefined =>
        device ? options.find(option => option.device.id === device.id) || { device, room: '' } : undefined;
    const label = i18nText(input.title, props.lang) || props.name;
    const helper =
        props.error ||
        i18nText(input.description, props.lang) ||
        (options.length
            ? ''
            : I18n.t(
                  'recipe_no_devices',
                  (Array.isArray(input.deviceType) ? input.deviceType : [input.deviceType]).join(', '),
              ));
    const common = {
        options,
        groupBy: (option: FoundDevice) => option.room || I18n.t('recipe_no_room'),
        getOptionLabel: (option: FoundDevice) => option.device.name,
        isOptionEqualToValue: (a: FoundDevice, b: FoundDevice) => a.device.id === b.device.id,
        renderOption: (optionProps: React.HTMLAttributes<HTMLLIElement> & { key: React.Key }, option: FoundDevice) => {
            const { key, ...rest } = optionProps;
            return (
                <li
                    key={key || option.device.id}
                    {...rest}
                >
                    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                        <span>{option.device.name}</span>
                        <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                            {option.device.id}
                        </Typography>
                    </Box>
                    <Chip
                        size="small"
                        label={option.device.type}
                        sx={{ ml: 1 }}
                    />
                </li>
            );
        },
    };

    if (input.multiple) {
        const value = ((props.value as RecipeDevice[]) || []).map(device => byId(device)!);
        return (
            <Autocomplete
                {...common}
                multiple
                disableCloseOnSelect
                value={value}
                onChange={(_e, selected: FoundDevice[]) => props.onChange(selected.map(option => option.device))}
                renderInput={params => (
                    <TextField
                        {...params}
                        variant="standard"
                        label={label}
                        error={!!props.error}
                        helperText={helper}
                    />
                )}
            />
        );
    }
    return (
        <Autocomplete
            {...common}
            value={byId(props.value as RecipeDevice | undefined) || null}
            onChange={(_e, selected: FoundDevice | null) => props.onChange(selected?.device)}
            renderInput={params => (
                <TextField
                    {...params}
                    variant="standard"
                    label={label}
                    error={!!props.error}
                    helperText={helper}
                />
            )}
        />
    );
}

export default function InputField(props: InputFieldProps): React.JSX.Element {
    const { input, lang } = props;
    const label = i18nText(input.title, lang) || props.name;
    const description = i18nText(input.description, lang);

    switch (input.type) {
        case 'device':
            return <DeviceField {...props} />;

        case 'state':
            return (
                <StateField
                    {...props}
                    input={input}
                />
            );

        case 'number':
        case 'duration': {
            const value = props.value as number | undefined;
            const unit = input.type === 'duration' ? 's' : input.unit;
            const hint = input.type === 'duration' ? durationText(value || 0) : '';
            return (
                <TextField
                    fullWidth
                    variant="standard"
                    type="number"
                    label={label}
                    value={value ?? ''}
                    error={!!props.error}
                    helperText={props.error || [description, hint].filter(Boolean).join(' ')}
                    onChange={e => props.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    slotProps={{
                        htmlInput: {
                            min: input.min,
                            max: input.max,
                            step: input.type === 'number' ? input.step : 1,
                        },
                        input: unit
                            ? { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> }
                            : undefined,
                    }}
                />
            );
        }

        case 'boolean':
            return (
                <FormControl>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={!!props.value}
                                onChange={e => props.onChange(e.target.checked)}
                            />
                        }
                        label={label}
                    />
                    {description ? <FormHelperText>{description}</FormHelperText> : null}
                </FormControl>
            );

        case 'time':
            return (
                <TextField
                    variant="standard"
                    type="time"
                    label={label}
                    value={(props.value as string) || ''}
                    error={!!props.error}
                    helperText={props.error || description}
                    onChange={e => props.onChange(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                />
            );

        case 'select':
            return (
                <FormControl
                    fullWidth
                    variant="standard"
                    error={!!props.error}
                >
                    <InputLabel>{label}</InputLabel>
                    <Select
                        value={(props.value as string) ?? ''}
                        onChange={e => props.onChange(e.target.value)}
                    >
                        {input.options.map(option => (
                            <MenuItem
                                key={option.value}
                                value={option.value}
                            >
                                {i18nText(option.title, lang) || option.value}
                            </MenuItem>
                        ))}
                    </Select>
                    {props.error || description ? <FormHelperText>{props.error || description}</FormHelperText> : null}
                </FormControl>
            );

        default:
            return (
                <TextField
                    fullWidth
                    variant="standard"
                    label={label}
                    value={(props.value as string) ?? ''}
                    error={!!props.error}
                    helperText={props.error || description}
                    onChange={e => props.onChange(e.target.value)}
                />
            );
    }
}
