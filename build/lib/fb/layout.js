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
 * New positions for the blocks of a diagram, by ID. The comments stay where they are; the top left
 * corner of the blocks stays where it was.
 */
function layoutGraph(graph, options = {}) {
    if (!graph.blocks.length) {
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
    const y = new Map();
    for (const ids of columns) {
        let top = 0;
        for (const id of ids) {
            y.set(id, top);
            top += items.get(id).height + GAP_Y;
        }
    }
    /**
     * Places the blocks of a column where they want to be, without overlaps: blocks that would
     * overlap form a group, which sits at the mean of what its blocks want.
     */
    const place = (ids, want) => {
        const wishes = ids
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
        ids.length = 0;
        for (const cluster of clusters) {
            let top = cluster.top;
            cluster.ids.forEach((id, i) => {
                y.set(id, top);
                top += cluster.heights[i] + GAP_Y;
                ids.push(id);
            });
        }
    };
    const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    // level with the outputs that feed it
    const fromLeft = (id) => mean((incoming.get(id) || []).map(link => y.get(link.from[0]) + outputY(link) - inputY(link)));
    // level with the inputs it feeds
    const fromRight = (id) => mean((outgoing.get(id) || []).map(link => y.get(link.to[0]) + inputY(link) - outputY(link)));
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
    // the columns side by side, each as wide as its widest block
    const left = Math.min(...graph.blocks.map(block => block.pos[0]));
    const top = Math.min(...graph.blocks.map(block => block.pos[1]));
    const minY = Math.min(...y.values());
    const positions = {};
    let x = Math.round(left / GRID) * GRID;
    for (const ids of columns) {
        if (!ids.length) {
            continue;
        }
        for (const id of ids) {
            // not on the grid vertically: a link between pins at different heights would get a kink
            positions[id] = [x, Math.round(top + y.get(id) - minY)];
        }
        x += Math.round((Math.max(...ids.map(id => items.get(id).width)) + GAP_X) / GRID) * GRID;
    }
    return positions;
}
//# sourceMappingURL=layout.js.map