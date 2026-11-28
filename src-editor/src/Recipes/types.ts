/**
 * The format of a recipe and of its catalog, as https://github.com/ioBroker/ioBroker.recipes defines it
 * in schema/recipe.schema.json
 */

/** A text, or a text per language */
export type I18nText = string | Partial<Record<ioBroker.Languages, string>>;

interface InputBase {
    title?: I18nText;
    description?: I18nText;
    optional?: boolean;
}

export interface DeviceInput extends InputBase {
    type: 'device';
    /** Device types of @iobroker/type-detector */
    deviceType: string | string[];
    multiple?: boolean;
}

export interface StateInput extends InputBase {
    type: 'state';
    /** A state fits if its role is this one or continues it: value.power fits value.power.xyz */
    role?: string;
    commonType?: ioBroker.CommonType;
    /** Only states the script may write */
    write?: boolean;
    multiple?: boolean;
}

export interface NumberInput extends InputBase {
    type: 'number';
    default?: number;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
}

export interface BooleanInput extends InputBase {
    type: 'boolean';
    default?: boolean;
}

export interface StringInput extends InputBase {
    type: 'string';
    default?: I18nText;
}

/** In seconds */
export interface DurationInput extends InputBase {
    type: 'duration';
    default?: number;
    min?: number;
    max?: number;
}

/** HH:MM */
export interface TimeInput extends InputBase {
    type: 'time';
    default?: string;
}

export interface SelectInput extends InputBase {
    type: 'select';
    options: { value: string; title: I18nText }[];
    default?: string;
}

export type RecipeInput =
    DeviceInput | StateInput | NumberInput | BooleanInput | StringInput | DurationInput | TimeInput | SelectInput;

export interface Recipe {
    id: string;
    version: string;
    title: I18nText;
    description: I18nText;
    /** GitHub user name */
    author: string;
    tags?: string[];
    minJavascript: string;
    inputs: Record<string, RecipeInput>;
    /** The Blockly XML with placeholders */
    blockly: string;
}

/** recipes.json */
export interface RecipeCatalog {
    format: number;
    buildTime: string;
    recipes: Recipe[];
}

/** What the adapter answers to the message "getRecipes" */
export interface RecipeCatalogAnswer {
    /** The recipes that this version of the adapter can run */
    recipes: Recipe[];
    /** When the catalog was built */
    buildTime?: string;
    /** When the adapter loaded it */
    loaded?: number;
    /** The catalog comes from the cache, as it could not be loaded */
    fromCache?: boolean;
    /** How many recipes need a newer version of the adapter */
    hidden?: number;
    /** The version of the adapter */
    version?: string;
    url?: string;
    error?: string;
}

/** A device as a placeholder sees it */
export interface RecipeDevice {
    id: string;
    name: string;
    /** The device type of the type-detector */
    type: string;
    /** State name (SET, ACTUAL, ...) to the ID of the state */
    states: Record<string, string>;
}

/** The value of one input while a recipe is filled in */
export type RecipeValue = RecipeDevice | RecipeDevice[] | string | string[] | number | boolean | undefined;

/** What is stored of a value: a device only by its ID */
export type RecipeParam = string | string[] | number | boolean;

/** common.recipe of a script made from a recipe */
export interface ScriptRecipe {
    id: string;
    version: string;
    params: Record<string, RecipeParam>;
    /** SHA-256 of the generated JavaScript, without the line with the Blockly XML */
    hash: string;
}
