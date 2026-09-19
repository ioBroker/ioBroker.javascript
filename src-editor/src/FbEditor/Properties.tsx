import React, { useEffect, useState } from 'react';

import {
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    IconButton,
    MenuItem,
    TextField,
    Typography,
    InputAdornment,
} from '@mui/material';
import { Delete as IconDelete, ListAlt as IconSelectId } from '@mui/icons-material';

import {
    DialogSelectID,
    I18n,
    type AdminConnection,
    type IobTheme,
    type ThemeName,
    type ThemeType,
} from '@iobroker/gui-components';

import {
    FB_CYCLE_MAX_MS,
    FB_CYCLE_MIN_MS,
    formatTime,
    getBlockDef,
    getInputs,
    parseTime,
    resolvePinType,
    type FbBlock,
    type FbCycle,
    type FbParamDef,
    type FbSignalType,
    type FbValue,
} from '@fb-core';

import type { FbEdge, FbNode } from './convert';

interface PropertiesProps {
    node: FbNode | null;
    edge: FbEdge | null;
    /** Inputs of the selected block that are connected - they have no value of their own */
    connectedInputs: Set<string>;
    cycle: FbCycle;
    /** The mode the diagram actually runs in */
    mode: 'cyclic' | 'event';
    onCycleChange: (cycle: FbCycle) => void;
    onBlockChange: (block: FbBlock) => void;
    onCommentChange: (id: string, text: string) => void;
    onDelete: () => void;
    socket: AdminConnection;
    theme: IobTheme;
    themeName: ThemeName;
    themeType: ThemeType;
}

/** A text field that accepts its value only when it is valid, on Enter or when it loses the focus */
function ValueField(props: {
    label: string;
    value: FbValue | undefined;
    type: FbSignalType | 'ANY';
    onChange: (value: FbValue) => void;
}): React.JSX.Element {
    const { label, value, type, onChange } = props;
    const format = (v: FbValue | undefined): string =>
        type === 'TIME' && typeof v === 'number' ? formatTime(v) : v === undefined ? '' : String(v);
    const [text, setText] = useState(format(value));
    useEffect(() => setText(format(value)), [value]); // eslint-disable-line react-hooks/exhaustive-deps

    const parse = (input: string): FbValue | null => {
        switch (type) {
            case 'TIME':
                return parseTime(input);
            case 'INT':
                return /^-?\d+$/.test(input.trim()) ? parseInt(input, 10) : null;
            case 'REAL':
                return input.trim() !== '' && Number.isFinite(Number(input)) ? Number(input) : null;
            default:
                return input;
        }
    };
    const invalid = parse(text) === null;
    const commit = (): void => {
        const parsed = parse(text);
        if (parsed !== null && parsed !== value) {
            onChange(parsed);
        }
    };

    return (
        <TextField
            variant="standard"
            size="small"
            fullWidth
            label={label}
            value={text}
            error={invalid}
            helperText={invalid ? I18n.t(type === 'TIME' ? 'fbd_invalid_time' : 'fbd_invalid_number') : undefined}
            onChange={event => setText(event.target.value)}
            onBlur={commit}
            onKeyDown={event => event.key === 'Enter' && commit()}
            sx={{ mb: 1 }}
        />
    );
}

