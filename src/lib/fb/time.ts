/**
 * Times as the diagrams write them: durations in ms, and times of day as ms since midnight.
 *
 * Here and not in the generator, because the blocks convert with them too (TO_TIME).
 */
import type { FbValue } from './types';

const TIME_UNITS: Record<string, number> = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 };

/** ms of a day */
export const DAY_MS = TIME_UNITS.d;

/**
 * A time in ms. Takes a number of ms, a text like `2s`, `1m30s`, `500ms` or `T#2s` (IEC), or a time
 * of day like `08:30` or `TOD#22:15:30` - as the time since midnight. Returns `null` if the text is
 * not a time.
 */
export function parseTime(value: FbValue | null | undefined): number | null {
    if (typeof value === 'number') {
        return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
    }
    if (typeof value !== 'string') {
        return null;
    }
    let text = value.trim().toLowerCase().replace(/_/g, '');
    if (/^(t|time|tod|timeofday)#/.test(text)) {
        text = text.substring(text.indexOf('#') + 1);
    }
    if (!text) {
        return null;
    }
    const clock = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (clock) {
        const [hours, minutes, seconds] = [clock[1], clock[2], clock[3] || '0'].map(Number);
        return minutes < 60 && seconds < 60 ? ((hours * 60 + minutes) * 60 + seconds) * 1000 : null;
    }
    if (/^\d+(\.\d+)?$/.test(text)) {
        return Math.round(Number(text));
    }
    const parts = text.match(/(\d+(?:\.\d+)?)(ms|s|m|h|d)/g);
    if (!parts || parts.join('') !== text) {
        return null;
    }
    return Math.round(
        parts.reduce((sum, part) => {
            const [, number, unit] = part.match(/(\d+(?:\.\d+)?)(ms|s|m|h|d)/)!;
            return sum + Number(number) * TIME_UNITS[unit];
        }, 0),
    );
}

/** A time for people: `1500` gives `1.5s`, `5400000` gives `1h30m` */
export function formatTime(ms: number): string {
    if (!ms) {
        return '0ms';
    }
    if (ms < TIME_UNITS.m) {
        return ms >= 1000 ? `${Math.round(ms / 100) / 10}s` : `${Math.round(ms)}ms`;
    }
    // from a minute on in parts: 1h30m, 2d4h, 1m30.5s
    let rest = Math.round(ms);
    const parts: string[] = [];
    for (const unit of ['d', 'h', 'm'] as const) {
        const count = Math.floor(rest / TIME_UNITS[unit]);
        if (count) {
            parts.push(`${count}${unit}`);
            rest -= count * TIME_UNITS[unit];
        }
    }
    if (rest) {
        parts.push(rest % 1000 ? `${Math.round(rest / 100) / 10}s` : `${rest / 1000}s`);
    }
    return parts.join('');
}

/** A time of day for people: `30600000` gives `08:30`, with seconds only when there are some */
export function formatClock(ms: number): string {
    const total = Math.round((((ms % DAY_MS) + DAY_MS) % DAY_MS) / 1000);
    const pad = (n: number): string => String(n).padStart(2, '0');
    const text = `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}`;
    return total % 60 ? `${text}:${pad(total % 60)}` : text;
}
