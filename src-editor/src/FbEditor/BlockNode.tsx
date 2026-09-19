import React, { memo, useContext } from 'react';
import { Handle, Position, useNodeConnections, type NodeProps } from '@xyflow/react';

import { I18n } from '@iobroker/gui-components';

import { formatTime, getBlockDef, getInputs, getOutputs, type FbBlock, type FbPin } from '@fb-core';

import { CATEGORY_COLORS, TYPE_COLORS, type BlockNode as BlockNodeType } from './convert';
import { FbViewContext } from './ViewContext';

export const PIN_HEIGHT = 20;
const HEADER_HEIGHT = 22;
const DETAIL_HEIGHT = 18;

/** The value an input that is not connected gets, as shown next to the pin */
export function formatValue(pin: FbPin, block: FbBlock): string {
    const value = block.params?.[pin.id] ?? pin.default;
    if (value === undefined || value === null) {
        return '';
    }
    if (pin.type === 'TIME') {
        return typeof value === 'number' ? formatTime(value) : String(value);
    }
    if (pin.type === 'STRING') {
        return `"${String(value)}"`;
    }
    return String(value);
}

/** The line under the type name: the state of STATE_IN and STATE_OUT, the value of CONST */
function getDetail(block: FbBlock): string | null {
    if (block.type === 'STATE_IN' || block.type === 'STATE_OUT') {
        return block.params?.oid ? String(block.params.oid) : I18n.t('fbd_no_state');
    }
    if (block.type === 'CONST') {
        const type = String(block.params?.type || 'REAL');
        const value = block.params?.value;
        if (type === 'TIME') {
            return typeof value === 'number' ? formatTime(value) : String(value ?? 0);
        }
        return type === 'STRING' ? `"${String(value ?? '')}"` : String(value ?? '');
    }
    return null;
}

/**
 * A block in the style of IEC 61131-3: the instance name above the frame, the type inside at the
 * top, the pins inside along the edges. An inverted input has a circle, an open input shows the value
 * it gets.
 */
function BlockNode({ id, data, selected }: NodeProps<BlockNodeType>): React.JSX.Element {
    const view = useContext(FbViewContext);
    const connections = useNodeConnections({ handleType: 'target' });
    const { block } = data;
    const def = getBlockDef(block.type);
    const inputs = getInputs(block, def);
    const outputs = getOutputs(block, def);
    const detail = getDetail(block);
    const rows = Math.max(inputs.length, outputs.length, 1);
    const top = HEADER_HEIGHT + (detail !== null ? DETAIL_HEIGHT : 0);
    const connected = new Set(connections.map(connection => connection.targetHandle));
    const color = def ? CATEGORY_COLORS[def.category] : '#f44336';
    const hasError = view.errors.has(id);

    return (
        <div
            className={`fb-block${selected ? ' fb-selected' : ''}${hasError ? ' fb-error' : ''}`}
            style={{ height: top + rows * PIN_HEIGHT + 6, borderTopColor: color }}
            title={def ? I18n.t(`fbd_desc_${block.type}`) : I18n.t('Unknown block type %s', block.type)}
        >
            <div className="fb-block-name">{block.name}</div>
            <div
                className="fb-block-type"
                style={{ color }}
            >
                {block.type}
            </div>
            {detail !== null ? <div className="fb-block-detail">{detail}</div> : null}

            {inputs.map((pin, i) => {
                const y = top + i * PIN_HEIGHT + PIN_HEIGHT / 2;
                const inverted = !!block.pins?.[pin.id]?.inverted;
                return (
                    <React.Fragment key={`in-${pin.id}`}>
                        <Handle
                            type="target"
                            position={Position.Left}
                            id={pin.id}
                            className="fb-handle"
                            style={{ top: y, background: TYPE_COLORS[pin.type] }}
                            title={pin.type}
                        />
                        {inverted ? (
                            <div
                                className="fb-inverted"
                                style={{ top: y }}
                            />
                        ) : null}
                        <div
                            className="fb-pin fb-pin-in"
                            style={{ top: y - PIN_HEIGHT / 2 }}
                        >
                            {pin.id}
                        </div>
                        {!connected.has(pin.id) ? (
                            <div
                                className="fb-pin-value"
                                style={{ top: y - PIN_HEIGHT / 2 }}
                            >
                                {formatValue(pin, block)}
                            </div>
                        ) : null}
                    </React.Fragment>
                );
            })}

            {outputs.map((pin, i) => {
                const y = top + i * PIN_HEIGHT + PIN_HEIGHT / 2;
                return (
                    <React.Fragment key={`out-${pin.id}`}>
                        <div
                            className="fb-pin fb-pin-out"
                            style={{ top: y - PIN_HEIGHT / 2 }}
                        >
                            {pin.id}
                        </div>
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={pin.id}
                            className="fb-handle"
                            style={{ top: y, background: TYPE_COLORS[pin.type] }}
                            title={pin.type}
                        />
                    </React.Fragment>
                );
            })}

            {view.order[id] !== undefined ? <div className="fb-block-order">{view.order[id]}</div> : null}
        </div>
    );
}

export default memo(BlockNode);
