



/**
 * Given a cronspec, return the human-readable string.
 * @param {string} cronspec
 * @param withSeconds
 * @param {Object=} locale
 */
function cronToText(cronspec, withSeconds, locale) {
    'use strict';

    // Constant array to convert valid names to values
    var NAMES = {
        JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8,
        SEP: 9, OCT: 10, NOV: 11, DEC: 12,
        SUN: 1, MON: 2, TUE: 3, WED: 4, THU: 5, FRI: 6, SAT: 7
    };

// Parsable replacements for common expressions
    var REPLACEMENTS = {
        '* * * * * *': '0/1 * * * * *',
        '@YEARLY': '0 0 1 1 *',
        '@ANNUALLY': '0 0 1 1 *',
        '@MONTHLY': '0 0 1 * *',
        '@WEEKLY': '0 0 * * 0',
        '@DAILY': '0 0 * * *',
        '@HOURLY': '0 * * * *'
    };

// Contains the index, min, and max for each of the constraints
    var FIELDS = {
        s: [0, 0, 59], // seconds
        m: [1, 0, 59], // minutes
        h: [2, 0, 23], // hours
        D: [3, 1, 31], // day of month
        M: [4, 1, 12], // month
        Y: [6, 1970, 2099], // year
        d: [5, 1, 7, 1] // day of week
    };

    /**
     * Returns the value + offset if value is a number, otherwise it
     * attempts to look up the value in the NAMES table and returns
     * that result instead.
     *
     * @param {Number,String} value: The value that should be parsed
     * @param {Number=} offset: Any offset that must be added to the value
     * @param {Number=} max
     * @returns {Number|null}
     */
    function getValue(value) {
        var offset = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
        var max = arguments.length <= 2 || arguments[2] === undefined ? 9999 : arguments[2];

        return isNaN(value) ? NAMES[value] || null : Math.min(+value + offset, max);
    }

    /**
     * Returns a deep clone of a schedule skipping any day of week
     * constraints.
     *
     * @param {Object} sched: The schedule that will be cloned
     * @returns {Object}
     */
    function cloneSchedule(sched) {
        var clone = {},
            field;

        for (field in sched) {
            if (field !== 'dc' && field !== 'd') {
                clone[field] = sched[field].slice(0);
            }
        }

        return clone;
    }

    /**
     * Adds values to the specified constraint in the current schedule.
     *
     * @param {Object} sched: The schedule to add the constraint to
     * @param {String} name: Name of constraint to add
     * @param {Number} min: Minimum value for this constraint
     * @param {Number} max: Maximum value for this constraint
     * @param {Number=} inc: The increment to use between min and max
     */
    function add(sched, name, min, max) {
        var inc = arguments.length <= 4 || arguments[4] === undefined ? 0 : arguments[4];

        var i = min;

        if (!sched[name]) {
            sched[name] = [];
        }

        while (i <= max) {
            if (sched[name].indexOf(i) < 0) {
                sched[name].push(i);
            }
            i += inc || 1;
        }

        sched[name].sort(function (a, b) {
            return a - b;
        });
    }

    /**
     * Adds a hash item (of the form x#y or xL) to the schedule.
     *
     * @param {Object} schedules: The current schedule array to add to
     * @param {Object} curSched: The current schedule to add to
     * @param {Number} value: The value to add (x of x#y or xL)
     * @param {Number} hash: The hash value to add (y of x#y)
     */
    function addHash(schedules, curSched, value, hash) {
        // if there are any existing day of week constraints that
        // aren't equal to the one we're adding, create a new
        // composite schedule
        if (curSched.d && !curSched.dc || curSched.dc && curSched.dc.indexOf(hash) < 0) {
            schedules.push(cloneSchedule(curSched));
            curSched = schedules[schedules.length - 1];
        }

        add(curSched, 'd', value, value);
        add(curSched, 'dc', hash, hash);
    }

    /**
     *
     * @param {Object} s: The existing set of schedules
     * @param {Object} curSched: The current schedule to add to
     * @param {Number} value
     */
    function addWeekday(s, curSched, value) {
        var except1 = {},
            except2 = {};
        if (value === 1) {
            // cron doesn't pass month boundaries, so if 1st is a
            // weekend then we need to use 2nd or 3rd instead
            add(curSched, 'D', 1, 3);
            add(curSched, 'd', NAMES.MON, NAMES.FRI);
            add(except1, 'D', 2, 2);
            add(except1, 'd', NAMES.TUE, NAMES.FRI);
            add(except2, 'D', 3, 3);
            add(except2, 'd', NAMES.TUE, NAMES.FRI);
        } else {
            // normally you want the closest day, so if v is a
            // Saturday, use the previous Friday.  If it's a
            // sunday, use the following Monday.
            add(curSched, 'D', value - 1, value + 1);
            add(curSched, 'd', NAMES.MON, NAMES.FRI);
            add(except1, 'D', value - 1, value - 1);
            add(except1, 'd', NAMES.MON, NAMES.THU);
            add(except2, 'D', value + 1, value + 1);
            add(except2, 'd', NAMES.TUE, NAMES.FRI);
        }
        s.exceptions.push(except1);
        s.exceptions.push(except2);
    }

    /**
     * Adds a range item (of the form x-y/z) to the schedule.
     *
     * @param {String} item: The cron expression item to add
     * @param {Object} curSched: The current schedule to add to
     * @param {String} name: The name to use for this constraint
     * @param {Number} min: The min value for the constraint
     * @param {Number} max: The max value for the constraint
     * @param {Number} offset: The offset to apply to the cron value
     */
    function addRange(item, curSched, name, min, max, offset) {
        // parse range/x
        var incSplit = item.split('/'),
            inc = +incSplit[1],
            range = incSplit[0];

        // parse x-y or * or 0
        if (range !== '*' && range !== '0') {
            var rangeSplit = range.split('-');
            min = getValue(rangeSplit[0], offset, max);

            // fix for issue #13, range may be single digit
            max = getValue(rangeSplit[1], offset, max) || max;
        }

        add(curSched, name, min, max, inc);
    }

    /**
     * Parses a particular item within a cron expression.
     *
     * @param {String} item: The cron expression item to parse
     * @param {Object} s: The existing set of schedules
     * @param {String} name: The name to use for this constraint
     * @param {Number} min: The min value for the constraint
     * @param {Number} max: The max value for the constraint
     * @param {Number} offset: The offset to apply to the cron value
     */
    function parse(item, s, name, min, max, offset) {
        var value,
            split,
            schedules = s.schedules,
            curSched = schedules[schedules.length - 1];

        // L just means min - 1 (this also makes it work for any field)
        if (item === 'L') {
            item = (min - 1).toString(10);
        }

        // parse x
        if ((value = getValue(item, offset, max)) !== null) {
            add(curSched, name, value, value);
        }
        // parse xW
        else if ((value = getValue(item.replace('W', ''), offset, max)) !== null) {
            addWeekday(s, curSched, value);
        }
        // parse xL
        else if ((value = getValue(item.replace('L', ''), offset, max)) !== null) {
            addHash(schedules, curSched, value, min - 1);
        }
        // parse x#y
        else if ((split = item.split('#')).length === 2) {
            value = getValue(split[0], offset, max);
            addHash(schedules, curSched, value, getValue(split[1]));
        }
        // parse x-y or x-y/z or */z or 0/z
        else {
            addRange(item, curSched, name, min, max, offset);
        }
    }

    /**
     * Returns true if the item is either of the form x#y or xL.
     *
     * @param {String} item: The expression item to check
     */
    function isHash(item) {
        return item.indexOf('#') > -1 || item.indexOf('L') > 0;
    }

    function itemSorter(a, b) {
        return isHash(a) && !isHash(b) ? 1 : a - b;
    }

    /**
     * Parses each of the fields in a cron expression.  The expression must
     * include the seconds field, the year field is optional.
     *
     * @param {String} expr: The cron expression to parse
     */
    function parseExpr(expr) {
        var schedule = { schedules: [{}], exceptions: [] },
            components = expr.replace(/(\s)+/g, ' ').split(' '),
            field,
            f,
            component,
            items;

        for (field in FIELDS) {
            f = FIELDS[field];
            component = components[f[0]];
            if (component && component !== '*' && component !== '?') {
                // need to sort so that any #'s come last, otherwise
                // schedule clones to handle # won't contain all of the
                // other constraints
                items = component.split(',').sort(itemSorter);
                var i,
                    length = items.length;
                for (i = 0; i < length; i++) {
                    parse(items[i], schedule, field, f[1], f[2], f[3]);
                }
            }
        }

        return schedule;
    }

    /**
     * Make cron expression parsable.
     *
     * @param {String} expr: The cron expression to prepare
     */
    function prepareExpr(expr) {
        var prepared = expr.toUpperCase();
        return REPLACEMENTS[prepared] || prepared;
    }

    function parseCron(expr, hasSeconds) {
        var e = prepareExpr(expr);
        return parseExpr(hasSeconds ? e : '0 ' + e);
    }

    var schedule = parseCron(cronspec, withSeconds);
    locale = locale || LOCALE;

    function absFloor(number) {
        if (number < 0) {
            return Math.ceil(number);
        } else {
            return Math.floor(number);
        }
    }

    function toInt(argumentForCoercion) {
        var coercedNumber = +argumentForCoercion,
            value = 0;

        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
            value = absFloor(coercedNumber);
        }

        return value;
    }

    function ordinal(number) {
        var b = number % 10,
            output = (toInt(number % 100 / 10) === 1) ? locale.ORDINALS.th :
                (b === 1) ? locale.ORDINALS.st :
                    (b === 2) ? locale.ORDINALS.nd :
                        (b === 3) ? locale.ORDINALS.rd : locale.ORDINALS.th;
        return number + output;
    }

    /**
     * For an array of numbers, e.g. a list of hours in a schedule,
     * return a string listing out all of the values (complete with
     * "and" plus ordinal text on the last item).
     * @param {Number[]} numbers
     * @returns {string}
     */
    function numberList(numbers) {
        if (numbers.length < 2) {
            return ordinal(numbers);
        }

        var lastVal = numbers.pop();
        return numbers.join(', ') + ' ' + locale['and'] + ' ' + ordinal(lastVal);
    }

    /**
     * Parse a number into day of week, or a month name;
     * used in dateList below.
     * @param {Number|String} value
     * @param {String} type
     * @returns {String}
     */
    function numberToDateName(value, type) {
        if (type === 'dow') {
            return locale.DOW[value - 1];
        } else if (type === 'mon') {
            return locale.MONTH[value - 1];
        }
    }

    /**
     * From an array of numbers corresponding to dates (given in type: either
     * days of the week, or months), return a string listing all the values.
     * @param {Number[]} numbers
     * @param {String} type
     * @returns {String}
     */
    function dateList(numbers, type) {
        if (numbers.length < 2) {
            return numberToDateName('' + numbers[0], type);
        }

        var lastVal = '' + numbers.pop();
        var outputText = '';

        for (var i = 0, value; value = numbers[i]; i++) {
            if (outputText.length > 0) {
                outputText += ', ';
            }
            outputText += numberToDateName(value, type);
        }
        return outputText + ' ' + locale['and'] + ' ' + numberToDateName(lastVal, type);
    }

    /**
     * Pad to equivalent of sprintf('%02d').
     * @param {Number} x
     * @returns {string}
     */
    function zeroPad(x) {
        return (x < 10) ? '0' + x : x;
    }

    //----------------

    /**
     * Given a schedule, generate a friendly sentence description.
     * @param {Object} schedule
     * @returns {string}
     */
    function scheduleToSentence(schedule, withSeconds) {
        var outputText = locale.Every + ' ';

        if (schedule['h'] && schedule['m'] && schedule['h'].length <= 2 && schedule['m'].length <= 2 && withSeconds && schedule['s'] && schedule['s'].length <= 2 ) {
            // If there are only one or two specified values for
            // hour or minute, print them in HH:MM:SS format

            var hm = [];
            for (var i = 0; i < schedule['h'].length; i++) {
                for (var j = 0; j < schedule['m'].length; j++) {
                    for (var k = 0; k < schedule['s'].length; k++) {
                        hm.push(zeroPad(schedule['h'][i]) + ':' + zeroPad(schedule['m'][j]) + ':' + zeroPad(schedule['s'][k]));
                    }
                }
            }
            if (hm.length < 2) {
                outputText = locale['At'] + ' ' + hm[0];
            } else {
                var lastVal = hm.pop();
                outputText = locale['At'] + ' ' + hm.join(', ') + ' ' + locale.and + ' ' + lastVal;
            }
            if (!schedule['d'] && !schedule['D']) {
                outputText += ' ' + locale['every day'] + ' ';
            }
        } else
        if (schedule['h'] && schedule['m'] && schedule['h'].length <= 2 && schedule['m'].length <= 2) {
            // If there are only one or two specified values for
            // hour or minute, print them in HH:MM format

            var hm = [];
            for (var i = 0; i < schedule['h'].length; i++) {
                for (var j = 0; j < schedule['m'].length; j++) {
                    hm.push(zeroPad(schedule['h'][i]) + ':' + zeroPad(schedule['m'][j]));
                }
            }
            if (hm.length < 2) {
                outputText = locale['At'] + ' ' + hm[0];
            } else {
                var lastVal = hm.pop();
                outputText = locale['At'] + ' ' + hm.join(', ') + ' ' + locale.and + ' ' + lastVal;
            }
            if (!schedule['d'] && !schedule['D']) {
                outputText += ' ' + locale['every day'] + ' ';
            }
        } else {
            // Otherwise, list out every specified hour/minute value.

            if (schedule['h']) { // runs only at specific hours
                if (schedule['m']) { // and only at specific minutes
                    if (withSeconds) {
                        if (!schedule['s'] || schedule['s'].length === 60) {
                            outputText += locale['second of every'] + ' ' + numberList(schedule['m']) + ' ' + locale['minute past the'] + ' ' + numberList(schedule['h']) + ' ' + locale['hour'];
                        } else {
                            outputText += numberList(schedule['s']) + ' ' + locale['second of every'] + ' ' +numberList(schedule['m']) + ' ' + locale['minute past the'] + ' ' + numberList(schedule['h']) + ' ' + locale['hour'];
                        }
                    } else {
                        outputText += numberList(schedule['m']) + ' ' + locale['minute past the'] + ' ' + numberList(schedule['h']) + ' ' + locale['hour'];
                    }
                } else { // specific hours, but every minute
                    if (withSeconds) {
                        if (!schedule['s'] || schedule['s'].length === 60) {
                            outputText += locale['second of every'] + ' ' + locale['minute of'] + ' ' + numberList(schedule['h']) + ' ' + locale['hour'];
                        } else {
                            outputText += numberList(schedule['s']) + ' ' + locale['second of every'] + ' ' + locale['minute of'] + ' ' + numberList(schedule['h']) + ' ' + locale['hour'];
                        }
                    } else {
                        outputText += locale['minute of'] + ' ' + numberList(schedule['h']) + ' ' + locale['hour'];
                    }
                }
            } else if (schedule['m']) { // every hour, but specific minutes
                if (withSeconds) {
                    if (!schedule['s'] || schedule['s'].length === 60) {
                        outputText += locale['second of every'] + ' ' + numberList(schedule['m']) + ' ' + locale['minute every hour'];
                    } else {
                        outputText += numberList(schedule['s']) + ' ' + locale['second of every'] + ' ' + numberList(schedule['m']) + ' ' + locale['minute every hour'];
                    }
                } else {
                    outputText += numberList(schedule['m']) + ' ' + locale['minute every hour'];
                }
            } else if (withSeconds) {
                if (!schedule['s'] || schedule['s'].length === 60) {
                    outputText += locale['second'];
                } else {
                    outputText += numberList(schedule['s']) + ' ' + locale['second'];
                }
            } else { // cronspec has "*" for both hour and minute
                outputText += locale['minute'];
            }
        }

        if (schedule['D']) { // runs only on specific day(s) of month
            outputText += (locale['on the'] ? ' ' + locale['on the'] + ' ' : ' ') + numberList(schedule['D']);
            if (!schedule['M']) {
                outputText += ' ' + locale['of every month'];
            }
        }

        if (schedule['d']) { // runs only on specific day(s) of week
            if (schedule['D']) {
                // if both day fields are specified, cron uses both; superuser.com/a/348372
                outputText += ' ' + locale['and every'] + ' ';
            } else {
                outputText += ' ' + locale['on'] + ' ';
            }
            outputText += dateList(schedule['d'], 'dow');
        }

        if (schedule['M']) {
            // runs only in specific months; put this output last
            outputText += ' ' + locale['in'] + ' ' + dateList(schedule['M'], 'mon');
        }

        return outputText;
    }

    return scheduleToSentence(schedule.schedules[0], withSeconds);
}