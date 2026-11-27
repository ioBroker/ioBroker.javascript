/**
 * Everything about recipes that needs no UI: values, params, the stored source, hash and updates.
 */
import { nameToIdPart } from '../scriptNames';
import { neededStates } from './analyze';
import { sha256 } from './sha256';
import { isDefined, parseTemplate } from './template';
import type { I18nText, Recipe, RecipeDevice, RecipeInput, RecipeParam, RecipeValue, ScriptRecipe } from './types';

/** The folder of the scripts made from recipes */
export const RECIPE_FOLDER = 'script.js.Rezepte';

/** A text in the language of the user */
export function i18nText(text: I18nText | undefined, lang: ioBroker.Languages): string {
    if (!text) {
        return '';
    }
    if (typeof text === 'string') {
        return text;
    }
    return text[lang] || text.en || Object.values(text)[0] || '';
}

/** Compares two versions in SemVer form: negative if a is older than b */
export function compareVersions(a: string, b: string): number {
    const parse = (version: string): { parts: number[]; pre: string } => {
        const [main, pre = ''] = String(version || '0').split('-', 2);
        return { parts: main.split('.').map(part => parseInt(part, 10) || 0), pre };
    };
    const va = parse(a);
    const vb = parse(b);
    for (let i = 0; i < 3; i++) {
        const diff = (va.parts[i] || 0) - (vb.parts[i] || 0);
        if (diff) {
            return diff;
        }
    }
    // 1.0.0-beta.1 is older than 1.0.0
    if (va.pre === vb.pre) {
        return 0;
    }
    if (!va.pre) {
        return 1;
    }
    if (!vb.pre) {
        return -1;
    }
    return va.pre < vb.pre ? -1 : 1;
}

/** The values the inputs start with */
export function defaultValues(recipe: Recipe, lang: ioBroker.Languages): Record<string, RecipeValue> {
    const values: Record<string, RecipeValue> = {};
    for (const [name, input] of Object.entries(recipe.inputs)) {
        switch (input.type) {
            case 'device':
                values[name] = input.multiple ? [] : undefined;
                break;
            case 'state':
                values[name] = input.multiple ? [] : undefined;
                break;
            case 'string':
                values[name] = i18nText(input.default, lang);
                break;
            case 'select':
                values[name] = input.default ?? input.options[0]?.value;
                break;
            case 'boolean':
                values[name] = input.default ?? false;
                break;
            default:
                values[name] = input.default;
        }
    }
    return values;
}

/** The inputs that need a value but have none */
export function missingInputs(recipe: Recipe, values: Record<string, RecipeValue>): string[] {
    return Object.entries(recipe.inputs)
        .filter(([name, input]) => !input.optional && !isMultiple(input) && !isDefined(values[name]))
        .map(([name]) => name);
}

/** A list may stay empty */
function isMultiple(input: RecipeInput): boolean {
    return (input.type === 'device' || input.type === 'state') && !!input.multiple;
}

/** What is stored in common.recipe.params: devices only by their ID */
export function paramsOf(recipe: Recipe, values: Record<string, RecipeValue>): Record<string, RecipeParam> {
    const params: Record<string, RecipeParam> = {};
    for (const name of Object.keys(recipe.inputs)) {
        const value = values[name];
        if (value === undefined || value === null || value === '') {
            continue;
        }
        if (Array.isArray(value)) {
            params[name] = (value as (RecipeDevice | string)[]).map(item =>
                typeof item === 'string' ? item : item.id,
            );
        } else if (typeof value === 'object') {
            params[name] = value.id;
        } else {
            params[name] = value;
        }
    }
    return params;
}

/** The ID of the script for a name: script.js.Rezepte.<name> */
export function recipeScriptId(name: string): string {
    return `${RECIPE_FOLDER}.${nameToIdPart(name)}`;
}

/** The source of a Blockly script: the JavaScript and the encoded XML in the last line */
export function blocklySource(js: string, xml: string): string {
    return `${js}\n//${btoa(encodeURIComponent(xml))}`;
}

/**
 * The JavaScript of a Blockly script, without the last line with the Blockly XML. Only this is
 * compared: opening and saving a script in Blockly writes the XML anew (IDs, positions), even if
 * nothing was changed.
 */
export function javascriptOf(source: string): string {
    const text = (source || '').replace(/\r\n?/g, '\n').replace(/\s+$/, '');
    const last = text.lastIndexOf('\n');
    const lastLine = text.slice(last + 1);
    if (lastLine.startsWith('//') && /^\/\/(<xml|[A-Za-z0-9+/=]+$)/.test(lastLine)) {
        return text.slice(0, Math.max(last, 0)).replace(/\s+$/, '');
    }
    return text;
}

