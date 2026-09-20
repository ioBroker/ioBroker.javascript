import React, { useEffect, useState } from 'react';

import {
    Autocomplete,
    Box,
    Button,
    Checkbox,
    IconButton,
    InputAdornment,
    MenuItem,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import {
    Delete as IconDelete,
    ExpandLess as IconOpen,
    ExpandMore as IconClosed,
    ListAlt as IconSelectId,
    Schedule as IconCron,
} from '@mui/icons-material';

import {
    DialogCron,
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
    checkJsCode,
    formatClock,
    formatTime,
    jsParameters,
    getBlockDef,
    getInputs,
    getOutputs,
    createBlockInfo,
    resolvePinType,
    type FbBlock,
    type FbBlockDef,
    type FbBlockInfo,
    type FbCycle,
    type FbDebugCommand,
    type FbDebugStatus,
    type FbParamDef,
    type FbSignalType,
    type FbUserBlock,
    type FbValue,
} from '@fb-core';

import { parseValue } from './BlockNode';
import Preview from './Preview';
import type { FbEdge, FbNode } from './convert';
import { LiveText } from './online';
import { previewOf } from './timing';

/** A user block that another diagram of the installation defines */
export interface FbLibraryEntry {
    /** The script with the diagram of the block */
    scriptId: string;
    user: FbUserBlock;
    /** The copies of the blocks it uses itself */
    userBlocks: Record<string, FbUserBlock>;
}

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
    /** Set when the diagram is a block */
    blockInfo: FbBlockInfo | undefined;
    /** `undefined`: the diagram is no block any more */
    onBlockInfoChange: (info: FbBlockInfo | undefined) => void;
    /** Name of the script, the name a new block starts with */
    scriptName: string;
    /** The copies of the user blocks the diagram carries */
    userBlocks: Record<string, FbUserBlock>;
    /** The user blocks of the installation, by type */
    library: Record<string, FbLibraryEntry>;
    /** Takes the newest version of a user block into the diagram */
    onUpdateUserBlock: (type: string) => void;
    onOpenScript?: (scriptId: string) => void;
    /** Shows an instance of a user block from inside */
    onOpenInstance: (block: FbBlock) => void;
    /** The selected link, as the diagram sees it */
    edgeView: { type: FbSignalType | 'ANY'; name: string; from: string; to: string } | null;
    onEdgeChange: (edge: FbEdge) => void;
    /** Shown online, and the runtime answers: values can be forced, breakpoints set */
    online: boolean;
    debug: FbDebugStatus | null;
    onCommand: (command: FbDebugCommand) => void;
    /** Changes when the gear of a block was clicked: the properties show */
    showProperties: number;
    socket: AdminConnection;
    theme: IobTheme;
    themeName: ThemeName;
    themeType: ThemeType;
}

const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** An option of a choice for people, where there is a text for it - a type name like BOOL stays as it is */
function optionLabel(option: string): string {
    const key = `fbd_option_${option}`;
    const text = I18n.t(key);
    return text === key ? option : text;
}

/** The sections that are closed, kept by the browser */
const CLOSED_KEY = 'FbEditor.properties.closed';

function closedSections(): string[] {
    try {
        return JSON.parse(window.localStorage.getItem(CLOSED_KEY) || '[]') as string[];
    } catch {
        return [];
    }
}

/** A part of the properties that opens and closes */
export function Section(props: { id: string; title: string; children: React.ReactNode }): React.JSX.Element {
    const [open, setOpen] = useState(() => !closedSections().includes(props.id));
    const toggle = (): void => {
        setOpen(!open);
        try {
            const closed = closedSections().filter(id => id !== props.id);
            window.localStorage.setItem(CLOSED_KEY, JSON.stringify(open ? [...closed, props.id] : closed));
        } catch {
            // open or closed for now
        }
    };
    return (
        <div className="fb-section">
            <div
                className="fb-section-head"
                onClick={toggle}
            >
                {open ? <IconOpen /> : <IconClosed />}
                <span>{props.title}</span>
            </div>
            {open ? <div className="fb-section-body">{props.children}</div> : null}
        </div>
    );
}

