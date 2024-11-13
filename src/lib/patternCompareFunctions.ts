import type { Pattern } from '../types';
import { type EventObj } from './eventObj';

function isRegExp(obj: any): boolean {
    return !!(obj?.test && obj.exec && (obj.ignoreCase || obj.ignoreCase === false));
}

export type PatternEventCompareFunction = (event: EventObj) => boolean;

/**
 * @param pattern The pattern object to use
 * @param propName The name of the property to compare
 * @param eventPropertyExtractor If given, this function is used to extract the property value from the event object. Otherwise the propName is used
 * @param invert Whether to invert the result
 */
function stringOrRegExpCompare(
    pattern: Pattern,
    propName: string,
    eventPropertyExtractor?: (event: EventObj) => any,
    invert?: boolean,
): PatternEventCompareFunction {
    const field: RegExp | string | string[] = pattern[propName];
    const hasExtractor = typeof eventPropertyExtractor === 'function';

    if (isRegExp(field)) {
        return function (event: EventObj): boolean {
            const eventValue = hasExtractor ? eventPropertyExtractor(event) : event[propName];
            const ret = eventValue != null && (field as RegExp).test(eventValue);
            return invert ? !ret : ret;
        };
    }

    if (Array.isArray(field)) {
        return function (event: EventObj): boolean {
            const eventValue = hasExtractor ? eventPropertyExtractor(event) : event[propName];
            // An array matches when any element is found that satisfies the constraint
            const ret = eventValue != null && field.find(f => f === eventValue) != null;
            return invert ? !ret : ret;
        };
    }

    return function (event: EventObj): boolean {
        const eventValue = hasExtractor ? eventPropertyExtractor(event) : event[propName];
        const ret = eventValue != null && field === eventValue;
        return invert ? !ret : ret;
    };
}

