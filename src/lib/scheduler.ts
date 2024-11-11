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

import {
    GetMoonIlluminationResult,
    GetMoonPositionResult,
    GetMoonTimes,
    GetSunPositionResult,
    GetTimesResult,
} from 'suncalc';

interface SunCalc {
    getTimes: (date: Date, latitude: number, longitude: number, height?: number) => GetTimesResult;
    addTime: (angleInDegrees: number, morningName: string, eveningName: string) => void;
    getPosition: (timeAndDate: Date, latitude: number, longitude: number) => GetSunPositionResult;
    getMoonPosition: (timeAndDate: Date, latitude: number, longitude: number) => GetMoonPositionResult;
    getMoonIllumination: (timeAndDate: Date) => GetMoonIlluminationResult;
    getMoonTimes: (date: Date, latitude: number, longitude: number, inUTC?: boolean) => GetMoonTimes;
}

type AstroEventName =
    | 'dawn'
    | 'dusk'
    | 'goldenHour'
    | 'goldenHourEnd'
    | 'nadir'
    | 'nauticalDawn'
    | 'nauticalDusk'
    | 'night'
    | 'nightEnd'
    | 'solarNoon'
    | 'sunrise'
    | 'sunriseEnd'
    | 'sunset'
    | 'sunsetStart';

type AstroEventNameLow =
    | 'dawn'
    | 'dusk'
    | 'goldenhour'
    | 'goldenhourend'
    | 'nadir'
    | 'nauticaldawn'
    | 'nauticaldusk'
    | 'night'
    | 'nightend'
    | 'solarnoon'
    | 'sunrise'
    | 'sunriseend'
    | 'sunset'
    | 'sunsetstart';

type SchedulerContext = {
    now: number;
    minutesOfDay: number;
    y: number;
    M: number;
    d: number;
    h: number;
    m: number;
    dow: number;
};

export type SchedulerRule = {
    time: {
        start?: string;
        end?: string;
        mode?: 'minutes' | 'hours';
        interval?: number;
        exactTime?: boolean;
    };
    period: {
        once?: string;

        days?: number;
        dows?: string;
        dates?: string;
        weeks?: number;
        months?: string;

        years?: number;
        yearMonth?: number;
        yearDate?: number;
    };
    valid?: {
        from?: string;
        to?: string;
    };
};

type SchedulerRuleParsed = {
    id: string;
    original: string;
    period: {
        fromDate?: Date;
        months?: number | number[];
        days?: number;
        dows?: number[];
        weeks?: number;
        years?: number;
        yearMonth?: number;
        yearDate?: number;
        dates?: number[];
        once?: { y: number; M: number; d: number };
    };
    time?: {
        exactTime: boolean;
        start: number | AstroEventName;
        end: number | AstroEventName;
        mode: 60 | 3600;
        interval: number;
    };
    valid?: {
        from?: { y: number; M: number; d: number };
        to?: { y: number; M: number; d: number };
        fromDate?: number | Date;
    };
    scriptName: string;
    cb: (id: string) => void;
};

export type ScheduleName = {
    id: `schedule_${string}`;
    type: 'schedule';
    schedule: string;
    scriptName: string;
};

export default class Scheduler {
    private readonly list: Record<string, SchedulerRuleParsed>;
    private readonly Date: typeof Date;
    private readonly suncalc: SunCalc;
    private readonly latitude: number;
    private readonly longitude: number;
    private log: {
        debug: (text: string) => void;
        info: (text: string) => void;
        log: (text: string) => void;
        warn: (text: string) => void;
        error: (text: string) => void;
        silly: (text: string) => void;
    };
    private timer: NodeJS.Timeout | null = null;
    private todaysAstroTimes: Record<AstroEventName, Date>;
    private yesterdaysAstroTimes: Record<AstroEventName, Date>;
    private astroList: AstroEventName[] | undefined;
    private astroListLow: AstroEventNameLow[] | undefined;

