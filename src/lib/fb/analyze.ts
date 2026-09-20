import {
    FB_CYCLE_DEFAULT_MS,
    FB_CYCLE_MAX_MS,
    FB_CYCLE_MIN_MS,
    FB_ID_PATTERN,
    getInputs,
    getOutputs,
    isCompatible,
} from './graph';
import { checkJsCode, jsCode, jsParameters } from './js';
import { getBlockDef } from './library';
import type { FbBlock, FbBlockDef, FbGraph, FbIssue, FbLink, FbUserBlock } from './types';
import { FB_USER_TYPE_PATTERN } from './user';

export interface FbAnalysis {
    issues: FbIssue[];
    /** Position of each block in the execution order: 10, 20, 30, ... */
    order: Record<string, number>;
    /** The links that carry the value of the previous cycle, because they lead back in the order */
    feedback: string[];
    /** The links that can be turned into code, in the order of `graph.links` */
    links: FbLink[];
    /** How the diagram runs: `auto` resolved */
    mode: 'cyclic' | 'event';
    /** Interval of the cyclic mode in ms */
    ms: number;
}

interface Node {
    block: FbBlock;
    def: FbBlockDef;
}

/**
 * Strongly connected components (Tarjan). A component of one node only counts as a loop when the
 * node feeds itself - the caller checks that.
 */
function findComponents(ids: string[], edges: Map<string, Set<string>>): string[][] {
    let index = 0;
    const indices = new Map<string, number>();
    const lowLinks = new Map<string, number>();
    const stack: string[] = [];
    const onStack = new Set<string>();
    const components: string[][] = [];

    const visit = (id: string): void => {
        indices.set(id, index);
        lowLinks.set(id, index);
        index++;
        stack.push(id);
        onStack.add(id);

        for (const next of edges.get(id) || []) {
            if (!indices.has(next)) {
                visit(next);
                lowLinks.set(id, Math.min(lowLinks.get(id)!, lowLinks.get(next)!));
            } else if (onStack.has(next)) {
                lowLinks.set(id, Math.min(lowLinks.get(id)!, indices.get(next)!));
            }
        }

        if (lowLinks.get(id) === indices.get(id)) {
            const component: string[] = [];
            let member: string;
            do {
                member = stack.pop()!;
                onStack.delete(member);
                component.push(member);
            } while (member !== id);
            components.push(component);
        }
    };

    ids.forEach(id => !indices.has(id) && visit(id));
    return components;
}

function isLoop(component: string[], edges: Map<string, Set<string>>): boolean {
    return component.length > 1 || !!edges.get(component[0])?.has(component[0]);
}

function buildEdges(ids: string[], links: FbLink[], skip?: (link: FbLink) => boolean): Map<string, Set<string>> {
    const edges = new Map<string, Set<string>>(ids.map(id => [id, new Set<string>()]));
    for (const link of links) {
        if (!skip?.(link)) {
            edges.get(link.from[0])?.add(link.to[0]);
        }
    }
    return edges;
}

export interface FbAnalyzeOptions {
    /** The user blocks the diagram may use - by default its own copies */
    userBlocks?: Record<string, FbUserBlock>;
    /** The diagram is a block: FB_IN and FB_OUT make its pins, states are not reachable */
    isBlock?: boolean;
    /** The user blocks being checked further up, against a block that contains itself */
    visiting?: Set<string>;
    /** Results of user blocks checked already */
    cache?: Map<string, FbAnalysis>;
}

/** A pin name becomes a property of the instance next to `run()` */
const PIN_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const RESERVED_PINS = ['run', 'self', 'constructor', 'prototype', '__proto__'];

export function formatIssue(issue: FbIssue): string {
    let index = 0;
    return issue.message.replace(/%s/g, () => issue.args?.[index++] ?? '');
}

/** Checks a user block once per analysis; its errors become one error of the instance */
function checkUserBlock(user: FbUserBlock, options: Required<FbAnalyzeOptions>): string | null {
    if (options.visiting.has(user.type)) {
        return 'The block %s contains itself';
    }
    let analysis = options.cache.get(user.type);
    if (!analysis) {
        options.visiting.add(user.type);
        analysis = analyzeGraph(user.graph, { ...options, isBlock: true });
        options.visiting.delete(user.type);
        options.cache.set(user.type, analysis);
    }
    return analysis.issues.some(issue => issue.severity === 'error') ? 'The block %s has errors: %s' : null;
}

