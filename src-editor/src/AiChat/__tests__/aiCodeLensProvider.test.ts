import { describe, it, expect } from 'vitest';
import {
    findCodeLensSymbols,
    buildCodeLenses,
    findSymbolAtLine,
    computeFullSymbolRange,
    findLeadingCommentsStart,
    findSymbolEndByBraces,
} from '../aiCodeLensProvider';

describe('findCodeLensSymbols', () => {
    it('detects a top-level function declaration', () => {
        const src = `function handleMotion(obj) {\n    log(obj);\n}`;
        expect(findCodeLensSymbols(src)).toEqual([{ name: 'handleMotion', kind: 'function', line: 1 }]);
    });

    it('detects async functions', () => {
        const src = `async function loadConfig() {\n    return await fetch('...');\n}`;
        expect(findCodeLensSymbols(src)).toEqual([{ name: 'loadConfig', kind: 'function', line: 1 }]);
    });

    it('detects exported functions (TS/ES modules)', () => {
        const src = `export function publicApi() {}`;
        expect(findCodeLensSymbols(src)).toEqual([{ name: 'publicApi', kind: 'function', line: 1 }]);
    });

    it('detects exported async functions', () => {
        const src = `export async function pub() {}`;
        expect(findCodeLensSymbols(src)).toEqual([{ name: 'pub', kind: 'function', line: 1 }]);
    });

    it('detects classes', () => {
        const src = `class MyController {\n    constructor() {}\n}`;
        expect(findCodeLensSymbols(src)).toEqual([{ name: 'MyController', kind: 'class', line: 1 }]);
    });

    it('detects exported classes', () => {
        const src = `export class Widget {}`;
        expect(findCodeLensSymbols(src)).toEqual([{ name: 'Widget', kind: 'class', line: 1 }]);
    });

    it('detects top-level arrow constants with parameters', () => {
        const src = `const onMotion = (obj) => {\n    log(obj);\n};`;
        expect(findCodeLensSymbols(src)).toEqual([{ name: 'onMotion', kind: 'arrow', line: 1 }]);
    });

    it('detects top-level arrow constants without parens (single param)', () => {
        const src = `const square = x => x * x;`;
        expect(findCodeLensSymbols(src)).toEqual([{ name: 'square', kind: 'arrow', line: 1 }]);
    });

    it('detects async arrow constants', () => {
        const src = `const loadUsers = async () => fetch('/users');`;
        expect(findCodeLensSymbols(src)).toEqual([{ name: 'loadUsers', kind: 'arrow', line: 1 }]);
    });

    it('ignores nested functions (not at column 0)', () => {
        const src = `function outer() {\n    function inner() {}\n}`;
        // inner is indented → not matched
        expect(findCodeLensSymbols(src)).toEqual([{ name: 'outer', kind: 'function', line: 1 }]);
    });

    it('ignores variable declarations that are not arrow functions', () => {
        const src = `const foo = 42;\nconst bar = 'hello';\nlet baz = { x: 1 };`;
        expect(findCodeLensSymbols(src)).toEqual([]);
    });

    it('finds multiple symbols in one file', () => {
        const src =
            `function setupTriggers() {\n    on('x.0.state', () => {});\n}\n\n` +
            `class Controller {\n    run() {}\n}\n\n` +
            `const helper = (v) => v * 2;`;
        const syms = findCodeLensSymbols(src);
        expect(syms).toEqual([
            { name: 'setupTriggers', kind: 'function', line: 1 },
            { name: 'Controller', kind: 'class', line: 5 },
            { name: 'helper', kind: 'arrow', line: 9 },
        ]);
    });

    it('returns [] for empty source', () => {
        expect(findCodeLensSymbols('')).toEqual([]);
    });

    it('returns [] for scripts that have no top-level declarations', () => {
        const src = `on('x.0.state', (obj) => {\n    log(obj);\n});`;
        // `on(...)` is a function call, not a declaration — so nothing to lens.
        expect(findCodeLensSymbols(src)).toEqual([]);
    });
});

