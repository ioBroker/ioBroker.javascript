import React, { memo, useContext, useEffect, useState } from 'react';
import { Handle, Position, useNodeConnections, type NodeProps } from '@xyflow/react';

import { ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import {
    ContentCopy as IconDuplicate,
    Delete as IconDelete,
    MoreVert as IconMore,
    Settings as IconSettings,
    StickyNote2 as IconNote,
    Adjust as IconBreakpoint,
    ZoomIn as IconInside,
} from '@mui/icons-material';

import { I18n } from '@iobroker/gui-components';

import {
    formatClock,
    formatTime,
    getBlockDef,
    getInputs,
    getOutputs,
    parseTime,
    resolvePinType,
    type FbBlock,
    type FbBlockDef,
    type FbBlockMetrics,
    type FbPin,
    type FbSignalType,
    type FbValue,
} from '@fb-core';

import BlockIcon from './BlockIcon';
import { CATEGORY_COLORS, TYPE_COLORS, type BlockNode as BlockNodeType } from './convert';
import { LiveValue } from './online';
import { FbViewContext } from './ViewContext';

/** Head bar with the instance name, and the line with the type under it */
const BAR_HEIGHT = 28;
const TITLE_HEIGHT = 24;

/** How a block is drawn - the automatic layout needs it to put the pins level */
export const BLOCK_METRICS: FbBlockMetrics = { header: BAR_HEIGHT + TITLE_HEIGHT, detail: 30, pin: 24, frame: 8 };
export const PIN_HEIGHT = BLOCK_METRICS.pin;

/** The value an input that is not connected gets, as text */
export function formatValue(pin: FbPin, block: FbBlock): string {
    return formatShown(block.params?.[pin.id] ?? pin.default, pin.type, pin.clock);
}

/** `clock`: a TIME that is a time of day, shown as `08:30` */
function formatShown(value: FbValue | undefined, type: FbSignalType | 'ANY', clock?: boolean): string {
    if (value === undefined || value === null) {
        return '';
    }
    if (type === 'TIME') {
        if (typeof value !== 'number') {
            return String(value);
        }
        return clock ? formatClock(value) : formatTime(value);
    }
    return String(value);
}

/** An offset of ASTRO in minutes, as `+30'` - nothing for 0 */
function formatOffset(value: FbValue | undefined): string {
    const minutes = Math.round(Number(value)) || 0;
    return minutes ? `${minutes > 0 ? '+' : '−'}${Math.abs(minutes)}'` : '';
}

/** The first line of the code of a JS block that is not empty and no comment */
function firstCodeLine(code: FbValue | undefined): string {
    const lines = String(code ?? '')
        .split('\n')
        .map(line => line.trim());
    return lines.find(line => line && !line.startsWith('//')) || lines.find(line => line) || '';
}

/** A value typed in, in the type it is for - `null` if it is none */
export function parseValue(text: string, type: FbSignalType | 'ANY'): FbValue | null {
    switch (type) {
        case 'TIME':
            return parseTime(text);
        case 'INT':
            return /^-?\d+$/.test(text.trim()) ? parseInt(text, 10) : null;
        case 'REAL':
            return text.trim() !== '' && Number.isFinite(Number(text)) ? Number(text) : null;
        default:
            return text;
    }
}

/**
 * A value right in the block: a BOOL switches with a click, anything else is typed in and taken on
 * Enter or when the field is left. Without `onChange` it can only be read.
 */
function InlineValue(props: {
    value: FbValue | undefined;
    type: FbSignalType | 'ANY';
    clock?: boolean;
    onChange?: (value: FbValue) => void;
    wide?: boolean;
}): React.JSX.Element {
    const { value, type, onChange } = props;
    const shown = formatShown(value, type, props.clock);
    const [text, setText] = useState(shown);
    useEffect(() => setText(shown), [shown]);

    if (type === 'BOOL') {
        const on = value === true || value === 'true';
        return (
            <button
                type="button"
                className={`fb-inline fb-inline-bool nodrag${on ? ' fb-on' : ''}`}
                disabled={!onChange}
                onClick={event => {
                    event.stopPropagation();
                    onChange?.(!on);
                }}
            >
                {on ? 'TRUE' : 'FALSE'}
            </button>
        );
    }
    const className = `fb-inline${props.wide ? ' fb-inline-wide' : ''}${type === 'STRING' ? ' fb-inline-string' : ''}`;
    if (!onChange) {
        return <span className={className}>{shown}</span>;
    }
    const parsed = parseValue(text, type);
    const commit = (): void => {
        if (parsed !== null && text !== shown) {
            onChange(parsed);
        } else {
            setText(shown);
        }
    };
    return (
        <input
            className={`${className} nodrag nopan${parsed === null ? ' fb-invalid' : ''}`}
            value={text}
            spellCheck={false}
            onChange={event => setText(event.target.value)}
            onBlur={commit}
            onKeyDown={event => {
                if (event.key === 'Enter') {
                    event.currentTarget.blur();
                } else if (event.key === 'Escape') {
                    setText(shown);
                }
            }}
            title={parsed === null ? I18n.t(type === 'TIME' ? 'fbd_invalid_time' : 'fbd_invalid_number') : undefined}
        />
    );
}

/** Blocks with a line under the type - the same rule as in the automatic layout */
function hasDetail(def: FbBlockDef | undefined): boolean {
    return !!def?.user || !!def?.params?.length;
}

/**
 * A block: a card in the color of its category. The head has the instance name and the actions, the
 * type follows in color, then what the block is about (state, value, pin, version), then the pins -
 * inputs on the left with the value of an open input right beside them, outputs on the right.
 */
function BlockNode({ id, data, selected }: NodeProps<BlockNodeType>): React.JSX.Element {
    const view = useContext(FbViewContext);
    const connections = useNodeConnections({ handleType: 'target' });
    const [menu, setMenu] = useState<HTMLElement | null>(null);
    const { block } = data;
    const { actions, debug } = view;
    const def = getBlockDef(block.type, view.userBlocks);
    const inputs = getInputs(block, def);
    const outputs = getOutputs(block, def);
    const detail = hasDetail(def);
    const rows = Math.max(inputs.length, outputs.length, 1);
    const top = BLOCK_METRICS.header + (detail ? BLOCK_METRICS.detail : 0);
    const connected = new Set(connections.map(connection => connection.targetHandle));
    const color = def ? CATEGORY_COLORS[def.category] : '#ef4444';
    // the running diagram failed in this block
    const runtimeError = view.runtimeError?.blockId === id ? view.runtimeError.message : null;
    const hasError = view.errors.has(id) || !!runtimeError;
    const breakpoint = debug.breakpoints.has(id);
    // paused in front of this block
    const next = debug.at === id;

    const setParam = actions
        ? (param: string, value: FbValue): void =>
              actions.change({ ...block, params: { ...block.params, [param]: value } })
        : undefined;

    const description = def?.user
        ? def.user.description || def.user.name
        : def
          ? I18n.t(`fbd_desc_${block.type}`)
          : I18n.t('Unknown block type %s', block.type);
    const title = runtimeError
        ? I18n.t('fbd_runtime_error', runtimeError)
        : block.comment
          ? `${block.comment}\n\n${description}`
          : description;

    const renderDetail = (): React.JSX.Element => {
        if (def?.user) {
            return <span className="fb-block-version">v{def.user.version}</span>;
        }
        if (block.type === 'CONST') {
            const type = resolvePinType(block, { param: 'type' }, def);
            return (
                <InlineValue
                    value={block.params?.value}
                    type={type}
                    wide
                    onChange={setParam && (value => setParam('value', value))}
                />
            );
        }
        const text = (): React.JSX.Element => (
            <InlineValue
                value={block.params?.text}
                type="STRING"
                wide
                onChange={setParam && (value => setParam('text', value))}
            />
        );
        if (block.type === 'LOG') {
            const level = String(block.params?.level || 'info');
            return (
                <>
                    <span className={`fb-log-level fb-log-${level}`}>{level}</span>
                    {text()}
                </>
            );
        }
        if (block.type === 'NOTIFY') {
            const category = String(block.params?.category || 'message');
            return (
                <>
                    <span className={`fb-log-level fb-log-${category === 'alert' ? 'error' : 'info'}`}>
                        {I18n.t(`fbd_option_${category}`)}
                    </span>
                    {text()}
                </>
            );
        }
        if (block.type === 'SENDTO') {
            const instance = block.params?.instance ? String(block.params.instance) : '';
            return (
                <>
                    <span
                        className={`fb-log-level fb-log-info fb-badge-instance${instance ? '' : ' fb-inline-empty'}`}
                        title={instance}
                    >
                        {instance || '?'}
                    </span>
                    {text()}
                </>
            );
        }
        if (block.type === 'SCHEDULE') {
            return (
                <InlineValue
                    value={block.params?.cron}
                    type="STRING"
                    wide
                    onChange={setParam && (value => setParam('cron', value))}
                />
            );
        }
        if (block.type === 'TIMEWINDOW') {
            return (
                <span className="fb-inline fb-inline-wide">
                    {I18n.t(`fbd_option_${String(block.params?.days || 'all')}`)}
                </span>
            );
        }
        if (block.type === 'ASTRO') {
            const event = (param: string): string =>
                `${I18n.t(`fbd_option_${String(block.params?.[param] || '')}`)}${formatOffset(block.params?.[`${param}Offset`])}`;
            return (
                <span className="fb-inline fb-inline-wide">
                    {event('start')} → {event('end')}
                </span>
            );
        }
        if (block.type === 'JS') {
            const code = String(block.params?.code ?? '');
            return (
                <span
                    className="fb-inline fb-inline-wide fb-inline-code"
                    title={code}
                >
                    {firstCodeLine(code)}
                </span>
            );
        }
        if (block.type === 'FB_IN' || block.type === 'FB_OUT') {
            return (
                <span className="fb-inline fb-inline-wide">
                    {String(block.params?.pin || '?')}: {String(block.params?.type || 'BOOL')}
                </span>
            );
        }
        const oid = block.params?.oid ? String(block.params.oid) : '';
        return (
            <span
                className={`fb-inline fb-inline-wide${oid ? '' : ' fb-inline-empty'}`}
                title={oid}
            >
                {oid || I18n.t('fbd_no_state')}
            </span>
        );
    };

    const menuAction = (action: () => void) => () => {
        setMenu(null);
        action();
    };

    return (
        <div
            className={`fb-block${selected ? ' fb-selected' : ''}${hasError ? ' fb-error' : ''}${next ? ' fb-next' : ''}`}
            style={{ '--fb-cat': color } as React.CSSProperties}
            title={title}
        >
            <div
                className="fb-block-bar"
                style={{ height: BAR_HEIGHT }}
            >
                {breakpoint || debug.enabled ? (
                    <span
                        className={`fb-breakpoint nodrag${breakpoint ? ' fb-breakpoint-on' : ''}`}
                        title={I18n.t(breakpoint ? 'fbd_debug_breakpoint_remove' : 'fbd_debug_breakpoint_set')}
                        onClick={
                            debug.enabled
                                ? event => {
                                      event.stopPropagation();
                                      debug.toggleBreakpoint(id);
                                  }
                                : undefined
                        }
                    />
                ) : null}
                <span className="fb-block-name">{block.name}</span>
                {block.comment ? <IconNote className="fb-block-note" /> : null}
                {actions ? (
                    <>
                        <button
                            type="button"
                            className="fb-block-action nodrag"
                            title={I18n.t('fbd_menu_properties')}
                            onClick={event => {
                                event.stopPropagation();
                                actions.select(id);
                            }}
                        >
                            <IconSettings />
                        </button>
                        <button
                            type="button"
                            className="fb-block-action nodrag"
                            title={I18n.t('fbd_menu')}
                            onClick={event => {
                                event.stopPropagation();
                                setMenu(event.currentTarget);
                            }}
                        >
                            <IconMore />
                        </button>
                    </>
                ) : null}
            </div>
            <div
                className="fb-block-title"
                style={{ height: TITLE_HEIGHT }}
            >
                <BlockIcon
                    type={block.type}
                    color={color}
                />
                <span className="fb-block-type">{def?.user ? def.user.name : block.type}</span>
                {view.order[id] !== undefined ? <span className="fb-block-order">{view.order[id]}</span> : null}
            </div>
            {detail ? (
                <div
                    className="fb-block-detail"
                    style={{ height: BLOCK_METRICS.detail }}
                >
                    {renderDetail()}
                </div>
            ) : null}
            {Array.from({ length: rows }, (_, i) => {
                const input = inputs[i];
                const output = outputs[i];
                return (
                    <div
                        key={i}
                        className="fb-pin-row"
                        style={{ height: PIN_HEIGHT }}
                    >
                        <span className="fb-pin-in">
                            {input ? (
                                <>
                                    {input.id}
                                    {!connected.has(input.id) ? (
                                        <InlineValue
                                            value={block.params?.[input.id] ?? input.default}
                                            type={input.type}
                                            clock={input.clock}
                                            onChange={setParam && (value => setParam(input.id, value))}
                                        />
                                    ) : null}
                                </>
                            ) : null}
                        </span>
                        <span className="fb-pin-out">{output ? output.id : null}</span>
                    </div>
                );
            })}
            <div style={{ height: BLOCK_METRICS.frame }} />

            {inputs.map((pin, i) => {
                const y = top + i * PIN_HEIGHT + PIN_HEIGHT / 2;
                return (
                    <React.Fragment key={`in-${pin.id}`}>
                        <Handle
                            type="target"
                            position={Position.Left}
                            id={pin.id}
                            className="fb-handle"
                            style={{ top: y, '--fb-pin': TYPE_COLORS[pin.type] } as React.CSSProperties}
                            title={pin.type}
                        />
                        {block.pins?.[pin.id]?.inverted ? (
                            <div
                                className="fb-inverted"
                                style={{ top: y }}
                            />
                        ) : null}
                    </React.Fragment>
                );
            })}
            {outputs.map((pin, i) => {
                const y = top + i * PIN_HEIGHT + PIN_HEIGHT / 2;
                return (
                    <React.Fragment key={`out-${pin.id}`}>
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={pin.id}
                            className="fb-handle"
                            style={{ top: y, '--fb-pin': TYPE_COLORS[pin.type] } as React.CSSProperties}
                            title={pin.type}
                        />
                        <LiveValue
                            signal={`${view.prefix}${id}.${pin.id}`}
                            type={pin.type}
                            clock={pin.clock}
                            forced={debug.forced.has(`${view.prefix}${id}.${pin.id}`)}
                            style={{ top: y - PIN_HEIGHT + 2 }}
                        />
                    </React.Fragment>
                );
            })}

            {menu && actions ? (
                <Menu
                    anchorEl={menu}
                    open
                    onClose={() => setMenu(null)}
                    onClick={event => event.stopPropagation()}
                >
                    <MenuItem onClick={menuAction(() => actions.select(id))}>
                        <ListItemIcon>
                            <IconSettings fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{I18n.t('fbd_menu_properties')}</ListItemText>
                    </MenuItem>
                    {def?.user ? (
                        <MenuItem onClick={menuAction(() => actions.openInstance(id))}>
                            <ListItemIcon>
                                <IconInside fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>{I18n.t('fbd_instance_open')}</ListItemText>
                        </MenuItem>
                    ) : null}
                    {debug.enabled ? (
                        <MenuItem onClick={menuAction(() => debug.toggleBreakpoint(id))}>
                            <ListItemIcon>
                                <IconBreakpoint fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>
                                {I18n.t(breakpoint ? 'fbd_debug_breakpoint_remove' : 'fbd_debug_breakpoint_set')}
                            </ListItemText>
                        </MenuItem>
                    ) : null}
                    <MenuItem onClick={menuAction(() => actions.duplicate(id))}>
                        <ListItemIcon>
                            <IconDuplicate fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{I18n.t('fbd_menu_duplicate')}</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={menuAction(() => actions.remove(id))}>
                        <ListItemIcon>
                            <IconDelete
                                fontSize="small"
                                color="error"
                            />
                        </ListItemIcon>
                        <ListItemText>{I18n.t('Delete')}</ListItemText>
                    </MenuItem>
                </Menu>
            ) : null}
        </div>
    );
}

export default memo(BlockNode);
