export type ScriptType = 'Javascript/js' | 'TypeScript/ts' | 'Blockly' | 'Rules';

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