/**
 * Checks a diagram and works out the execution order.
 *
 * The order follows the data flow. A loop is only allowed when it runs through a block with a
 * state (a timer, a flip-flop, a user block, ...): the link that leads back reads what that block
 * put out in the previous cycle, as in any SPS. A loop without such a block has no solution and is
 * an error.
 */
export function analyzeGraph(graph: FbGraph, analyzeOptions?: FbAnalyzeOptions): FbAnalysis {
    const options: Required<FbAnalyzeOptions> = {
        userBlocks: analyzeOptions?.userBlocks || graph.userBlocks || {},
        isBlock: analyzeOptions?.isBlock ?? !!graph.block,
        visiting: analyzeOptions?.visiting || new Set(graph.block ? [graph.block.type] : []),
        cache: analyzeOptions?.cache || new Map(),
    };
    const issues: FbIssue[] = [];
    const nodes = new Map<string, Node>();

    if (graph.block && !FB_USER_TYPE_PATTERN.test(graph.block.type)) {
        issues.push({ severity: 'error', message: 'Invalid block type %s', args: [graph.block.type] });
    }
    const pins = new Set<string>();

    for (const block of graph.blocks) {
        if (!FB_ID_PATTERN.test(block.id || '')) {
            issues.push({ severity: 'error', message: 'Invalid block ID %s', args: [String(block.id)] });
            continue;
        }
        if (nodes.has(block.id)) {
            issues.push({ severity: 'error', message: 'Duplicate block ID %s', args: [block.id], blockId: block.id });
            continue;
        }
        const def = getBlockDef(block.type, options.userBlocks);
        if (!def) {
            issues.push({ severity: 'error', message: 'Unknown block type %s', args: [block.type], blockId: block.id });
            continue;
        }
        nodes.set(block.id, { block, def });

        for (const param of def.params || []) {
            const value = block.params?.[param.id] ?? param.default;
            if (param.required && (value === undefined || value === null || value === '')) {
                issues.push({
                    severity: 'error',
                    message: 'Parameter "%s" is not set',
                    args: [param.id],
                    blockId: block.id,
                });
            }
        }

        if (def.category === 'interface') {
            if (!options.isBlock) {
                issues.push({
                    severity: 'error',
                    message: 'Inputs and outputs of a block only work in the diagram of a block',
                    blockId: block.id,
                });
            }
            const pin = String(block.params?.pin ?? '');
            if (pin && (!PIN_NAME.test(pin) || RESERVED_PINS.includes(pin))) {
                issues.push({ severity: 'error', message: 'Invalid pin name %s', args: [pin], blockId: block.id });
            } else if (pin && pins.has(pin)) {
                issues.push({
                    severity: 'error',
                    message: 'The pin name %s is used twice',
                    args: [pin],
                    blockId: block.id,
                });
            }
            pins.add(pin);
        } else if (options.isBlock && (block.type === 'STATE_IN' || block.type === 'STATE_OUT')) {
            issues.push({
                severity: 'error',
                message: 'A block cannot read or write states - give it inputs and outputs instead',
                blockId: block.id,
            });
        }

        if (def.user) {
            const problem = checkUserBlock(def.user, options);
            if (problem) {
                const inner = options.cache.get(def.user.type)?.issues.find(issue => issue.severity === 'error');
                issues.push({
                    severity: 'error',
                    message: problem,
                    args: inner ? [def.user.name, formatIssue(inner)] : [def.user.name],
                    blockId: block.id,
                });
            }
        }

        if (block.type === 'JS') {
            const problem = checkJsCode(jsCode(block, def), jsParameters(block, def));
            if (problem) {
                issues.push({
                    severity: 'error',
                    message: 'The code has an error: %s',
                    args: [problem],
                    blockId: block.id,
                });
            }
        }
    }

    // links: both ends must exist, the types must fit, and an input takes one signal only
    const links: FbLink[] = [];
    const driven = new Set<string>();
    for (const link of graph.links) {
        const from = nodes.get(link.from[0]);
        const to = nodes.get(link.to[0]);
        const output = from && getOutputs(from.block, from.def).find(pin => pin.id === link.from[1]);
        const input = to && getInputs(to.block, to.def).find(pin => pin.id === link.to[1]);
        if (!output || !input) {
            issues.push({
                severity: 'error',
                message: 'The connection refers to a missing block or pin',
                linkId: link.id,
                blockId: to ? link.to[0] : from ? link.from[0] : undefined,
            });
            continue;
        }
        if (!isCompatible(output.type, input.type)) {
            issues.push({
                severity: 'error',
                message: 'Types do not match: %s cannot be connected to %s',
                args: [output.type, input.type],
                linkId: link.id,
                blockId: link.to[0],
            });
            continue;
        }
        const key = `${link.to[0]}.${link.to[1]}`;
        if (driven.has(key)) {
            issues.push({
                severity: 'error',
                message: 'Input %s is connected more than once',
                args: [link.to[1]],
                linkId: link.id,
                blockId: link.to[0],
            });
            continue;
        }
        driven.add(key);
        links.push(link);
    }

    // Loops: inside a loop, the links that start at a block with a state may lead back. Whatever
    // is still a loop without them has no block to take the value of the previous cycle from.
    const ids = [...nodes.keys()];
    const allEdges = buildEdges(ids, links);
    const inLoop = new Map<string, number>();
    findComponents(ids, allEdges)
        .filter(component => isLoop(component, allEdges))
        .forEach((component, i) => component.forEach(id => inLoop.set(id, i)));

    const breakable = (link: FbLink): boolean =>
        !!nodes.get(link.from[0])?.def.stateful &&
        inLoop.has(link.from[0]) &&
        inLoop.get(link.from[0]) === inLoop.get(link.to[0]);

    const orderEdges = buildEdges(ids, links, breakable);
    for (const component of findComponents(ids, orderEdges)) {
        if (isLoop(component, orderEdges)) {
            const names = component
                .map(id => nodes.get(id)!.block)
                .sort(byPosition)
                .map(block => block.name || block.id);
            issues.push({
                severity: 'error',
                message: 'Loop without a block that stores a value: %s',
                args: [names.join(', ')],
                blockIds: component,
            });
        }
    }

    // topological order; blocks that are ready at the same time run from left to right, then top down
    const incoming = new Map<string, number>(ids.map(id => [id, 0]));
    orderEdges.forEach(targets => targets.forEach(id => incoming.set(id, incoming.get(id)! + 1)));
    const ready = ids.filter(id => !incoming.get(id));
    const sequence: string[] = [];
    while (ready.length) {
        ready.sort((a, b) => byPosition(nodes.get(a)!.block, nodes.get(b)!.block));
        const id = ready.shift()!;
        sequence.push(id);
        for (const next of orderEdges.get(id)!) {
            const count = incoming.get(next)! - 1;
            incoming.set(next, count);
            if (!count) {
                ready.push(next);
            }
        }
    }
    // blocks of an unsolvable loop still get a number, so the editor can show one
    ids.filter(id => !sequence.includes(id))
        .sort((a, b) => byPosition(nodes.get(a)!.block, nodes.get(b)!.block))
        .forEach(id => sequence.push(id));

    const order: Record<string, number> = {};
    sequence.forEach((id, i) => (order[id] = (i + 1) * 10));

    const feedback = links.filter(link => order[link.from[0]] >= order[link.to[0]]).map(link => link.id);

    const timeDependent = [...nodes.values()].some(node => node.def.timeDependent);
    const mode = graph.cycle.mode === 'auto' ? (timeDependent ? 'cyclic' : 'event') : graph.cycle.mode;
    const ms = Math.max(
        FB_CYCLE_MIN_MS,
        Math.min(FB_CYCLE_MAX_MS, Math.round(Number(graph.cycle.ms) || FB_CYCLE_DEFAULT_MS)),
    );
    // the mode of a block is the one of the diagram it is used in
    if (mode === 'event' && timeDependent && !options.isBlock) {
        issues.push({
            severity: 'warning',
            message: 'Timers need the cyclic mode, in the event mode they only run when an input changes',
        });
    }

    return { issues, order, feedback, links, mode, ms };
}

function byPosition(a: FbBlock, b: FbBlock): number {
    return a.pos[0] - b.pos[0] || a.pos[1] - b.pos[1] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
