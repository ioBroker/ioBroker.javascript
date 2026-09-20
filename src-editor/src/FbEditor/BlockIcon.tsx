import React from 'react';

import {
    AccessTime as IconClock,
    Code as IconJs,
    DateRange as IconTimeWindow,
    EventRepeat as IconSchedule,
    Extension as IconUser,
    Flare as IconBlink,
    NotificationsActive as IconNotify,
    Send as IconSendTo,
    WbTwilight as IconAstro,
    HourglassBottom as IconPulse,
    Login as IconStateIn,
    Logout as IconStateOut,
    PushPin as IconConst,
    ShowChart as IconFilter,
    StickyNote2 as IconComment,
    Thermostat as IconHysteresis,
    Timer as IconTimer,
    TimerOff as IconTimerOff,
    TrendingUp as IconRamp,
    Tune as IconPid,
    Input as IconPinIn,
    Notes as IconLog,
    Output as IconPinOut,
} from '@mui/icons-material';

import { FB_USER_PREFIX } from '@fb-core';

/** The symbols of IEC 61131-3 where there is one, the sign of the operation otherwise */
const GLYPHS: Record<string, string> = {
    AND: '&',
    OR: '≥1',
    XOR: '=1',
    NOT: '¬',
    RS: 'RS',
    SR: 'SR',
    R_TRIG: '↑',
    F_TRIG: '↓',
    GT: '>',
    GE: '≥',
    LT: '<',
    LE: '≤',
    EQ: '=',
    NE: '≠',
    ADD: '+',
    SUB: '−',
    MUL: '×',
    DIV: '÷',
    MIN: 'min',
    MAX: 'max',
    ROUND: '≈',
    CTU: '+1',
    CTD: '−1',
    CTUD: '±1',
    TO_BOOL: '0/1',
    TO_INT: '123',
    TO_REAL: '1.5',
    TO_TIME: 'ms',
    TO_STRING: 'abc',
    CONCAT: 'a+b',
};

const ICONS: Record<string, typeof IconTimer> = {
    STATE_IN: IconStateIn,
    STATE_OUT: IconStateOut,
    CONST: IconConst,
    LOG: IconLog,
    NOTIFY: IconNotify,
    SENDTO: IconSendTo,
    CLOCK: IconClock,
    TIMEWINDOW: IconTimeWindow,
    SCHEDULE: IconSchedule,
    ASTRO: IconAstro,
    BLINK: IconBlink,
    JS: IconJs,
    TON: IconTimer,
    TOF: IconTimerOff,
    TP: IconPulse,
    HYST: IconHysteresis,
    RAMP: IconRamp,
    PT1: IconFilter,
    PID: IconPid,
    FB_IN: IconPinIn,
    FB_OUT: IconPinOut,
    comment: IconComment,
};

/** The small sign of a block type, in the palette and in the head of a block */
export default function BlockIcon(props: { type: string; color?: string }): React.JSX.Element {
    const Icon = props.type.startsWith(FB_USER_PREFIX) ? IconUser : ICONS[props.type];
    if (Icon) {
        return (
            <Icon
                className="fb-icon"
                style={{ color: props.color }}
            />
        );
    }
    return (
        <span
            className="fb-icon fb-icon-glyph"
            style={{ color: props.color }}
        >
            {GLYPHS[props.type] || '?'}
        </span>
    );
}
