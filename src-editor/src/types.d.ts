export type ScriptType = 'Javascript/js' | 'TypeScript/ts' | 'Blockly' | 'Rules';

export type LogMessage = {
    message: string;
    from: string;
    ts: number;
    severity: ioBroker.LogLevel;
};
