/**
 * Placeholders in the Blockly XML of a recipe.
 *
 * A copy of lib/template.mjs of https://github.com/ioBroker/ioBroker.recipes: the catalog checks the
 * recipes with that one, so a change here belongs there as well (and the other way round). The syntax
 * is described in the README of the catalog ("Placeholders").
 *
 *   {{path}}                         a value, XML escaped
 *   {{#each name}} ... {{/each}}     once per item of an input with "multiple": true
 *   {{#if cond}} ... {{else}} ... {{/if}}
 *
 * A path is `name`, `name.PROPERTY` or `@index`. A condition is a path, or a path compared with a text:
 * `light.type == "dimmer"`, `mode != "eco"`.
 */
import type { RecipeDevice, RecipeInput, RecipeValue } from './types';

/** Names of inputs and properties */
const IDENT = '[A-Za-z_][A-Za-z0-9_]*';
const PATH = `(?:@index|${IDENT}(?:\\.${IDENT})?)`;
const PATH_RE = new RegExp(`^${PATH}$`);
const CONDITION_RE = new RegExp(`^(${PATH})(?:\\s*(==|!=)\\s*"([^"]*)")?$`);
const EACH_RE = new RegExp(`^#each\\s+(${IDENT})$`);
const IF_RE = /^#if\s+(.+)$/;
const TAG_RE = /\{\{\s*([^{}]*?)\s*\}\}/g;

/** A state of a device is named in upper case, like the type-detector does: SET, ACTUAL, ON_SET */
export const STATE_NAME_RE = /^[A-Z][A-Z0-9_]*$/;

export interface TemplatePath {
    name: string;
    prop?: string;
    index?: true;
}

export interface TemplateCondition {
    path: TemplatePath;
    op?: '==' | '!=';
    literal?: string;
}

export type TemplateNode =
    | { type: 'text'; value: string }
    | { type: 'value'; path: TemplatePath; offset: number }
    | { type: 'each'; name: string; offset: number; body: TemplateNode[] }
    | { type: 'if'; condition: TemplateCondition; offset: number; then: TemplateNode[]; else: TemplateNode[] | null };

export interface TemplateRoot {
    type: 'root';
    children: TemplateNode[];
    text: string;
}

/** Line and column (both counted from 1) of an offset in a text */
export function locate(text: string, offset: number): { line: number; column: number } {
    const lines = text.slice(0, offset).split('\n');
    return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

/** A template that cannot be parsed */
export class TemplateError extends Error {
    line: number;

    column: number;

    constructor(message: string, text: string, offset: number) {
        const { line, column } = locate(text, offset);
        super(`line ${line}, column ${column}: ${message}`);
        this.name = 'TemplateError';
        this.line = line;
        this.column = column;
    }
}

/** A template that cannot be rendered with the given values */
export class RenderError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RenderError';
    }
}

function parsePath(text: string): TemplatePath {
    if (text === '@index') {
        return { index: true, name: '@index' };
    }
    const [name, prop] = text.split('.');
    return prop ? { name, prop } : { name };
}

/** The text of a path again, for messages */
export function pathText(path: TemplatePath): string {
    return path.index ? '@index' : path.prop ? `${path.name}.${path.prop}` : path.name;
}

type OpenNode = { node: TemplateRoot | Extract<TemplateNode, { type: 'each' | 'if' }>; children: TemplateNode[] };

/** Parses a template into a tree of nodes */
export function parseTemplate(text: string): TemplateRoot {
    const root: TemplateRoot = { type: 'root', children: [], text };
    // the open blocks; the last one receives the nodes
    const stack: OpenNode[] = [{ node: root, children: root.children }];
    let last = 0;

    for (const match of text.matchAll(TAG_RE)) {
        const offset = match.index;
        const tag = match[1];
        const current = stack[stack.length - 1];
        if (offset > last) {
            current.children.push({ type: 'text', value: text.slice(last, offset) });
        }
        last = offset + match[0].length;

        if (tag.startsWith('#each')) {
            const each = tag.match(EACH_RE);
            if (!each) {
                throw new TemplateError(`"{{${tag}}}" must name one input, like {{#each light}}`, text, offset);
            }
            const node: TemplateNode = { type: 'each', name: each[1], offset, body: [] };
            current.children.push(node);
            stack.push({ node, children: node.body });
        } else if (tag.startsWith('#if')) {
            const condition = (tag.match(IF_RE)?.[1] || '').trim().match(CONDITION_RE);
            if (!condition) {
                throw new TemplateError(
                    `"{{${tag}}}" is no valid condition: use {{#if name}}, {{#if name.STATE}} or {{#if name == "text"}}`,
                    text,
                    offset,
                );
            }
            const node: TemplateNode = {
                type: 'if',
                condition: {
                    path: parsePath(condition[1]),
                    op: condition[2] as '==' | '!=' | undefined,
                    literal: condition[3],
                },
                offset,
                then: [],
                else: null,
            };
            current.children.push(node);
            stack.push({ node, children: node.then });
        } else if (tag === 'else') {
            if (current.node.type !== 'if' || current.node.else) {
                throw new TemplateError('{{else}} without {{#if}}', text, offset);
            }
            current.node.else = [];
            current.children = current.node.else;
        } else if (tag === '/each' || tag === '/if') {
            const expected = tag.slice(1);
            if (current.node.type !== expected) {
                const open = current.node.type === 'root' ? 'nothing' : `{{#${current.node.type}}}`;
                throw new TemplateError(`{{${tag}}} closes ${open}`, text, offset);
            }
            stack.pop();
        } else if (PATH_RE.test(tag)) {
            current.children.push({ type: 'value', path: parsePath(tag), offset });
        } else {
            throw new TemplateError(`"{{${tag}}}" is no placeholder`, text, offset);
        }
    }
    if (stack.length > 1) {
        const open = stack[stack.length - 1].node as Extract<TemplateNode, { type: 'each' | 'if' }>;
        throw new TemplateError(`{{#${open.type}}} is not closed`, text, open.offset);
    }
    if (last < text.length) {
        root.children.push({ type: 'text', value: text.slice(last) });
    }
    return root;
}