    constructor(
        log: {
            debug: (text: string) => void;
            info: (text: string) => void;
            log: (text: string) => void;
            warn: (text: string) => void;
            error: (text: string) => void;
            silly: (text: string) => void;
        },
        DateTest: typeof Date | null,
        suncalc: SunCalc,
        latitude: number,
        longitude: number,
    ) {
        this.list = {};
        this.Date = DateTest || Date;
        this.suncalc = suncalc;
        this.latitude = latitude;
        this.longitude = longitude;
        this.log = log || {
            debug: function (text) {
                console.log(text);
            },
            info: function (text) {
                console.log(text);
            },
            log: function (text) {
                console.log(text);
            },
            warn: function (text) {
                console.warn(text);
            },
            error: function (text) {
                console.error(text);
            },
            silly: function (text) {
                console.log(text);
            },
        };

        // this._setAstroVars();
        const todayNoon = new this.Date();
        const yesterdayNoon = new this.Date();
        todayNoon.setHours(12, 0, 0, 0);
        yesterdayNoon.setHours(-12, 0, 0, 0);
        this.todaysAstroTimes = this.suncalc.getTimes(todayNoon, this.latitude, this.longitude);
        this.yesterdaysAstroTimes = this.suncalc.getTimes(yesterdayNoon, this.latitude, this.longitude);

        this.astroList = [
            'dawn',
            'dusk',
            'goldenHour',
            'goldenHourEnd',
            'nadir',
            'nauticalDawn',
            'nauticalDusk',
            'night',
            'nightEnd',
            'solarNoon',
            'sunrise',
            'sunriseEnd',
            'sunset',
            'sunsetStart',
        ];
        this.astroListLow = [
            'dawn',
            'dusk',
            'goldenhour',
            'goldenhourend',
            'nadir',
            'nauticaldawn',
            'nauticaldusk',
            'night',
            'nightend',
            'solarnoon',
            'sunrise',
            'sunriseend',
            'sunset',
            'sunsetstart',
        ];
    }

    _getId() {
        return `${Math.round(Math.random() * 1000000)}.${this.Date.now()}`;
    }

