import type { AstroEvent } from '../../src/lib/consts';

export type ScriptType = 'Javascript/js' | 'TypeScript/ts' | 'Blockly' | 'Rules';

export interface JavaScriptAdapterConfig {
    latitude: number;
    longitude: number;
    enableSetObject: boolean;
    enableSendToHost: boolean;
    enableExec: boolean;
    libraries: string;
    libraryTypings: string;
    subscribe: boolean;
    useSystemGPS: true;
    mirrorPath: string;
    mirrorInstance: number;
    allowSelfSignedCerts: boolean;
    sunriseEvent: AstroEvent;
    sunriseOffset: number;
    sunriseLimitStart: string;
    sunriseLimitEnd: string;
    sunsetEvent: AstroEvent;
    sunsetOffset: number;
    sunsetLimitStart: string;
    sunsetLimitEnd: string;
    createAstroStates: boolean;
    maxSetStatePerMinute: number;
    maxTriggersPerScript: number;
    gptKey: string;
    password?: string;
}

export type LogMessage = {
    message: string;
    from: string;
    ts: number;
    severity: ioBroker.LogLevel;
};

type AstroTime = {
    isValidDate: boolean;
    serverTime: string;
    date: string;
};

export type AstroTimes = Record<string, AstroTime>;
/* interface AstroTimes {
    dawn: AstroTime;
    dusk: AstroTime;
    goldenHour: AstroTime;
    goldenHourEnd: AstroTime;
    nadir: AstroTime;
    nauticalDawn: AstroTime;
    nauticalDusk: AstroTime;
    night: AstroTime;
    nightEnd: AstroTime;
    solarNoon: AstroTime;
    sunrise: AstroTime;
    sunriseEnd: AstroTime;
    sunset: AstroTime;
    sunsetStart: AstroTime;
    nextSunrise: AstroTime;
    nextSunset: AstroTime;
}*/
