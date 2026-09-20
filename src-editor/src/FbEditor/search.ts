import { getBlockDef, type FbUserBlock } from '@fb-core';

import type { FbEdge, FbNode } from './convert';

/**
 * What a search in the diagram finds: blocks by instance name, type, name of a user block and the
 * values of their parameters (a state ID, for example), comments by their text, and the blocks at
 * both ends of a link whose connection mark has the name. In the order of the data flow: from left to
 * right, then from top to bottom.
 */
export function findNodes(
    nodes: FbNode[],
    edges: FbEdge[],
    text: string,
    userBlocks: Record<string, FbUserBlock>,
): string[] {
    const query = text.trim().toLowerCase();
    if (!query) {
        return [];
    }
    const matches = (value: string | number | boolean | undefined | null): boolean =>
        value !== undefined && value !== null && String(value).toLowerCase().includes(query);

    const found = new Set<string>();
    for (const node of nodes) {
        if (node.type === 'fbComment') {
            if (matches(node.data.text)) {
                found.add(node.id);
            }
            continue;
        }
        const { block } = node.data;
        const user = getBlockDef(block.type, userBlocks)?.user;
        if ([block.name, block.type, user?.name, ...Object.values(block.params || {})].some(matches)) {
            found.add(node.id);
        }
    }
    for (const edge of edges) {
        if (matches(edge.data?.label)) {
            found.add(edge.source);
            found.add(edge.target);
        }
    }
    return nodes
        .filter(node => found.has(node.id))
        .sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y)
        .map(node => node.id);
}