/** A label on the left, the field on the right */
export function Row(props: {
    label: React.ReactNode;
    hint?: React.ReactNode;
    children: React.ReactNode;
}): React.JSX.Element {
    return (
        <div className="fb-row">
            <div className="fb-row-label">{props.label}</div>
            <div className="fb-row-field">
                {props.children}
                {props.hint ? <div className="fb-row-hint">{props.hint}</div> : null}
            </div>
        </div>
    );
}

/** A text field that accepts its value only when it is valid, on Enter or when it loses the focus */
function ValueField(props: {
    value: FbValue | undefined;
    type: FbSignalType | 'ANY';
    /** A TIME that is a time of day */
    clock?: boolean;
    onChange: (value: FbValue) => void;
}): React.JSX.Element {
    const { value, type, onChange } = props;
    const format = (v: FbValue | undefined): string => {
        if (type === 'TIME' && typeof v === 'number') {
            return props.clock ? formatClock(v) : formatTime(v);
        }
        return v === undefined ? '' : String(v);
    };
    const [text, setText] = useState(format(value));
    useEffect(() => setText(format(value)), [value]); // eslint-disable-line react-hooks/exhaustive-deps

    const invalid = parseValue(text, type) === null;
    const commit = (): void => {
        const parsed = parseValue(text, type);
        if (parsed !== null && parsed !== value) {
            onChange(parsed);
        }
    };

    return (
        <TextField
            size="small"
            fullWidth
            value={text}
            error={invalid}
            placeholder={props.clock ? '08:30' : type}
            helperText={invalid ? I18n.t(type === 'TIME' ? 'fbd_invalid_time' : 'fbd_invalid_number') : undefined}
            onChange={event => setText(event.target.value)}
            onBlur={commit}
            onKeyDown={event => event.key === 'Enter' && commit()}
        />
    );
}

/** A text field that hands its text up when it loses the focus or on Enter */
function CommitField(props: {
    value: string;
    placeholder?: string;
    multiline?: boolean;
    error?: boolean;
    helperText?: string;
    endAdornment?: React.ReactNode;
    onCommit: (value: string) => void;
}): React.JSX.Element {
    const { value, onCommit } = props;
    const [text, setText] = useState(value);
    useEffect(() => setText(value), [value]);
    return (
        <TextField
            size="small"
            fullWidth
            multiline={props.multiline}
            minRows={props.multiline ? 2 : undefined}
            placeholder={props.placeholder}
            value={text}
            error={props.error}
            helperText={props.helperText}
            onChange={event => setText(event.target.value)}
            onBlur={() => text !== value && onCommit(text)}
            onKeyDown={event => !props.multiline && event.key === 'Enter' && text !== value && onCommit(text)}
            slotProps={props.endAdornment ? { input: { endAdornment: props.endAdornment } } : undefined}
        />
    );
}

/** The adapter instances there are, asked for once */
let instancesPromise: Promise<string[]> | null = null;

/** An adapter instance to send to: one of the list, or typed in */
function InstanceField(props: {
    value: string;
    socket: AdminConnection;
    onChange: (value: string) => void;
}): React.JSX.Element {
    const [instances, setInstances] = useState<string[]>([]);
    useEffect(() => {
        let mounted = true;
        instancesPromise ||= props.socket
            .getAdapterInstances()
            .then(list =>
                (list || [])
                    // the ones that take messages first
                    .sort((a, b) => Number(!!b?.common?.messagebox) - Number(!!a?.common?.messagebox))
                    .map(obj => obj?._id?.replace('system.adapter.', ''))
                    .filter((id): id is string => !!id),
            )
            .catch(() => []);
        void instancesPromise.then(list => mounted && setInstances(list));
        return () => {
            mounted = false;
        };
    }, [props.socket]);

    return (
        <Autocomplete
            freeSolo
            size="small"
            fullWidth
            options={instances}
            value={props.value}
            onChange={(_event, value) => props.onChange((value || '').trim())}
            onInputChange={(_event, value, reason) => reason === 'input' && props.onChange(value.trim())}
            renderInput={params => (
                <TextField
                    {...params}
                    error={!props.value}
                    placeholder="telegram.0"
                />
            )}
        />
    );
}

