"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventObj = void 0;
exports.getObjectEnumsSync = getObjectEnumsSync;
exports.createEventObject = createEventObject;
let gContext;
function getObjectEnumsSync(context, idObj, enumIds, enumNames) {
    if (!enumIds) {
        enumIds = [];
    }
    if (!enumNames) {
        enumNames = [];
    }
    // Use Sets for O(1) deduplication instead of Array.includes() O(n)
    const enumIdSet = new Set(enumIds);
    const enumNameSet = new Set(enumNames);
    if (context.cacheObjectEnums[idObj]) {
        for (const enumId of context.cacheObjectEnums[idObj].enumIds) {
            if (!enumIdSet.has(enumId)) {
                enumIdSet.add(enumId);
                enumIds.push(enumId);
            }
        }
        for (const enumName of context.cacheObjectEnums[idObj].enumNames) {
            if (!enumNameSet.has(enumName)) {
                enumNameSet.add(enumName);
                enumNames.push(enumName);
            }
        }
        return { enumIds, enumNames };
    }
    for (const enumId of context.enums) {
        if (context.objects[enumId]?.common?.members?.includes(idObj)) {
            if (!enumIdSet.has(enumId)) {
                enumIdSet.add(enumId);
                enumIds.push(enumId);
            }
            const name = context.objects[enumId].common.name;
            const str = typeof name === 'object' ? name[gContext.language || 'en'] : name;
            if (str && !enumNameSet.has(str)) {
                enumNameSet.add(str);
                enumNames.push(str);
            }
        }
    }
    if (context.objects[idObj]) {
        const pos = idObj.lastIndexOf('.');
        if (pos !== -1) {
            const parent = idObj.substring(0, pos);
            if (parent && context.objects[parent]) {
                const parentEnumIds = [];
                const parentEnumNames = [];
                //get parent enums but do not propagate our enums to parent.
                getObjectEnumsSync(context, parent, parentEnumIds, parentEnumNames);
                for (const enumId of parentEnumIds) {
                    if (!enumIdSet.has(enumId)) {
                        enumIdSet.add(enumId);
                        enumIds.push(enumId);
                    }
                }
                for (const enumName of parentEnumNames) {
                    if (!enumNameSet.has(enumName)) {
                        enumNameSet.add(enumName);
                        enumNames.push(enumName);
                    }
                }
            }
        }
    }
    context.cacheObjectEnums[idObj] = { enumIds, enumNames };
    return context.cacheObjectEnums[idObj];
}
function doGetter(obj, name, ret) {
    //adapter.log.debug('getter: ' + name + ' returns ' + ret);
    Object.defineProperty(obj, name, { value: ret });
    return ret;
}
class EventObj {
    id;
    state;
    newState;
    oldState;
    constructor(id, state, oldState, context) {
        if (context && !gContext) {
            gContext = context;
        }
        this.id = id;
        if (!state) {
            this.newState = { q: undefined, c: undefined, user: undefined };
        }
        else {
            this.newState = {
                val: state.val,
                ts: state.ts,
                ack: state.ack,
                lc: state.lc,
                from: state.from,
                q: state.q,
                c: state.c,
                user: state.user,
            };
        }
        // if (oldState === undefined) oldState = {};
        if (!oldState) {
            this.oldState = {
                q: undefined,
                c: undefined,
                user: undefined,
            };
        }
        else {
            this.oldState = {
                val: oldState.val,
                ts: oldState.ts,
                ack: oldState.ack,
                lc: oldState.lc,
                from: oldState.from,
                q: oldState.q,
                c: oldState.c,
                user: oldState.user,
            };
        }
        this.state = this.newState;
    }
    get common() {
        const ret = gContext.objects[this.id] ? gContext.objects[this.id].common : {};
        return doGetter(this, 'common', ret);
    }
    get native() {
        const ret = gContext.objects[this.id] ? gContext.objects[this.id].native : {};
        return doGetter(this, 'native', ret);
    }
    get name() {
        const ret = this.common ? this.common.name : null;
        return doGetter(this, 'name', ret);
    }
    get channelId() {
        const ret = this.id.replace(/\.*[^.]+$/, '');
        return doGetter(this, 'channelId', gContext.objects[ret] ? ret : null);
    }
    get channelName() {
        const channelId = this.channelId;
        const ret = channelId && gContext.objects[channelId].common ? gContext.objects[channelId].common.name : null;
        return doGetter(this, 'channelName', ret);
    }
    get deviceId() {
        let deviceId;
        const channelId = this.channelId;
        if (!channelId || !(deviceId = channelId.replace(/\.*[^.]+$/, '')) || !gContext.objects[deviceId]) {
            Object.defineProperty(this, 'deviceName', { value: null });
            return doGetter(this, 'deviceId', null);
        }
        return doGetter(this, 'deviceId', deviceId);
    }
    get deviceName() {
        const deviceId = this.deviceId;
        const ret = deviceId && gContext.objects[deviceId].common ? gContext.objects[deviceId].common.name : null;
        return doGetter(this, 'deviceName', ret);
    }
    get enumIds() {
        if (!gContext.isEnums) {
            return undefined;
        }
        const enumIds = [];
        const enumNames = [];
        getObjectEnumsSync(gContext, this.id, enumIds, enumNames);
        Object.defineProperty(this, 'enumNames', { value: enumNames });
        return doGetter(this, 'enumIds', enumIds);
    }
    get enumNames() {
        if (!gContext.isEnums) {
            return undefined;
        }
        const enumIds = [];
        const enumNames = [];
        getObjectEnumsSync(gContext, this.id, enumIds, enumNames);
        Object.defineProperty(this, 'enumIds', { value: enumIds });
        return doGetter(this, 'enumNames', enumNames);
    }
}
exports.EventObj = EventObj;
function createEventObject(context, id, state, oldState) {
    gContext = gContext || context;
    return new EventObj(id, state, oldState, context);
}
//# sourceMappingURL=eventObj.js.map