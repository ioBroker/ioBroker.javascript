import { describe, expect, it } from 'vitest';

import { createBlock, createBlockInfo, createGraph, userBlockOf } from '@fb-core';

import { graphToFlow } from '../convert';
import { findNodes } from '../search';

function sample(): ReturnType<typeof createGraph> {
    // a user block "Shutter"
    const definition = createGraph();
    definition.block = createBlockInfo('Shutter');
    const pin = createBlock('FB_IN', [0, 0], definition);
    pin.params = { ...pin.params, pin: 'IN' };
    definition.blocks.push(pin);
    const user = userBlockOf(definition)!;

    const graph = createGraph();
    graph.userBlocks = { [user.type]: user };
    const input = createBlock('STATE_IN', [0, 100], graph);
    input.params = { ...input.params, oid: 'zigbee.0.kitchen.motion', type: 'BOOL' };
    input.name = 'motion';
    graph.blocks.push(input);
    const timer = createBlock('TON', [300, 0], graph);
    graph.blocks.push(timer);
    const shutter = createBlock(user.type, [300, 200], graph);
    graph.blocks.push(shutter);
    const output = createBlock('STATE_OUT', [600, 0], graph);
    output.params = { ...output.params, oid: 'hue.0.kitchen.on' };
    graph.blocks.push(output);
    graph.links.push({ id: 'l1', from: [timer.id, 'Q'], to: [output.id, 'IN'], mark: true, label: 'light' });
    graph.comments.push({ id: 'c1', pos: [0, 400], size: [200, 80], text: 'Kitchen at night' });
    return graph;
}

describe('FbEditor: search in the diagram', () => {
    const graph = sample();
    const { nodes, edges } = graphToFlow(graph);
    const find = (text: string): string[] => findNodes(nodes, edges, text, graph.userBlocks!);

    it('finds blocks by name, type, state and the name of a user block', () => {
        expect(find('MOTION')).toEqual(['b1']);
        expect(find('ton')).toEqual(['b2']);
        expect(find('hue.0')).toEqual(['b4']);
        expect(find('shutter')).toEqual(['b3']);
    });

    it('finds comments and both ends of a connection mark, from left to right', () => {
        // the input and the comment are both on the left, the input higher up
        expect(find('kitchen')).toEqual(['b1', 'c1', 'b4']);
        expect(find('light')).toEqual(['b2', 'b4']);
    });

    it('finds nothing for nothing', () => {
        expect(find('  ')).toEqual([]);
        expect(find('garage')).toEqual([]);
    });
});
