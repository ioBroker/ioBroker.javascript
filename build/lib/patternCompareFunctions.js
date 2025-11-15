"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patternCompareFunctions = void 0;
function isRegExp(obj) {
    return !!(obj?.test && obj.exec && (obj.ignoreCase || obj.ignoreCase === false));
}
/**
 * @param pattern The pattern object to use
 * @param propName The name of the property to compare
 * @param eventPropertyExtractor If given, this function is used to extract the property value from the event object. Otherwise, the propName is used
 * @param invert Whether to invert the result
 */
function stringOrRegExpCompare(pattern, propName, eventPropertyExtractor, invert) {
    const field = pattern[propName];
    const hasExtractor = typeof eventPropertyExtractor === 'function';
    if (isRegExp(field)) {
        return function (event) {
            const eventValue = hasExtractor
                ? eventPropertyExtractor(event)
                : event[propName];
            const ret = eventValue != null && field.test(eventValue);
            return invert ? !ret : ret;
        };
    }
    if (Array.isArray(field)) {
        return function (event) {
            const eventValue = hasExtractor ? eventPropertyExtractor(event) : event[propName];
            // An array matches when any element is found that satisfies the constraint
            const ret = eventValue != null && field.find(f => f === eventValue) != null;
            return invert ? !ret : ret;
        };
    }
    return function (event) {
        const eventValue = hasExtractor ? eventPropertyExtractor(event) : event[propName];
        const ret = eventValue != null && field === eventValue;
        return invert ? !ret : ret;
    };
}
exports.patternCompareFunctions = {
    logic: (_pattern) => { },
    id: (pattern) => stringOrRegExpCompare(pattern, 'id'),
    name: (pattern) => stringOrRegExpCompare(pattern, 'name'),
    change: (pattern) => {
        switch (pattern.change) {
            case 'eq':
                return (event) => event.newState.val === event.oldState.val;
            case 'ne':
                return (event) => event.newState.val !== event.oldState.val;
            case 'gt':
                return (event) => (event.newState.val ?? 0) > (event.oldState.val ?? 0);
            case 'ge':
                return (event) => (event.newState.val ?? 0) >= (event.oldState.val ?? 0);
            case 'lt':
                return (event) => (event.newState.val ?? 0) < (event.oldState.val ?? 0);
            case 'le':
                return (event) => (event.newState.val ?? 0) <= (event.oldState.val ?? 0);
            default:
                return (_event) => true;
            // on any other logic, just signal about a message
        }
    },
    ack: (pattern) => {
        if (pattern.ack === true || pattern.ack === 'true') {
            return (event) => event.newState.ack === true;
        }
        return (event) => event.newState.ack === false;
    },
    oldAck: (pattern) => {
        if (pattern.oldAck === true || pattern.oldAck === 'true') {
            return (event) => event.oldState.ack === true;
        }
        return (event) => event.oldState.ack === false;
    },
    q: (pattern) => {
        const q = pattern.q;
        return (event) => q === '*' || q === event.newState.q;
    },
    oldQ: (pattern) => {
        const q = pattern.oldQ;
        return (event) => q === '*' || q === event.oldState.q;
    },
    val: (pattern) => {
        const pVal = pattern.val;
        return (event) => pVal === event.newState.val;
    },
    valGt: (pattern) => {
        const pValGt = pattern.valGt;
        return (event) => (event.newState.val ?? 0) > (pValGt ?? 0);
    },
    valGe: (pattern) => {
        const pValGe = pattern.valGe;
        return (event) => (event.newState.val ?? 0) >= (pValGe ?? 0);
    },
    valLt: (pattern) => {
        const pValLt = pattern.valLt;
        return (event) => (event.newState.val ?? 0) < (pValLt ?? 0);
    },
    valLe: (pattern) => {
        const pValLe = pattern.valLe;
        return (event) => (event.newState.val ?? 0) <= (pValLe ?? 0);
    },
    valNe: (pattern) => {
        const pValNe = pattern.valNe;
        return (event) => event.newState.val !== pValNe;
    },
    oldVal: (pattern) => {
        const pOldVal = pattern.oldVal;
        return (event) => pOldVal === event.oldState.val;
    },
    oldValGt: (pattern) => {
        const pOldValGt = pattern.oldValGt;
        return (event) => (event.oldState.val ?? 0) > (pOldValGt ?? 0);
    },
    oldValGe: (pattern) => {
        const pOldValGe = pattern.oldValGe;
        return (event) => (event.oldState.val ?? 0) >= (pOldValGe ?? 0);
    },
    oldValLt: (pattern) => {
        const pOldValLt = pattern.oldValLt;
        return (event) => (event.oldState.val ?? 0) < (pOldValLt ?? 0);
    },
    oldValLe: (pattern) => {
        const pOldValLe = pattern.oldValLe;
        return (event) => (event.oldState.val ?? 0) <= (pOldValLe ?? 0);
    },
    oldValNe: (pattern) => {
        const pOldValNe = pattern.oldValNe;
        return (event) => event.oldState.val !== pOldValNe;
    },
    ts: (pattern) => {
        const pts = pattern.ts;
        return (event) => pts === event.newState.ts;
    },
    tsGt: (pattern) => {
        const ptsGt = pattern.tsGt;
        return (event) => event.newState.ts > (ptsGt ?? 0);
    },
    tsGe: (pattern) => {
        const ptsGe = pattern.tsGe;
        return (event) => event.newState.ts >= (ptsGe ?? 0);
    },
    tsLt: (pattern) => {
        const ptsLt = pattern.tsLt;
        return (event) => event.newState.ts < (ptsLt ?? 0);
    },
    tsLe: (pattern) => {
        const ptsLe = pattern.tsLe;
        return (event) => event.newState.ts <= (ptsLe ?? 0);
    },
    oldTs: (pattern) => {
        const pOldTs = pattern.oldTs;
        return (event) => pOldTs === event.oldState.ts;
    },
    oldTsGt: (pattern) => {
        const pOldTsGt = pattern.oldTsGt;
        return (event) => event.oldState.ts > (pOldTsGt ?? 0);
    },
    oldTsGe: (pattern) => {
        const pOldTsGe = pattern.oldTsGe;
        return (event) => event.oldState.ts >= (pOldTsGe ?? 0);
    },
    oldTsLt: (pattern) => {
        const pOldTsLt = pattern.oldTsLt;
        return (event) => event.oldState.ts < (pOldTsLt ?? 0);
    },
    oldTsLe: (pattern) => {
        const pOldTsLe = pattern.oldTsLe;
        return (event) => event.oldState.ts <= (pOldTsLe ?? 0);
    },
    lc: (pattern) => {
        const plc = pattern.lc;
        return (event) => plc === event.newState.lc;
    },
    lcGt: (pattern) => {
        const plcGt = pattern.lcGt;
        return (event) => event.newState.lc > (plcGt ?? 0);
    },
    lcGe: (pattern) => {
        const plcGe = pattern.lcGe;
        return (event) => event.newState.lc >= (plcGe ?? 0);
    },
    lcLt: (pattern) => {
        const plcLt = pattern.lcLt;
        return (event) => event.newState.lc < (plcLt ?? 0);
    },
    lcLe: (pattern) => {
        const plcLe = pattern.lcLe;
        return (event) => event.newState.lc <= (plcLe ?? 0);
    },
    oldLc: (pattern) => {
        const pOldLc = pattern.oldLc;
        return (event) => pOldLc === event.oldState.lc;
    },
    oldLcGt: (pattern) => {
        const pOldLcGt = pattern.oldLcGt;
        return (event) => event.oldState.lc > (pOldLcGt ?? 0);
    },
    oldLcGe: (pattern) => {
        const pOldLcGe = pattern.oldLcGe;
        return (event) => event.oldState.lc >= (pOldLcGe ?? 0);
    },
    oldLcLt: (pattern) => {
        const pOldLcLt = pattern.oldLcLt;
        return (event) => event.oldState.lc < (pOldLcLt ?? 0);
    },
    oldLcLe: (pattern) => {
        const pOldLcLe = pattern.oldLcLe;
        return (event) => event.oldState.lc <= (pOldLcLe ?? 0);
    },
    from: (pattern) => stringOrRegExpCompare(pattern, 'from', event => event && event.newState && event.newState.from),
    fromNe: (pattern) => stringOrRegExpCompare(pattern, 'fromNe', event => event && event.newState && event.newState.from, true),
    oldFrom: (pattern) => stringOrRegExpCompare(pattern, 'oldFrom', event => event && event.oldState && event.oldState.from),
    oldFromNe: (pattern) => stringOrRegExpCompare(pattern, 'oldFromNe', event => event && event.oldState && event.oldState.from, true),
    channelId: (pattern) => stringOrRegExpCompare(pattern, 'channelId'),
    channelName: (pattern) => stringOrRegExpCompare(pattern, 'channelName'),
    deviceId: (pattern) => stringOrRegExpCompare(pattern, 'deviceId'),
    deviceName: (pattern) => stringOrRegExpCompare(pattern, 'deviceName'),
    enumId: (pattern) => {
        const pEnumId = pattern.enumId;
        function ensureEnumIDsIsArray(enumIds) {
            if (!Array.isArray(enumIds)) {
                console.error(`enumIds is of type ${typeof enumIds} but should be an array: ${JSON.stringify(enumIds)}`);
                return false;
            }
            return true;
        }
        if (isRegExp(pEnumId)) {
            return (event) => {
                const enumIds = event.enumIds;
                if (enumIds == null || !ensureEnumIDsIsArray(enumIds)) {
                    return false;
                }
                // Test if any enum name matches the regex:
                return enumIds.find(e => pEnumId.test(e)) != null;
            };
        }
        if (Array.isArray(pEnumId)) {
            return (event) => {
                const enumIds = event.enumIds;
                if (enumIds == null || !ensureEnumIDsIsArray(enumIds)) {
                    return false;
                }
                // Test if the enum names of the event and the given array intersect
                return enumIds.find(e => pEnumId.includes(e)) != null;
            };
        }
        return (event) => {
            const enumIds = event.enumIds;
            if (enumIds == null || !ensureEnumIDsIsArray(enumIds)) {
                return false;
            }
            return enumIds && enumIds.includes(pEnumId);
        };
    },
    enumName: (pattern) => {
        const pEnumName = pattern.enumName;
        function ensureEnumNamesIsArray(enumNames) {
            if (!Array.isArray(enumNames)) {
                console.error(`enumNames is of type ${typeof enumNames} but should be an array: ${JSON.stringify(enumNames)}`);
                return false;
            }
            return true;
        }
        if (isRegExp(pEnumName)) {
            return (event) => {
                const enumNames = event.enumNames;
                if (enumNames == null || !ensureEnumNamesIsArray(enumNames)) {
                    return false;
                }
                // Test if any enum name matches the regex:
                return enumNames.find(e => pEnumName.test(e)) != null;
            };
        }
        if (Array.isArray(pEnumName)) {
            return (event) => {
                const enumNames = event.enumNames;
                if (enumNames == null || !ensureEnumNamesIsArray(enumNames)) {
                    return false;
                }
                // Test if the enum names of the event and the given array intersect
                return enumNames.find(e => pEnumName.includes(e)) != null;
            };
        }
        return (event) => {
            const enumNames = event.enumNames;
            if (enumNames == null || !ensureEnumNamesIsArray(enumNames)) {
                return false;
            }
            return enumNames?.includes(pEnumName);
        };
    },
};
//# sourceMappingURL=patternCompareFunctions.js.map