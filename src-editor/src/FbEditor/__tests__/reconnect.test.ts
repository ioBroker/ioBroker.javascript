import { describe, expect, it } from 'vitest';

import { createBlock, createGraph } from '@fb-core';

import { isInputTaken, letGoLink, linksFrom, moveLink, refuseLink, retypeConst } from '../connect';
import type { FbEdge } from '../convert';

function block(type: string): ReturnType<typeof createBlock> {
    return createBlock(type, [0, 0], createGraph());
}

/** CONST1.OUT -> AND1.IN1 (as a connection mark), NOT1.OUT -> AND1.IN2; AND2.IN1 and AND2.IN2 are free */
function sample(): FbEdge[] {
    return [
        {
            id: 'l1',
            type: 'fbLink',
            source: 'CONST1',
            sourceHandle: 'OUT',
            target: 'AND1',
            targetHandle: 'IN1',
            data: { mark: true, label: 'start' },
        },
        { id: 'l2', type: 'fbLink', source: 'NOT1', sourceHandle: 'OUT', target: 'AND1', targetHandle: 'IN2' },
    ];
}

describe('FbEditor: a link is moved with its input end to another input', () => {
    it('moves to a free input that fits, from the same output and with all it has', () => {
        const edges = sample();
        const moved = moveLink(edges, 'l1', 'AND2', 'IN1');
        expect(moved).toHaveLength(2);
        expect(moved?.[0]).toEqual({ ...edges[0], target: 'AND2', targetHandle: 'IN1' });
        expect(moved?.[0].data).toEqual({ mark: true, label: 'start' });
        expect(moved?.[1], 'the other link stays').toBe(edges[1]);
        expect(isInputTaken(moved!, 'AND1', 'IN1'), 'the old input is free').toBe(false);
        expect(refuseLink(block('NOT'), 'BOOL', 'BOOL', [], isInputTaken(edges, 'AND2', 'IN1', 'l1'))).toBeNull();
    });

    it('goes back where it was, as its own input does not count as taken', () => {
        const edges = sample();
        expect(isInputTaken(edges, 'AND1', 'IN1', 'l1')).toBe(false);
        expect(moveLink(edges, 'l1', 'AND1', 'IN1')?.[0]).toEqual(edges[0]);
    });

    it('is refused on an input that has a link already, and stays', () => {
        const edges = sample();
        expect(isInputTaken(edges, 'AND1', 'IN2', 'l1')).toBe(true);
        expect(refuseLink(block('NOT'), 'BOOL', 'BOOL', [], true)).toBe('taken');
        expect(moveLink(edges, 'l1', 'AND1', 'IN2')).toBeNull();
        expect(edges, 'nothing changed').toEqual(sample());
    });

    it('is refused on an input of the wrong type, and stays', () => {
        const edges = sample();
        expect(refuseLink(block('STATE_IN'), 'STRING', 'TIME', [], false)).toBe('type');
        expect(refuseLink(block('NOT'), 'BOOL', 'TIME', [], false)).toBe('type');
        // the link is only moved when it is not refused
        expect(edges).toEqual(sample());
    });

    it('lets a CONST take the type of the new input - the input it leaves holds it no more', () => {
        const edges: FbEdge[] = [
            ...sample(),
            { id: 'l3', type: 'fbLink', source: 'CONST1', sourceHandle: 'OUT', target: 'CMP1', targetHandle: 'IN1' },
        ];
        // CONST1 feeds AND1.IN1 (l1) and CMP1.IN1 (l3); l1 moves to a TIME input
        const others = linksFrom(edges, 'CONST1', 'OUT', 'l1');
        expect(others.map(edge => edge.id)).toEqual(['l3']);
        expect(linksFrom(edges, 'CONST1', 'OUT').map(edge => edge.id)).toEqual(['l1', 'l3']);

        // the other input takes TIME as well: the CONST takes it
        expect(retypeConst(block('CONST'), 'BOOL', 'TIME', ['ANY'])).toBe('TIME');
        expect(refuseLink(block('CONST'), 'BOOL', 'TIME', ['ANY'], false)).toBeNull();
        // the only input it feeds is the one it leaves: no obstacle any more
        expect(retypeConst(block('CONST'), 'BOOL', 'TIME', [])).toBe('TIME');
        // counted with the input it leaves, it could not
        expect(refuseLink(block('CONST'), 'BOOL', 'TIME', ['BOOL'], false)).toBe('const');
    });

    it('is deleted when let go nowhere, and stays as it is on a pin', () => {
        const edges = sample();
        expect(letGoLink(edges, 'l1', false)).toEqual([edges[1]]);
        expect(letGoLink(edges, 'l1', true)).toBe(edges);
    });
});
