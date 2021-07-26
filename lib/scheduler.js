'use strict';

// const DEFAULT = {
//     time: {
//         exactTime: false,
//
//         start: '00:00',
//         end: '23:59',
//
//         mode: 'hours',
//         interval: 1,
//     },
//     period: {
//         once: '',
//         days: 1,
//         dows: '',
//         dates: '',
//         weeks: 0,
//         months: '',
//
//         years: 0,
//         yearMonth: 0,
//         yearDate: 0,
//     },
//     valid: {
//         from: '',
//         to: ''
//     }
// };

class Scheduler {
    constructor(log, DateTest, suncalc, latitude, longitude) {
        this.list = {};
        this.Date = DateTest || Date;
        this.suncalc = suncalc;
        this.latitude = latitude;
        this.longitude = longitude;
        this.log = log || {
            debug: function (text) {console.log(text);},
            info: function (text) {console.log(text);},
            log: function (text) {console.log(text);},
            warn: function (text) {console.warn(text);},
            error: function (text) {console.error(text);},
            silly: function (text) {console.log(text);}
        };
    }

    _getId() {
        return Math.round(Math.random() * 1000000) + '.' + this.Date.now();
    }

    recalculate() {
        const count = Object.keys(this.list).length;
        if (count && !this.timer) {
            const d = new this.Date();
            d.setMilliseconds(0);
            d.setSeconds(0);
            d.setMinutes(d.getMinutes() + 1);
            this.timer = setTimeout(() => this.checkSchedules(), d.getTime() - this.Date.now());
        } else if (!count && this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    getContext() {
        const now = new this.Date();
        return {
            now: now.getTime(),
            minutesOfDay: now.getHours() * 60 + now.getMinutes(),
            y: now.getFullYear(),
            M: now.getMonth(),
            d: now.getDate(),
            h: now.getHours(),
            m: now.getMinutes(),
            dow: now.getDay()
        };
    }

    checkSchedules() {
        const context = this.getContext();

        for (const id in this.list) {
            if (!this.list.hasOwnProperty(id)) continue;
            if (this.checkSchedule(context, this.list[id])) {
                typeof this.list[id].cb === 'function' && this.list[id].cb(id);
            }
        }

        const d = new this.Date();
        // if callback last more than a minute
        if (d.getTime() - context.now > 60000) {
            setImmediate(() => this.checkSchedules());
        } else {
            d.setMilliseconds(0);
            d.setSeconds(0);
            d.setMinutes(d.getMinutes() + 1);
            this.timer = setTimeout(() => this.checkSchedules(), d.getTime() - this.Date.now());
        }
    }

    monthDiff(d1, d2) {
        let months;
        months = (d2.getFullYear() - d1.getFullYear()) * 12;
        months -= d1.getMonth() + 1;
        months += d2.getMonth();
        return months <= 0 ? 0 : months;
    }

    checkSchedule(context, schedule) {
        if (schedule.valid) {
            if (schedule.valid.from && !this.isPast(schedule.valid.from) && !this.isToday(schedule.valid.from)) {
                return;
            }
            // "to" this.Date is in the past => delete it from list
            if (schedule.valid.to && this.isPast(schedule.valid.to)) {
                delete this.list[schedule.id];
                return;
            }
        }
        if (schedule.period) {
            if (schedule.period.once && !this.isToday(schedule.period.once)) {
                if (this.isPast(schedule.period.once)) {
                    delete this.list[schedule.id];
                }
                return;
            } else if (schedule.period.days) {
                if (schedule.period.dows && schedule.period.dows.indexOf(context.dow) === -1) {
                    return;
                } else
                if (schedule.period.days > 1) {
                    const diff = Math.round((context.now - schedule.valid.fromDate) / (60000 * 24) + 0.5);
                    if (diff % schedule.period.days) {
                        return;
                    }
                }
            } else if (schedule.period.weeks) {
                if (schedule.period.dows && schedule.period.dows.indexOf(context.dow) === -1) {
                    return;
                }
                if (schedule.period.weeks > 1) {
                    const diff = Math.round((context.now - schedule.valid.fromDate) / (60000 * 24 * 7) + 0.5);
                    if (diff % schedule.period.days) {
                        return;
                    }
                }
            } else if (schedule.period.months) {
                if (schedule.period.months && schedule.period.months.indexOf(context.M) === -1) {
                    return;
                }
                if (typeof schedule.period.months === 'number' && schedule.period.months > 1) {
                    const diff = this.monthDiff(schedule.period.fromDate, new this.Date(context.now));
                    if (diff % schedule.period.months) {
                        return;
                    }
                }
            } else if (schedule.period.years) {
                if (schedule.period.yearMonth !== undefined && schedule.period.yearMonth !== context.M) {
                    return;
                }
                if (schedule.period.yearDate && schedule.period.yearDate !== context.d) {
                    return;
                }
                if (schedule.period.years > 1) {
                    const diff = Math.floor(this.monthDiff(schedule.period.fromDate, new this.Date(context.now)) / 12);
                    if (diff % schedule.period.years) {
                        return;
                    }
                }
            }
        }

        if (schedule.time) {
            let start = schedule.time.start;
            let times;
            if (start === 'sunrise' || start === 'sunset') {
                times = this.suncalc.getTimes(new Date(), this.latitude, this.longitude);
                start = times[start];
                start = start.getHours() * 60 + start.getMinutes();
            }

            let end = schedule.time.end;

            if (end === 'sunrise' || end === 'sunset') {
                times = times || this.suncalc.getTimes(new Date(), this.latitude, this.longitude);
                end = times[end];
                end = end.getHours() * 60 + end.getMinutes();
            }

            start = start || 0;
            end   = end   || (60 * 24);

            if (schedule.time.exactTime) {
                if (context.minutesOfDay !== start) {
                    return;
                }
            } else {
                if (start >= context.minutesOfDay || (end && end < context.minutesOfDay)) {
                    return;
                }
                if (schedule.time.mode === 60) {
                    if (schedule.time.interval > 1 && ((context.minutesOfDay - start) % schedule.time.interval)) {
                        return;
                    }
                } else
                if (schedule.time.mode === 3600) {
                    if ((context.minutesOfDay - start) % (schedule.time.interval * 60)) {
                        return;
                    }
                }
            }
        }
        return true;
    }

    string2date(date) {
        let parts = date.split('.');
        let d;
        if (parts.length !== 3) {
            parts = date.split('-');
            d = new this.Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        } else {
            d = new this.Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
        return {y: d.getFullYear(), M: d.getMonth(), d: d.getDate()};
    }

    isPast(context, date) {
        if (date) {
            if (date.y < context.y) {
                return true;
            } else if (date.y === context.y) {
                if (date.M < context.M) {
                    return true;
                } else if (date.M === context.M) {
                    if (date.d < context.d) {
                        return true;
                    }
                }
            }
        }
    }

    isToday(context, date) {
        return date && date.y === context.y && date.M === context.M && date.d === context.d;
    }

    add(schedule, scriptName, cb) {
        if (typeof schedule === 'string') {
            try {
                schedule = JSON.parse(schedule);
            } catch (e) {
                this.log.error('Cannot parse schedule: ' + schedule);
                return;
            }
        }

        const id = this._getId();
        if (typeof schedule !== 'object' || !schedule.period) {
            return this.log.error('Invalid schedule structure: ' + JSON.stringify(schedule));
        }
        const context = this.getContext();
        const sch = JSON.parse(JSON.stringify(schedule));
        sch.scriptName = scriptName;
        sch.original = JSON.stringify(schedule);
        sch.id = id;
        sch.cb = cb;
        if (sch.time && sch.time.start && sch.time.start !== 'sunrise' && sch.time.start !== 'sunset') {
            const parts = sch.time.start.split(':');
            sch.time.start = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        }
        if (sch.time && sch.time.end && sch.time.end !== 'sunrise' && sch.time.end !== 'sunset') {
            const parts = sch.time.end.split(':');
            sch.time.end = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        }
        if (sch.time.mode === 'minutes') {
            sch.time.mode = 60;
        } else if (sch.time.mode === 'hours') {
            sch.time.mode = 3600;
        }
        sch.period.once = sch.period.once && this.string2date(sch.period.once);

        if (sch.valid) {
            sch.valid.from = sch.valid.from && this.string2date(sch.valid.from);
            sch.valid.to = sch.valid.to && this.string2date(sch.valid.to);

            if (this.isPast(context, sch.valid.to)) {
                this.log.warn('End of schedule is in the past');
                return;
            }
            if ((typeof sch.period.days === 'number' && sch.period.days > 1)) {
                // fromDate must be unix time
                sch.valid.fromDate = new this.Date(sch.valid.from.y, sch.valid.from.M, sch.valid.from.d).getTime();
            } else if (typeof sch.period.weeks === 'number' && sch.period.weeks > 1) {
                sch.valid.fromDate = sch.valid.from ? new this.Date(sch.valid.from.y, sch.valid.from.M, sch.valid.from.d) : new this.Date();
                //sch.valid.fromDate.setDate(-sch.valid.fromDate.getDate() - sch.valid.fromDate.getDay());
                // fromDate must be unix time
                sch.valid.fromDate = sch.valid.fromDate.getTime();
            } else if (typeof sch.period.months === 'number' && sch.period.months > 1) {
                // fromDate must be object
                sch.valid.fromDate = new this.Date(sch.valid.from.y, sch.valid.from.M, sch.valid.from.d);
            } else if (typeof sch.period.years === 'number' && sch.period.years > 1) {
                // fromDate must be object
                sch.valid.fromDate = new this.Date(sch.valid.from.y, sch.valid.from.M, sch.valid.from.d);
            }
        }
        if (sch.period && (
            (typeof sch.period.days   === 'number' && sch.period.days   > 1) ||
            (typeof sch.period.weeks  === 'number' && sch.period.weeks  > 1) ||
            (typeof sch.period.months === 'number' && sch.period.months > 1) ||
            (typeof sch.period.years  === 'number' && sch.period.years  > 1)
        ) && (
            !sch.valid || !sch.valid.fromDate
        )) {
            this.log.warn('Invalid Schedule definition: Period day/weeks/months/years only allowed with a valid.from date!');
            return;
        }
        if (sch.period.dows) {
            try {
                sch.period.dows = JSON.parse(sch.period.dows);
            } catch (e) {
                this.log.error('Cannot parse day of weeks: ' + sch.period.dows);
                return;
            }
            if (!Array.isArray(sch.period.dows)) {
                this.log.error('day of weeks is no array: ' + JSON.stringify(sch.period.dows));
                return;
            }
        }
        if (sch.period.months) {
            try {
                sch.period.months = JSON.parse(sch.period.months);
            } catch (e) {
                this.log.error('Cannot parse day of months: ' + sch.period.months);
                return;
            }
            sch.period.months = sch.period.months.map(m => m - 1);
        }
        if (sch.period.dates) {
            try {
                sch.period.dates = JSON.parse(sch.period.dates);
            } catch (e) {
                this.log.error('Cannot parse day of dates: ' + sch.period.dates);
                return;
            }
        }
        sch.period.yearMonth = sch.period.yearMonth && (sch.period.yearMonth - 1);
        this.list[id] = sch;
        this.recalculate();
        return id;
    }

    remove(id) {
        if (typeof id === 'object' && id.type === 'schedule' && typeof id.id === 'string' && id.id.startsWith('schedule_')) {
            if (this.list[id.id.substring('schedule_'.length)]) {
                delete this.list[id.id.substring('schedule_'.length)];
                this.recalculate();
                return true;
            } else {
                return false;
            }
        } else
        if (typeof id === 'string' && this.list[id]) {
            delete this.list[id];
            this.recalculate();
            return true;
        } else {
            return false;
        }
    }

    getList() {
        return Object.keys(this.list)
            .map(id => ({id: 'schedule_' + id, type: 'schedule', schedule: this.list[id].original, scriptId: this.list[id].scriptId}));
    }

    get(id) {
        if (id && typeof id === 'object' && id.type === 'schedule' && typeof id.id === 'string' && id.id.startsWith('schedule_')) {
            return this.list[id.id.substring('schedule_'.length)];
        } else if (typeof id === 'string') {
            return this.list[id];
        } else {
            return null;
        }
    }
}

module.exports = Scheduler;