/** A cron pattern, typed in or put together in the dialog */
function CronField(props: { value: string; theme: IobTheme; onChange: (value: string) => void }): React.JSX.Element {
    const [dialog, setDialog] = useState(false);
    return (
        <>
            <CommitField
                value={props.value}
                placeholder="0 8 * * *"
                error={!props.value.trim()}
                onCommit={value => props.onChange(value.trim())}
                endAdornment={
                    <InputAdornment position="end">
                        <IconButton
                            size="small"
                            title={I18n.t('fbd_cron_dialog')}
                            onClick={() => setDialog(true)}
                        >
                            <IconCron fontSize="small" />
                        </IconButton>
                    </InputAdornment>
                }
            />
            {dialog ? (
                <DialogCron
                    theme={props.theme}
                    cron={props.value}
                    noWizard
                    onClose={() => setDialog(false)}
                    onOk={cron => {
                        setDialog(false);
                        props.onChange(cron);
                    }}
                />
            ) : null}
        </>
    );
}

/** The code of a JS block, checked while it is typed */
function CodeField(props: {
    value: string;
    parameters: string[];
    onChange: (value: string) => void;
}): React.JSX.Element {
    const { value, parameters, onChange } = props;
    const [text, setText] = useState(value);
    useEffect(() => setText(value), [value]);
    const error = checkJsCode(text, parameters);
    return (
        <TextField
            size="small"
            fullWidth
            multiline
            minRows={6}
            maxRows={20}
            value={text}
            error={!!error}
            helperText={error || I18n.t('fbd_code_hint', parameters.join(', '))}
            onChange={event => setText(event.target.value)}
            onBlur={() => text !== value && onChange(text)}
            onKeyDown={event => {
                // a tab indents instead of leaving the field
                if (event.key === 'Tab' && !event.shiftKey) {
                    event.preventDefault();
                    const target = event.target as HTMLTextAreaElement;
                    const { selectionStart, selectionEnd } = target;
                    setText(`${text.substring(0, selectionStart)}    ${text.substring(selectionEnd)}`);
                    window.requestAnimationFrame(() =>
                        target.setSelectionRange(selectionStart + 4, selectionStart + 4),
                    );
                }
            }}
            slotProps={{ htmlInput: { spellCheck: false, className: 'fb-code' } }}
        />
    );
}

/** The live value of a signal, and forcing it to a value or letting it go */
export function ForceControls(props: {
    label: string;
    signal: string;
    type: FbSignalType | 'ANY';
    debug: FbDebugStatus;
    onCommand: (command: FbDebugCommand) => void;
}): React.JSX.Element {
    const { signal, type, debug, onCommand } = props;
    const forced = Object.prototype.hasOwnProperty.call(debug.forced, signal);
    const [text, setText] = useState('');
    const value = parseValue(text, type);
    const force = (forcedValue: FbValue): void => onCommand({ command: 'force', signal, value: forcedValue });

    return (
        <Box className="fb-force">
            <Typography variant="body2">
                {props.label} ={' '}
                <LiveText
                    signal={signal}
                    type={type}
                />
                {forced ? (
                    <Typography
                        component="span"
                        variant="caption"
                        color="warning"
                    >
                        {' '}
                        {I18n.t('fbd_debug_forced')}
                    </Typography>
                ) : null}
            </Typography>
            <Box className="fb-force-row">
                {type === 'BOOL' ? (
                    <>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => force(true)}
                        >
                            TRUE
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => force(false)}
                        >
                            FALSE
                        </Button>
                    </>
                ) : (
                    <>
                        <TextField
                            size="small"
                            value={text}
                            placeholder={type}
                            error={!!text && value === null}
                            onChange={event => setText(event.target.value)}
                            onKeyDown={event => event.key === 'Enter' && value !== null && force(value)}
                            sx={{ width: 100 }}
                        />
                        <Button
                            size="small"
                            variant="outlined"
                            disabled={value === null || (!text && type !== 'STRING')}
                            onClick={() => value !== null && force(value)}
                        >
                            {I18n.t('fbd_debug_force')}
                        </Button>
                    </>
                )}
                {forced ? (
                    <Button
                        size="small"
                        color="warning"
                        onClick={() => onCommand({ command: 'release', signal })}
                    >
                        {I18n.t('fbd_debug_release')}
                    </Button>
                ) : null}
            </Box>
        </Box>
    );
}

