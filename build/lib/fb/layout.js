"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.layoutGraph = layoutGraph;
/**
 * Arranges the blocks of a diagram automatically: in columns along the data flow, inputs on the
 * left, outputs on the right, and each block as level as it can be with the blocks it is linked to,
 * so the links run straight where possible.
 *
 * A layered layout in the manner of Sugiyama, kept small: columns by the longest path, the order in a
 * column by the positions of the neighbours, and the positions by the mean of what the blocks of a
 * column want, without overlaps. Links that lead back (feedback) do not count.
 *
 * Pinned blocks (`block.pinned`) stay where they are. Their column goes where they are, and the other
 * blocks are as level with them as with any other block, but never on them.
 */
const analyze_1 = require("./analyze");
const graph_1 = require("./graph");
const library_1 = require("./library");
const DEFAULT_METRICS = { header: 22, detail: 18, pin: 20, frame: 6 };
const DEFAULT_WIDTH = 160;
/** Room between the columns - for the links, and the values of open inputs left of a block */
const GAP_X = 100;
const GAP_Y = 30;
const GRID = 10;
/** Rounds from one side to the other and back */
const PASSES = 4;
/** Blocks that are closer side by side than this count as one above the other */
const MARGIN_X = 20;
/** Blocks with a line under the type (state, value, pin, version) are that much higher */
function pinTop(def, metrics) {
    return metrics.header + (def?.user || def?.params?.length ? metrics.detail : 0);
}
/** The top of a group of blocks that touch: the mean of what each of them wants */
function settle(cluster) {
    let offset = 0;
    let sum = 0;
    cluster.ids.forEach((_id, i) => {
        sum += cluster.wants[i] - offset;
        offset += cluster.heights[i] + GAP_Y;
    });
    cluster.top = sum / cluster.ids.length;
}
function clusterHeight(cluster) {
    return cluster.heights.reduce((sum, height) => sum + height + GAP_Y, 0) - GAP_Y;
}
/**
 * The left edge of each column with blocks: side by side, each as wide as its widest block. A column
 * with pinned blocks is where the leftmost of them is, and the columns without go on either side of it.
 */
function placeColumns(columns, items, pinned, left) {
    const used = columns.map((_ids, i) => i).filter(i => columns[i].length);
    const step = (i) => Math.round((Math.max(...columns[i].map(id => items.get(id).width)) + GAP_X) / GRID) * GRID;
    const anchor = (i) => {
        const xs = columns[i].filter(id => pinned.has(id)).map(id => items.get(id).block.pos[0]);
        return xs.length ? Math.min(...xs) : undefined;
    };
    const x = [];
    const first = used.findIndex(i => anchor(i) !== undefined);
    if (first === -1) {
        let next = Math.round(left / GRID) * GRID;
        for (const i of used) {
            x[i] = next;
            next += step(i);
        }
        return x;
    }
    x[used[first]] = anchor(used[first]);
    for (let k = first - 1; k >= 0; k--) {
        x[used[k]] = x[used[k + 1]] - step(used[k]);
    }
    for (let k = first + 1; k < used.length; k++) {
        x[used[k]] = anchor(used[k]) ?? x[used[k - 1]] + step(used[k - 1]);
    }
    return x;
}
/**
 * New positions for the blocks of a diagram, by ID - not for pinned blocks, which stay where they are.
 * The comments stay where they are too; without pinned blocks the top left corner of the blocks stays
 * where it was.
 */