function BlockProperties(
    props: PropertiesProps & { block: FbBlock; onSelectId: (param: string) => void },
): React.JSX.Element {
    const { block, onBlockChange, connectedInputs } = props;
    const def = getBlockDef(block.type);
    const [name, setName] = useState(block.name);
    useEffect(() => setName(block.name), [block.name]);

    if (!def) {
        return <Typography color="error">{I18n.t('Unknown block type %s', block.type)}</Typography>;
    }

    const setParam = (id: string, value: FbValue): void =>
        onBlockChange({ ...block, params: { ...block.params, [id]: value } });

    const renderParam = (param: FbParamDef): React.JSX.Element | null => {
        const value = block.params?.[param.id] ?? param.default;
        const label = I18n.t(`fbd_param_${param.id}`);
        if (param.type === 'OID') {
            return (
                <TextField
                    key={param.id}
                    variant="standard"
                    size="small"
                    fullWidth
                    label={label}
                    value={value === undefined ? '' : String(value)}
                    error={param.required && !value}
                    onChange={event => setParam(param.id, event.target.value.trim())}
                    sx={{ mb: 1 }}
                    slotProps={{
                        input: {
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        title={I18n.t('fbd_select_state')}
                                        onClick={() => props.onSelectId(param.id)}
                                    >
                                        <IconSelectId fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        },
                    }}
                />
            );
        }
        if (param.type === 'ENUM') {
            return (
                <TextField
                    key={param.id}
                    select
                    variant="standard"
                    size="small"
                    fullWidth
                    label={label}
                    value={value === undefined ? '' : String(value)}
                    onChange={event => setParam(param.id, event.target.value)}
                    sx={{ mb: 1 }}
                >
                    {(param.options || []).map(option => (
                        <MenuItem
                            key={option}
                            value={option}
                        >
                            {option}
                        </MenuItem>
                    ))}
                </TextField>
            );
        }
        const type = resolvePinType(block, param.type, def);
        if (type === 'BOOL') {
            return (
                <FormControlLabel
                    key={param.id}
                    control={
                        <Checkbox
                            size="small"
                            checked={value === true}
                            onChange={event => setParam(param.id, event.target.checked)}
                        />
                    }
                    label={label}
                />
            );
        }
        return (
            <ValueField
                key={`${param.id}-${type}`}
                label={label}
                value={value}
                type={type}
                onChange={v => setParam(param.id, v)}
            />
        );
    };

    const inputs = getInputs(block, def);

    return (
        <>
            <Typography
                variant="subtitle2"
                sx={{ mb: 1 }}
            >
                {block.type} - {I18n.t(`fbd_desc_${block.type}`)}
            </Typography>
            <TextField
                variant="standard"
                size="small"
                fullWidth
                label={I18n.t('fbd_instance_name')}
                value={name}
                onChange={event => setName(event.target.value)}
                onBlur={() => name.trim() && name !== block.name && onBlockChange({ ...block, name: name.trim() })}
                onKeyDown={event =>
                    event.key === 'Enter' && name.trim() && onBlockChange({ ...block, name: name.trim() })
                }
                sx={{ mb: 1 }}
            />
            {(def.params || []).map(renderParam)}
            {def.extensible ? (
                <TextField
                    select
                    variant="standard"
                    size="small"
                    fullWidth
                    label={I18n.t('fbd_param_inputs')}
                    value={inputs.length}
                    onChange={event => setParam('inputs', Number(event.target.value))}
                    sx={{ mb: 1 }}
                >
                    {Array.from(
                        { length: def.extensible.max - def.extensible.min + 1 },
                        (_, i) => def.extensible!.min + i,
                    ).map(count => (
                        <MenuItem
                            key={count}
                            value={count}
                        >
                            {count}
                        </MenuItem>
                    ))}
                </TextField>
            ) : null}
            {inputs.length ? (
                <Typography
                    variant="caption"
                    component="div"
                    sx={{ mt: 1, opacity: 0.7 }}
                >
                    {I18n.t('fbd_inputs')}
                </Typography>
            ) : null}
            {inputs.map(pin => (
                <Box key={pin.id}>
                    {connectedInputs.has(pin.id) ? (
                        <Typography
                            variant="body2"
                            sx={{ mb: 1 }}
                        >
                            {pin.id}: {I18n.t('fbd_connected')}
                        </Typography>
                    ) : pin.type === 'BOOL' ? (
                        <FormControlLabel
                            control={
                                <Checkbox
                                    size="small"
                                    checked={(block.params?.[pin.id] ?? pin.default) === true}
                                    onChange={event => setParam(pin.id, event.target.checked)}
                                />
                            }
                            label={pin.id}
                        />
                    ) : (
                        <ValueField
                            label={`${pin.id} (${pin.type})`}
                            value={block.params?.[pin.id] ?? pin.default}
                            type={pin.type}
                            onChange={value => setParam(pin.id, value)}
                        />
                    )}
                    {pin.type === 'BOOL' ? (
                        <FormControlLabel
                            sx={{ ml: 0, mt: -1, mb: 0.5 }}
                            control={
                                <Checkbox
                                    size="small"
                                    checked={!!block.pins?.[pin.id]?.inverted}
                                    onChange={event =>
                                        onBlockChange({
                                            ...block,
                                            pins: { ...block.pins, [pin.id]: { inverted: event.target.checked } },
                                        })
                                    }
                                />
                            }
                            label={<Typography variant="caption">{I18n.t('fbd_inverted', pin.id)}</Typography>}
                        />
                    ) : null}
                </Box>
            ))}
        </>
    );
}

