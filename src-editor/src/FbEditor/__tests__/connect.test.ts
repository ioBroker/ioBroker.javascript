import { describe, expect, it } from 'vitest';

import { createBlock, createGraph } from '@fb-core';

import { convertValue, retypeConst } from '../connect';

function block(type: string): ReturnType<typeof createBlock> {
    return createBlock(type, [0, 0], createGraph());
}

describe('FbEditor: a CONST takes the type of the input it is linked to', () => {
    it('takes the type of the input when the types do not fit', () => {
        expect(retypeConst(block('CONST'), 'STRING', 'TIME', [])).toBe('TIME');
        expect(retypeConst(block('CONST'), 'REAL', 'BOOL', [])).toBe('BOOL');
    });

    it('keeps its type when the types fit, or the input takes anything', () => {
        expect(retypeConst(block('CONST'), 'TIME', 'TIME', [])).toBeNull();
        expect(retypeConst(block('CONST'), 'INT', 'REAL', []), 'INT becomes REAL by itself').toBeNull();
        expect(retypeConst(block('CONST'), 'STRING', 'ANY', [])).toBeNull();
    });

    it('keeps its type when it feeds inputs already that the new type would not fit', () => {
        expect(retypeConst(block('CONST'), 'STRING', 'TIME', ['STRING'])).toBeNull();
        // an input that takes anything, or one that fits the new type, is no obstacle
        expect(retypeConst(block('CONST'), 'STRING', 'TIME', ['ANY', 'TIME'])).toBe('TIME');
        expect(retypeConst(block('CONST'), 'STRING', 'INT', ['REAL'])).toBe('INT');
    });

    it('leaves every other block alone', () => {
        expect(retypeConst(block('STATE_IN'), 'STRING', 'TIME', [])).toBeNull();
        expect(retypeConst(block('NOT'), 'BOOL', 'TIME', [])).toBeNull();
    });

    it('takes the value along as far as it goes', () => {
        expect(convertValue('0', 'TIME')).toBe(0);
        expect(convertValue('5s', 'TIME')).toBe(5000);
        expect(convertValue('abc', 'TIME')).toBe(0);
        expect(convertValue('21.5', 'REAL')).toBe(21.5);
        expect(convertValue('21.5', 'INT')).toBe(22);
        expect(convertValue(true, 'INT')).toBe(1);
        expect(convertValue('1', 'BOOL')).toBe(true);
        expect(convertValue(0, 'BOOL')).toBe(false);
        expect(convertValue(21, 'STRING')).toBe('21');
        expect(convertValue(undefined, 'REAL')).toBe(0);
    });
});