function layoutGraph(graph, options = {}) {
    const pinned = new Set(graph.blocks.filter(block => block.pinned).map(block => block.id));
    if (pinned.size === graph.blocks.length) {
        return {};
    }
    const analysis = (0, analyze_1.analyzeGraph)(graph);
    const feedback = new Set(analysis.feedback);
    const links = analysis.links.filter(link => !feedback.has(link.id) && link.from[0] !== link.to[0]);
    const metrics = options.metrics || DEFAULT_METRICS;
    const PIN_HEIGHT = metrics.pin;
    const items = new Map();
    for (const block of graph.blocks) {
        const def = (0, library_1.getBlockDef)(block.type, graph.userBlocks);
        const rows = Math.max((0, graph_1.getInputs)(block, def).length, (0, graph_1.getOutputs)(block, def).length, 1);
        const top = pinTop(def, metrics);
        const size = options.sizes?.[block.id];
        items.set(block.id, {
            id: block.id,
            block,
            def,
            width: size?.width || DEFAULT_WIDTH,
            height: size?.height || top + rows * PIN_HEIGHT + metrics.frame,
            pinTop: top,
        });
    }
    const incoming = new Map();
    const outgoing = new Map();
    for (const link of links) {
        incoming.set(link.to[0], [...(incoming.get(link.to[0]) || []), link]);
        outgoing.set(link.from[0], [...(outgoing.get(link.from[0]) || []), link]);
    }
    // the pins, from the top of their block
    const outputY = (link) => {
        const item = items.get(link.from[0]);
        const index = (0, graph_1.getOutputs)(item.block, item.def).findIndex(pin => pin.id === link.from[1]);
        return item.pinTop + Math.max(index, 0) * PIN_HEIGHT + PIN_HEIGHT / 2;
    };
    const inputY = (link) => {
        const item = items.get(link.to[0]);
        const index = (0, graph_1.getInputs)(item.block, item.def).findIndex(pin => pin.id === link.to[1]);
        return item.pinTop + Math.max(index, 0) * PIN_HEIGHT + PIN_HEIGHT / 2;
    };
    // Columns by the longest path. The execution order is a topological order of the links that do
    // not lead back; blocks that cannot run (an unknown type) come last.
    const sequence = graph.blocks
        .map(block => block.id)
        .sort((a, b) => (analysis.order[a] ?? Infinity) - (analysis.order[b] ?? Infinity));
    const column = new Map();
    for (const id of sequence) {
        let index = 0;
        for (const link of incoming.get(id) || []) {
            index = Math.max(index, (column.get(link.from[0]) ?? 0) + 1);
        }
        column.set(id, index);
    }
    // a block that only gives a value, like CONST, goes next to where it is used
    for (const id of [...sequence].reverse()) {
        const type = items.get(id).block.type;
        const next = outgoing.get(id) || [];
        if (!incoming.get(id)?.length && next.length && type !== 'STATE_IN' && type !== 'FB_IN') {
            column.set(id, Math.max(0, Math.min(...next.map(link => column.get(link.to[0]))) - 1));
        }
    }
    // the outputs of the diagram in the last column
    const last = Math.max(...column.values());
    for (const id of sequence) {
        const type = items.get(id).block.type;
        if ((type === 'STATE_OUT' || type === 'FB_OUT') && !outgoing.get(id)?.length) {
            column.set(id, last);
        }
    }
    // the columns, at first in the order the blocks have from top to bottom
    const columns = Array.from({ length: last + 1 }, () => []);
    graph.blocks
        .slice()
        .sort((a, b) => a.pos[1] - b.pos[1] || a.pos[0] - b.pos[0])
        .forEach(block => columns[column.get(block.id)].push(block.id));
    const left = Math.min(...graph.blocks.map(block => block.pos[0]));
    const top = Math.min(...graph.blocks.map(block => block.pos[1]));
    const columnX = placeColumns(columns, items, pinned, left);
    // Without pinned blocks the layout starts at 0 and goes to the top of the blocks at the end. With
    // them it works where the blocks are, as the pinned ones stay there - and the others start where
    // they are, so blocks added beside the pinned ones stay near where they were put.
    const anchored = pinned.size > 0;
    const y = new Map();
    for (const ids of columns) {
        let next = 0;
        for (const id of ids) {
            if (anchored) {
                y.set(id, items.get(id).block.pos[1]);
            }
            else {
                y.set(id, next);
                next += items.get(id).height + GAP_Y;
            }
        }
    }
    /** From the left to the right edge of a block */
    const spanX = (id) => {
        const item = items.get(id);
        const x = pinned.has(id) ? item.block.pos[0] : columnX[column.get(id)];
        return [x, x + item.width];
    };
    /** With the gap between them */
    const overlaps = (at, height, span) => at < span[1] + GAP_Y && span[0] < at + height + GAP_Y;
    /**
     * Moves the blocks of a column, from the top down, off the blocks they would lie on: the pinned
     * ones, and those of other columns that are this close side by side (where pinned blocks leave no
     * room between two columns). A block goes above such a block if it fits there and is nearer to where
     * it wanted to be, else below - where new parts of a diagram usually go.
     */
    const avoid = (order) => {
        const own = new Set(order);
        let free = -Infinity;
        for (const id of order) {
            const height = items.get(id).height;
            const [x1, x2] = spanX(id);
            const blockers = [];
            for (const other of items.values()) {
                if (other.id === id || own.has(other.id)) {
                    continue;
                }
                const [o1, o2] = spanX(other.id);
                if (o1 < x2 + MARGIN_X && x1 < o2 + MARGIN_X) {
                    blockers.push([y.get(other.id), y.get(other.id) + other.height]);
                }
            }
            blockers.sort((a, b) => a[0] - b[0]);
            const wanted = y.get(id);
            let at = Math.max(wanted, free);
            for (;;) {
                const hit = blockers.find(span => overlaps(at, height, span));
                if (!hit) {
                    break;
                }
                const above = hit[0] - GAP_Y - height;
                const below = hit[1] + GAP_Y;
                if (above >= free &&
                    Math.abs(above - wanted) < Math.abs(below - wanted) &&
                    !blockers.some(span => overlaps(above, height, span))) {
                    at = above;
                    break;
                }
                at = below;
            }
            y.set(id, at);
            free = at + height + GAP_Y;
        }
    };
    /**
     * Places the blocks of a column where they want to be, without overlaps: blocks that would
     * overlap form a group, which sits at the mean of what its blocks want. Pinned blocks stay.
     */
    const place = (ids, want) => {
        const movable = anchored ? ids.filter(id => !pinned.has(id)) : ids;
        const fixed = anchored ? ids.filter(id => pinned.has(id)) : [];
        const wishes = movable
            .map((id, i) => ({ id, i, want: want(id) ?? y.get(id) }))
            .sort((a, b) => a.want - b.want || a.i - b.i);
        const clusters = [];
        for (const wish of wishes) {
            const cluster = {
                ids: [wish.id],
                wants: [wish.want],
                heights: [items.get(wish.id).height],
                top: wish.want,
            };
            clusters.push(cluster);
            // merge with the groups above as long as they overlap
            while (clusters.length > 1) {
                const current = clusters[clusters.length - 1];
                const above = clusters[clusters.length - 2];
                if (above.top + clusterHeight(above) + GAP_Y <= current.top) {
                    break;
                }
                above.ids.push(...current.ids);
                above.wants.push(...current.wants);
                above.heights.push(...current.heights);
                settle(above);
                clusters.pop();
            }
        }
        const order = [];
        for (const cluster of clusters) {
            let next = cluster.top;
            cluster.ids.forEach((id, i) => {
                y.set(id, next);
                next += cluster.heights[i] + GAP_Y;
                order.push(id);
            });
        }
        if (anchored) {
            avoid(order);
        }
        ids.length = 0;
        ids.push(...order, ...fixed);
    };
    const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    // level with the outputs that feed it
    const fromLeft = (id) => mean((incoming.get(id) || []).map(link => y.get(link.from[0]) + outputY(link) - inputY(link)));
    // level with the inputs it feeds
    const fromRight = (id) => mean((outgoing.get(id) || []).map(link => y.get(link.to[0]) + inputY(link) - outputY(link)));
    if (anchored) {
        // off the pinned blocks from the start - a diagram of one column has no rounds
        columns.forEach(ids => place(ids, () => null));
    }
    for (let pass = 0; pass < PASSES; pass++) {
        for (let i = 1; i < columns.length; i++) {
            place(columns[i], fromLeft);
        }
        for (let i = columns.length - 2; i >= 0; i--) {
            place(columns[i], fromRight);
        }
    }
    // the last round from left to right: the links of a chain run straight
    for (let i = 1; i < columns.length; i++) {
        place(columns[i], fromLeft);
    }
    const minY = Math.min(...y.values());
    const positions = {};
    columns.forEach((ids, i) => {
        for (const id of ids) {
            if (!pinned.has(id)) {
                // not on the grid vertically: a link between pins at different heights would get a kink
                positions[id] = [columnX[i], Math.round(anchored ? y.get(id) : top + y.get(id) - minY)];
            }
        }
    });
    return positions;
}
//# sourceMappingURL=layout.js.map