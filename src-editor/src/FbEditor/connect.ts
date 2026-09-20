/**
 * A CONST dragged to an input of another type takes that type - it is only a value, and a value of
 * the wrong type is what nobody wants to keep. Other blocks keep their type: a STATE_IN converts a
 * real state, and a change of that is not made in passing.
 */
import { isCompatible, type FbBlock, type FbSignalType, type FbValue } from '@fb-core';

import { parseValue } from './BlockNode';

/**
 * The type a CONST takes for a new link: `null` when it needs none (the types fit, or the input
 * takes anything) or cannot take one - when it feeds inputs already that would not fit then.
 *
 * @param source the block the link comes from
 * @param from the type of its output
 * @param to the type of the input
 * @param others the types of the inputs it feeds already
 */
export function retypeConst(
    source: FbBlock,
    from: FbSignalType | 'ANY',
    to: FbSignalType | 'ANY',
    others: (FbSignalType | 'ANY')[],
): FbSignalType | null {
    if (source.type !== 'CONST' || to === 'ANY' || isCompatible(from, to)) {
        return null;
    }
    return others.every(other => isCompatible(to, other)) ? to : null;
}

/** A value in another type, as far as it goes: `"5s"` as TIME is 5000, `"abc"` as REAL is 0 */
export function convertValue(value: FbValue | undefined, type: FbSignalType): FbValue {
    const text = value === undefined || value === null ? '' : String(value).trim();
    switch (type) {
        case 'BOOL':
            return value === true || /^(true|1|on|yes)$/i.test(text);
        case 'STRING':
            return text;
        case 'INT': {
            const number = typeof value === 'boolean' ? Number(value) : Number(text);
            return Number.isFinite(number) ? Math.round(number) : 0;
        }
        case 'REAL': {
            const number = typeof value === 'boolean' ? Number(value) : Number(text);
            return Number.isFinite(number) ? number : 0;
        }
        default:
            // TIME: a number of ms, or a text like `5s`
            return (parseValue(text, 'TIME') as number | null) ?? 0;
    }
}
