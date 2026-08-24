/**
 * Helpers shared by the converted block modules.
 */
import type { Block, Connection } from 'blockly/core';
import { javascriptGenerator } from 'blockly/javascript';

/**
 * Reconnects a saved child connection to a named input - the former
 * `Blockly.icons.MutatorIcon.reconnect()`, which Blockly 13 removed. Every mutator that rebuilds
 * its inputs in `compose()` needs it; without it, editing the mutator throws.
 *
 * @param connectionChild The connection on the child block, saved by `saveConnections`
 * @param block The block whose input the child belongs to
 * @param inputName Name of that input
 * @returns whether the child had to be reconnected
 */
export function reconnectChild(
    connectionChild: Connection | null | undefined,
    block: Block,
    inputName: string,
): boolean {
    if (!connectionChild?.getSourceBlock().workspace) {
        return false;
    }

    const connectionParent = block.getInput(inputName)?.connection;
    if (!connectionParent) {
        return false;
    }

    const currentParent = connectionChild.targetBlock();
    if ((!currentParent || currentParent === block) && connectionParent.targetConnection !== connectionChild) {
        if (connectionParent.isConnected()) {
            connectionParent.disconnect();
        }
        connectionParent.connect(connectionChild);
        return true;
    }

    return false;
}

/**
 * Quotes a string for the generated code.
 *
 * `quote_` is not part of the generator's public typings, but it is what the legacy block files
 * used, and it handles the escaping the generated scripts rely on.
 *
 * @param text The string to quote
 */
export function quote(text: string): string {
    return (javascriptGenerator as unknown as { quote_: (value: string) => string }).quote_(text);
}

/**
 * The date format entries of `Blockly.Words` carry their pattern in an extra `format` property,
 * which `blocks_time.ts` fills in.
 *
 * @param word The translation key
 */
export function dateFormat(word: string): string {
    return window.Blockly.Words[word].format as string;
}

/**
 * The shared option list of the date formatting dropdowns - `time_get` and `convert_from_date`
 * offer exactly the same choices.
 */
export function dateFormatOptions(): [string, string][] {
    const translate = window.Blockly.Translate;
    const named: string[] = ['object', 'ms', 's', 'sid', 'm', 'mid', 'h', 'd', 'M', 'Mt', 'Mts', 'y', 'fy', 'wdt', 'wdts', 'wd', 'cw', 'custom'];
    const patterns: string[] = [
        'time_get_yyyy.mm.dd',
        'time_get_yyyy/mm/dd',
        'time_get_yy.mm.dd',
        'time_get_yy/mm/dd',
        'time_get_dd.mm.yyyy',
        'time_get_dd/mm/yyyy',
        'time_get_dd.mm.yy',
        'time_get_dd/mm/yy',
        'time_get_mm/dd/yyyy',
        'time_get_mm/dd/yy',
        'time_get_dd.mm',
        'time_get_dd/mm',
        'time_get_mm.dd',
        'time_get_mm/dd',
        'time_get_hh_mm',
        'time_get_hh_mm_ss',
        'time_get_hh_mm_ss.sss',
    ];

    return [
        ...named.map((option): [string, string] => [translate(`time_get_${option}`), option]),
        ...patterns.map((word): [string, string] => [translate(word), dateFormat(word)]),
    ];
}

/** The languages the weekday and month-name formats can be rendered in, most likely one first */
export function dateLanguageOptions(): [string, string][] {
    const english: [string, string] = ['in english', 'en'];
    const german: [string, string] = ['auf deutsch', 'de'];
    const russian: [string, string] = ['на русском', 'ru'];

    if (window.systemLang === 'de') {
        return [german, english, russian];
    }
    if (window.systemLang === 'ru') {
        return [russian, english, german];
    }
    return [english, german, russian];
}

/** `true` for every spelling of true the mutation attributes, checkboxes and fields use */
export function isTrue(value: unknown): boolean {
    return value === true || value === 'true' || value === 'TRUE';
}

/** The log level choices the action and sendTo blocks offer */
export function logLevelOptions(): [string, string][] {
    const translate = window.Blockly.Translate;

    return [
        [translate('loglevel_none'), ''],
        [translate('loglevel_debug'), 'debug'],
        [translate('loglevel_info'), 'info'],
        [translate('loglevel_warn'), 'warn'],
        [translate('loglevel_error'), 'error'],
    ];
}

