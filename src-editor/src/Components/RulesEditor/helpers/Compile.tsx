import type { RuleBlockConfig, RuleContext, RuleUserConditionsSaved, RuleUserRules } from '../types';
import type { GenericBlock } from '../components/GenericBlock';

export const STANDARD_FUNCTION_STATE = `async function (obj) {
    "__%%DEBUG_TRIGGER%%__";
    __%%CONDITIONS_VARS%%__
    const _cond = __%%CONDITION%%__;
    
    "__%%DEBUG_CONDITIONS%%__";
    
    if (_cond) {
__%%THEN%%__
    } else {
__%%ELSE%%__
    }
}`;
export const STANDARD_FUNCTION_STATE_ONCHANGE = `async function (obj) {
    "__%%DEBUG_TRIGGER%%__";
    __%%CONDITIONS_VARS%%__
    const _cond = __%%CONDITION%%__;
    
    "__%%DEBUG_CONDITIONS%%__";
    
    if (__%%STATE%%__ === false && _cond) {
        __%%STATE%%__ = true;    
__%%THEN%%__
    } else if (__%%STATE%%__ === true && !_cond) {
        __%%STATE%%__ = false;    
__%%ELSE%%__
    }
}`;
export const STANDARD_FUNCTION = `async function () {
    "__%%DEBUG_TRIGGER%%__";
    __%%CONDITIONS_VARS%%__
    const _cond = __%%CONDITION%%__;
    
    "__%%DEBUG_CONDITIONS%%__";
    
    if (_cond) {
__%%THEN%%__
    } else {
__%%ELSE%%__
    }
}`;

export const STANDARD_FUNCTION_ONCHANGE = `async function () {
    "__%%DEBUG_TRIGGER%%__";
    __%%CONDITIONS_VARS%%__
    const _cond = __%%CONDITION%%__;
    
    "__%%DEBUG_CONDITIONS%%__";
    
    if (__%%STATE%%__ === false && _cond) {
        __%%STATE%%__ = true;    
__%%THEN%%__
    } else if (__%%STATE%%__ === true && !_cond) {
        __%%STATE%%__ = false;    
__%%ELSE%%__
    }
}`;

export const NO_FUNCTION = `"__%%DEBUG_TRIGGER%%__";
__%%CONDITIONS_VARS%%__
const _cond = __%%CONDITION%%__;

"__%%DEBUG_CONDITIONS%%__";

if (_cond) {
__%%THEN%%__
} else {
__%%ELSE%%__
}`;

const DEFAULT_RULE: RuleUserRules = {
    triggers: [],
    conditions: [[]],
    justCheck: false,
    actions: {
        then: [],
        else: [],
    },
};

function compileTriggers(
    json: RuleUserRules,
    _context: RuleContext | null,
    blocks: (typeof GenericBlock<any>)[],
): string {
    const triggers: string[] = [];
    let jsonTriggers = json.triggers;
    if (!jsonTriggers.length) {
        jsonTriggers = [{ id: 'TriggerScriptSave' } as RuleBlockConfig];
    }

    const vars: string[] = [];
    const prelines: string[] = [];
    const hist = json.conditions.find(conds => conds.find(cond => cond.tagCard === '()'));

    jsonTriggers.forEach((trigger, i) => {
        const found = findBlock(trigger.id, blocks);
        if (found) {
            const _context: RuleContext = {
                trigger,
                condition: { index: 0 },
                justCheck: hist ? false : json.justCheck || !json.conditions.length || !json.conditions[0].length,
                conditionsDebug: [],
                conditionsVars: [],
                conditionsStates: [],
            };
            const text = found.compile(trigger, _context);
            const conditions = compileConditions(json.conditions, _context, blocks);
            const then = compileActions(json.actions.then, _context, blocks);
            const _else = compileActions(json.actions.else, _context, blocks);

            // find indent
            vars.push(`cond${i}`);

            if (_context.prelines?.length) {
                _context.prelines.forEach(line => prelines.push(line));
            }

            if (text.includes('    __%%CONDITIONS_VARS%%__')) {
                _context.conditionsVars = _context.conditionsVars.map((v, i) => (i ? `    ${v}` : v));
                _context.conditionsDebug = _context.conditionsDebug.map((v, i) => (i ? `    ${v}` : v));
            }

            triggers.push(
                text
                    .replace('__%%CONDITIONS_VARS%%__', _context.conditionsVars.join('\n'))
                    .replace('"__%%DEBUG_CONDITIONS%%__";', _context.conditionsDebug.join('\n'))
                    .replace('__%%CONDITION%%__', conditions)
                    .replace('__%%THEN%%__', then || '// ignore')
                    .replace('__%%ELSE%%__', _else || '// ignore')
                    .replace(/__%%STATE%%__/g, `cond${i}`),
            );
        }
    });

    let text = triggers.join('\n\n');

    if (!json.justCheck || hist) {
        text = `${vars.map(v => `let ${v} = false;`).join('\n')}\n\n${text}`;
    }
    if (prelines) {
        text = `${prelines.join('\n')}\n\n${text}`;
    }

    return text;
}

function findBlock(type: string, blocks: (typeof GenericBlock<any>)[]): typeof GenericBlock<any> | undefined {
    return blocks.find(block => block.getStaticData && block.getStaticData().id === type);
}

function compileActions(
    actions: RuleBlockConfig[],
    context: RuleContext,
    blocks: (typeof GenericBlock<any>)[],
): string {
    const result: string[] = [];
    actions?.forEach(action => {
        const found = findBlock(action.id, blocks);
        if (found) {
            result.push(found.compile(action, context));
        }
    });
    return `\t\t${result.join('\n\n\t\t')}`;
}

function compileConditions(
    conditions: RuleUserConditionsSaved,
    context: RuleContext,
    blocks: (typeof GenericBlock<any>)[],
): string {
    const result: string[] = [];
    let i = 0;
    conditions?.forEach(ors => {
        const _ors: string[] = [];
        ors?.forEach(block => {
            const found = findBlock(block.id, blocks);
            if (found) {
                context.condition.index = i++;
                _ors.push(found.compile(block, context));
            }
        });
        result.push(`(${_ors.join(') &&\n                  (')})`);
    });

    if (!result.length) {
        return 'true';
    }
    if (result.length === 1) {
        return result[0] || 'true';
    }
    return `(${result.join(') || (')})`;
}

export function compile(json: RuleUserRules, blocks: (typeof GenericBlock<any>)[]): string {
    return compileTriggers(json, null, blocks);
}

// eslint-disable-next-line no-unused-vars
export function code2json(code: string): RuleUserRules {
    if (!code) {
        return DEFAULT_RULE;
    }
    const lines = code.split('\n');
    try {
        const jsonStr = (lines.pop() || '').replace(/^\/\//, '');
        let json: RuleUserRules = JSON.parse(jsonStr);
        if (!json.triggers) {
            json = DEFAULT_RULE;
        }
        return json;
    } catch {
        return DEFAULT_RULE;
    }
}

export function json2code(json: RuleUserRules, blocks: (typeof GenericBlock<any>)[]): string {
    let code = '';

    const compiled = compile(json, blocks);
    code += compiled;

    code += `\n/*\nconst demo = ${JSON.stringify(json, null, 2).replace(/\*\//g, '* /')};\n*/\n`;

    return `${code}\n//${JSON.stringify(json)}`;
}
