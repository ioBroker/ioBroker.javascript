/**
 * The JS block: code of the user that becomes a function of the generated script. Its parameters are
 * the inputs of the block, then `dt`, `firstScan` and `state`.
 */
import { getInputs } from './graph';
import type { FbBlock, FbBlockDef } from './types';

/** The names the code of a JS block sees, in the order the function gets them */
export function jsParameters(block: FbBlock, def: FbBlockDef): string[] {
    return [...getInputs(block, def).map(pin => pin.id), 'dt', 'firstScan', 'state'];
}

/** The code of a JS block */
export function jsCode(block: FbBlock, def: FbBlockDef): string {
    const code = block.params?.code ?? def.params?.find(param => param.id === 'code')?.default;
    return typeof code === 'string' ? code : '';
}

/**
 * The syntax error of the code of a JS block, or `null`. The body is parsed on its own, so code that
 * closes the function early is an error too and cannot break the script around it.
 */
export function checkJsCode(code: string, parameters: string[]): string | null {
    try {
        new Function(...parameters, code);
        return null;
    } catch (error: unknown) {
        return (error as Error)?.message || String(error);
    }
}
