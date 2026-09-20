import { describe, expect, it } from 'vitest';

import { createBlock, createGraph, generateSource, parseGraph } from '@fb-core';

import { flowToGraph, graphToFlow } from '../convert';

function sampleGraph(): ReturnType<typeof createGraph> {
    const graph = createGraph();
    const input = createBlock('STATE_IN', [0, 0], graph);
    input.params = { ...input.params, oid: 'x.0.in', type: 'BOOL' };
    graph.blocks.push(input);
    const ton = createBlock('TON', [200, 0], graph);
    ton.pins = { IN: { inverted: true } };
    graph.blocks.push(ton);
    graph.links.push({ id: 'l1', from: [input.id, 'Q'], to: [ton.id, 'IN'] });
    graph.comments.push({ id: 'c1', pos: [0, 200], size: [220, 90], text: 'note' });
    graph.cycle = { mode: 'cyclic', ms: 500 };
    return graph;
}

describe('FbEditor: graph and React Flow', () => {
    it('gives back the same graph', () => {
        const graph = sampleGraph();
        const { nodes, edges } = graphToFlow(graph);
        expect(flowToGraph(nodes, edges, graph.cycle)).toEqual(graph);
    });

    it('does not see a change in a diagram that was only opened', () => {
        // what the editor compares to find out whether the user changed something
        const stored = parseGraph(generateSource(sampleGraph()).source)!;
        const { nodes, edges } = graphToFlow(stored);
        const opened = flowToGraph(nodes, edges, stored.cycle);
        const again = graphToFlow(opened);
        expect(JSON.stringify(flowToGraph(again.nodes, again.edges, opened.cycle))).toBe(JSON.stringify(opened));
        // the stored execution order is not taken over - it comes from the analysis
        expect(opened.blocks.every(block => block.order === undefined)).toBe(true);
    });

    it('draws comments below the blocks', () => {
        const { nodes } = graphToFlow(sampleGraph());
        expect(nodes[0].type).toBe('fbComment');
        expect(nodes[0].zIndex).toBe(-1);
    });

    it('keeps connection marks, and a link that is no mark any more has nothing left of it', () => {
        const graph = sampleGraph();
        graph.links[0] = { ...graph.links[0], mark: true, label: 'motion' };
        const { nodes, edges } = graphToFlow(graph);
        expect(edges[0].data).toEqual({ mark: true, label: 'motion' });
        expect(flowToGraph(nodes, edges, graph.cycle)).toEqual(graph);

        // switched off in the properties: no `mark: false` stays behind
        edges[0] = { ...edges[0], data: { ...edges[0].data, mark: false, label: undefined } };
        expect(flowToGraph(nodes, edges, graph.cycle).links[0]).toEqual({
            id: 'l1',
            from: graph.links[0].from,
            to: graph.links[0].to,
        });
    });
});
