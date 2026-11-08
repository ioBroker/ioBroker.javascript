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

/**
 * Why a link from an output to an input is not made, `null` if it is: `type` - the types do not fit,
 * `const` - a CONST would take the type, but feeds inputs already that would not fit then, `taken` -
 * the input has a link already.
 *
 * @param source the block the link comes from
 * @param from the type of its output
 * @param to the type of the input
 * @param others the types of the inputs it feeds already
 * @param taken whether the input has a link already
 */
export function refuseLink(
    source: FbBlock,
    from: FbSignalType | 'ANY',
    to: FbSignalType | 'ANY',
    others: (FbSignalType | 'ANY')[],
    taken: boolean,
): 'type' | 'const' | 'taken' | null {
    if (!isCompatible(from, to) && !retypeConst(source, from, to, others)) {
        return source.type === 'CONST' && to !== 'ANY' ? 'const' : 'type';
    }
    return taken ? 'taken' : null;
}

/** The ends of a link, as React Flow has them */
interface LinkEnds {
    id: string;
    source: string;
    sourceHandle?: string | null;
    target: string;
    targetHandle?: string | null;
}

/**
 * The links an output feeds - without the one `except`, which is on its way to another input: the
 * input it leaves does not hold a CONST to its type any more.
 */
export function linksFrom<E extends LinkEnds>(
    edges: E[],
    source: string,
    sourceHandle: string | null | undefined,
    except?: string,
): E[] {
    return edges.filter(edge => edge.source === source && edge.sourceHandle === sourceHandle && edge.id !== except);
}

/** Whether an input has a link already - other than the one `except`, which may go back where it was */
export function isInputTaken(
    edges: LinkEnds[],
    target: string,
    targetHandle: string | null | undefined,
    except?: string,
): boolean {
    return edges.some(edge => edge.target === target && edge.targetHandle === targetHandle && edge.id !== except);
}

/**
 * A link moved with its input end to another input: from the same output, with its ID and all it
 * has (a connection mark, its label). `null` if the new input has a link already.
 */
export function moveLink<E extends LinkEnds>(
    edges: E[],
    id: string,
    target: string,
    targetHandle: string | null | undefined,
): E[] | null {
    if (isInputTaken(edges, target, targetHandle, id)) {
        return null;
    }
    return edges.map(edge => (edge.id === id ? { ...edge, target, targetHandle } : edge));
}

/**
 * The links after the input end of one was let go: on a pin, the link is where the pin left it -
 * moved, or as it was if the pin refused it; anywhere else it is deleted.
 */
export function letGoLink<E extends LinkEnds>(edges: E[], id: string, onPin: boolean): E[] {
    return onPin ? edges : edges.filter(edge => edge.id !== id);
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