describe('buildCodeLenses', () => {
    const cmdId = 'test.command.id';

    it('emits three lens commands per symbol (explain / refactor / tests)', () => {
        const src = `function doStuff() {\n    x();\n}`;
        const lenses = buildCodeLenses(src, cmdId);
        expect(lenses).toHaveLength(1);
        const commands = lenses[0].commands;
        expect(commands).toHaveLength(3);
        expect(commands.map(c => c.arguments[0])).toEqual(['explain', 'refactor', 'tests']);
        expect(commands.map(c => c.title)).toEqual(['💡 Explain', '🔧 Refactor', '✅ Tests']);
        expect(commands.every(c => c.id === cmdId)).toBe(true);
    });

    it('body range ends at last line when only one symbol', () => {
        const src = `function a() {\n    one();\n    two();\n}`;
        const [entry] = buildCodeLenses(src, cmdId);
        expect(entry.startLine).toBe(1);
        expect(entry.endLine).toBe(4);
        // Commands should carry the same range info
        expect(entry.commands[0].arguments).toEqual(['explain', 1, 4]);
    });

    it('body range stops before next symbol', () => {
        const src = `function a() {\n    a1();\n}\n` + `function b() {\n    b1();\n}`;
        const [first, second] = buildCodeLenses(src, cmdId);
        expect(first.startLine).toBe(1);
        expect(first.endLine).toBe(3);
        expect(second.startLine).toBe(4);
        expect(second.endLine).toBe(6);
    });

    it('returns [] when no symbols are found', () => {
        expect(buildCodeLenses('', cmdId)).toEqual([]);
        expect(buildCodeLenses('on("x", () => {});', cmdId)).toEqual([]);
    });

    it('includes tooltips that name the symbol and its kind', () => {
        const src = `class Widget {}`;
        const [entry] = buildCodeLenses(src, cmdId);
        expect(entry.commands[0].tooltip).toBe('Explain class Widget');
        expect(entry.commands[1].tooltip).toBe('Refactor class Widget');
        expect(entry.commands[2].tooltip).toBe('Suggest tests for class Widget');
    });

    it('threads the caller-supplied command id into every command', () => {
        const src = `function a(){}\nfunction b(){}`;
        const lenses = buildCodeLenses(src, 'my.unique.id');
        expect(lenses.flatMap(l => l.commands).every(c => c.id === 'my.unique.id')).toBe(true);
    });

    it('displayLine points at the symbol declaration (not at leading JSDoc)', () => {
        const src = ['/**', ' * Does something.', ' */', 'function foo() { return 1; }'].join('\n');
        const [entry] = buildCodeLenses(src, 'x');
        expect(entry.displayLine).toBe(4); // `function foo` line → lens renders here
        expect(entry.startLine).toBe(1); // scope starts at JSDoc
        expect(entry.endLine).toBe(4); // scope ends at `}`
        // Commands carry the scope range, not the display line
        expect(entry.commands[0].arguments).toEqual(['explain', 1, 4]);
    });
});

describe('findSymbolEndByBraces', () => {
    it('finds the matching closing brace of a simple function', () => {
        const src = ['function a() {', '    doThing();', '}'].join('\n');
        expect(findSymbolEndByBraces(src.split('\n'), 1, 99)).toBe(3);
    });

    it('handles nested braces', () => {
        const src = ['function outer() {', '    if (cond) {', '        inner();', '    }', '    done();', '}'].join(
            '\n',
        );
        expect(findSymbolEndByBraces(src.split('\n'), 1, 99)).toBe(6);
    });

    it('falls back when no closing brace is found', () => {
        const src = 'function broken() {';
        expect(findSymbolEndByBraces(src.split('\n'), 1, 42)).toBe(42);
    });

    it('handles single-line braces', () => {
        const src = ['function a() { return 1; }', 'function b() {}'].join('\n');
        expect(findSymbolEndByBraces(src.split('\n'), 1, 99)).toBe(1);
        expect(findSymbolEndByBraces(src.split('\n'), 2, 99)).toBe(2);
    });
});