const XML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

/** Escapes a text for XML, both for element content and attribute values */
export function escapeXml(text: unknown): string {
    return String(text).replace(/[&<>"']/g, char => XML_ESCAPES[char]);
}

/** Is a value given at all? `false` and `0` are values, an empty text or list is none */
export function isDefined(value: unknown): boolean {
    return value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && !value.length);
}

/** The text of a value of an input, as it goes into the XML (not yet escaped) */
function valueText(input: RecipeInput, value: RecipeValue): string {
    switch (input.type) {
        case 'boolean':
            // the value of the Blockly block "logic_boolean"
            return value ? 'TRUE' : 'FALSE';
        case 'device':
            return (value as RecipeDevice).id;
        default:
            return String(value);
    }
}

interface RenderContext {
    inputs: Record<string, RecipeInput>;
    values: Record<string, RecipeValue>;
    loops: Record<string, RecipeValue>;
    index: number | undefined;
}

interface Resolved {
    defined: boolean;
    value: unknown;
    /** only for a defined single value */
    text?: string;
}

/** Resolves a path to the value it stands for */
function resolve(path: TemplatePath, ctx: RenderContext): Resolved {
    if (path.index) {
        if (ctx.index === undefined) {
            throw new RenderError('{{@index}} is only known inside {{#each}}');
        }
        return { defined: true, value: ctx.index, text: String(ctx.index) };
    }
    const input = ctx.inputs[path.name];
    if (!input) {
        throw new RenderError(`there is no input "${path.name}"`);
    }
    const inLoop = Object.prototype.hasOwnProperty.call(ctx.loops, path.name);
    const value = inLoop ? ctx.loops[path.name] : ctx.values[path.name];
    const list = Array.isArray(value);

    if (!path.prop) {
        if (!isDefined(value)) {
            return { defined: false, value };
        }
        return { defined: true, value, text: list ? undefined : valueText(input, value) };
    }
    const prop = path.prop;
    if (prop === 'count') {
        const count = list ? value.length : 0;
        return { defined: true, value: count, text: String(count) };
    }
    if (!isDefined(value) || list) {
        return { defined: false, value: undefined };
    }
    let result: unknown;
    if (STATE_NAME_RE.test(prop)) {
        result = (value as RecipeDevice).states?.[prop];
    } else if (prop === 'id' || prop === 'name' || prop === 'type') {
        result = (value as RecipeDevice)[prop];
    } else if (prop === 'hour' || prop === 'minute') {
        const [hour, minute] = String(value).split(':');
        // without leading zeros, so they can go into a cron expression
        result = String(parseInt(prop === 'hour' ? hour : minute, 10));
    } else {
        throw new RenderError(`"${prop}" is no property of {{${path.name}}}`);
    }
    return isDefined(result)
        ? { defined: true, value: result, text: String(result) }
        : { defined: false, value: result };
}

/** Is a condition true? */
function test(condition: TemplateCondition, ctx: RenderContext): boolean {
    const resolved = resolve(condition.path, ctx);
    if (!condition.op) {
        return resolved.defined && resolved.value !== false;
    }
    const text = resolved.defined ? (resolved.text ?? '') : '';
    return condition.op === '==' ? text === condition.literal : text !== condition.literal;
}

const XML_TOKEN_RE =
    /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<(\/?)([A-Za-z_][\w.:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;

interface XmlElement {
    name: string;
    start: number;
    end: number;
    /** where the closing tag begins */
    closeStart: number;
    selfClosing: boolean;
    /** the names of the direct child elements */
    children: string[];
}

/**
 * The elements at the top level of a piece of XML, and whether there is text other than white space at
 * the top level
 */
export function topLevelElements(xml: string): { elements: XmlElement[]; text: boolean } {
    const elements: XmlElement[] = [];
    let depth = 0;
    let current: Omit<XmlElement, 'end' | 'closeStart'> | null = null;
    let last = 0;
    let text = false;

    for (const match of xml.matchAll(XML_TOKEN_RE)) {
        if (depth === 0 && xml.slice(last, match.index).trim()) {
            text = true;
        }
        last = match.index + match[0].length;
        const [token, closing, name, , selfClose] = match;
        if (!name) {
            // comment, CDATA or processing instruction
            continue;
        }
        if (closing) {
            depth--;
            if (depth === 0 && current) {
                elements.push({ ...current, closeStart: match.index, end: last });
                current = null;
            }
        } else if (selfClose) {
            if (depth === 0) {
                elements.push({
                    name,
                    start: match.index,
                    end: last,
                    closeStart: match.index + token.length - 2,
                    selfClosing: true,
                    children: [],
                });
            } else if (depth === 1 && current) {
                current.children.push(name);
            }
        } else {
            if (depth === 0) {
                current = { name, start: match.index, children: [], selfClosing: false };
            } else if (depth === 1 && current) {
                current.children.push(name);
            }
            depth++;
        }
    }
    if (xml.slice(last).trim()) {
        text = true;
    }
    return { elements, text };
}

/** The piece is exactly one `<block>` element */
function singleBlock(xml: string): XmlElement | null {
    const { elements, text } = topLevelElements(xml);
    return !text && elements.length === 1 && elements[0].name === 'block' ? elements[0] : null;
}

/**
 * Links blocks into a sequence, as Blockly stores statements one after another: the second block goes
 * into a `<next>` of the first one, and so on.
 */
function chainBlocks(blocks: string[]): string {
    let result = '';
    for (let i = blocks.length - 1; i >= 0; i--) {
        const xml = blocks[i];
        if (!result) {
            result = xml;
            continue;
        }
        const block = singleBlock(xml)!;
        if (block.children.includes('next')) {
            throw new RenderError('a block that {{#each}} repeats must not have a <next> of its own');
        }
        result = block.selfClosing
            ? `${xml.slice(0, block.closeStart)}><next>${result}</next></block>`
            : `${xml.slice(0, block.closeStart)}<next>${result}</next>${xml.slice(block.closeStart)}`;
    }
    return result;
}

function renderNodes(nodes: TemplateNode[], ctx: RenderContext): string {
    let out = '';
    for (const node of nodes) {
        if (node.type === 'text') {
            out += node.value;
        } else if (node.type === 'value') {
            const resolved = resolve(node.path, ctx);
            if (!resolved.defined) {
                throw new RenderError(`{{${pathText(node.path)}}} has no value`);
            }
            if (resolved.text === undefined) {
                throw new RenderError(`{{${node.path.name}}} is a list: use it inside {{#each ${node.path.name}}}`);
            }
            out += escapeXml(resolved.text);
        } else if (node.type === 'if') {
            const branch = test(node.condition, ctx) ? node.then : node.else;
            if (branch) {
                out += renderNodes(branch, ctx);
            }
        } else if (node.type === 'each') {
            const items = ctx.values[node.name];
            if (!ctx.inputs[node.name]) {
                throw new RenderError(`there is no input "${node.name}"`);
            }
            if (items !== undefined && items !== null && !Array.isArray(items)) {
                throw new RenderError(`{{#each ${node.name}}} needs a list`);
            }
            const parts = ((items || []) as (RecipeDevice | string)[])
                .map((item, index) =>
                    renderNodes(node.body, { ...ctx, loops: { ...ctx.loops, [node.name]: item }, index }),
                )
                .filter(part => part.trim());
            out +=
                parts.length > 1 && parts.every(part => singleBlock(part.trim()))
                    ? chainBlocks(parts.map(part => part.trim()))
                    : parts.join('');
        }
    }
    return out;
}

/**
 * Replaces the placeholders of a template.
 *
 * Values, by type of the input: `device` a RecipeDevice (a list of them for "multiple"), `state` the ID
 * of the state (a list for "multiple"), `number` and `duration` (seconds) a number, `boolean` true or
 * false, `string`, `select` and `time` ("HH:MM") a text. An input without value is `undefined`.
 */
export function renderTemplate(
    template: string | TemplateRoot,
    inputs: Record<string, RecipeInput>,
    values: Record<string, RecipeValue>,
): string {
    const ast = typeof template === 'string' ? parseTemplate(template) : template;
    return renderNodes(ast.children, { inputs, values: values || {}, loops: {}, index: undefined });
}
