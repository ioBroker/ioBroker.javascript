import React, { memo, useContext } from 'react';
import { getSmoothStepPath, type EdgeProps } from '@xyflow/react';

import { TYPE_COLORS, type FbEdge } from './convert';
import { FbViewContext } from './ViewContext';

/**
 * A link, drawn at right angles in the color of its signal type.
 *
 * A link that leads back in the execution order carries the value of the previous cycle; as usual
 * in CFC it is drawn as a double line. The paths are drawn here and not with `BaseEdge`, which
 * passes no `ref` on - the online view will want to reach the path directly.
 */
function LinkEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
}: EdgeProps<FbEdge>): React.JSX.Element {
    const view = useContext(FbViewContext);
    const info = view.links[id];
    const [path] = getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        borderRadius: 0,
        offset: 12,
    });
    const color = info?.error ? '#f44336' : TYPE_COLORS[info?.type || 'ANY'];
    const width = selected ? 3 : 2;

    return (
        <>
            {info?.feedback ? (
                <path
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth={width + 4}
                />
            ) : null}
            <path
                id={id}
                d={path}
                fill="none"
                className="react-flow__edge-path"
                style={{
                    stroke: info?.feedback ? view.background : color,
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
        </>
    );
}

export default memo(LinkEdge);