    recalculate(): void {
        const count = Object.keys(this.list).length;
        if (count && !this.timer) {
            const d = new this.Date();
            d.setMilliseconds(2); // 2 ms to be sure that the next second is reached, they do not hurt anyone
            d.setSeconds(0);
            d.setMinutes(d.getMinutes() + 1);
            this.timer = setTimeout(
                notBefore => this.checkSchedules(notBefore),
                d.getTime() - this.Date.now(),
                d.getTime(),
            );
        } else if (!count && this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    getContext(): SchedulerContext {
        const now = new this.Date();
        return {
            now: now.getTime(),
            minutesOfDay: now.getHours() * 60 + now.getMinutes(),
            y: now.getFullYear(),
            M: now.getMonth(),
            d: now.getDate(),
            h: now.getHours(),
            m: now.getMinutes(),
            dow: now.getDay(),
        };
    }

    checkSchedules(notBeforeTime?: number): void {
        const context = this.getContext();

        // Work around for not those precise RTCs in some system
        if (notBeforeTime !== undefined && context.now < notBeforeTime) {
            this.timer = setTimeout(
                notBefore => this.checkSchedules(notBefore),
                notBeforeTime - this.Date.now(),
                notBeforeTime,
            );
            return;
        }

        for (const id in this.list) {
            if (!Object.prototype.hasOwnProperty.call(this.list, id)) {
                continue;
            }
            if (this.checkSchedule(context, this.list[id])) {
                setImmediate(id => this.list[id] && typeof this.list[id].cb === 'function' && this.list[id].cb(id), id);
            }
        }

        const d = new this.Date();
        d.setMilliseconds(2); // 2 ms to be sure that the next second is reached, they do not hurt anyone
        d.setSeconds(0);
        d.setMinutes(d.getMinutes() + 1);
        this.timer = setTimeout(
            notBefore => this.checkSchedules(notBefore),
            d.getTime() - this.Date.now(),
            d.getTime(),
        );
    }

    monthDiff(d1: Date, d2: Date): number {
        let months: number;
        months = (d2.getFullYear() - d1.getFullYear()) * 12;
        months -= d1.getMonth() + 1;
        months += d2.getMonth();
        return months <= 0 ? 0 : months;
    }

    checkSchedule(context: SchedulerContext, schedule: SchedulerRuleParsed) {
        if (schedule.valid) {
            if (
                schedule.valid.from &&
                !this.isPast(context, schedule.valid.from) &&
                !this.isToday(context, schedule.valid.from)
            ) {
                return;
            }
            // "to" this.Date is in the past => delete it from a list
            if (schedule.valid.to && this.isPast(context, schedule.valid.to)) {
                delete this.list[schedule.id];
                return;
            }
        }
        if (schedule.period) {
            if (schedule.period.once && !this.isToday(context, schedule.period.once)) {
                if (this.isPast(context, schedule.period.once)) {
                    delete this.list[schedule.id];
                }
                return;
            } else if (schedule.period.days) {
                if (schedule.period.dows && !schedule.period.dows.includes(context.dow)) {
                    return;
                } else if (schedule.period.days > 1) {
                    // @ts-expect-error period of days cannot be without valid fromDate
                    const diff = Math.round((context.now - schedule.valid.fromDate) / (60000 * 24) + 0.5);
                    if (diff % schedule.period.days) {
                        return;
                    }
                }
            } else if (schedule.period.weeks) {
                if (schedule.period.dows && !schedule.period.dows.includes(context.dow)) {
                    return;
                }
                if (schedule.period.weeks > 1) {
                    // @ts-expect-error period of weeks cannot be without valid fromDate
                    const diff = Math.round((context.now - schedule.valid.fromDate) / (60000 * 24 * 7) + 0.5);
                    if (diff % schedule.period.weeks) {
                        return;
                    }
                }
            } else if (schedule.period.months) {
                if (Array.isArray(schedule.period.months) && !schedule.period.months.includes(context.M)) {
                    return;
                }
                if (
                    schedule.period.fromDate &&
                    typeof schedule.period.months === 'number' &&
                    schedule.period.months > 1
                ) {
                    const diff = this.monthDiff(schedule.period.fromDate, new this.Date(context.now));
                    if (diff % schedule.period.months) {
                        return;
                    }
                }
                if (schedule.period.dates && !schedule.period.dates.includes(context.d)) {
                    return;
                }
            } else if (schedule.period.years) {
                if (schedule.period.yearMonth !== undefined && schedule.period.yearMonth !== context.M) {
                    return;
                }
                if (schedule.period.yearDate && schedule.period.yearDate !== context.d) {
                    return;
                }
                if (
                    schedule.period.fromDate &&
                    typeof schedule.period.years === 'number' &&
                    schedule.period.years > 1
                ) {
                    const diff = Math.floor(this.monthDiff(schedule.period.fromDate, new this.Date(context.now)) / 12);
                    if (diff % schedule.period.years) {
                        return;
                    }
                }
            }
        }

        if (schedule.time) {
            let start: number;
            let end: number;
            const now = new this.Date(context.now);
            if (now.getDate() !== this.todaysAstroTimes.sunrise.getDate()) {
                this._setAstroVars();
            }
            if (typeof schedule.time.start === 'string') {
                const astroNameStart = this._getAstroName(schedule.time.start);
                if (astroNameStart) {
                    let times = this.todaysAstroTimes;

                    if (times[astroNameStart].getDate() !== now.getDate()) {
                        times = this.yesterdaysAstroTimes;
                    }
                    const startDate: Date = times[astroNameStart];
                    start = startDate.getHours() * 60 + startDate.getMinutes();
                } else {
                    this.log.error(`unknown astro event "${schedule.time.start}"`);
                    return;
                }
            } else {
                start = schedule.time.start;
            }
            if (typeof schedule.time.end === 'string') {
                const astroNameEnd = this._getAstroName(schedule.time.end);
                if (astroNameEnd) {
                    let times = this.todaysAstroTimes;
                    if (times[astroNameEnd].getDate() !== now.getDate()) {
                        times = this.yesterdaysAstroTimes;
                    }
                    const endDate: Date = times[astroNameEnd];
                    end = endDate.getHours() * 60 + endDate.getMinutes();
                } else {
                    this.log.error(`unknown astro event "${schedule.time.end}"`);
                    return;
                }
            } else {
                end = schedule.time.end;
            }

            start = start || 0;
            end = end || 60 * 24;

            if (schedule.time.exactTime) {
                if (context.minutesOfDay !== start) {
                    return;
                }
            } else {
                if (start >= context.minutesOfDay || (end && end < context.minutesOfDay)) {
                    return;
                }
                if (schedule.time.mode === 60) {
                    if (schedule.time.interval > 1 && (context.minutesOfDay - start) % schedule.time.interval) {
                        return;
                    }
                } else if (schedule.time.mode === 3600) {
                    if ((context.minutesOfDay - start) % (schedule.time.interval * 60)) {
                        return;
                    }
                }
            }
        }
        return true;
    }

    string2date(date: string): { y: number; M: number; d: number } {
        let parts = date.split('.');
        let d: Date;
        if (parts.length !== 3) {
            parts = date.split('-');
            d = new this.Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        } else {
            d = new this.Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
        return { y: d.getFullYear(), M: d.getMonth(), d: d.getDate() };
    }

    isPast(context: SchedulerContext, date: { y: number; M: number; d: number } | undefined): boolean {
        if (date) {
            if (date.y < context.y) {
                return true;
            }
            if (date.y === context.y) {
                if (date.M < context.M) {
                    return true;
                }
                if (date.M === context.M) {
                    if (date.d < context.d) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    isToday(context: SchedulerContext, date: { y: number; M: number; d: number }): boolean {
        return date && date.y === context.y && date.M === context.M && date.d === context.d;
    }

    add(schedule: SchedulerRule | string, scriptName: string, cb: (id: string) => void): string | null {
        let oSchedule: SchedulerRule;
        if (typeof schedule === 'string') {
            try {
                oSchedule = JSON.parse(schedule);
            } catch (e) {
                this.log.error(`Cannot parse schedule: ${schedule}`);
                return null;
            }
        } else {
            oSchedule = schedule;
        }

        const id = this._getId();
        if (typeof oSchedule !== 'object' || !oSchedule.period) {
            this.log.error(`Invalid schedule structure: ${JSON.stringify(oSchedule)}`);
            return null;
        }
        const context = this.getContext();
        const sch: SchedulerRuleParsed = JSON.parse(JSON.stringify(oSchedule));
        sch.scriptName = scriptName;
        sch.original = JSON.stringify(oSchedule);
        sch.id = id;
        sch.cb = cb;

        if (oSchedule.time?.start) {
            const astroNameStart = this._getAstroName(oSchedule.time.start);
            if (astroNameStart && sch.time) {
                sch.time.start = astroNameStart;
            } else if (oSchedule.time.start.includes(':')) {
                const parts = oSchedule.time.start.split(':');
                if (sch.time) {
                    sch.time.start = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                }
            } else {
                this.log.error(`unknown astro event "${oSchedule.time.start}"`);
                return null;
            }
        }

        if (oSchedule.time?.end) {
            const astroNameEnd = this._getAstroName(oSchedule.time.end);
            if (astroNameEnd && sch.time) {
                sch.time.end = astroNameEnd;
            } else if (oSchedule.time.end.includes(':')) {
                const parts = oSchedule.time.end.split(':');
                if (sch.time) {
                    sch.time.end = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                }
            } else {
                this.log.error(`unknown astro event "${oSchedule.time.end}"`);
                return null;
            }
        }

        if (sch.time) {
            if (oSchedule.time.mode === 'minutes') {
                sch.time.mode = 60;
            } else if (oSchedule.time.mode === 'hours') {
                sch.time.mode = 3600;
            }
        }

        if (oSchedule.period.once) {
            sch.period.once = this.string2date(oSchedule.period.once);
        }

        if (oSchedule.valid && sch.valid) {
            if (oSchedule.valid.from) {
                sch.valid.from = this.string2date(oSchedule.valid.from);
            }
            if (oSchedule.valid.to) {
                sch.valid.to = this.string2date(oSchedule.valid.to);
            }

            if (this.isPast(context, sch.valid.to)) {
                this.log.warn('End of schedule is in the past');
                return null;
            }

            if (typeof oSchedule.period.days === 'number' && oSchedule.period.days > 1 && sch.valid.from) {
                // fromDate must be unix time
                sch.valid.fromDate = new this.Date(sch.valid.from.y, sch.valid.from.M, sch.valid.from.d).getTime();
            } else if (typeof oSchedule.period.weeks === 'number' && oSchedule.period.weeks > 1) {
                const fromDate: Date = sch.valid.from
                    ? new this.Date(sch.valid.from.y, sch.valid.from.M, sch.valid.from.d)
                    : new this.Date();
                //sch.valid.fromDate.setDate(-sch.valid.fromDate.getDate() - sch.valid.fromDate.getDay());
                // fromDate must be unix time
                sch.valid.fromDate = fromDate.getTime();
            } else if (sch.valid.from && typeof oSchedule.period.months === 'number' && oSchedule.period.months > 1) {
                // fromDate must be object
                sch.valid.fromDate = new this.Date(sch.valid.from.y, sch.valid.from.M, sch.valid.from.d);
            } else if (sch.valid.from && typeof oSchedule.period.years === 'number' && oSchedule.period.years > 1) {
                // fromDate must be object
                sch.valid.fromDate = new this.Date(sch.valid.from.y, sch.valid.from.M, sch.valid.from.d);
            }
        }
        if (
            sch.period &&
            ((typeof sch.period.days === 'number' && sch.period.days > 1) ||
                (typeof sch.period.weeks === 'number' && sch.period.weeks > 1) ||
                (typeof sch.period.months === 'number' && sch.period.months > 1) ||
                (typeof sch.period.years === 'number' && sch.period.years > 1)) &&
            (!sch.valid || !sch.valid.fromDate)
        ) {
            this.log.warn(
                'Invalid Schedule definition: Period day/weeks/months/years only allowed with a valid.from date!',
            );
            return null;
        }

        if (oSchedule.period.dows) {
            try {
                sch.period.dows = JSON.parse(oSchedule.period.dows);
            } catch (e) {
                this.log.error(`Cannot parse day of weeks: ${sch.period.dows}`);
                return null;
            }
            if (!Array.isArray(sch.period.dows)) {
                this.log.error(`day of weeks is no array: ${JSON.stringify(sch.period.dows)}`);
                return null;
            }
        }

        if (oSchedule.period.months && typeof oSchedule.period.months !== 'number') {
            // can be number or array-string
            try {
                sch.period.months = JSON.parse(oSchedule.period.months) as number[];
            } catch (e) {
                this.log.error(`Cannot parse day of months: ${sch.period.months}`);
                return null;
            }
            sch.period.months = sch.period.months.map(m => m - 1);
        }

        if (oSchedule.period.dates) {
            try {
                sch.period.dates = JSON.parse(oSchedule.period.dates) as number[];
            } catch (e) {
                this.log.error(`Cannot parse day of dates: ${sch.period.dates}`);
                return null;
            }
        }
        if (oSchedule.period.yearMonth) {
            sch.period.yearMonth = oSchedule.period.yearMonth - 1;
        }
        this.list[id] = sch;
        this.recalculate();
        return id;
    }

    remove(id: string | ScheduleName) {
        if (
            typeof id === 'object' &&
            id.type === 'schedule' &&
            typeof id.id === 'string' &&
            id.id.startsWith('schedule_')
        ) {
            if (this.list[id.id.substring('schedule_'.length)]) {
                delete this.list[id.id.substring('schedule_'.length)];
                this.recalculate();
                return true;
            }
            return false;
        }
        if (typeof id === 'string' && this.list[id]) {
            delete this.list[id];
            this.recalculate();
            return true;
        }
        return false;
    }

    getList(): ScheduleName[] {
        return Object.keys(this.list).map(id => ({
            id: `schedule_${id}`,
            type: 'schedule',
            schedule: this.list[id].original,
            scriptName: this.list[id].scriptName,
        }));
    }

    get(id: string | ScheduleName): SchedulerRuleParsed | null {
        if (
            id &&
            typeof id === 'object' &&
            id.type === 'schedule' &&
            typeof id.id === 'string' &&
            id.id.startsWith('schedule_')
        ) {
            return this.list[id.id.substring('schedule_'.length)];
        }
        if (typeof id === 'string') {
            return this.list[id];
        }
        return null;
    }

    private _setAstroVars(): void {
        const todayNoon = new this.Date();
        const yesterdayNoon = new this.Date();
        todayNoon.setHours(12, 0, 0, 0);
        yesterdayNoon.setHours(-12, 0, 0, 0);
        this.todaysAstroTimes = this.suncalc.getTimes(todayNoon, this.latitude, this.longitude);
        this.yesterdaysAstroTimes = this.suncalc.getTimes(yesterdayNoon, this.latitude, this.longitude);
    }

    private _getAstroName(evt: string): AstroEventName | null {
        if (typeof evt === 'string') {
            const pos = (this.astroListLow as string[]).indexOf(evt.toLowerCase() as AstroEventNameLow);
            if (pos > -1) {
                return (this.astroList as string[])[pos] as AstroEventName;
            }
        }
        return null;
    }
}
