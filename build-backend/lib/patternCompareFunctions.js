"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patternCompareFunctions = void 0;
function isRegExp(obj) {
    return !!(obj?.test && obj.exec && (obj.ignoreCase || obj.ignoreCase === false));
}
/**
 * @param pattern The pattern object to use
 * @param propName The name of the property to compare
 * @param eventPropertyExtractor If given, this function is used to extract the property value from the event object. Otherwise the propName is used
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
                // @ts-expect-error we assume it could be null
                return (event) => event.newState.val > event.oldState.val;
            case 'ge':
                // @ts-expect-error we assume it could be null
                return (event) => event.newState.val >= event.oldState.val;
            case 'lt':
                // @ts-expect-error we assume it could be null
                return (event) => event.newState.val < event.oldState.val;
            case 'le':
                // @ts-expect-error we assume it could be null
                return (event) => event.newState.val <= event.oldState.val;
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
        const pval = pattern.val;
        return (event) => pval === event.newState.val;
    },
    valGt: (pattern) => {
        const pvalGt = pattern.valGt;
        // @ts-expect-error we assume it could be null
        return (event) => event.newState.val > pvalGt;
    },
    valGe: (pattern) => {
        const pvalGe = pattern.valGe;
        // @ts-expect-error we assume it could be null
        return (event) => event.newState.val >= pvalGe;
    },
    valLt: (pattern) => {
        const pvalLt = pattern.valLt;
        // @ts-expect-error we assume it could be null
        return (event) => event.newState.val < pvalLt;
    },
    valLe: (pattern) => {
        const pvalLe = pattern.valLe;
        // @ts-expect-error we assume it could be null
        return (event) => event.newState.val <= pvalLe;
    },
    valNe: (pattern) => {
        const pvalNe = pattern.valNe;
        return (event) => event.newState.val !== pvalNe;
    },
    oldVal: (pattern) => {
        const poldVal = pattern.oldVal;
        return (event) => poldVal === event.oldState.val;
    },
    oldValGt: (pattern) => {
        const poldValGt = pattern.oldValGt;
        // @ts-expect-error we assume it could be null
        return (event) => event.oldState.val > poldValGt;
    },
    oldValGe: (pattern) => {
        const poldValGe = pattern.oldValGe;
        // @ts-expect-error we assume it could be null
        return (event) => event.oldState.val >= poldValGe;
    },
    oldValLt: (pattern) => {
        const poldValLt = pattern.oldValLt;
        // @ts-expect-error we assume it could be null
        return (event) => event.oldState.val < poldValLt;
    },
    oldValLe: (pattern) => {
        const poldValLe = pattern.oldValLe;
        // @ts-expect-error we assume it could be null
        return (event) => event.oldState.val <= poldValLe;
    },
    oldValNe: (pattern) => {
        const poldValNe = pattern.oldValNe;
        return (event) => event.oldState.val !== poldValNe;
    },
    ts: (pattern) => {
        const pts = pattern.ts;
        return (event) => pts === event.newState.ts;
    },
    tsGt: (pattern) => {
        const ptsGt = pattern.tsGt;
        // @ts-expect-error we assume it could be null
        return (event) => event.newState.ts > ptsGt;
    },
    tsGe: (pattern) => {
        const ptsGe = pattern.tsGe;
        // @ts-expect-error we assume it could be null
        return (event) => event.newState.ts >= ptsGe;
    },
    tsLt: (pattern) => {
        const ptsLt = pattern.tsLt;
        // @ts-expect-error we assume it could be null
        return (event) => event.newState.ts < ptsLt;
    },
    tsLe: (pattern) => {
        const ptsLe = pattern.tsLe;
        // @ts-expect-error we assume it could be null
        return (event) => event.newState.ts <= ptsLe;
    },
    oldTs: (pattern) => {
        const poldTs = pattern.oldTs;
        return (event) => poldTs === event.oldState.ts;
    },
    oldTsGt: (pattern) => {
        const poldTsGt = pattern.oldTsGt;
        // @ts-expect-error we assume it could be null
        return (event) => event.oldState.ts > poldTsGt;
    },
    oldTsGe: (pattern) => {
        const poldTsGe = pattern.oldTsGe;
        // @ts-expect-error we assume it could be null
        return (event) => event.oldState.ts >= poldTsGe;
    },
    oldTsLt: (pattern) => {
        const poldTsLt = pattern.oldTsLt;
        // @ts-expect-error we assume it could be null
        return (event) => event.oldState.ts < poldTsLt;
    },
    oldTsLe: (pattern) => {
        const poldTsLe = pattern.oldTsLe;
        // @ts-expect-error we assume it could be null
        return (event) => event.oldState.ts <= poldTsLe;
    },
    lc: (pattern) => {
        const plc = pattern.lc;
        return (event) => plc === event.newState.lc;
    },
    lcGt: (pattern) => {
        const plcGt = pattern.lcGt;
        // @ts-expect-error we assume it could be null
        return (event) => event.newState.lc > plcGt;
    },
    lcGe: (pattern) => {
        const plcGe = pattern.lcGe;
        // @ts-expect-error we assume it could be null
        return (event) => event.newState.lc >= plcGe;
    },
    lcLt: (pattern) => {
        const plcLt = pattern.lcLt;
        // @ts-expect-error we assume it could be null
        return (event) => event.newState.lc < plcLt;
    },
    lcLe: (pattern) => {
        const plcLe = pattern.lcLe;
        // @ts-expect-error we assume it could be null
        return (event) => event.newState.lc <= plcLe;
    },
    oldLc: (pattern) => {
        const poldLc = pattern.oldLc;
        return (event) => poldLc === event.oldState.lc;
    },
    oldLcGt: (pattern) => {
        const poldLcGt = pattern.oldLcGt;
        // @ts-expect-error we assume it could be null
        return (event) => event.oldState.lc > poldLcGt;
    },
    oldLcGe: (pattern) => {
        const poldLcGe = pattern.oldLcGe;
        // @ts-expect-error we assume it could be null
        return (event) => event.oldState.lc >= poldLcGe;
    },
    oldLcLt: (pattern) => {
        const poldLcLt = pattern.oldLcLt;
        // @ts-expect-error we assume it could be null
        return (event) => event.oldState.lc < poldLcLt;
    },
    oldLcLe: (pattern) => {
        const poldLcLe = pattern.oldLcLe;
        // @ts-expect-error we assume it could be null
        return (event) => event.oldState.lc <= poldLcLe;
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
        const penumId = pattern.enumId;
        function ensureEnumIDsIsArray(enumIds) {
            if (!Array.isArray(enumIds)) {
                console.error(`enumIds is of type ${typeof enumIds} but should be an array: ${JSON.stringify(enumIds)}`);
                return false;
            }
            return true;
        }
        if (isRegExp(penumId)) {
            return (event) => {
                const enumIds = event.enumIds;
                if (enumIds == null || !ensureEnumIDsIsArray(enumIds)) {
                    return false;
                }
                // Test if any enum name matches the regex:
                return enumIds.find(e => penumId.test(e)) != null;
            };
        }
        if (Array.isArray(penumId)) {
            return (event) => {
                const enumIds = event.enumIds;
                if (enumIds == null || !ensureEnumIDsIsArray(enumIds)) {
                    return false;
                }
                // Test if the enum names of the event and the given array intersect
                return enumIds.find(e => penumId.includes(e)) != null;
            };
        }
        return (event) => {
            const enumIds = event.enumIds;
            if (enumIds == null || !ensureEnumIDsIsArray(enumIds)) {
                return false;
            }
            return enumIds && enumIds.includes(penumId);
        };
    },
    enumName: (pattern) => {
        const penumName = pattern.enumName;
        function ensureEnumNamesIsArray(enumNames) {
            if (!Array.isArray(enumNames)) {
                console.error(`enumNames is of type ${typeof enumNames} but should be an array: ${JSON.stringify(enumNames)}`);
                return false;
            }
            return true;
        }
        if (isRegExp(penumName)) {
            return (event) => {
                const enumNames = event.enumNames;
                if (enumNames == null || !ensureEnumNamesIsArray(enumNames)) {
                    return false;
                }
                // Test if any enum name matches the regex:
                return enumNames.find(e => penumName.test(e)) != null;
            };
        }
        if (Array.isArray(penumName)) {
            return (event) => {
                const enumNames = event.enumNames;
                if (enumNames == null || !ensureEnumNamesIsArray(enumNames)) {
                    return false;
                }
                // Test if the enum names of the event and the given array intersect
                return enumNames.find(e => penumName.includes(e)) != null;
            };
        }
        return (event) => {
            const enumNames = event.enumNames;
            if (enumNames == null || !ensureEnumNamesIsArray(enumNames)) {
                return false;
            }
            return enumNames?.includes(penumName);
        };
    },
};
//# sourceMappingURL=patternCompareFunctions.js.map