import React, { memo, useContext, useEffect, useRef } from 'react';
import { getBezierPath, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

import { TYPE_COLORS, type FbEdge } from './convert';
import { FbViewContext } from './ViewContext';
import { LIVE_FALSE, LIVE_TRUE, SignalBusContext, formatLive } from './online';

/** Length of the line from a pin to its connection mark */
const STUB = 14;
/** Width of a character of the mark, which is monospace */
const CHAR_WIDTH = 6.6;

/** A connection mark: a label with a tip to the right, `x` its left end, `y` its middle */
function Mark(props: {
    x: number;
    y: number;
    width: number;
    text: string;
    stroke: string;
    fill: string;
}): React.JSX.Element {
    const { x, y, width } = props;
    return (
        <>
            <polygon
                points={`${x},${y - 8} ${x + width},${y - 8} ${x + width + 6},${y} ${x + width},${y + 8} ${x},${y + 8}`}
                style={{ stroke: props.stroke, fill: props.fill }}
                strokeWidth={1.5}
            />
            <text
                x={x + 5}
                y={y + 3.5}
                className="fb-mark-text"
            >
                {props.text}
            </text>
        </>
    );
}

/**
 * A link in the color of its signal type - a curve, or at right angles as in CFC.
 *
 * A link that leads back in the execution order carries the value of the previous cycle; as usual
 * in CFC it is drawn as a double line. Online, a BOOL link shows its value in its color, any other
 * link as a label. A link marked as a connection mark is not drawn through the diagram, but as a
 * named mark at both ends.
 *
 * The paths are drawn here and not with `BaseEdge`, which passes no `ref` on: the online view
 * changes them directly, see `online.tsx`. The live color goes into the CSS variable `--fb-live`
 * of the group - the color React sets stays untouched, so the two never fight.
 */
function LinkEdge({
    id,
    source,
    sourceHandleId,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
    data,
}: EdgeProps<FbEdge>): React.JSX.Element {
    const view = useContext(FbViewContext);
    const bus = useContext(SignalBusContext);
    const group = useRef<SVGGElement>(null);
    const label = useRef<SVGTextElement>(null);
    const info = view.links[id];
    const type = info?.type || 'ANY';
    const [path, labelX, labelY] =
        view.linkStyle === 'orthogonal'
            ? getSmoothStepPath({
                  sourceX,
                  sourceY,
                  targetX,
                  targetY,
                  sourcePosition,
                  targetPosition,
                  borderRadius: 0,
                  offset: 12,
              })
            : getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
    const color = info?.error ? '#f44336' : TYPE_COLORS[type];
    const width = selected ? 3 : 2;
    const mark = !!data?.mark;
    // on a short link the label would cover the value at the output it comes from
    const labeled = !mark && type !== 'BOOL' && Math.abs(targetX - sourceX) + Math.abs(targetY - sourceY) > 120;

    useEffect(
        () =>
            bus.subscribe(`${view.prefix}${source}.${sourceHandleId}`, value => {
                if (type === 'BOOL') {
                    if (value === undefined) {
                        group.current?.style.removeProperty('--fb-live');
                    } else {
                        group.current?.style.setProperty('--fb-live', value ? LIVE_TRUE : LIVE_FALSE);
                    }
                } else if (label.current) {
                    label.current.textContent = value === undefined ? '' : formatLive(value, type);
                }
            }),
        // `labeled`: a label that appears needs the current value at once
        [bus, view.prefix, source, sourceHandleId, type, labeled],
    );

    if (mark) {
        const text = data?.label || info?.name || '';
        const markWidth = Math.max(24, text.length * CHAR_WIDTH + 10);
        const stroke = `var(--fb-live, ${color})`;
        const stubs = `M ${sourceX} ${sourceY} h ${STUB} M ${targetX - STUB} ${targetY} H ${targetX}`;
        return (
            <g
                ref={group}
                className="fb-mark"
            >
                <path
                    id={id}
                    d={stubs}
                    fill="none"
                    className="react-flow__edge-path"
                    style={{
                        stroke,
                        strokeWidth: width,
                        strokeDasharray: info?.error ? '4 3' : undefined,
                    }}
                />
                <path
                    d={stubs}
                    fill="none"
                    strokeOpacity={0}
                    strokeWidth={16}
                    className="react-flow__edge-interaction"
                />
                <Mark
                    x={sourceX + STUB}
                    y={sourceY}
                    width={markWidth}
                    text={text}
                    stroke={stroke}
                    fill={view.background}
                />
                <Mark
                    x={targetX - STUB - markWidth - 6}
                    y={targetY}
                    width={markWidth}
                    text={text}
                    stroke={stroke}
                    fill={view.background}
                />
            </g>
        );
    }

    return (
        <g ref={group}>
            {info?.feedback ? (
                <path
                    d={path}
                    fill="none"
                    style={{ stroke: `var(--fb-live, ${color})` }}
                    strokeWidth={width + 4}
                />
            ) : null}
            <path
                id={id}
                d={path}
                fill="none"
                className="react-flow__edge-path"
                style={{
                    stroke: info?.feedback ? view.background : `var(--fb-live, ${color})`,
                    strokeWidth: info?.feedback ? 2 : width,
                    strokeDasharray: info?.error ? '6 4' : undefined,
                }}
            />
            {/* a wide invisible path, so the link is easy to hit */}
            <path
                d={path}
                fill="none"
                strokeOpacity={0}
                strokeWidth={16}
                className="react-flow__edge-interaction"
            />
            {labeled ? (
                <text
                    ref={label}
                    x={labelX}
                    y={labelY - 5}
                    textAnchor="middle"
                    className="fb-live-label"
                />
            ) : null}
        </g>
    );
}

export default memo(LinkEdge);