describe('findLeadingCommentsStart', () => {
    it('includes a JSDoc block directly above the symbol', () => {
        const lines = [
            '/**', // line 1
            ' * Description.',
            ' */',
            'function foo() {}', // line 4 ← symbol
        ];
        expect(findLeadingCommentsStart(lines, 4)).toBe(1);
    });

    it('allows exactly one blank line between JSDoc and symbol', () => {
        const lines = [
            '/**',
            ' * Description.',
            ' */',
            '', // 1 blank — still associated
            'function foo() {}', // line 5
        ];
        expect(findLeadingCommentsStart(lines, 5)).toBe(1);
    });

    it('stops at two blank lines', () => {
        const lines = [
            '/**',
            ' * Not my doc.',
            ' */',
            '',
            '',
            'function foo() {}', // line 6
        ];
        expect(findLeadingCommentsStart(lines, 6)).toBe(6);
    });

    it('includes a run of //-comments', () => {
        const lines = ['// one', '// two', '// three', 'function foo() {}'];
        expect(findLeadingCommentsStart(lines, 4)).toBe(1);
    });

    it('returns the symbol line when nothing precedes it', () => {
        expect(findLeadingCommentsStart(['function foo() {}'], 1)).toBe(1);
    });

    it('does not cross non-comment code', () => {
        const lines = ['const x = 1;', '// comment', 'function foo() {}'];
        expect(findLeadingCommentsStart(lines, 3)).toBe(2);
    });
});

describe('computeFullSymbolRange', () => {
    it("does NOT eat the next symbol's leading JSDoc (the reported bug)", () => {
        // The exact layout from the user's screenshot.
        const src = [
            'function setZ2m(briPercent, transitionSec, sunAlt) {', // 1
            '    const ct = getColorTempZ2m(sunAlt);', // 2
            '    setState(IDS.z2mGroup3Transition, transitionSec);', // 3
            '    setState(IDS.z2mGroup3Colortemp, ct);', // 4
            '    setStateDelayed(IDS.z2mGroup3Brightness, 50, 200);', // 5
            '    lastCommandTimestamp = Date.now();', // 6
            '}', // 7
            '', // 8
            '/**', // 9  ← belongs to NEXT
            ' * Schaltet alle Lampen aus.', // 10
            ' */', // 11
            'function allOff() {', // 12
            '    // …',
            '}',
        ];
        const range = computeFullSymbolRange(src, 1, 11 /* naive next-symbol end */);
        expect(range.startLine).toBe(1);
        expect(range.endLine).toBe(7); // closing `}` of setZ2m, NOT line 11
    });

    it('DOES include leading JSDoc in the range for the function it documents', () => {
        const src = [
            'const other = 1;', // 1
            '', // 2
            '/**', // 3
            ' * Does the thing.', // 4
            ' */', // 5
            'function doThing() {', // 6
            '    work();', // 7
            '}', // 8
        ];
        const range = computeFullSymbolRange(src, 6, 8);
        expect(range.startLine).toBe(3); // JSDoc included
        expect(range.endLine).toBe(8); // closing brace
    });
});

describe('findSymbolAtLine', () => {
    const src = [
        '/**', // 1
        ' * Doc for first.', // 2
        ' */', // 3
        'function first() {', // 4
        '    return 1;', // 5
        '}', // 6
        '', // 7
        '/**', // 8
        ' * Doc for second.', // 9
        ' */', // 10
        'function second() {', // 11
        '    return 2;', // 12
        '}', // 13
    ].join('\n');

    it('matches the symbol from inside its body', () => {
        const m = findSymbolAtLine(src, 5);
        expect(m?.symbol.name).toBe('first');
        expect(m?.startLine).toBe(1);
        expect(m?.endLine).toBe(6);
    });

    it('matches the symbol when the cursor is on its leading JSDoc', () => {
        const m = findSymbolAtLine(src, 2);
        expect(m?.symbol.name).toBe('first');
        expect(m?.startLine).toBe(1);
    });

    it('matches the second symbol for lines inside its body', () => {
        const m = findSymbolAtLine(src, 12);
        expect(m?.symbol.name).toBe('second');
        expect(m?.startLine).toBe(8);
        expect(m?.endLine).toBe(13);
    });

    it("does NOT swallow the second symbol's JSDoc into the first symbol", () => {
        const m = findSymbolAtLine(src, 6);
        expect(m?.symbol.name).toBe('first');
        expect(m?.endLine).toBe(6); // NOT 10
    });
});