/**
 * Adds a statement input when the "with results" checkbox is ticked, removes it otherwise.
 *
 * @param block The block to reshape
 * @param withStatement The new checkbox state; read off the block when omitted
 */
export function updateStatementInput(block: Block, withStatement?: boolean): void {
    const show = withStatement === undefined ? isTrue(block.getFieldValue('WITH_STATEMENT')) : withStatement;

    if (block.getInput('STATEMENT')) {
        block.removeInput('STATEMENT');
    }

    if (show) {
        block.appendStatementInput('STATEMENT');
    }
}

/**
 * Warns on a block that only makes sense inside one of the given blocks - the result blocks of
 * `exec`, `httpGet` and `readFile` all do this.
 *
 * @param block The block to check
 * @param parentTypes Types it may be nested in
 * @param warning Translation key of the warning
 */
export function warnIfNotNestedIn(block: Block, parentTypes: string[], warning: string): void {
    let legal = false;
    let current: Block | null = block;

    do {
        if (parentTypes.includes(current.type)) {
            legal = true;
            break;
        }
        current = current.getSurroundParent();
    } while (current);

    block.setWarningText(legal ? null : window.Blockly.Translate(warning), block.id);
}

/**
 * The name of the object a generated call refers to, for the comment behind it.
 *
 * @param code The generated code of the object ID, e.g. `'javascript.0.myScript'`
 */
export function objectNameOf(code: string): string {
    try {
        // eslint-disable-next-line no-eval
        const objId = eval(code) as string; // Code to string
        let name: any = window.main?.objects[objId]?.common?.name || '';
        if (typeof name === 'object') {
            name = name[window.systemLang] || name.en;
        }
        return name || '';
    } catch {
        return '';
    }
}

/**
 * Milliseconds for a delay given in one of the `ms` / `sec` / `min` units the blocks offer.
 *
 * @param value The delay as the field holds it
 * @param unit The selected unit
 */
export function toMilliseconds(value: string, unit: string): number {
    const number = parseFloat(value);

    if (unit === 'min') {
        return number * 60000;
    }
    if (unit === 'sec') {
        return number * 1000;
    }
    return number;
}

/**
 * The name of an object for the comment behind a generated call, looked up by its plain ID.
 *
 * Unlike `objectNameOf()` this takes the ID itself, not the generated code of it.
 *
 * @param id The object ID
 */
export function objectNameById(id: string): string {
    let name: any = window.main?.objects[id]?.common?.name || '';

    if (typeof name === 'object') {
        name = name[window.systemLang] || name.en;
    }

    return name || '';
}

/**
 * Warns when a trigger block sits inside another trigger or a loop, where it would be registered
 * over and over again. The list of offending parents is `Blockly.Trigger.WARNING_PARENTS`.
 *
 * @param block The trigger block to check
 */
export function warnIfInsideTrigger(block: Block): void {
    let parent = block.getSurroundParent();

    while (parent) {
        if (window.Blockly.Trigger.WARNING_PARENTS.includes(parent.type)) {
            block.setWarningText(window.Blockly.Translate('trigger_in_trigger_warning'), block.id);
            return;
        }
        parent = parent.getSurroundParent();
    }

    block.setWarningText(null, block.id);
}

/**
 * The variable model of a block that owns a named resource (timer, interval, schedule) without a
 * real workspace variable behind it. Blockly 13 reads variable models through methods -
 * `Xml.variablesToDom` calls `getName`/`getType`/`getId` when the workspace is serialized for
 * saving, so a model without them kills the save (issue #2349). The bare `name`/`type`
 * properties stay for adapter block files written against the Blockly 11 shape.
 */
export type NamedResourceVariableModel = {
    getId: () => string;
    getName: () => string;
    getType: () => string;
    name: string;
    type: string;
};

/**
 * Builds the variable model for one named resource.
 *
 * @param name The name the user gave the timer/interval/schedule
 * @param type The variable type the legacy scripts stored these under
 */
export function namedResourceVariableModel(name: string, type: string): NamedResourceVariableModel {
    return { getId: () => name, getName: () => name, getType: () => type, name, type };
}
