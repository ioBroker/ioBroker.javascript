import React, { useMemo } from 'react';

import { I18n } from '@iobroker/gui-components';

import { fbBlocks, getInputs, type FbBlock, type FbBlockDef } from '@fb-core';

import { previewOf, type Trace } from './timing';

const WIDTH = 280;
const LABEL = 38;
const ROW = 30;
const PAD = 6;

const COLORS: Record<string, string> = {
    IN: '#22c55e',
    CLK: '#22c55e',
    S: '#22c55e',
    S1: '#22c55e',
    R: '#ef4444',
    R1: '#ef4444',
    Q: '#f59e0b',
    Q1: '#f59e0b',
    OUT: '#f59e0b',
    ET: '#a855f7',
    PT: '#3b82f6',
    T: '#3b82f6',
};

/** Whether a block has a preview: the timing diagram, or the curve of CHARCURVE */
export function hasPreview(block: FbBlock, def: FbBlockDef | undefined): boolean {
    return (!!def && !def.user && block.type === 'CHARCURVE') || !!previewOf(block, def);
}

const CURVE_HEIGHT = 150;
const CURVE_LEFT = 34;
const CURVE_BOTTOM = 18;

function formatNumber(value: number): string {
    return String(Math.round(value * 100) / 100);
}

/**
 * The curve of CHARCURVE with the values of its points. Before the first and beyond the last point it
 * is dashed - there it stays at their Y. A point with a connected input is hollow: its value comes when
 * the diagram runs, the curve shows the one entered.
 */
function CurvePreview(props: { block: FbBlock; def: FbBlockDef; connected?: Set<string> }): React.JSX.Element {
    const { block, def, connected } = props;
    const pins = getInputs(block, def);
    const valueOf = (id: string): unknown => block.params?.[id] ?? pins.find(pin => pin.id === id)?.default;
    const indexes = pins.filter(pin => /^X\d+$/.test(pin.id)).map(pin => pin.id.substring(1));
    const points = fbBlocks.curvePoints(
        indexes.map(i => valueOf(`X${i}`)),
        indexes.map(i => valueOf(`Y${i}`)),
    );
    // which of the sorted points have a connected input
    const open = new Set(
        indexes
            .filter(i => connected?.has(`X${i}`) || connected?.has(`Y${i}`))
            .map(i => `${Number(valueOf(`X${i}`))}/${Number(valueOf(`Y${i}`))}`),
    );

    if (!points.length) {
        return <div className="fb-row-hint">{I18n.t('fbd_curve_no_points')}</div>;
    }

    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    const spanX = Math.max(...xs) - Math.min(...xs) || 10;
    const minX = Math.min(...xs) - spanX * 0.15;
    const maxX = Math.max(...xs) + spanX * 0.15;
    const spanY = Math.max(...ys) - Math.min(...ys) || 2;
    const minY = Math.min(...ys) - spanY * 0.1;
    const maxY = Math.max(...ys) + spanY * 0.1;

    const right = WIDTH - 6;
    const bottom = CURVE_HEIGHT - CURVE_BOTTOM;
    const x = (value: number): number => CURVE_LEFT + ((value - minX) / (maxX - minX)) * (right - CURVE_LEFT);
    const y = (value: number): number => bottom - ((value - minY) / (maxY - minY)) * (bottom - 6);

    const first = points[0];
    const last = points[points.length - 1];
    const line = points.map(point => `${x(point.x)},${y(point.y)}`).join(' ');
    const labelsX = [...new Set([first.x, last.x])];
    const labelsY = [...new Set([Math.min(...ys), Math.max(...ys)])];

    return (
        <svg
            className="fb-preview"
            viewBox={`0 0 ${WIDTH} ${CURVE_HEIGHT}`}
        >
            <line
                x1={CURVE_LEFT}
                x2={right}
                y1={bottom}
                y2={bottom}
                className="fb-preview-level"
            />
            <line
                x1={CURVE_LEFT}
                x2={CURVE_LEFT}
                y1={4}
                y2={bottom}
                className="fb-preview-level"
            />
            {labelsY.map(value => (
                <text
                    key={`y${value}`}
                    x={CURVE_LEFT - 4}
                    y={y(value) + 4}
                    textAnchor="end"
                    className="fb-preview-label"
                >
                    {formatNumber(value)}
                </text>
            ))}
            {labelsX.map(value => (
                <text
                    key={`x${value}`}
                    x={x(value)}
                    y={CURVE_HEIGHT - 4}
                    textAnchor="middle"
                    className="fb-preview-label"
                >
                    {formatNumber(value)}
                </text>
            ))}
            {(
                [
                    [minX, first],
                    [maxX, last],
                ] as const
            ).map(([end, point]) => (
                <line
                    key={end}
                    x1={x(end)}
                    x2={x(point.x)}
                    y1={y(point.y)}
                    y2={y(point.y)}
                    stroke={COLORS.OUT}
                    strokeWidth={2}
                    strokeDasharray="4 3"
                />
            ))}
            <polyline
                points={line}
                fill="none"
                stroke={COLORS.OUT}
                strokeWidth={2}
                strokeLinejoin="round"
            />
            {points.map((point, i) => {
                const hollow = open.has(`${point.x}/${point.y}`);
                return (
                    <circle
                        key={i}
                        cx={x(point.x)}
                        cy={y(point.y)}
                        r={3.5}
                        fill={hollow ? 'none' : COLORS.OUT}
                        stroke={COLORS.OUT}
                        strokeWidth={1.5}
                    >
                        <title>
                            {`${formatNumber(point.x)} → ${formatNumber(point.y)}${hollow ? ` (${I18n.t('fbd_curve_connected')})` : ''}`}
                        </title>
                    </circle>
                );
            })}
        </svg>
    );
}

