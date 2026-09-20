import React, { useMemo } from 'react';

import type { FbBlock, FbBlockDef } from '@fb-core';

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

/** The timing diagram of a block, drawn with the values its parameters have */
export default function Preview(props: { block: FbBlock; def: FbBlockDef | undefined }): React.JSX.Element | null {
    const { block, def } = props;
    const preview = useMemo(() => previewOf(block, def), [block, def]);
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
