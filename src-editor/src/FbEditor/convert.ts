import type { Edge, Node } from '@xyflow/react';

import type { FbBlock, FbCategory, FbComment, FbCycle, FbGraph, FbSignalType } from '@fb-core';
import { FB_FORMAT, FB_RUNTIME_VERSION } from '@fb-core';

export interface BlockNodeData extends Record<string, unknown> {
    /** The block; its `pos` is not kept up to date - the position of the node is */
    block: FbBlock;
}

export interface CommentNodeData extends Record<string, unknown> {
    text: string;
}

export type BlockNode = Node<BlockNodeData, 'fbBlock'>;
export type CommentNode = Node<CommentNodeData, 'fbComment'>;
export type FbNode = BlockNode | CommentNode;
export type FbEdge = Edge<Record<string, unknown>, 'fbLink'>;

/** Colors of the signal types - links and pins */
export const TYPE_COLORS: Record<FbSignalType | 'ANY', string> = {
    BOOL: '#43a047',
    INT: '#1e88e5',
    REAL: '#00acc1',
    TIME: '#fb8c00',
    STRING: '#8e24aa',
    ANY: '#9e9e9e',
};

export const CATEGORY_COLORS: Record<FbCategory, string> = {
    iobroker: '#3f51b5',
    logic: '#43a047',
    timers: '#fb8c00',
    compare: '#00897b',
    arithmetic: '#1e88e5',
};

export const COMMENT_DEFAULT_SIZE: [number, number] = [220, 90];

export function graphToFlow(graph: FbGraph): { nodes: FbNode[]; edges: FbEdge[] } {
    const nodes: FbNode[] = [
        // comments first, so they lie below the blocks
        ...graph.comments.map((comment): CommentNode => ({
            id: comment.id,
            type: 'fbComment',
            position: { x: comment.pos[0], y: comment.pos[1] },
            width: comment.size[0],
            height: comment.size[1],
            zIndex: -1,
            data: { text: comment.text },
        })),
        ...graph.blocks.map((stored): BlockNode => {
            // the order is shown from the last analysis, a stored one would only be stale
            const block = { ...stored };
            delete block.order;
            return {
                id: block.id,
                type: 'fbBlock',
                position: { x: block.pos[0], y: block.pos[1] },
                data: { block },
            };
        }),
    ];

    const edges: FbEdge[] = graph.links.map(link => ({
        id: link.id,
        type: 'fbLink',
        source: link.from[0],
        sourceHandle: link.from[1],
        target: link.to[0],
        targetHandle: link.to[1],
    }));

    return { nodes, edges };
}

export function flowToGraph(nodes: FbNode[], edges: FbEdge[], cycle: FbCycle): FbGraph {
    const blocks: FbBlock[] = [];
    const comments: FbComment[] = [];
    for (const node of nodes) {
        const pos: [number, number] = [Math.round(node.position.x), Math.round(node.position.y)];
        if (node.type === 'fbBlock') {
            blocks.push({ ...node.data.block, pos });
        } else {
            comments.push({
                id: node.id,
                pos,
                size: [
                    Math.round(node.width ?? node.measured?.width ?? COMMENT_DEFAULT_SIZE[0]),
                    Math.round(node.height ?? node.measured?.height ?? COMMENT_DEFAULT_SIZE[1]),
                ],
                text: node.data.text,
            });
        }
    }

    return {
        format: FB_FORMAT,
        runtime: FB_RUNTIME_VERSION,
        cycle,
        blocks,
        links: edges.map(edge => ({
            id: edge.id,
            from: [edge.source, edge.sourceHandle || ''],
            to: [edge.target, edge.targetHandle || ''],
        })),
        comments,
    };
}