/** The settings of what is selected, or of the diagram when nothing is */
export default function Properties(props: PropertiesProps): React.JSX.Element {
    const { node, edge, cycle, mode, onCycleChange } = props;
    const [selectId, setSelectId] = useState<string | null>(null);
    const block = node?.type === 'fbBlock' ? node.data.block : null;

    let content: React.JSX.Element;
    if (block) {
        content = (
            <BlockProperties
                {...props}
                block={block}
                onSelectId={setSelectId}
            />
        );
    } else if (node?.type === 'fbComment') {
        content = (
            <TextField
                variant="outlined"
                size="small"
                fullWidth
                multiline
                minRows={4}
                label={I18n.t('fbd_comment')}
                value={node.data.text}
                onChange={event => props.onCommentChange(node.id, event.target.value)}
            />
        );
    } else if (edge) {
        content = (
            <Typography variant="body2">
                {edge.source}.{edge.sourceHandle} → {edge.target}.{edge.targetHandle}
            </Typography>
        );
    } else {
        content = (
            <>
                <Typography
                    variant="subtitle2"
                    sx={{ mb: 1 }}
                >
                    {I18n.t('fbd_diagram')}
                </Typography>
                <TextField
                    select
                    variant="standard"
                    size="small"
                    fullWidth
                    label={I18n.t('fbd_cycle_mode')}
                    value={cycle.mode}
                    onChange={event => onCycleChange({ ...cycle, mode: event.target.value as FbCycle['mode'] })}
                    helperText={I18n.t(mode === 'cyclic' ? 'fbd_runs_cyclic' : 'fbd_runs_event')}
                    sx={{ mb: 2 }}
                >
                    <MenuItem value="auto">{I18n.t('fbd_mode_auto')}</MenuItem>
                    <MenuItem value="cyclic">{I18n.t('fbd_mode_cyclic')}</MenuItem>
                    <MenuItem value="event">{I18n.t('fbd_mode_event')}</MenuItem>
                </TextField>
                {mode === 'cyclic' ? (
                    <TextField
                        variant="standard"
                        size="small"
                        fullWidth
                        type="number"
                        label={I18n.t('fbd_cycle_time')}
                        value={cycle.ms}
                        slotProps={{ htmlInput: { min: FB_CYCLE_MIN_MS, max: FB_CYCLE_MAX_MS, step: 50 } }}
                        onChange={event => onCycleChange({ ...cycle, ms: Number(event.target.value) || 0 })}
                        helperText={`${FB_CYCLE_MIN_MS} - ${FB_CYCLE_MAX_MS} ms`}
                    />
                ) : null}
            </>
        );
    }

    return (
        <Box className="fb-properties">
            {content}
            {node || edge ? (
                <Button
                    size="small"
                    color="error"
                    startIcon={<IconDelete />}
                    onClick={props.onDelete}
                    sx={{ mt: 2 }}
                >
                    {I18n.t('Delete')}
                </Button>
            ) : null}
            {selectId && block ? (
                <DialogSelectID
                    theme={props.theme}
                    imagePrefix="../.."
                    themeName={props.themeName}
                    themeType={props.themeType}
                    socket={props.socket}
                    selected={String(block.params?.[selectId] || '')}
                    types={['state']}
                    onClose={() => setSelectId(null)}
                    onOk={selected => {
                        const oid = Array.isArray(selected) ? selected[0] : selected;
                        setSelectId(null);
                        if (oid) {
                            void applyState(block, selectId, oid, props);
                        }
                    }}
                />
            ) : null}
        </Box>
    );
}

/**
 * Takes a state for a block. A STATE_IN also takes the type of the state, and a block that still has
 * its generated name is named after the state.
 */
async function applyState(block: FbBlock, param: string, oid: string, props: PropertiesProps): Promise<void> {
    const changed: FbBlock = { ...block, params: { ...block.params, [param]: oid } };
    try {
        const obj = await props.socket.getObject(oid);
        const common = obj?.common as ioBroker.StateCommon | undefined;
        if (block.type === 'STATE_IN' && common?.type) {
            const types: Record<string, FbSignalType> = { boolean: 'BOOL', number: 'REAL', string: 'STRING' };
            if (types[common.type]) {
                changed.params!.type = types[common.type];
            }
        }
        if (new RegExp(`^${block.type}_\\d+$`).test(block.name)) {
            changed.name = oid.split('.').pop() || block.name;
        }
    } catch {
        // the state stays selected even if its object cannot be read
    }
    props.onBlockChange(changed);
}
