import { describe, expect, it } from 'vitest';

import { createBlock, createBlockInfo, createGraph, userBlockOf } from '@fb-core';

import { copySelection, getClipboard, pasteNodes } from '../clipboard';
import { graphToFlow, type FbNode } from '../convert';

/** STATE_IN -> NOT -> STATE_OUT, and a comment */
function sample(): ReturnType<typeof graphToFlow> {
    const graph = createGraph();
    const input = createBlock('STATE_IN', [0, 0], graph);
    graph.blocks.push(input);
    const not = createBlock('NOT', [200, 0], graph);
    graph.blocks.push(not);
    const output = createBlock('STATE_OUT', [400, 0], graph);
    graph.blocks.push(output);
    graph.links.push(
        { id: 'l1', from: [input.id, 'Q'], to: [not.id, 'IN'] },
        { id: 'l2', from: [not.id, 'OUT'], to: [output.id, 'IN'] },
    );
    graph.comments.push({ id: 'c1', pos: [0, 200], size: [200, 80], text: 'note' });
    return graphToFlow(graph);
}

function select(nodes: FbNode[], ids: string[]): FbNode[] {
    return nodes.map(node => ({ ...node, selected: ids.includes(node.id) }));
}

describe('FbEditor: copy and paste', () => {
    it('copies the selected blocks and only the links between them', () => {
        const { nodes, edges } = sample();
        const copy = copySelection(select(nodes, ['b1', 'b2', 'c1']), edges)!;
        expect(copy.blocks.map(block => block.id)).toEqual(['b1', 'b2']);
        expect(copy.links.map(link => link.id)).toEqual(['l1']);
        expect(copy.comments.map(comment => comment.id)).toEqual(['c1']);
        expect(getClipboard()).toEqual(copy);
    });

    it('copies nothing without a selection', () => {
        const { nodes, edges } = sample();
        expect(copySelection(nodes, edges)).toBeNull();
    });

    it('pastes with new IDs and names, and keeps the links between the copies', () => {
        const { nodes, edges } = sample();
        const copy = copySelection(select(nodes, ['b1', 'b2']), edges)!;
        const pasted = pasteNodes(copy, nodes, edges, 40);

        const ids = pasted.nodes.map(node => node.id);
        expect(ids).toEqual(['b4', 'b5']);
        const names = pasted.nodes.map(node => (node.type === 'fbBlock' ? node.data.block.name : ''));
        expect(names).toEqual(['STATE_IN_2', 'NOT_2']);
        expect(pasted.nodes.every(node => node.selected)).toBe(true);
        expect(pasted.nodes[0].position).toEqual({ x: 40, y: 40 });

        expect(pasted.edges).toHaveLength(1);
        expect(pasted.edges[0]).toMatchObject({
            id: 'l3',
            source: 'b4',
            sourceHandle: 'Q',
            target: 'b5',
            targetHandle: 'IN',
        });
    });

    it('takes the copies of the user blocks along, so they can be pasted into another diagram', () => {
        // a block "pass": FB_IN -> FB_OUT
        const definition = createGraph();
        definition.block = createBlockInfo('pass');
        const pinIn = createBlock('FB_IN', [0, 0], definition);
        pinIn.params = { ...pinIn.params, pin: 'IN' };
        definition.blocks.push(pinIn);
        const pinOut = createBlock('FB_OUT', [200, 0], definition);
        pinOut.params = { ...pinOut.params, pin: 'Q' };
        definition.blocks.push(pinOut);
        const user = userBlockOf(definition)!;

        const graph = createGraph();
        graph.userBlocks = { [user.type]: user };
        const instance = createBlock(user.type, [0, 0], graph);
        graph.blocks.push(instance);
        expect(instance.name).toBe('pass_1');
        const { nodes, edges } = graphToFlow(graph);

        const copy = copySelection(select(nodes, [instance.id]), edges, graph.userBlocks)!;
        expect(Object.keys(copy.userBlocks || {})).toEqual([user.type]);
        const pasted = pasteNodes(copy, [], [], 0);
        expect(pasted.nodes[0].type === 'fbBlock' && pasted.nodes[0].data.block.type).toBe(user.type);
    });

    it('keeps the names when they are free', () => {
        const { nodes, edges } = sample();
        const copy = copySelection(select(nodes, ['b2']), edges)!;
        // pasted into an empty diagram
        const pasted = pasteNodes(copy, [], [], 0);
        expect(pasted.nodes[0].id).toBe('b1');
        expect(pasted.nodes[0].type === 'fbBlock' && pasted.nodes[0].data.block.name).toBe('NOT_1');
    });
});
