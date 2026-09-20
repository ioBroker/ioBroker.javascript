import { createId, usedUserBlocks, type FbBlock, type FbComment, type FbLink, type FbUserBlock } from '@fb-core';

import { flowToGraph, graphToFlow, type FbEdge, type FbNode } from './convert';

/** What is copied: the selected blocks and comments, and the links between them */
export interface FbClipboard {
    blocks: FbBlock[];
    links: FbLink[];
    comments: FbComment[];
    /** Copies of the user blocks among them, so they can be pasted into another diagram */
    userBlocks?: Record<string, FbUserBlock>;
}

/** Kept in the local storage as well, so a copy can be pasted in another diagram, also in another tab */
const STORAGE_KEY = 'FbEditor.clipboard';

let clipboard: FbClipboard | null = null;

export function copySelection(
    nodes: FbNode[],
    edges: FbEdge[],
    userBlocks?: Record<string, FbUserBlock>,
): FbClipboard | null {
    const selected = nodes.filter(node => node.selected);
    if (!selected.length) {
        return null;
    }
    const ids = new Set(selected.map(node => node.id));
    const graph = flowToGraph(
        selected,
        edges.filter(edge => ids.has(edge.source) && ids.has(edge.target)),
        { mode: 'auto', ms: 0 },
    );
    clipboard = { blocks: graph.blocks, links: graph.links, comments: graph.comments };
    const used = usedUserBlocks(graph, userBlocks);
    if (used.length) {
        const copies: Record<string, FbUserBlock> = {};
        used.forEach(type => (copies[type] = userBlocks![type]));
        clipboard.userBlocks = copies;
    }
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clipboard));
    } catch {
        // the copy is still there for this page
    }
    return clipboard;
}

export function getClipboard(): FbClipboard | null {
    if (clipboard) {
        return clipboard;
    }
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        return stored ? (JSON.parse(stored) as FbClipboard) : null;
    } catch {
        return null;
    }
}

/**
 * The nodes and links of a paste, selected, `offset` away from where they were copied.
 *
 * Everything gets a new ID, and a block whose name is taken a new name - so the copy never touches
 * the signals of the original.
 */
export function pasteNodes(
    copy: FbClipboard,
    nodes: FbNode[],
    edges: FbEdge[],
    offset: number,
): { nodes: FbNode[]; edges: FbEdge[] } {
    const usedIds = new Set(nodes.map(node => node.id));
    const usedNames = new Set(
        nodes.map(node => (node.type === 'fbBlock' ? node.data.block.name : '')).filter(name => name),
    );
    const usedLinks = new Set(edges.map(edge => edge.id));
    const newIds = new Map<string, string>();

    const blocks = copy.blocks.map(block => {
        const id = createId('b', usedIds);
        usedIds.add(id);
        newIds.set(block.id, id);
        let name = block.name;
        if (usedNames.has(name)) {
            // "NOT_1" becomes "NOT_2", "Kitchen" "Kitchen_1"
            name = createId(`${name.replace(/_\d+$/, '')}_`, usedNames);
        }
        usedNames.add(name);
        return { ...block, id, name, pos: [block.pos[0] + offset, block.pos[1] + offset] as [number, number] };
    });

    const comments = copy.comments.map(comment => {
        const id = createId('c', usedIds);
        usedIds.add(id);
        return { ...comment, id, pos: [comment.pos[0] + offset, comment.pos[1] + offset] as [number, number] };
    });

    const links = copy.links
        .filter(link => newIds.has(link.from[0]) && newIds.has(link.to[0]))
        .map(link => {
            const id = createId('l', usedLinks);
            usedLinks.add(id);
            return {
                ...link,
                id,
                from: [newIds.get(link.from[0])!, link.from[1]] as [string, string],
                to: [newIds.get(link.to[0])!, link.to[1]] as [string, string],
            };
        });

    const flow = graphToFlow({ format: 1, runtime: '', cycle: { mode: 'auto', ms: 0 }, blocks, links, comments });
    return { nodes: flow.nodes.map(node => ({ ...node, selected: true })), edges: flow.edges };
}
