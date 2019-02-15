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
    constructor(log) {
        this.list = {};
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
        return Math.round(Math.random() * 1000000) + '.' + Date.now();
    }

    recalculate() {
        const count = Object.keys(this.list).length;
        if (count && !this.timer) {
            const d = new Date();
            d.setMilliseconds(0);
            d.setSeconds(0);
            d.setMinutes(d.getMinutes() + 1);
            this.timer = setTimeout(() => this.checkSchedules(), d.getTime() - Date.now());
        } else if (!count && this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
    getContext() {
        const now = new Date();
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

        const d = new Date();
        // if callback last more than a minute
        if (d.getTime() - context.now > 60000) {
            setImmediate(() => this.checkSchedules());
        } else {
            d.setMilliseconds(0);
            d.setSeconds(0);
            d.setMinutes(d.getMinutes() + 1);
            this.timer = setTimeout(() => this.checkSchedules(), d.getTime() - Date.now());
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
            // "to" date is in the past => delete it from list
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
                    const diff = this.monthDiff(schedule.period.fromDate, new Date(context.now));
                    if (diff % schedule.period.months) {
                        return;
                    }
                }
            } else if (schedule.period.years) {
                if (schedule.period.years.yearMonth && schedule.period.years.yearMonth !== context.M) {
                    return;
                }
                if (schedule.period.years.yearDate && schedule.period.years.yearDate !== context.d) {
                    return;
                }
                if (schedule.period.years > 1) {
                    const diff = Math.floor(this.monthDiff(schedule.period.fromDate, new Date(context.now)) / 12);
                    if (diff % schedule.period.years) {
                        return;
                    }
                }
            }
        }

        if (schedule.time) {
            if (schedule.time.exactTime) {
                if (context.minutesOfDay !== schedule.time.start) {
                    return;
                }
            } else {
                if (schedule.time.start > context.minutesOfDay || (schedule.time.end && schedule.time.end < context.minutesOfDay)) {
                    return;
                }
                if (schedule.time.mode === 60) {
                    if (schedule.time.interval > 1 && ((context.minutesOfDay - schedule.time.start) % schedule.time.interval)) {
                        return;
                    }
                } else
                if (schedule.time.mode === 3600) {
                    if ((context.minutesOfDay - schedule.time.start) % (schedule.time.interval * 60)) {
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
            d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        } else {
            d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
        return {y: d.getFullYear(), m: d.getMonth(), d: d.getDate()};
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

    add(schedule, cb) {
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
        sch.id = id;
        sch.cb = cb;
        if (sch.time && sch.time.start) {
            const parts = sch.time.start.split(':');
            sch.time.start = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        }
        if (sch.time && sch.time.end) {
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
            sch.valid.from = sch.period.from && this.string2date(sch.period.from);
            sch.valid.to = sch.period.to && this.string2date(sch.period.to);

            if (this.isPast(context, sch.valid.to)) {
                this.log.warn('End of schedule is in the past');
                return;
            }
            if ((typeof sch.period.days === 'number' && sch.period.days > 1)) {
                sch.valid.fromDate = new Date(sch.valid.from.y, sch.valid.from.M, sch.valid.from.d).getTime();
            } else if (typeof sch.period.weeks === 'number' && sch.period.weeks > 1) {
                sch.valid.fromDate = new Date(sch.valid.from.y, sch.valid.from.M, sch.valid.from.d);
                //sch.valid.fromDate.setDate(-sch.valid.fromDate.getDate() - sch.valid.fromDate.getDay());
                sch.valid.fromDate = sch.valid.fromDate.getTime();
            } else if (typeof sch.period.months === 'number' && sch.period.months > 1) {
                sch.valid.fromDate = new Date(sch.valid.from.y, sch.valid.from.M, sch.valid.from.d);
            } else if (typeof sch.period.years === 'number' && sch.period.years > 1) {
                sch.valid.fromDate = new Date(sch.valid.from.y, sch.valid.from.M, sch.valid.from.d);
            }
        }
        if (sch.period.dows) {
            try {
                sch.period.dows = JSON.parse(sch.period.dows);
            } catch (e) {
                this.log.error('Cannot parse day of weeks: ' + sch.period.dows);
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
        if (this.list[id]) {
            delete this.list[id];
            this.recalculate();
        }
    }

    get(id) {
        return typeof id === 'string' && this.list[id];
    }
}

module.exports = Scheduler;