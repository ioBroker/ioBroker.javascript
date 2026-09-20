import type { Edge, Node } from '@xyflow/react';

import type { FbBlock, FbCategory, FbComment, FbCycle, FbGraph, FbLink, FbSignalType } from '@fb-core';
import { FB_FORMAT, FB_RUNTIME_VERSION } from '@fb-core';

export interface BlockNodeData extends Record<string, unknown> {
    /** The block; its `pos` is not kept up to date - the position of the node is */
    block: FbBlock;
}

export interface CommentNodeData extends Record<string, unknown> {
    text: string;
}

export interface LinkData extends Record<string, unknown> {
    /** Drawn as a connection mark at both ends instead of a line */
    mark?: boolean;
    /** The name the marks show, if not the one of the block the link comes from */
    label?: string;
}

export type BlockNode = Node<BlockNodeData, 'fbBlock'>;
export type CommentNode = Node<CommentNodeData, 'fbComment'>;
export type FbNode = BlockNode | CommentNode;
export type FbEdge = Edge<LinkData, 'fbLink'>;

/** Colors of the signal types - links and pins */
export const TYPE_COLORS: Record<FbSignalType | 'ANY', string> = {
    BOOL: '#22c55e',
    INT: '#3b82f6',
    REAL: '#06b6d4',
    TIME: '#f59e0b',
    STRING: '#a855f7',
    ANY: '#94a3b8',
};

export const CATEGORY_COLORS: Record<FbCategory, string> = {
    iobroker: '#3b82f6',
    logic: '#22c55e',
    memory: '#f59e0b',
    timers: '#8b5cf6',
    counters: '#d946ef',
    compare: '#14b8a6',
    arithmetic: '#0ea5e9',
    convert: '#84cc16',
    control: '#ec4899',
    calendar: '#eab308',
    messages: '#6366f1',
    expert: '#78716c',
    interface: '#64748b',
    user: '#a855f7',
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

    const edges: FbEdge[] = graph.links.map(link => {
        const edge: FbEdge = {
            id: link.id,
            type: 'fbLink',
            source: link.from[0],
            sourceHandle: link.from[1],
            target: link.to[0],
            targetHandle: link.to[1],
        };
        if (link.mark || link.label) {
            edge.data = { mark: link.mark, label: link.label };
        }
        return edge;
    });

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
        links: edges.map(edge => {
            const link: FbLink = {
                id: edge.id,
                from: [edge.source, edge.sourceHandle || ''],
                to: [edge.target, edge.targetHandle || ''],
            };
            if (edge.data?.mark) {
                link.mark = true;
            }
            if (edge.data?.label) {
                link.label = edge.data.label;
            }
            return link;
        }),
        comments,
    };
}