/** Online: the breakpoint of a block and its outputs to force */
function OnlineSection(props: PropertiesProps & { block: FbBlock; def: FbBlockDef }): React.JSX.Element | null {
    const { block, def, debug, onCommand } = props;
    if (!debug) {
        return null;
    }
    const outputs = getOutputs(block, def);
    return (
        <Section
            id="online"
            title={I18n.t('fbd_online')}
        >
            <Row
                label={I18n.t('fbd_debug_breakpoint')}
                hint={I18n.t(debug.breaks ? 'fbd_debug_breakpoint_hint' : 'fbd_debug_save_once')}
            >
                <Switch
                    size="small"
                    disabled={!debug.breaks}
                    checked={debug.breakpoints.includes(block.id)}
                    onChange={event => onCommand({ command: 'breakpoint', block: block.id, on: event.target.checked })}
                />
            </Row>
            {outputs.map(pin => (
                <ForceControls
                    key={pin.id}
                    label={pin.id}
                    signal={`${block.id}.${pin.id}`}
                    type={pin.type}
                    debug={debug}
                    onCommand={onCommand}
                />
            ))}
            {outputs.length ? <div className="fb-row-hint">{I18n.t('fbd_debug_force_hint')}</div> : null}
        </Section>
    );
}

/** A link: from where to where, and whether it is drawn as a connection mark */
function EdgeProperties(props: PropertiesProps & { edge: FbEdge }): React.JSX.Element {
    const { edge, edgeView, onEdgeChange, debug } = props;
    const mark = !!edge.data?.mark;
    return (
        <>
            <Section
                id="link"
                title={I18n.t('fbd_link')}
            >
                <Row label={I18n.t('fbd_link_from_to')}>
                    <Typography variant="body2">
                        {edgeView ? `${edgeView.from} → ${edgeView.to}` : `${edge.source} → ${edge.target}`}
                    </Typography>
                </Row>
                {edgeView ? (
                    <Row label={I18n.t('fbd_type')}>
                        <Typography variant="body2">{edgeView.type}</Typography>
                    </Row>
                ) : null}
                <Row
                    label={I18n.t('fbd_link_mark_short')}
                    hint={I18n.t('fbd_link_mark_hint')}
                >
                    <Switch
                        size="small"
                        checked={mark}
                        onChange={event =>
                            onEdgeChange({ ...edge, data: { ...edge.data, mark: event.target.checked } })
                        }
                    />
                </Row>
                {mark ? (
                    <Row label={I18n.t('fbd_link_label')}>
                        <CommitField
                            value={edge.data?.label || ''}
                            placeholder={edgeView?.name}
                            onCommit={label =>
                                onEdgeChange({ ...edge, data: { ...edge.data, label: label.trim() || undefined } })
                            }
                        />
                    </Row>
                ) : null}
            </Section>
            {props.online && debug && edgeView ? (
                <Section
                    id="online"
                    title={I18n.t('fbd_online')}
                >
                    <ForceControls
                        label={edgeView.from}
                        signal={`${edge.source}.${edge.sourceHandle}`}
                        type={edgeView.type}
                        debug={debug}
                        onCommand={props.onCommand}
                    />
                </Section>
            ) : null}
        </>
    );
}

