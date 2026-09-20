"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FB_USER_TYPE_PATTERN = void 0;
exports.toIdentifier = toIdentifier;
exports.createBlockInfo = createBlockInfo;
exports.factoryName = factoryName;
exports.userBlockOf = userBlockOf;
exports.mergeUserBlocks = mergeUserBlocks;
exports.usedUserBlocks = usedUserBlocks;
exports.containsUserBlock = containsUserBlock;
/**
 * User blocks: diagrams that are used as blocks in other diagrams.
 *
 * A diagram becomes a block with `graph.block`; its FB_IN and FB_OUT blocks are the pins. A diagram
 * that uses it carries a copy (`graph.userBlocks`), together with copies of the blocks used inside
 * it. So the diagram keeps working as it is when the block changes, until it is updated on purpose.
 */
const types_1 = require("./types");
/** `@userFb/<identifier>` */
exports.FB_USER_TYPE_PATTERN = /^@userFb\/[A-Za-z_][A-Za-z0-9_]*$/;
/** A text as an identifier: `Rollladen Süd` gives `Rollladen_S_d` */
function toIdentifier(text) {
    const identifier = text.trim().replace(/[^A-Za-z0-9_]/g, '_');
    return /^[A-Za-z_]/.test(identifier) ? identifier : `_${identifier}`;
}
/** The block info of a diagram that just became a block */
function createBlockInfo(name) {
    return { type: `${types_1.FB_USER_PREFIX}${toIdentifier(name || 'block')}`, name: name || 'block', version: 1 };
}
/** The name of the factory function the generated code has for a user block */
function factoryName(type) {
    return `UFB_${type.substring(types_1.FB_USER_PREFIX.length)}`;
}
/** The copy of a block to put into other diagrams, made of the diagram of the block */
function userBlockOf(graph) {
    if (!graph.block) {
        return null;
    }
    const { block, userBlocks: _userBlocks, ...rest } = graph;
    // the order of a stored diagram is only for the display
    const blocks = rest.blocks.map(({ order: _order, ...inner }) => inner);
    return { ...block, graph: { ...rest, blocks } };
}
/**
 * Puts the copies of `incoming` into `target`. A copy only replaces an older version - except for
 * the types in `update`, which take the incoming one in any case.
 */
function mergeUserBlocks(target, incoming, update) {
    const result = { ...target };
    for (const [type, user] of Object.entries(incoming || {})) {
        const existing = result[type];
        if (!existing || existing.version < user.version || update?.includes(type)) {
            result[type] = user;
        }
    }
    return result;
}
/** The user blocks a diagram needs: those it places, and those used inside them */
function usedUserBlocks(graph, userBlocks) {
    const used = new Set();
    const visit = (blocks) => {
        for (const block of blocks) {
            const user = userBlocks?.[block.type];
            if (user && !used.has(block.type)) {
                used.add(block.type);
                visit(user.graph.blocks);
            }
        }
    };
    visit(graph.blocks);
    return [...used];
}
/** Whether the block `type` contains `inner` - directly or deeper down */
function containsUserBlock(type, inner, userBlocks) {
    const user = userBlocks?.[type];
    return !!user && usedUserBlocks(user.graph, userBlocks).includes(inner);
}
//# sourceMappingURL=user.js.map