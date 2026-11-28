/**
 * "Export as recipe": the IDs a Blockly script uses become inputs, the rest stays as it is.
 */
import { deviceOfState, type ObjectMap } from './devices';
import type { I18nText, Recipe, RecipeInput } from './types';

/** One ID the script uses, and what it would become */
export interface ExportItem {
    id: string;
    /** Make it an input; else the ID stays in the recipe as it is */
    use: boolean;
    /** The name of the input */
    input: string;
    kind: 'device' | 'state';
    /** If the type-detector knows the device of the state */
    device?: { id: string; name: string; type: string; state: string };
    /** Of the state object */
    role?: string;
    commonType?: ioBroker.CommonType;
    name: string;
}

const FIELD_RE = /<field\b[^>]*>([^<]*)<\/field>/g;

function unescapeXml(text: string): string {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&');
}

/** The IDs of objects that the Blockly XML names in its fields, in order of appearance */
export function usedIds(xml: string, objects: ObjectMap): string[] {
    const ids: string[] = [];
    for (const match of xml.matchAll(FIELD_RE)) {
        const text = unescapeXml(match[1]).trim();
        if (text && objects[text]?.type === 'state' && !ids.includes(text)) {
            ids.push(text);
        }
    }
    return ids;
}

/** A name for an input, from the name of an object: "Lamp living room" becomes lampLivingRoom */
export function inputName(text: string, taken: string[]): string {
    const words = text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/ß/g, 'ss')
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean);
    let name = words
        .map((word, i) => (i ? word[0].toUpperCase() + word.slice(1) : word[0].toLowerCase() + word.slice(1)))
        .join('');
    if (!/^[A-Za-z_]/.test(name)) {
        name = `input${name}`;
    }
    let unique = name;
    for (let i = 2; taken.includes(unique); i++) {
        unique = `${name}${i}`;
    }
    return unique;
}

function objectName(objects: ObjectMap, id: string, lang: ioBroker.Languages): string {
    const name = objects[id]?.common?.name as ioBroker.StringOrTranslated | undefined;
    const text = name && typeof name === 'object' ? name[lang] || name.en : name;
    return (text || id.split('.').pop() || id).toString();
}

/** What each used ID would become: states of one device share one device input */
export function suggestItems(xml: string, objects: ObjectMap, lang: ioBroker.Languages): ExportItem[] {
    const items: ExportItem[] = [];
    const deviceInputs = new Map<string, string>();
    const taken: string[] = [];
    for (const id of usedIds(xml, objects)) {
        const common = objects[id].common as ioBroker.StateCommon;
        const found = deviceOfState(objects, id, lang);
        let input: string;
        if (found) {
            input = deviceInputs.get(found.device.id) || inputName(found.device.name, taken);
            deviceInputs.set(found.device.id, input);
        } else {
            input = inputName(objectName(objects, id, lang), taken);
        }
        if (!taken.includes(input)) {
            taken.push(input);
        }
        items.push({
            id,
            use: true,
            input,
            kind: found ? 'device' : 'state',
            device: found
                ? { id: found.device.id, name: found.device.name, type: found.device.type, state: found.state }
                : undefined,
            role: common.role,
            commonType: common.type,
            name: objectName(objects, id, lang),
        });
    }
    return items;
}

/** What is wrong with the chosen inputs; empty if nothing */
export function checkItems(items: ExportItem[]): string[] {
    const errors: string[] = [];
    const byInput = new Map<string, ExportItem[]>();
    for (const item of items.filter(i => i.use)) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(item.input)) {
            errors.push(`"${item.input}": letters, digits and _ only, not starting with a digit`);
        }
        byInput.set(item.input, [...(byInput.get(item.input) || []), item]);
    }
    for (const [name, list] of byInput) {
        if (list.length < 2) {
            continue;
        }
        const devices = new Set(list.map(item => (item.kind === 'device' ? item.device?.id : `state:${item.id}`)));
        if (devices.size > 1) {
            errors.push(`"${name}" is used for different devices or states`);
        }
    }
    return errors;
}

export interface ExportMeta {
    id: string;
    title: { en: string; de: string };
    description: { en: string; de: string };
    author: string;
    minJavascript: string;
}

/** The recipe: the chosen IDs replaced by placeholders, one input per device or state */
export function buildRecipe(xml: string, items: ExportItem[], meta: ExportMeta): Recipe & { $schema: string } {
    const inputs: Record<string, RecipeInput> = {};
    const replace = new Map<string, string>();
    for (const item of items.filter(i => i.use)) {
        const title: I18nText = { en: item.device?.name || item.name, de: item.device?.name || item.name };
        if (item.kind === 'device' && item.device) {
            const existing = inputs[item.input];
            if (!existing) {
                inputs[item.input] = { type: 'device', deviceType: item.device.type, title };
            }
            replace.set(item.id, `{{${item.input}.${item.device.state}}}`);
        } else {
            inputs[item.input] = {
                type: 'state',
                ...(item.role ? { role: item.role } : {}),
                ...(item.commonType ? { commonType: item.commonType } : {}),
                title,
            };
            replace.set(item.id, `{{${item.input}}}`);
        }
    }
    const blockly = xml.replace(FIELD_RE, (field, text: string) => {
        const placeholder = replace.get(unescapeXml(text).trim());
        return placeholder ? field.replace(`>${text}<`, `>${placeholder}<`) : field;
    });
    return {
        $schema: 'https://iobroker.github.io/ioBroker.recipes/schema/recipe.schema.json',
        id: meta.id,
        version: '1.0.0',
        title: meta.title,
        description: meta.description,
        author: meta.author,
        minJavascript: meta.minJavascript,
        inputs,
        blockly,
    };
}

/** A recipe ID from a title: "Light on motion" becomes light-on-motion */
export function recipeId(title: string): string {
    return (
        title
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/ß/g, 'ss')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'my-recipe'
    );
}

/** The XML uses {{ itself, which a recipe cannot have */
export function hasBraces(xml: string): boolean {
    return xml.includes('{{');
}