function BlockProperties(
    props: PropertiesProps & { block: FbBlock; onSelectId: (param: string) => void },
): React.JSX.Element {
    const { block, onBlockChange, connectedInputs } = props;
    const def = getBlockDef(block.type, props.userBlocks);

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
                <Row
                    key={param.id}
                    label={label}
                >
                    <TextField
                        size="small"
                        fullWidth
                        value={value === undefined ? '' : String(value)}
                        error={param.required && !value}
                        onChange={event => setParam(param.id, event.target.value.trim())}
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
                </Row>
            );
        }
        if (param.type === 'ENUM') {
            return (
                <Row
                    key={param.id}
                    label={label}
                >
                    <TextField
                        select
                        size="small"
                        fullWidth
                        value={value === undefined ? '' : String(value)}
                        onChange={event => setParam(param.id, event.target.value)}
                    >
                        {(param.options || []).map(option => (
                            <MenuItem
                                key={option}
                                value={option}
                            >
                                {optionLabel(option)}
                            </MenuItem>
                        ))}
                    </TextField>
                </Row>
            );
        }
        if (param.type === 'NAME') {
            const text = value === undefined ? '' : String(value);
            return (
                <Row
                    key={param.id}
                    label={label}
                >
                    <TextField
                        size="small"
                        fullWidth
                        value={text}
                        error={!NAME_PATTERN.test(text)}
                        helperText={NAME_PATTERN.test(text) ? undefined : I18n.t('fbd_invalid_name')}
                        onChange={event => setParam(param.id, event.target.value.trim())}
                    />
                </Row>
            );
        }
        if (param.type === 'INSTANCE') {
            return (
                <Row
                    key={param.id}
                    label={label}
                >
                    <InstanceField
                        value={value === undefined ? '' : String(value)}
                        socket={props.socket}
                        onChange={instance => setParam(param.id, instance)}
                    />
                </Row>
            );
        }
        if (param.type === 'CRON') {
            return (
                <Row
                    key={param.id}
                    label={label}
                    hint={I18n.t('fbd_cron_hint')}
                >
                    <CronField
                        value={value === undefined ? '' : String(value)}
                        theme={props.theme}
                        onChange={cron => setParam(param.id, cron)}
                    />
                </Row>
            );
        }
        if (param.type === 'CODE') {
            return (
                <div
                    key={param.id}
                    className="fb-code-row"
                >
                    <CodeField
                        value={value === undefined ? '' : String(value)}
                        parameters={jsParameters(block, def)}
                        onChange={code => setParam(param.id, code)}
                    />
                </div>
            );
        }
        const type = resolvePinType(block, param.type, def);
        return (
            <Row
                key={param.id}
                label={label}
                hint={param.id.endsWith('Offset') ? I18n.t('fbd_offset_hint') : undefined}
            >
                {type === 'BOOL' ? (
                    <Switch
                        size="small"
                        checked={value === true}
                        onChange={event => setParam(param.id, event.target.checked)}
                    />
                ) : (
                    <ValueField
                        key={`${param.id}-${type}`}
                        value={value}
                        type={type}
                        onChange={v => setParam(param.id, v)}
                    />
                )}
            </Row>
        );
    };

    const inputs = getInputs(block, def);
    const user = def.user;
    const newest = user ? props.library[user.type] : undefined;
    const hasPreview = !!previewOf(block, def);

    return (
        <>
            <Section
                id="general"
                title={I18n.t('fbd_section_general')}
            >
                <Row label={I18n.t('fbd_name')}>
                    <CommitField
                        value={block.name}
                        onCommit={name => name.trim() && onBlockChange({ ...block, name: name.trim() })}
                    />
                </Row>
                <Row label={I18n.t('fbd_type')}>
                    <TextField
                        size="small"
                        fullWidth
                        disabled
                        value={
                            user
                                ? `${user.name} (v${user.version})`
                                : `${block.type} - ${I18n.t(`fbd_desc_${block.type}`)}`
                        }
                        title={user ? user.description : I18n.t(`fbd_desc_${block.type}`)}
                    />
                </Row>
                <Row label={I18n.t('fbd_comment_field')}>
                    <CommitField
                        value={block.comment || ''}
                        placeholder={I18n.t('fbd_comment_placeholder')}
                        multiline
                        onCommit={comment => {
                            const next = { ...block, comment: comment.trim() || undefined };
                            if (!next.comment) {
                                delete next.comment;
                            }
                            onBlockChange(next);
                        }}
                    />
                </Row>
                {user ? (
                    <Box className="fb-row-actions">
                        {newest && newest.user.version > user.version ? (
                            <>
                                <Typography
                                    variant="body2"
                                    color="warning"
                                    component="div"
                                >
                                    {I18n.t('fbd_block_newer', newest.user.version)}
                                </Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => props.onUpdateUserBlock(user.type)}
                                    title={I18n.t('fbd_block_update_hint')}
                                >
                                    {I18n.t('fbd_block_update')}
                                </Button>
                            </>
                        ) : null}
                        <Button
                            size="small"
                            onClick={() => props.onOpenInstance(block)}
                            title={I18n.t('fbd_instance_open_hint')}
                        >
                            {I18n.t('fbd_instance_open')}
                        </Button>
                        {newest && props.onOpenScript ? (
                            <Button
                                size="small"
                                onClick={() => props.onOpenScript!(newest.scriptId)}
                            >
                                {I18n.t('fbd_block_open')}
                            </Button>
                        ) : null}
                    </Box>
                ) : null}
            </Section>
            {props.online ? (
                <OnlineSection
                    {...props}
                    block={block}
                    def={def}
                />
            ) : null}
            {def.params?.length || def.extensible || def.extensibleOutputs ? (
                <Section
                    id="params"
                    title={I18n.t('fbd_section_params')}
                >
                    {(def.params || []).map(renderParam)}
                    {def.extensible ? (
                        <Row label={I18n.t('fbd_param_inputs')}>
                            <TextField
                                select
                                size="small"
                                fullWidth
                                value={inputs.length}
                                onChange={event => setParam('inputs', Number(event.target.value))}
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
                        </Row>
                    ) : null}
                    {def.extensibleOutputs ? (
                        <Row label={I18n.t('fbd_param_outputs')}>
                            <TextField
                                select
                                size="small"
                                fullWidth
                                value={getOutputs(block, def).length}
                                onChange={event => setParam('outputs', Number(event.target.value))}
                            >
                                {Array.from(
                                    { length: def.extensibleOutputs.max - def.extensibleOutputs.min + 1 },
                                    (_, i) => def.extensibleOutputs!.min + i,
                                ).map(count => (
                                    <MenuItem
                                        key={count}
                                        value={count}
                                    >
                                        {count}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Row>
                    ) : null}
                </Section>
            ) : null}
            {inputs.length ? (
                <Section
                    id="inputs"
                    title={I18n.t('fbd_inputs')}
                >
                    {inputs.map(pin => (
                        <Row
                            key={pin.id}
                            label={`${pin.id} (${pin.type})`}
                        >
                            <div className="fb-input-field">
                                {connectedInputs.has(pin.id) ? (
                                    <Typography
                                        variant="body2"
                                        className="fb-dim"
                                    >
                                        {I18n.t('fbd_connected')}
                                    </Typography>
                                ) : pin.type === 'BOOL' ? (
                                    <Switch
                                        size="small"
                                        checked={(block.params?.[pin.id] ?? pin.default) === true}
                                        onChange={event => setParam(pin.id, event.target.checked)}
                                    />
                                ) : (
                                    <ValueField
                                        value={block.params?.[pin.id] ?? pin.default}
                                        type={pin.type}
                                        clock={pin.clock}
                                        onChange={value => setParam(pin.id, value)}
                                    />
                                )}
                                {pin.type === 'BOOL' ? (
                                    <label
                                        className="fb-invert"
                                        title={I18n.t('fbd_inverted', pin.id)}
                                    >
                                        <Checkbox
                                            size="small"
                                            checked={!!block.pins?.[pin.id]?.inverted}
                                            onChange={event =>
                                                onBlockChange({
                                                    ...block,
                                                    pins: {
                                                        ...block.pins,
                                                        [pin.id]: { inverted: event.target.checked },
                                                    },
                                                })
                                            }
                                        />
                                        {I18n.t('fbd_invert_short')}
                                    </label>
                                ) : null}
                            </div>
                        </Row>
                    ))}
                </Section>
            ) : null}
            {hasPreview ? (
                <Section
                    id="preview"
                    title={I18n.t('fbd_section_preview')}
                >
                    <Preview
                        block={block}
                        def={def}
                    />
                </Section>
            ) : null}
        </>
    );
}

/**
 * Whether the diagram is a block, and what it is called. The type is set once - the diagrams that
 * use the block find it by it - the name can change any time.
 */
function BlockSettings(props: PropertiesProps): React.JSX.Element {
    const { blockInfo, onBlockInfoChange } = props;
    const other = blockInfo ? props.library[blockInfo.type] : undefined;

    return (
        <Section
            id="block"
            title={I18n.t('fbd_section_block')}
        >
            <Row
                label={I18n.t('fbd_is_block_short')}
                hint={I18n.t('fbd_block_hint')}
            >
                <Switch
                    size="small"
                    checked={!!blockInfo}
                    onChange={event =>
                        onBlockInfoChange(event.target.checked ? createBlockInfo(props.scriptName) : undefined)
                    }
                    title={I18n.t('fbd_is_block')}
                />
            </Row>
            {blockInfo ? (
                <>
                    <Row label={I18n.t('fbd_block_name')}>
                        <CommitField
                            value={blockInfo.name}
                            onCommit={name => name.trim() && onBlockInfoChange({ ...blockInfo, name: name.trim() })}
                        />
                    </Row>
                    <Row label={I18n.t('fbd_block_description')}>
                        <CommitField
                            value={blockInfo.description || ''}
                            multiline
                            onCommit={description =>
                                onBlockInfoChange({ ...blockInfo, description: description.trim() })
                            }
                        />
                    </Row>
                    <div className="fb-row-hint">{I18n.t('fbd_block_type', blockInfo.type, blockInfo.version)}</div>
                    {other ? (
                        <Typography
                            variant="caption"
                            component="div"
                            color="warning"
                        >
                            {I18n.t('fbd_block_duplicate', other.user.name)}
                        </Typography>
                    ) : null}
                </>
            ) : null}
        </Section>
    );
}

/** The documentation of what is selected: the block type, its pins, its preview - or the keys */
function Documentation(props: PropertiesProps): React.JSX.Element {
    const block = props.node?.type === 'fbBlock' ? props.node.data.block : null;
    if (!block) {
        const keys: [string, string][] = [
            ['Ctrl+Z / Ctrl+Y', 'fbd_key_undo'],
            ['Ctrl+C / Ctrl+X / Ctrl+V', 'fbd_key_copy'],
            ['Del', 'fbd_key_delete'],
            ['Ctrl+F', 'fbd_key_find'],
            ['F8', 'fbd_key_pause'],
            ['F9', 'fbd_key_breakpoint'],
            ['F10', 'fbd_key_step'],
            ['Esc', 'fbd_key_back'],
        ];
        return (
            <Section
                id="doc-keys"
                title={I18n.t('fbd_doc_keys')}
            >
                {keys.map(([key, text]) => (
                    <Row
                        key={key}
                        label={<code>{key}</code>}
                    >
                        <Typography variant="body2">{I18n.t(text)}</Typography>
                    </Row>
                ))}
                <div className="fb-row-hint">{I18n.t('fbd_doc_double_click')}</div>
            </Section>
        );
    }
    const def = getBlockDef(block.type, props.userBlocks);
    if (!def) {
        return <Typography color="error">{I18n.t('Unknown block type %s', block.type)}</Typography>;
    }
    const pinRows = (pins: ReturnType<typeof getInputs>): React.JSX.Element[] =>
        pins.map(pin => (
            <Row
                key={pin.id}
                label={<code>{pin.id}</code>}
            >
                <Typography variant="body2">
                    {pin.type}
                    {pin.default !== undefined
                        ? ` = ${pin.clock && typeof pin.default === 'number' ? formatClock(pin.default) : String(pin.default)}`
                        : ''}
                </Typography>
            </Row>
        ));
    const inputs = getInputs(block, def);
    const outputs = getOutputs(block, def);
    return (
        <>
            <Section
                id="doc-block"
                title={def.user ? def.user.name : block.type}
            >
                <Typography
                    variant="body2"
                    sx={{ mb: 1 }}
                >
                    {def.user ? def.user.description || def.user.name : I18n.t(`fbd_desc_${block.type}`)}
                </Typography>
                {def.stateful ? <div className="fb-row-hint">{I18n.t('fbd_doc_stateful')}</div> : null}
                {def.timeDependent ? <div className="fb-row-hint">{I18n.t('fbd_doc_time')}</div> : null}
            </Section>
            {inputs.length ? (
                <Section
                    id="doc-inputs"
                    title={I18n.t('fbd_inputs')}
                >
                    {pinRows(inputs)}
                </Section>
            ) : null}
            {outputs.length ? (
                <Section
                    id="doc-outputs"
                    title={I18n.t('fbd_outputs')}
                >
                    {pinRows(outputs)}
                </Section>
            ) : null}
            {previewOf(block, def) ? (
                <Section
                    id="preview"
                    title={I18n.t('fbd_section_preview')}
                >
                    <Preview
                        block={block}
                        def={def}
                    />
                </Section>
            ) : null}
        </>
    );
}

/** The settings of what is selected, or of the diagram when nothing is - and its documentation */
export default function Properties(props: PropertiesProps): React.JSX.Element {
    const { node, edge, cycle, mode, onCycleChange } = props;
    const [selectId, setSelectId] = useState<string | null>(null);
    const [tab, setTab] = useState<'properties' | 'docs'>('properties');
    const block = node?.type === 'fbBlock' ? node.data.block : null;

    // the gear of a block shows its properties
    useEffect(() => {
        if (props.showProperties) {
            setTab('properties');
        }
    }, [props.showProperties]);

    let content: React.JSX.Element;
    if (tab === 'docs') {
        content = <Documentation {...props} />;
    } else if (block) {
        content = (
            <BlockProperties
                {...props}
                block={block}
                onSelectId={setSelectId}
            />
        );
    } else if (node?.type === 'fbComment') {
        content = (
            <Section
                id="comment"
                title={I18n.t('fbd_comment')}
            >
                <TextField
                    size="small"
                    fullWidth
                    multiline
                    minRows={4}
                    value={node.data.text}
                    onChange={event => props.onCommentChange(node.id, event.target.value)}
                />
            </Section>
        );
    } else if (edge) {
        content = (
            <EdgeProperties
                {...props}
                edge={edge}
            />
        );
    } else {
        content = (
            <>
                {/* a block runs in the cycle of the diagram that uses it */}
                {!props.blockInfo ? (
                    <Section
                        id="diagram"
                        title={I18n.t('fbd_diagram')}
                    >
                        <Row
                            label={I18n.t('fbd_cycle_mode')}
                            hint={I18n.t(mode === 'cyclic' ? 'fbd_runs_cyclic' : 'fbd_runs_event')}
                        >
                            <TextField
                                select
                                size="small"
                                fullWidth
                                value={cycle.mode}
                                onChange={event =>
                                    onCycleChange({ ...cycle, mode: event.target.value as FbCycle['mode'] })
                                }
                            >
                                <MenuItem value="auto">{I18n.t('fbd_mode_auto')}</MenuItem>
                                <MenuItem value="cyclic">{I18n.t('fbd_mode_cyclic')}</MenuItem>
                                <MenuItem value="event">{I18n.t('fbd_mode_event')}</MenuItem>
                            </TextField>
                        </Row>
                        {mode === 'cyclic' ? (
                            <Row
                                label={I18n.t('fbd_cycle_time')}
                                hint={`${FB_CYCLE_MIN_MS} - ${FB_CYCLE_MAX_MS} ms`}
                            >
                                <TextField
                                    size="small"
                                    fullWidth
                                    type="number"
                                    value={cycle.ms}
                                    slotProps={{ htmlInput: { min: FB_CYCLE_MIN_MS, max: FB_CYCLE_MAX_MS, step: 50 } }}
                                    onChange={event => onCycleChange({ ...cycle, ms: Number(event.target.value) || 0 })}
                                />
                            </Row>
                        ) : null}
                    </Section>
                ) : null}
                <BlockSettings {...props} />
            </>
        );
    }

    return (
        <div className="fb-properties">
            <div className="fb-tabs">
                {(['properties', 'docs'] as const).map(item => (
                    <button
                        key={item}
                        type="button"
                        className={`fb-tab${tab === item ? ' fb-tab-active' : ''}`}
                        onClick={() => setTab(item)}
                    >
                        {I18n.t(item === 'properties' ? 'fbd_tab_properties' : 'fbd_tab_docs')}
                    </button>
                ))}
            </div>
            <div className="fb-properties-content">
                {content}
                {(node || edge) && tab === 'properties' ? (
                    <Button
                        size="small"
                        color="error"
                        startIcon={<IconDelete />}
                        onClick={props.onDelete}
                        sx={{ mt: 1 }}
                    >
                        {I18n.t('Delete')}
                    </Button>
                ) : null}
            </div>
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
                            applyState(block, selectId, oid, props);
                        }
                    }}
                />
            ) : null}
        </div>
    );
}

/**
 * Takes a state for a block. The type and the name follow from its object, as for a typed ID - see
 * `detectState()` of the editor.
 */
function applyState(block: FbBlock, param: string, oid: string, props: PropertiesProps): void {
    props.onBlockChange({ ...block, params: { ...block.params, [param]: oid } });
}
