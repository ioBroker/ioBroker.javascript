import { STATE_NAME_RE, type TemplateNode, type TemplateRoot } from './template';
import type { DeviceInput, RecipeInput } from './types';

/** The device types an input allows */
export function deviceTypesOf(input: DeviceInput): string[] {
    return Array.isArray(input.deviceType) ? input.deviceType : [input.deviceType];
}

/**
 * The states that a template uses of a device input for one of its device types, without a condition
 * like `{{#if light.ON_SET}}` that makes sure the device has them. A device of that type must have
 * these states, or the recipe cannot be filled in with it.
 */
function statesNeededFor(
    nodes: TemplateNode[],
    input: string,
    type: string,
    known: Set<string>,
    out: Set<string>,
): void {
    for (const node of nodes) {
        if (node.type === 'value') {
            const { name, prop } = node.path;
            if (name === input && prop && STATE_NAME_RE.test(prop) && !known.has(prop)) {
                out.add(prop);
            }
        } else if (node.type === 'each') {
            statesNeededFor(node.body, input, type, known, out);
        } else if (node.type === 'if') {
            const { path, op, literal } = node.condition;
            if (path.name === input && path.prop === 'type' && op) {
                // decided by the device type alone
                const equal = literal === type;
                const branch = (op === '==') === equal ? node.then : node.else;
                if (branch) {
                    statesNeededFor(branch, input, type, known, out);
                }
            } else if (path.name === input && path.prop && STATE_NAME_RE.test(path.prop) && !op) {
                statesNeededFor(node.then, input, type, new Set([...known, path.prop]), out);
                if (node.else) {
                    statesNeededFor(node.else, input, type, known, out);
                }
            } else {
                statesNeededFor(node.then, input, type, known, out);
                if (node.else) {
                    statesNeededFor(node.else, input, type, known, out);
                }
            }
        }
    }
}

/** For every device input: device type to the states a device of that type must have */
export function neededStates(
    ast: TemplateRoot,
    inputs: Record<string, RecipeInput>,
): Record<string, Record<string, string[]>> {
    const result: Record<string, Record<string, string[]>> = {};
    for (const [name, input] of Object.entries(inputs)) {
        if (input.type !== 'device') {
            continue;
        }
        result[name] = {};
        for (const type of deviceTypesOf(input)) {
            const out = new Set<string>();
            statesNeededFor(ast.children, name, type, new Set(), out);
            result[name][type] = [...out].sort();
        }
    }
    return result;
}

/** The names of all inputs a template uses */
export function usedInputs(ast: TemplateRoot): Set<string> {
    const used = new Set<string>();
    const walk = (nodes: TemplateNode[]): void => {
        for (const node of nodes) {
            if (node.type === 'value' && !node.path.index) {
                used.add(node.path.name);
            } else if (node.type === 'each') {
                used.add(node.name);
                walk(node.body);
            } else if (node.type === 'if') {
                if (!node.condition.path.index) {
                    used.add(node.condition.path.name);
                }
                walk(node.then);
                if (node.else) {
                    walk(node.else);
                }
            }
        }
    };
    walk(ast.children);
    return used;
}
