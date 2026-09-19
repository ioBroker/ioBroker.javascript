import React, { memo } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';

import type { CommentNode as CommentNodeType } from './convert';

/** A note on the canvas; it takes no part in the execution */
function CommentNode({ data, selected }: NodeProps<CommentNodeType>): React.JSX.Element {
    return (
        <>
            <NodeResizer
                isVisible={selected}
                minWidth={80}
                minHeight={40}
            />
            <div className={`fb-comment${selected ? ' fb-selected' : ''}`}>{data.text}</div>
        </>
    );
}

export default memo(CommentNode);
