'use strict';
let inited = false;

function getObjectEnumsSync(context, idObj, enumIds, enumNames) {
    if (!enumIds)   enumIds   = [];
    if (!enumNames) enumNames = [];

    if (context.cacheObjectEnums[idObj]) {
        for (const enumId of context.cacheObjectEnums[idObj].enumIds) {
            if (!enumIds.includes(enumId)) {
                enumIds.push(enumId);
            }
        }
        for (const enumName of context.cacheObjectEnums[idObj].enumNames) {
            if (!enumNames.includes(enumName)) {
                enumNames.push(enumName);
            }
        }
        return {enumIds: enumIds, enumNames: enumNames};
    }


    for (let i = 0, l = context.enums.length; i < l; i++) {
        if (context.objects[context.enums[i]] &&
            context.objects[context.enums[i]].common &&
            context.objects[context.enums[i]].common.members &&
            context.objects[context.enums[i]].common.members.indexOf(idObj) !== -1) {
            if (enumIds.indexOf(context.enums[i]) === -1) enumIds.push(context.enums[i]);
            if (enumNames.indexOf(context.objects[context.enums[i]].common.name) === -1) enumNames.push(context.objects[context.enums[i]].common.name);
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
                    if (!enumIds.includes(enumId)) {
                        enumIds.push(enumId);
                    }
                }
                for (const enumName of parentEnumNames) {
                    if (!enumNames.includes(enumName)) {
                        enumNames.push(enumName);
                    }
                }
            }
        }
    }

    context.cacheObjectEnums[idObj] = {enumIds: enumIds, enumNames: enumNames};
    return context.cacheObjectEnums[idObj];
}

function doGetter(obj, name, ret) {
    //adapter.log.debug('getter: ' + name + ' returns ' + ret);
    Object.defineProperty(obj, name, {value: ret});
    return ret;
}

function EventObj(id, state, oldState) {
    if (!(this instanceof EventObj)) return new EventObj(id, state, oldState);
    this.id = id;
    this.newState = {
        val:  state.val,
        ts:   state.ts,
        ack:  state.ack,
        lc:   state.lc,
        from: state.from,
        q:    state.q
    };
    //if (oldState === undefined) oldState = {};
    if (!oldState) {
        this.oldState = {
            val:  undefined,
            ts:   undefined,
            ack:  undefined,
            lc:   undefined,
            from: undefined,
            q:    undefined
        };
    } else {
        this.oldState = {
            val:  oldState.val,
            ts:   oldState.ts,
            ack:  oldState.ack,
            lc:   oldState.lc,
            from: oldState.from,
            q:    oldState.q
        };
    }
    this.state = this.newState;
}

function createEventObject(context, id, state, oldState) {
    if (!inited) {
        inited = true;
        const eventObjectProperties = {
            common: {
                get: function () {
                    const ret = context.objects[this.id] ? context.objects[this.id].common : {};
                    return doGetter(this, 'common', ret);
                },
                configurable: true
            },
            native: {
                get: function () {
                    const ret = context.objects[this.id] ? context.objects[this.id].native : {};
                    return doGetter(this, 'native', ret);
                },
                configurable: true
            },
            name: {
                get: function () {
                    const ret = this.common ? this.common.name : null;
                    return doGetter(this, 'name', ret);
                },
                configurable: true
            },
            channelId: {
                get: function () {
                    const ret = this.id.replace (/\.*[^.]+$/, '');
                    return doGetter(this, 'channelId', context.objects[ret] ? ret : null);
                },
                configurable: true
            },
            channelName: {
                get: function () {
                    const channelId = this.channelId;
                    const ret = channelId && context.objects[channelId].common ? context.objects[channelId].common.name : null;
                    return doGetter(this, 'channelName', ret);
                },
                configurable: true
            },
            deviceId: {
                get: function () {
                    let deviceId;
                    const channelId = this.channelId;
                    if (!channelId || !(deviceId = channelId.replace (/\.*[^.]+$/, '')) || !context.objects[deviceId]) {
                        Object.defineProperty(this, 'deviceName', { value: null });
                        return doGetter(this, 'deviceId', null);
                    }
                    return doGetter(this, 'deviceId', deviceId);
                },
                configurable: true
            },
            deviceName: {
                get: function () {
                    const deviceId = this.deviceId;
                    const ret = deviceId && context.objects[deviceId].common ? context.objects[deviceId].common.name : null;
                    return doGetter(this, 'deviceName', ret);
                },
                configurable: true
            },
            enumIds: {
                get: function () {
                    if (!context.isEnums) return undefined;
                    let enumIds = [];
                    let enumNames = [];
                    getObjectEnumsSync(context, this.id, enumIds, enumNames);
                    Object.defineProperty(this, 'enumNames', {value: enumNames});
                    return doGetter(this, 'enumIds', enumIds);
                },
                configurable: true
            },
            enumNames: {
                get: function () {
                    if (!context.isEnums) return undefined;
                    let enumIds = [];
                    let enumNames = [];
                    getObjectEnumsSync(context, this.id, enumIds, enumNames);
                    Object.defineProperty(this, 'enumIds', {value: enumIds});
                    return doGetter(this, 'enumNames', enumNames);
                },
                configurable: true
            }
        };
        Object.defineProperties(EventObj.prototype, eventObjectProperties);
        inited = true;
    }

    return new EventObj(id, state, oldState);
}

module.exports = {
    createEventObject,
    getObjectEnumsSync
};