export const patternCompareFunctions = {
    logic: (_pattern: Pattern): void => {},

    id: (pattern: Pattern): PatternEventCompareFunction => stringOrRegExpCompare(pattern, 'id'),

    name: (pattern: Pattern): PatternEventCompareFunction => stringOrRegExpCompare(pattern, 'name'),

    change: (pattern: Pattern): PatternEventCompareFunction => {
        switch (pattern.change) {
            case 'eq':
                return (event: EventObj): boolean => event.newState.val === event.oldState.val;
            case 'ne':
                return (event: EventObj): boolean => event.newState.val !== event.oldState.val;
            case 'gt':
                // @ts-expect-error we assume it could be null
                return (event: EventObj): boolean => event.newState.val > event.oldState.val;
            case 'ge':
                // @ts-expect-error we assume it could be null
                return (event: EventObj): boolean => event.newState.val >= event.oldState.val;
            case 'lt':
                // @ts-expect-error we assume it could be null
                return (event: EventObj): boolean => event.newState.val < event.oldState.val;
            case 'le':
                // @ts-expect-error we assume it could be null
                return (event: EventObj): boolean => event.newState.val <= event.oldState.val;
            default:
                return (_event: EventObj): boolean => true;
            // on any other logic, just signal about a message
        }
    },
    ack: (pattern: Pattern): PatternEventCompareFunction => {
        if (pattern.ack === true || pattern.ack === 'true') {
            return (event: EventObj): boolean => event.newState.ack === true;
        }
        return (event: EventObj): boolean => event.newState.ack === false;
    },
    oldAck: (pattern: Pattern): PatternEventCompareFunction => {
        if (pattern.oldAck === true || pattern.oldAck === 'true') {
            return (event: EventObj): boolean => event.oldState.ack === true;
        }
        return (event: EventObj): boolean => event.oldState.ack === false;
    },

    q: (pattern: Pattern): PatternEventCompareFunction => {
        const q = pattern.q;
        return (event: EventObj): boolean => q === '*' || q === event.newState.q;
    },
    oldQ: (pattern: Pattern): PatternEventCompareFunction => {
        const q = pattern.oldQ;
        return (event: EventObj): boolean => q === '*' || q === event.oldState.q;
    },

    val: (pattern: Pattern): PatternEventCompareFunction => {
        const pval = pattern.val;
        return (event: EventObj): boolean => pval === event.newState.val;
    },
    valGt: (pattern: Pattern): PatternEventCompareFunction => {
        const pvalGt = pattern.valGt;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.newState.val > pvalGt;
    },
    valGe: (pattern: Pattern): PatternEventCompareFunction => {
        const pvalGe = pattern.valGe;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.newState.val >= pvalGe;
    },
    valLt: (pattern: Pattern): PatternEventCompareFunction => {
        const pvalLt = pattern.valLt;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.newState.val < pvalLt;
    },
    valLe: (pattern: Pattern): PatternEventCompareFunction => {
        const pvalLe = pattern.valLe;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.newState.val <= pvalLe;
    },
    valNe: (pattern: Pattern): PatternEventCompareFunction => {
        const pvalNe = pattern.valNe;
        return (event: EventObj): boolean => event.newState.val !== pvalNe;
    },

    oldVal: (pattern: Pattern): PatternEventCompareFunction => {
        const poldVal = pattern.oldVal;
        return (event: EventObj): boolean => poldVal === event.oldState.val;
    },
    oldValGt: (pattern: Pattern): PatternEventCompareFunction => {
        const poldValGt = pattern.oldValGt;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.oldState.val > poldValGt;
    },
    oldValGe: (pattern: Pattern): PatternEventCompareFunction => {
        const poldValGe = pattern.oldValGe;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.oldState.val >= poldValGe;
    },
    oldValLt: (pattern: Pattern): PatternEventCompareFunction => {
        const poldValLt = pattern.oldValLt;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.oldState.val < poldValLt;
    },
    oldValLe: (pattern: Pattern): PatternEventCompareFunction => {
        const poldValLe = pattern.oldValLe;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.oldState.val <= poldValLe;
    },
    oldValNe: (pattern: Pattern): PatternEventCompareFunction => {
        const poldValNe = pattern.oldValNe;
        return (event: EventObj): boolean => event.oldState.val !== poldValNe;
    },

    ts: (pattern: Pattern): PatternEventCompareFunction => {
        const pts = pattern.ts;
        return (event: EventObj): boolean => pts === event.newState.ts;
    },
    tsGt: (pattern: Pattern): PatternEventCompareFunction => {
        const ptsGt = pattern.tsGt;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.newState.ts > ptsGt;
    },
    tsGe: (pattern: Pattern): PatternEventCompareFunction => {
        const ptsGe = pattern.tsGe;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.newState.ts >= ptsGe;
    },
    tsLt: (pattern: Pattern): PatternEventCompareFunction => {
        const ptsLt = pattern.tsLt;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.newState.ts < ptsLt;
    },
    tsLe: (pattern: Pattern): PatternEventCompareFunction => {
        const ptsLe = pattern.tsLe;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.newState.ts <= ptsLe;
    },

    oldTs: (pattern: Pattern): PatternEventCompareFunction => {
        const poldTs = pattern.oldTs;
        return (event: EventObj): boolean => poldTs === event.oldState.ts;
    },
    oldTsGt: (pattern: Pattern): PatternEventCompareFunction => {
        const poldTsGt = pattern.oldTsGt;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.oldState.ts > poldTsGt;
    },
    oldTsGe: (pattern: Pattern): PatternEventCompareFunction => {
        const poldTsGe = pattern.oldTsGe;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.oldState.ts >= poldTsGe;
    },
    oldTsLt: (pattern: Pattern): PatternEventCompareFunction => {
        const poldTsLt = pattern.oldTsLt;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.oldState.ts < poldTsLt;
    },
    oldTsLe: (pattern: Pattern): PatternEventCompareFunction => {
        const poldTsLe = pattern.oldTsLe;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.oldState.ts <= poldTsLe;
    },

    lc: (pattern: Pattern): PatternEventCompareFunction => {
        const plc = pattern.lc;
        return (event: EventObj): boolean => plc === event.newState.lc;
    },
    lcGt: (pattern: Pattern): PatternEventCompareFunction => {
        const plcGt = pattern.lcGt;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.newState.lc > plcGt;
    },
    lcGe: (pattern: Pattern): PatternEventCompareFunction => {
        const plcGe = pattern.lcGe;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.newState.lc >= plcGe;
    },
    lcLt: (pattern: Pattern): PatternEventCompareFunction => {
        const plcLt = pattern.lcLt;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.newState.lc < plcLt;
    },
    lcLe: (pattern: Pattern): PatternEventCompareFunction => {
        const plcLe = pattern.lcLe;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.newState.lc <= plcLe;
    },

    oldLc: (pattern: Pattern): PatternEventCompareFunction => {
        const poldLc = pattern.oldLc;
        return (event: EventObj): boolean => poldLc === event.oldState.lc;
    },
    oldLcGt: (pattern: Pattern): PatternEventCompareFunction => {
        const poldLcGt = pattern.oldLcGt;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.oldState.lc > poldLcGt;
    },
    oldLcGe: (pattern: Pattern): PatternEventCompareFunction => {
        const poldLcGe = pattern.oldLcGe;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.oldState.lc >= poldLcGe;
    },
    oldLcLt: (pattern: Pattern): PatternEventCompareFunction => {
        const poldLcLt = pattern.oldLcLt;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.oldState.lc < poldLcLt;
    },
    oldLcLe: (pattern: Pattern): PatternEventCompareFunction => {
        const poldLcLe = pattern.oldLcLe;
        // @ts-expect-error we assume it could be null
        return (event: EventObj): boolean => event.oldState.lc <= poldLcLe;
    },

    from: (pattern: Pattern): PatternEventCompareFunction =>
        stringOrRegExpCompare(pattern, 'from', event => event && event.newState && event.newState.from),

    fromNe: (pattern: Pattern): PatternEventCompareFunction =>
        stringOrRegExpCompare(pattern, 'fromNe', event => event && event.newState && event.newState.from, true),

    oldFrom: (pattern: Pattern): PatternEventCompareFunction =>
        stringOrRegExpCompare(pattern, 'oldFrom', event => event && event.oldState && event.oldState.from),

    oldFromNe: (pattern: Pattern): PatternEventCompareFunction =>
        stringOrRegExpCompare(pattern, 'oldFromNe', event => event && event.oldState && event.oldState.from, true),

    channelId: (pattern: Pattern): PatternEventCompareFunction => stringOrRegExpCompare(pattern, 'channelId'),
    channelName: (pattern: Pattern): PatternEventCompareFunction => stringOrRegExpCompare(pattern, 'channelName'),
    deviceId: (pattern: Pattern): PatternEventCompareFunction => stringOrRegExpCompare(pattern, 'deviceId'),
    deviceName: (pattern: Pattern): PatternEventCompareFunction => stringOrRegExpCompare(pattern, 'deviceName'),

    enumId: (pattern: Pattern): PatternEventCompareFunction => {
        const penumId: RegExp | string | string[] | undefined = pattern.enumId;

        function ensureEnumIDsIsArray(enumIds: any): boolean {
            if (!Array.isArray(enumIds)) {
                console.error(
                    `enumIds is of type ${typeof enumIds} but should be an array: ${JSON.stringify(enumIds)}`,
                );
                return false;
            }
            return true;
        }

        if (isRegExp(penumId)) {
            return (event: EventObj): boolean => {
                const enumIds = event.enumIds;
                if (enumIds == null || !ensureEnumIDsIsArray(enumIds)) {
                    return false;
                }
                // Test if any enum name matches the regex:
                return enumIds.find(e => (penumId as RegExp).test(e)) != null;
            };
        }

        if (Array.isArray(penumId)) {
            return (event: EventObj): boolean => {
                const enumIds = event.enumIds;
                if (enumIds == null || !ensureEnumIDsIsArray(enumIds)) {
                    return false;
                }
                // Test if the enum names of the event and the given array intersect
                return enumIds.find(e => penumId.includes(e)) != null;
            };
        }

        return (event: EventObj): boolean => {
            const enumIds = event.enumIds;
            if (enumIds == null || !ensureEnumIDsIsArray(enumIds)) {
                return false;
            }
            return enumIds && enumIds.includes(penumId as string);
        };
    },

    enumName: (pattern: Pattern): PatternEventCompareFunction => {
        const penumName: RegExp | string | string[] | undefined = pattern.enumName;

        function ensureEnumNamesIsArray(enumNames: any): boolean {
            if (!Array.isArray(enumNames)) {
                console.error(
                    `enumNames is of type ${typeof enumNames} but should be an array: ${JSON.stringify(enumNames)}`,
                );
                return false;
            }
            return true;
        }

        if (isRegExp(penumName)) {
            return (event: EventObj): boolean => {
                const enumNames = event.enumNames;
                if (enumNames == null || !ensureEnumNamesIsArray(enumNames)) {
                    return false;
                }
                // Test if any enum name matches the regex:
                return enumNames.find(e => (penumName as RegExp).test(e)) != null;
            };
        }
        if (Array.isArray(penumName)) {
            return (event: EventObj): boolean => {
                const enumNames = event.enumNames;
                if (enumNames == null || !ensureEnumNamesIsArray(enumNames)) {
                    return false;
                }
                // Test if the enum names of the event and the given array intersect
                return enumNames.find(e => penumName.includes(e)) != null;
            };
        }

        return (event: EventObj): boolean => {
            const enumNames = event.enumNames;
            if (enumNames == null || !ensureEnumNamesIsArray(enumNames)) {
                return false;
            }
            return enumNames?.includes(penumName as string);
        };
    },
};
