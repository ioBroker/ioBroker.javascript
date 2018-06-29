'use strict';

function isRegExp(obj) {
    return !!(obj && obj.test && obj.exec && (obj.ignoreCase || obj.ignoreCase === false));
}

/**
 * 
 * @param {{}} pattern The pattern object to use
 * @param {string} propName The name of the property to compare
 * @param {(event: any) => any} [eventPropertyExtractor] If given, this function is used to extract the property value from the event object. Otherwise the propName is used
 */
function stringOrRegExpCompare(pattern, propName, eventPropertyExtractor) {
    /** @type {RegExp | string | string[]} */
    const field = pattern[propName];
    const hasExtractor = typeof eventPropertyExtractor === 'function';
    if (isRegExp(field)) {
        return function (event) {
            const eventValue = hasExtractor ? eventPropertyExtractor(event) : event[propName];
            return (eventValue != null && /** @type {RegExp} */ (field).test(eventValue));
        };
    } else if (Array.isArray(field)) {
        return function (event) {
            const eventValue = hasExtractor ? eventPropertyExtractor(event) : event[propName];
            // An array matches when any element is found that satisfies the constraint
            return eventValue != null  && field.find(f => f === eventValue) != null;
        }
    } else {
        return function (event) {
            const eventValue = hasExtractor ? eventPropertyExtractor(event) : event[propName];
            return (eventValue != null && field === eventValue);
        };
    }
}