function points(trace: Trace, top: number, steps: number): string {
    const x = (i: number): number => LABEL + ((WIDTH - LABEL - 4) * i) / steps;
    const y = (value: number): number => {
        const range = trace.max - trace.min || 1;
        return top + ROW - PAD - ((value - trace.min) / range) * (ROW - 2 * PAD);
    };
    const list: string[] = [];
    trace.values.forEach((value, i) => {
        if (trace.kind === 'bool' && i) {
            // steps: along at the old value, then up or down
            list.push(`${x(i)},${y(trace.values[i - 1])}`);
        }
        list.push(`${x(i)},${y(value)}`);
    });
    return list.join(' ');
}

/**
 * The timing diagram of a block, drawn with the values its parameters have - or the curve of
 * CHARCURVE. `connected` are the inputs with a link.
 */
export default function Preview(props: {
    block: FbBlock;
    def: FbBlockDef | undefined;
    connected?: Set<string>;
}): React.JSX.Element | null {
    const { block, def } = props;
    const preview = useMemo(() => previewOf(block, def), [block, def]);
    if (def && !def.user && block.type === 'CHARCURVE') {
        return (
            <CurvePreview
                block={block}
                def={def}
                connected={props.connected}
            />
        );
    }
    if (!preview) {
        return null;
    }
    const steps = preview.traces[0].values.length - 1;
    const x = (i: number): number => LABEL + ((WIDTH - LABEL - 4) * i) / steps;
    const rows = preview.traces.length + (preview.span ? 1 : 0);

    return (
        <svg
            className="fb-preview"
            viewBox={`0 0 ${WIDTH} ${rows * ROW}`}
        >
            {preview.traces.map((trace, i) => {
                const top = i * ROW;
                const color = COLORS[trace.id] || '#94a3b8';
                const range = trace.max - trace.min || 1;
                return (
                    <g key={trace.id}>
                        <text
                            x={4}
                            y={top + ROW / 2 + 4}
                            className="fb-preview-label"
                        >
                            {trace.id}
                        </text>
                        {trace.levels?.map(level => {
                            const y = top + ROW - PAD - ((level.value - trace.min) / range) * (ROW - 2 * PAD);
                            return (
                                <line
                                    key={level.label}
                                    x1={LABEL}
                                    x2={WIDTH - 4}
                                    y1={y}
                                    y2={y}
                                    className="fb-preview-level"
                                />
                            );
                        })}
                        <polyline
                            points={points(trace, top, steps)}
                            fill="none"
                            stroke={color}
                            strokeWidth={2}
                            strokeLinejoin="round"
                        />
                    </g>
                );
            })}
            {preview.span
                ? (() => {
                      const { span } = preview;
                      const top = preview.traces.length * ROW;
                      const from = x(span.from);
                      const to = x(span.to);
                      const y = top + ROW / 2;
                      const color = COLORS[span.id] || '#3b82f6';
                      return (
                          <g>
                              <text
                                  x={4}
                                  y={y + 4}
                                  className="fb-preview-label"
                              >
                                  {span.id}
                              </text>
                              {[from, to].map(position => (
                                  <line
                                      key={position}
                                      x1={position}
                                      x2={position}
                                      y1={0}
                                      y2={top + ROW - 4}
                                      className="fb-preview-mark"
                                  />
                              ))}
                              <line
                                  x1={from + 2}
                                  x2={to - 2}
                                  y1={y + 6}
                                  y2={y + 6}
                                  stroke={color}
                                  strokeWidth={1.5}
                                  markerStart="url(#fb-arrow)"
                                  markerEnd="url(#fb-arrow)"
                              />
                              <text
                                  x={(from + to) / 2}
                                  y={y}
                                  textAnchor="middle"
                                  className="fb-preview-label"
                              >
                                  {span.label}
                              </text>
                              <defs>
                                  <marker
                                      id="fb-arrow"
                                      viewBox="0 0 10 10"
                                      refX="5"
                                      refY="5"
                                      markerWidth="6"
                                      markerHeight="6"
                                      orient="auto-start-reverse"
                                  >
                                      <path
                                          d="M 0 0 L 10 5 L 0 10 z"
                                          fill={color}
                                      />
                                  </marker>
                              </defs>
                          </g>
                      );
                  })()
                : null}
        </svg>
    );
}
