const assert = require('node:assert').strict;
const fs = require('node:fs');
const path = require('node:path');
const { AI_COMMANDS } = require('@iobroker/ai-core');
const { COMMANDS, HELP } = require('../build/lib/help');
const { JS_AI_ALIASES } = require('../build/lib/ai');

/** The commands of the switch in `onMessage` of src/main.ts and the AI commands it hands to `AiBackend` */
function commandsOfMain() {
    const source = fs.readFileSync(path.join(__dirname, '../src/main.ts'), 'utf8');
    const start = source.indexOf('    onMessage(obj: ioBroker.Message): void {');
    const end = source.indexOf('\n    }\n', start);
    assert.ok(start > 0 && end > start, 'onMessage found');
    const cases = [...source.slice(start, end).matchAll(/^ {12}case '([^']+)':/gm)].map(m => m[1]);
    return [...cases, ...Object.values(AI_COMMANDS), ...Object.keys(JS_AI_ALIASES)];
}

describe('Test help', function () {
    it('lists exactly the commands onMessage answers', function () {
        assert.deepEqual(COMMANDS.map(c => c.command).sort(), [...new Set(commandsOfMain())].sort());
    });

    it('lists every command once', function () {
        const names = COMMANDS.map(c => c.command);
        assert.deepEqual(names, [...new Set(names)]);
    });

    it('names every command in the text', function () {
        for (const { command } of COMMANDS.filter(c => c.command !== 'help')) {
            assert.ok(HELP.includes(command), command);
        }
    });

    it('marks the commands that change something as write', function () {
        const write = Object.fromEntries(COMMANDS.map(c => [c.command, c.write]));
        for (const command of ['toScript', 'jsMessageBus', 'execute', 'restartScript', 'deleteHistory']) {
            assert.equal(write[command], true, command);
        }
        for (const command of ['help', 'calcAstro', 'calcAstroAll', 'getScriptVersions', 'getScriptVersion']) {
            assert.equal(write[command], false, command);
        }
    });

    it('keeps the lines short', function () {
        for (const line of HELP.split('\n')) {
            assert.ok(line.length <= 120, line);
        }
    });
});
