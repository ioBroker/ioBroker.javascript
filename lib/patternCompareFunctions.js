'use strict';

function isRegExp(obj) {
    return !!(obj && obj.test && obj.exec && (obj.ignoreCase || obj.ignoreCase === false));
}

function stringOrRegExpCompare(name, pattern) {
    const field = pattern[name];
    if (isRegExp(field)) {
        return function (event) {
            return (event[name] && field.test(event[name]));
        };
    } else {
        return function (event) {
            return (event[name] && field === event[name]);
        };
    }
}

const patternCompareFunctions = {

    logic: function (pattern) {
    },
    //id: stringOrRegExpCompare.bind(1, 'id'),
    id: function (pattern) {
        const pid = pattern.id;
        if (isRegExp(pid)) {
            return function (event) {
                //return event.id && event.id.match (pattern.id);
                return event.id && pid.test(event.id);
            };
        } else {
            return function (event) {
                return (event.id && pid === event.id);
            };
        }
    },

    name: stringOrRegExpCompare.bind(1, 'name'),

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

    from: function (pattern) {
        const pfrom = pattern.from;
        return function (event) {
            return pfrom === event.newState.from;
        };
    },
    fromNe: function (pattern) {
        const pfromNe = pattern.fromNe;
        return function (event) {
            return pfromNe !== event.newState.from;
        };
    },

    oldFrom: function (pattern) {
        const poldFrom = pattern.oldFrom;
        return function (event) {
            return poldFrom === event.oldState.from;
        };
    },
    oldFromNe: function (pattern) {
        const poldFromNe = pattern.oldFromNe;
        return function (event) {
            return poldFromNe !== event.oldState.from;
        };
    },

    channelId:   stringOrRegExpCompare.bind(1, 'channelId'),
    channelName: stringOrRegExpCompare.bind(1, 'channelName'),
    deviceId:    stringOrRegExpCompare.bind(1, 'deviceId'),
    deviceName:  stringOrRegExpCompare.bind(1, 'deviceName'),

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