/** The hash of common.recipe */
export function sourceHash(source: string): string {
    return sha256(javascriptOf(source));
}

/** Was the script changed since it was made from the recipe? */
export function hasLocalChanges(source: string, info: ScriptRecipe): boolean {
    return sourceHash(source) !== info.hash;
}

/** The newer version of the recipe of a script in the catalog, if there is one */
export function newerRecipe(info: ScriptRecipe | undefined, recipes: Recipe[]): Recipe | null {
    if (!info?.id) {
        return null;
    }
    const recipe = recipes.find(item => item.id === info.id);
    return recipe && compareVersions(recipe.version, info.version) > 0 ? recipe : null;
}

/** A stored param still fits the input, as far as one can tell without the objects */
function paramFits(input: RecipeInput, param: RecipeParam): boolean {
    switch (input.type) {
        case 'device':
        case 'state':
            return input.multiple
                ? Array.isArray(param) && param.every(item => typeof item === 'string')
                : typeof param === 'string' && !!param;
        case 'number':
        case 'duration':
            return (
                typeof param === 'number' &&
                (input.min === undefined || param >= input.min) &&
                (input.max === undefined || param <= input.max)
            );
        case 'boolean':
            return typeof param === 'boolean';
        case 'select':
            return input.options.some(option => option.value === param);
        case 'time':
            return typeof param === 'string' && /^\d{1,2}:\d{2}$/.test(param);
        default:
            return typeof param === 'string';
    }
}

/** What an update to a new version of a recipe does with the stored params */
export interface UpdatePlan {
    /** Values for the inputs other than devices, taken over from the params */
    values: Record<string, RecipeValue>;
    /** Device inputs to the stored IDs, to be detected again */
    devices: Record<string, string | string[]>;
    /** Inputs the user has to fill in: new ones, or ones whose param does not fit any more */
    ask: string[];
    /** Params of inputs the new version does not have any more */
    dropped: string[];
}

export function planUpdate(recipe: Recipe, params: Record<string, RecipeParam>, lang: ioBroker.Languages): UpdatePlan {
    const values = defaultValues(recipe, lang);
    const devices: Record<string, string | string[]> = {};
    const ask: string[] = [];
    for (const [name, input] of Object.entries(recipe.inputs)) {
        const param = params[name];
        if (param === undefined) {
            if (!input.optional && !isMultiple(input) && !isDefined(values[name])) {
                ask.push(name);
            }
            continue;
        }
        if (!paramFits(input, param)) {
            ask.push(name);
            continue;
        }
        if (input.type === 'device') {
            devices[name] = param as string | string[];
        } else {
            values[name] = param;
        }
    }
    const dropped = Object.keys(params).filter(name => !recipe.inputs[name]);
    return { values, devices, ask, dropped };
}

/** The states every device input needs per device type, parsed once per recipe */
const neededCache = new WeakMap<Recipe, Record<string, Record<string, string[]>>>();

export function neededStatesOf(recipe: Recipe): Record<string, Record<string, string[]>> {
    let needed = neededCache.get(recipe);
    if (!needed) {
        needed = neededStates(parseTemplate(recipe.blockly), recipe.inputs);
        neededCache.set(recipe, needed);
    }
    return needed;
}

/** Does a device fit a device input: a type it allows, and all states the recipe needs of that type? */
export function deviceFits(recipe: Recipe, inputName: string, device: RecipeDevice): boolean {
    const needed = neededStatesOf(recipe)[inputName];
    const states = needed?.[device.type];
    return !!states && states.every(state => !!device.states[state]);
}

/** The values to preview a recipe with, before the user chose anything */
export function sampleValues(recipe: Recipe, lang: ioBroker.Languages): Record<string, RecipeValue> {
    const values = defaultValues(recipe, lang);
    const needed = neededStatesOf(recipe);
    for (const [name, input] of Object.entries(recipe.inputs)) {
        const title = i18nText(input.title, lang) || name;
        if (input.type === 'device') {
            const type = Array.isArray(input.deviceType) ? input.deviceType[0] : input.deviceType;
            const states: Record<string, string> = {};
            for (const state of needed[name]?.[type] || []) {
                states[state] = `${title}.${state}`;
            }
            const device: RecipeDevice = { id: title, name: title, type, states };
            values[name] = input.multiple ? [device] : device;
        } else if (input.type === 'state') {
            values[name] = input.optional ? undefined : input.multiple ? [title] : title;
        } else if (!isDefined(values[name])) {
            values[name] = input.type === 'time' ? '00:00' : input.type === 'string' ? title : 0;
        }
    }
    return values;
}