const patternCompareFunctions = {

    logic: function (pattern) {
    },

    id: (pattern) => stringOrRegExpCompare(pattern, "id"),

    name: (pattern) => stringOrRegExpCompare(pattern, "name"),

    change: function (pattern) {
        switch (pattern.change) {
            case 'eq': return function (event) { return (event.newState.val === event.oldState.val); };
            case 'ne': return function (event) { return (event.newState.val !== event.oldState.val); };
            case 'gt': return function (event) { return (event.newState.val > event.oldState.val); };
            case 'ge': return function (event) { return (event.newState.val >= event.oldState.val); };
            case 'lt': return function (event) { return (event.newState.val < event.oldState.val); };
            case 'le': return function (event) { return (event.newState.val <= event.oldState.val); };
            default:   return function (/* event */) { return true; };
            // on any other logic, just signal about message
        }
    },
    ack: function (pattern) {
        if (pattern.ack === true || pattern.ack === 'true') {
            return function (event) {
                return (event.newState.ack === true || event.newState.ack === 'true');
            };
        } else {
            return function (event) {
                return (event.newState.ack === false || event.newState.ack === 'false');
            };
        }
    },
    oldAck: function (pattern) {
        if (pattern.oldAck === true || pattern.oldAck === 'true') {
            return function (event) {
                return (event.oldState.ack === true || event.oldState.ack === 'true');
            };
        } else {
            return function (event) {
                return (event.oldState.ack === false || event.oldState.ack === 'false');
            };
        }
    },
    val: function (pattern) {
        const pval = pattern.val;
        return function (event) {
            return pval === event.newState.val;
        };
    },
    valGt: function (pattern) {
        const pvalGt = pattern.valGt;
        return function (event) {
            return event.newState.val > pvalGt;
        };
    },
    valGe: function (pattern) {
        const pvalGe = pattern.valGe;
        return function (event) {
            return event.newState.val >= pvalGe;
        };
    },
    valLt: function (pattern) {
        const pvalLt = pattern.valLt;
        return function (event) {
            return event.newState.val < pvalLt;
        };
    },
    valLe: function (pattern) {
        const pvalLe = pattern.valLe;
        return function (event) {
            return event.newState.val <= pvalLe;
        };
    },
    valNe: function (pattern) {
        const pvalNe = pattern.valNe;
        return function (event) {
            return event.newState.val !== pvalNe;
        };
    },

    oldVal: function (pattern) {
        const poldVal = pattern.oldVal;
        return function (event) {
            return poldVal === event.oldState.val;
        };
    },
    oldValGt: function (pattern) {
        const poldValGt = pattern.oldValGt;
        return function (event) {
            return event.oldState.val > poldValGt;
        };
    },
    oldValGe: function (pattern) {
        const poldValGe = pattern.oldValGe;
        return function (event) {
            return event.oldState.val >= poldValGe;
        };
    },
    oldValLt: function (pattern) {
        const poldValLt = pattern.oldValLt;
        return function (event) {
            return event.oldState.val < poldValLt;
        };
    },
    oldValLe: function (pattern) {
        const poldValLe = pattern.oldValLe;
        return function (event) {
            return event.oldState.val <= poldValLe;
        };
    },
    oldValNe: function (pattern) {
        const poldValNe = pattern.oldValNe;
        return function (event) {
            return event.oldState.val !== poldValNe;
        };
    },

    ts: function (pattern) {
        const pts = pattern.ts;
        return function (event) {
            return pts === event.newState.ts;
        };
    },
    tsGt: function (pattern) {
        const ptsGt = pattern.tsGt;
        return function (event) {
            return event.newState.ts > ptsGt;
        };
    },
    tsGe: function (pattern) {
        const ptsGe = pattern.tsGe;
        return function (event) {
            return event.newState.ts >= ptsGe;
        };
    },
    tsLt: function (pattern) {
        const ptsLt = pattern.tsLt;
        return function (event) {
            return event.newState.ts < ptsLt;
        };
    },
    tsLe: function (pattern) {
        const ptsLe = pattern.tsLe;
        return function (event) {
            return event.newState.ts <= ptsLe;
        };
    },

    oldTs: function (pattern) {
        const poldTs = pattern.oldTs;
        return function (event) {
            return poldTs === event.oldState.ts;
        };
    },
    oldTsGt: function (pattern) {
        const poldTsGt = pattern.oldTsGt;
        return function (event) {
            return event.oldState.ts > poldTsGt;
        };
    },
    oldTsGe: function (pattern) {
        const poldTsGe = pattern.oldTsGe;
        return function (event) {
            return event.oldState.ts >= poldTsGe;
        };
    },
    oldTsLt: function (pattern) {
        const poldTsLt = pattern.oldTsLt;
        return function (event) {
            return event.oldState.ts < poldTsLt;
        };
    },
    oldTsLe: function (pattern) {
        const poldTsLe = pattern.oldTsLe;
        return function (event) {
            return event.oldState.ts <= poldTsLe;
        };
    },

    lc: function (pattern) {
        const plc = pattern.lc;
        return function (event) {
            return plc === event.newState.lc;
        };
    },
    lcGt: function (pattern) {
        const plcGt = pattern.lcGt;
        return function (event) {
            return event.newState.lc > plcGt;
        };
    },
    lcGe: function (pattern) {
        const plcGe = pattern.lcGe;
        return function (event) {
            return event.newState.lc >= plcGe;
        };
    },
    lcLt: function (pattern) {
        const plcLt = pattern.lcLt;
        return function (event) {
            return event.newState.lc < plcLt;
        };
    },
    lcLe: function (pattern) {
        const plcLe = pattern.lcLe;
        return function (event) {
            return event.newState.lc <= plcLe;
        };
    },

    oldLc: function (pattern) {
        const poldLc = pattern.oldLc;
        return function (event) {
            return poldLc === event.oldState.lc;
        };
    },
    oldLcGt: function (pattern) {
        const poldLcGt = pattern.oldLcGt;
        return function (event) {
            return event.oldState.lc > poldLcGt;
        };
    },
    oldLcGe: function (pattern) {
        const poldLcGe = pattern.oldLcGe;
        return function (event) {
            return event.oldState.lc >= poldLcGe;
        };
    },
    oldLcLt: function (pattern) {
        const poldLcLt = pattern.oldLcLt;
        return function (event) {
            return event.oldState.lc < poldLcLt;
        };
    },
    oldLcLe: function (pattern) {
        const poldLcLe = pattern.oldLcLe;
        return function (event) {
            return event.oldState.lc <= poldLcLe;
        };
    },

    from: (pattern) => stringOrRegExpCompare(pattern, "from",
        (event) => event && event.newState && event.newState.from
    ),

    fromNe: (pattern) => !stringOrRegExpCompare(pattern, "fromNe",
        (event) => event && event.newState && event.newState.from
    ),

    oldFrom: (pattern) => stringOrRegExpCompare(pattern, "oldFrom",
        (event) => event && event.oldState && event.oldState.from
    ),

    oldFromNe: (pattern) => !stringOrRegExpCompare(pattern, "oldFromNe",
        (event) => event && event.oldState && event.oldState.from
    ),

    channelId: (pattern) => stringOrRegExpCompare(pattern, "channelId"),
    channelName: (pattern) => stringOrRegExpCompare(pattern, "channelName"),
    deviceId: (pattern) => stringOrRegExpCompare(pattern, "deviceId"),
    deviceName: (pattern) => stringOrRegExpCompare(pattern, "deviceName"),

    enumId: function (pattern) {
        const penumId = pattern.enumId;
        if (isRegExp(penumId)) {
            return function (event) {
                for (let i = 0; i < event.enumIds.length; i++) {
                    //if (event.enumIds[i].match (penumId)) {
                    if (penumId.test(event.enumIds[i])) {
                        return true;
                    }
                }
                return false;
            };
        } else {
            return function (event) {
                return (event.enumIds && event.enumIds.indexOf(penumId) !== -1);
            };
        }
    },

    enumName: function (pattern) {
        const penumName = pattern.enumName;
        if (isRegExp(penumName)) {
            return function (event) {
                if (event.enumNames) {
                    if (!(event.enumNames instanceof Array)) {
                        console.error('Invalid type of enumNames: ' + (typeof event.enumNames) + ' ' + JSON.stringify(event.enumNames));
                        return false;
                    }

                    for (let j = 0; j < event.enumNames.length; j++) {
                        if (penumName.test(event.enumNames[j])) {
                            return true;
                        }
                    }
                }
                return false;
            };
        } else {
            return function (event) {
                return (event.enumNames && event.enumNames.indexOf(penumName) !== -1);
            };
        }
    }
};


module.exports = patternCompareFunctions;
