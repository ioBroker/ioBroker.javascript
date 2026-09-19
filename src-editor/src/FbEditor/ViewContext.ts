import { createContext } from 'react';

import type { FbSignalType } from '@fb-core';

export interface LinkView {
    type: FbSignalType | 'ANY';
    /** Leads back in the execution order, so it carries the value of the previous cycle */
    feedback: boolean;
    error: boolean;
}

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
}

export const FbViewContext = createContext<FbView>({
    order: {},
    errors: new Set(),
    links: {},
    background: '#fff',
});
