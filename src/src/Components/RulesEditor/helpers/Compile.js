// eslint-disable-next-line no-unused-vars

const STANDARD_FUNCTION_STATE = `async function (obj) {
    const _cond = __%%CONDITION%%__;
    if (_cond) {
__%%THEN%%__
    } else {
__%%ELSE%%__
    }
}`;
const STANDARD_FUNCTION_STATE_ONCHANGE = `async function (obj) {
    const _cond = __%%CONDITION%%__;
    if (__%%STATE%%__ === false && _cond) {
        __%%STATE%%__ = true;    
__%%THEN%%__
    } else if (__%%STATE%%__ === true && !_cond) {
        __%%STATE%%__ = false;    
__%%ELSE%%__
    }
}`;
const STANDARD_FUNCTION =
`async function () {
    const _cond = __%%CONDITION%%__;
    if (_cond) {
__%%THEN%%__
    } else {
__%%ELSE%%__
    }
}`;

const STANDARD_FUNCTION_ONCHANGE =
`async function () {
    const _cond = __%%CONDITION%%__;
    if (__%%STATE%%__ === false && _cond) {
        __%%STATE%%__ = true;    
__%%THEN%%__
    } else if (__%%STATE%%__ === true && !_cond) {
        __%%STATE%%__ = false;    
__%%ELSE%%__
    }
}`;

const DEFAULT_RULE = {
    triggers: [],
    conditions: [[]],
    justCheck: false,
    actions: {
        then: [],
        'else': []
    }
};

function compileTriggers(json, context, blocks) {
    const triggers = [];
    let jsonTriggers = json.triggers;
    if (!jsonTriggers.length) {
        jsonTriggers = [{id: 'TriggerScriptSave'}];
    }

    const vars = [];
    jsonTriggers.forEach((trigger, i) => {
        const found = findBlock(trigger.id, blocks);
        if (found) {
            const _context = {trigger, condition: {}, justCheck: json.justCheck || (!json.conditions.length || !json.conditions[0].length)};
            const text = found.compile(trigger, _context);
            const conditions = compileConditions(json.conditions, _context, blocks);
            const then = compileActions(json.actions.then, _context, blocks);
            const _else = compileActions(json.actions.else, _context, blocks);

            // find indent
            vars.push('cond' + i);

            triggers.push(
                text
                    .replace(/__%%STATE%%__/g, 'cond' + i)
                    .replace('__%%CONDITION%%__', conditions)
                    .replace('__%%THEN%%__', then || '// ignore')
                    .replace('__%%ELSE%%__', _else || '// ignore')
            );
        }
    });

    let text = triggers.join('\n\n');

    if (json.justCheck) {
        text = vars.map(v => `let ${v} = false;`).join('\n') + '\n\n' + text;
    }

    return text;
}

function findBlock(type, blocks) {
    return blocks.find(block => block.getStaticData && block.getStaticData().id === type);
}

function compileActions(actions, context, blocks) {
    let result = [];
    actions && actions.forEach(action => {
        const found = findBlock(action.id, blocks);
        if (found) {
            result.push(found.compile(action, context));
        }
    });
    return `\t\t${result.join('\n\t\t')}` || '';
}

function compileConditions(conditions, context, blocks) {
    let result = [];
    let i = 0;
    conditions && conditions.forEach(ors => {
        if (ors.hasOwnProperty('length')) {
            const _ors = [];
            _ors && ors.forEach(block => {
                const found = findBlock(block.id, blocks);
                if (found) {
                    context.condition.index = i++;
                    _ors.push(found.compile(block, context));
                }
            });
            result.push(_ors.join(' && '));
        } else {
            const found = findBlock(ors.id, blocks);
            if (found) {
                context.condition.index = i++;
                result.push(found.compile(ors, context));
            }
        }

    });

    if (!result.length) {
        return 'true';
    } else
    if (result.length === 1) {
        return result[0] || 'true';
    } else {
        return '(' + result.join(') || (') + ')';
    }
}

function compile(json, blocks) {
    return compileTriggers(json, null, blocks);
}

// eslint-disable-next-line no-unused-vars
function code2json(code) {
    if (!code) {
        return DEFAULT_RULE;
    } else {
        const lines = code.split('\n');
        try {
            let json = lines.pop().replace(/^\/\//, '');
            json = JSON.parse(json);
            if (!json.triggers) {
                json = DEFAULT_RULE;
            }
            return json;
        } catch (e) {
            return DEFAULT_RULE;
        }
    }
}

// eslint-disable-next-line no-unused-vars
function json2code(json, blocks) {
    let code = '';

    const compiled = compile(json, blocks);
    code += compiled;

    code += `\n/*const demo = ${JSON.stringify(json, null, 2)};*/\n`;

    return code + '\n//' + JSON.stringify(json);
}

const Compile = {
    code2json,
    json2code,
    compile,
    STANDARD_FUNCTION,
    STANDARD_FUNCTION_ONCHANGE,
    STANDARD_FUNCTION_STATE,
    STANDARD_FUNCTION_STATE_ONCHANGE,
};

export default Compile;