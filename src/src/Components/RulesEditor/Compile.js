// eslint-disable-next-line no-unused-vars

const STANDARD_FUNCTION = `async function (obj) {
    if (__%%CONDITION%%__) {
__%%THEN%%__
    } else {
__%%ELSE%%__
    }
}`;

const DEFAULT_RULE = {
    triggers: [],
    conditions: [[]],
    actions: {
        then: [],
        'else': []
    }
};

function compileTriggers(json, context, blocks) {
    const triggers = [];
    json.triggers.forEach(trigger => {
        const found = findBlock(trigger.id, blocks);
        if (found && false) {
            const text = found.compile(trigger, context);
            const conditions = compileConditions(json.conditions, context, blocks);
            const then = compileActions(json.actions.then, context, blocks);
            const _else = compileActions(json.actions.else, context, blocks);
            triggers.push(
                text
                    .replace('__%%CONDITION%%__', conditions)
                    .replace('__%%THEN%%__', then || '// ignore')
                    .replace('__%%ELSE%%__', _else || '// ignore')
            );
        }
    });

    return triggers.join('\n\n');
}

function findBlock(type, blocks) {
    return blocks.find(block => block.name === type);
}

function compileActions(actions, context, blocks) {
    let result = [];
    actions && actions.forEach(action => {
        const found = findBlock(action.id, blocks);
        if (found) {
            result.push(found.compile(action, context));
        }
    });
    return `\t\t${result.join('\t\t\n')}` || '';
}

function compileConditions(conditions, context, blocks) {
    let result = [];
    conditions && conditions.forEach(ors => {
        if (ors.hasOwnProperty('length')) {
            const _ors = [];
            _ors && ors.forEach(block => {
                const found = findBlock(block.id, blocks);
                if (found) {
                    _ors.push(found.compile(block, context));
                }
            });
            result.push(_ors.join(' || '));
        } else {
            const found = findBlock(ors.id, blocks);
            if (found) {
                result.push(found.compile(ors, context));
            }
        }

    });
    return (result.join(') && (') || 'true');
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
    let code = `const demo = ${JSON.stringify(json, null, 2)};\n`;

    const compiled = compile(json, blocks);
    code += compiled;

    return code + '\n//' + JSON.stringify(json);
}

const Compile = {
    code2json,
    json2code,
    compile,
    STANDARD_FUNCTION
};

export default Compile;