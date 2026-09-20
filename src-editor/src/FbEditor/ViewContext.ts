import { createContext } from 'react';

import {
    getBlockDef,
    getOutputs,
    type FbAnalysis,
    type FbBlock,
    type FbGraph,
    type FbSignalType,
    type FbUserBlock,
} from '@fb-core';

export interface LinkView {
    type: FbSignalType | 'ANY';
    /** Leads back in the execution order, so it carries the value of the previous cycle */
    feedback: boolean;
    error: boolean;
    /** What the marks of the link show when it has no label: the block it comes from, and its pin */
    name: string;
}

/** What the online view does with the running diagram */
export interface DebugView {
    /** Breakpoints can be set: online, and the code is new enough */
    enabled: boolean;
    breakpoints: Set<string>;
    /** Paused: the block that runs next */
    at: string | null;
    /** The forced signals `<block>.<pin>` */
    forced: Set<string>;
    toggleBreakpoint: (blockId: string) => void;
}

/** What a block offers in its head and takes in its fields - not inside an instance, which is read only */
export interface BlockActions {
    /** Changes a block, like a value typed into it */
    change: (block: FbBlock) => void;
    /** Selects it and shows its properties */
    select: (blockId: string) => void;
    duplicate: (blockId: string) => void;
    remove: (blockId: string) => void;
    /** Shows an instance of a user block from inside */
    openInstance: (blockId: string) => void;
}

/** How links are drawn: as curves, or at right angles as in CFC */
export type LinkStyle = 'curved' | 'orthogonal';

/**
 * What the last analysis found out about the diagram. The nodes and links read it from here and not
 * from their `data`: rewriting the nodes after every analysis would redraw the whole diagram.
 */
export interface FbView {
    order: Record<string, number>;
    /** Blocks with an error */
    errors: Set<string>;
    links: Record<string, LinkView>;
    /** The background of the canvas, for the gap of a double line */
    background: string;
    /** The error the running diagram reports, while it is shown online */
    runtimeError: { message: string; blockId?: string } | null;
    /** The copies of the user blocks the diagram carries - a node needs them for its pins */
    userBlocks: Record<string, FbUserBlock>;
    debug: DebugView;
    /**
     * In front of the signal keys of the online view: empty for the diagram, the path of the
     * instance and a `/` inside an instance of a user block, like `b3/b7/`
     */
    prefix: string;
    /** Missing inside an instance */
    actions?: BlockActions;
    linkStyle: LinkStyle;
}

export const NO_DEBUG: DebugView = {
    enabled: false,
    breakpoints: new Set(),
    at: null,
    forced: new Set(),
    toggleBreakpoint: () => {},
};

/**
 * The view of a diagram after an analysis. `userBlocks`: the user blocks it may use, if not its own
 * copies - the diagram inside a user block has none of its own.
 */
export function buildView(
    analysis: FbAnalysis,
    graph: FbGraph,
    dark: boolean,
    userBlocks: Record<string, FbUserBlock> = graph.userBlocks || {},
): FbView {
    const errors = new Set<string>();
    const errorLinks = new Set<string>();
    analysis.issues
        .filter(issue => issue.severity === 'error')
        .forEach(issue => {
            if (issue.blockId) {
                errors.add(issue.blockId);
            }
            issue.blockIds?.forEach(id => errors.add(id));
            if (issue.linkId) {
                errorLinks.add(issue.linkId);
            }
        });

    const blocks = new Map(graph.blocks.map(block => [block.id, block]));
    const feedback = new Set(analysis.feedback);
    const links: FbView['links'] = {};
    for (const link of graph.links) {
        const block = blocks.get(link.from[0]);
        const outputs = block ? getOutputs(block, getBlockDef(block.type, userBlocks)) : [];
        const pin = outputs.find(output => output.id === link.from[1]);
        links[link.id] = {
            type: pin?.type || 'ANY',
            feedback: feedback.has(link.id),
            error: errorLinks.has(link.id),
            // the pin only where the block has several outputs
            name: block ? (outputs.length > 1 ? `${block.name}.${link.from[1]}` : block.name) : link.from.join('.'),
        };
    }

    return {
        order: analysis.order,
        errors,
        links,
        background: dark ? '#141414' : '#ffffff',
        runtimeError: null,
        userBlocks,
        debug: NO_DEBUG,
        prefix: '',
        linkStyle: 'curved',
    };
}

export const FbViewContext = createContext<FbView>({
    order: {},
    errors: new Set(),
    links: {},
    background: '#fff',
    runtimeError: null,
    userBlocks: {},
    debug: NO_DEBUG,
    prefix: '',
    linkStyle: 'curved',
});
