import type { JavascriptContext } from '../types';

let gContext: JavascriptContext;

export function getObjectEnumsSync(
    context: JavascriptContext,
    idObj: string,
    enumIds?: string[],
    enumNames?: string[],
): { enumIds: string[]; enumNames: string[] } {
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
            const name: ioBroker.StringOrTranslated = context.objects[enumId].common.name;
            // Use the provided context.language (fallback to 'en') instead of gContext which may be undefined
            const lang = (context && (context.language as string)) || 'en';
            let str: string | undefined;
            if (typeof name === 'object') {
                str = (name as Record<string, string>)[lang];
            } else {
                str = name as string | undefined;
            }
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
                const parentEnumIds: string[] = [];
                const parentEnumNames: string[] = [];
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

function doGetter(obj: Record<string, any>, name: string, ret: any): any {
    //adapter.log.debug(`getter: ${name} returns ${ret}`);
    Object.defineProperty(obj, name, { value: ret });
    return ret;
}

export class EventObj {
    public id: string;
    public state: ioBroker.State;
    public newState: ioBroker.State;
    public oldState: ioBroker.State;

    constructor(
        id: string,
        state: ioBroker.State | null | undefined,
        oldState?: ioBroker.State | null,
        context?: JavascriptContext,
    ) {
        if (context && !gContext) {
            gContext = context;
        }
        this.id = id;
        if (!state) {
            this.newState = { q: undefined, c: undefined, user: undefined } as ioBroker.State;
        } else {
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
            } as ioBroker.State;
        } else {
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

    get common(): ioBroker.ObjectCommon {
        const ret = gContext.objects[this.id] ? gContext.objects[this.id].common : {};
        return doGetter(this, 'common', ret);
    }
    get native(): Record<string, any> {
        const ret = gContext.objects[this.id] ? gContext.objects[this.id].native : {};
        return doGetter(this, 'native', ret);
    }
    get name(): ioBroker.StringOrTranslated {
        const ret = this.common ? this.common.name : null;
        return doGetter(this, 'name', ret);
    }
    get channelId(): string | null {
        const ret = this.id.replace(/\.*[^.]+$/, '');
        return doGetter(this, 'channelId', gContext.objects[ret] ? ret : null);
    }
    get channelName(): string | null {
        const channelId = this.channelId;
        const ret = channelId && gContext.objects[channelId].common ? gContext.objects[channelId].common.name : null;
        return doGetter(this, 'channelName', ret);
    }
    get deviceId(): string | null {
        let deviceId: string;
        const channelId = this.channelId;
        if (!channelId || !(deviceId = channelId.replace(/\.*[^.]+$/, '')) || !gContext.objects[deviceId]) {
            Object.defineProperty(this, 'deviceName', { value: null });
            return doGetter(this, 'deviceId', null);
        }
        return doGetter(this, 'deviceId', deviceId);
    }
    get deviceName(): ioBroker.StringOrTranslated | null {
        const deviceId = this.deviceId;
        const ret = deviceId && gContext.objects[deviceId].common ? gContext.objects[deviceId].common.name : null;
        return doGetter(this, 'deviceName', ret);
    }
    get enumIds(): string[] | undefined {
        if (!gContext.isEnums) {
            return undefined;
        }
        const enumIds: string[] = [];
        const enumNames: string[] = [];
        getObjectEnumsSync(gContext, this.id, enumIds, enumNames);
        Object.defineProperty(this, 'enumNames', { value: enumNames });
        return doGetter(this, 'enumIds', enumIds);
    }
    get enumNames(): string[] | undefined {
        if (!gContext.isEnums) {
            return undefined;
        }
        const enumIds: string[] = [];
        const enumNames: string[] = [];
        getObjectEnumsSync(gContext, this.id, enumIds, enumNames);
        Object.defineProperty(this, 'enumIds', { value: enumIds });
        return doGetter(this, 'enumNames', enumNames);
    }
}

export function createEventObject(
    context: JavascriptContext,
    id: string,
    state: ioBroker.State | null | undefined,
    oldState: ioBroker.State | null | undefined,
): EventObj {
    gContext = gContext || context;

    return new EventObj(id, state, oldState, context);
}
