import { describe, it, expect } from 'vitest';
import { matchByName, matchBySimilarity, matchCommentBlock, findBestTarget } from '../findAiBlockTarget';

describe('matchByName', () => {
    it('locates a function by matching name', () => {
        const script = [
            "on('x.0.a', () => {});",
            '',
            'function updateLighting() {',
            '    setState("lamp", true);',
            '}',
            '',
            'schedule("* * * * *", tick);',
        ].join('\n');
        const aiBlock = ['function updateLighting() {', '    setState("lamp", false);', '}'].join('\n');
        const res = matchByName(aiBlock, script);
        expect(res).not.toBeNull();
        expect(res?.method).toBe('name');
        expect(res?.matchedName).toBe('updateLighting');
        expect(res?.range.startLine).toBe(3);
        expect(res?.range.endLine).toBe(5);
        expect(res?.confidence).toBe(1);
    });

    it('locates a class by matching name', () => {
        const script = ['const foo = 1;', 'class Widget {', '    run() {}', '}'].join('\n');
        const aiBlock = 'class Widget {\n    run() { /* new */ }\n}';
        const res = matchByName(aiBlock, script);
        expect(res?.method).toBe('name');
        expect(res?.matchedName).toBe('Widget');
        expect(res?.range.startLine).toBe(2);
    });

    it('locates arrow-function constants by name', () => {
        const script = ['const unrelated = 1;', '', 'const onMotion = (obj) => {', '    log(obj);', '};'].join('\n');
        const aiBlock = 'const onMotion = async (obj) => {\n    await log(obj);\n};';
        const res = matchByName(aiBlock, script);
        expect(res?.matchedName).toBe('onMotion');
    });

    it('picks the first AI-block symbol that has a script counterpart', () => {
        const script = ['function keep() {}', 'function replaceMe() { return 1; }'].join('\n');
        const aiBlock = ['function notInScript() {}', 'function replaceMe() { return 2; }'].join('\n');
        const res = matchByName(aiBlock, script);
        expect(res?.matchedName).toBe('replaceMe');
    });

    it('returns null when the AI block has no top-level symbols', () => {
        const script = 'function a() {}';
        expect(matchByName('setState("x", 1);', script)).toBeNull();
    });

    it('returns null when none of the AI block names exist in the script', () => {
        const script = 'function a() {}\nfunction b() {}';
        const aiBlock = 'function x() {}';
        expect(matchByName(aiBlock, script)).toBeNull();
    });

    it('handles empty inputs', () => {
        expect(matchByName('', 'x')).toBeNull();
        expect(matchByName('x', '')).toBeNull();
    });

    it('end-line reaches EOF for the last script symbol', () => {
        const script = ['const a = 1;', 'function late() {', '    step();', '    more();', '}'].join('\n');
        const aiBlock = 'function late() {\n    better();\n}';
        const res = matchByName(aiBlock, script);
        expect(res?.range.startLine).toBe(2);
        expect(res?.range.endLine).toBe(5);
    });
});

describe('matchBySimilarity', () => {
    it('finds a block with high overlap ignoring cosmetic changes', () => {
        const script = [
            "on('sensor.motion', (obj) => {",
            '    if (obj.state.val) {',
            '        setState("light.kitchen", true);',
            '        log("motion detected");',
            '    }',
            '});',
        ].join('\n');
        const aiBlock = [
            // Same logic, cosmetic tweaks (renamed var, added await)
            '    if (obj.state.val) {',
            '        setState("light.kitchen", true);',
            '        log("motion detected");',
            '    }',
        ].join('\n');
        const res = matchBySimilarity(aiBlock, script);
        expect(res).not.toBeNull();
        expect(res?.method).toBe('similarity');
        expect(res?.confidence).toBeGreaterThan(0.9);
        expect(res?.range.startLine).toBeGreaterThanOrEqual(2);
        expect(res?.range.endLine).toBeLessThanOrEqual(5);
    });

    it('returns null when overlap is below the threshold', () => {
        const script = ['function foo() {', '    return 42;', '}', 'function bar() {', '    return 99;', '}'].join(
            '\n',
        );
        const aiBlock = [
            'function completelyDifferent() {',
            '    doSomethingElse();',
            '    andMoreNewLogic();',
            '    withNothingFamiliar();',
            '}',
        ].join('\n');
        const res = matchBySimilarity(aiBlock, script, 0.5);
        expect(res).toBeNull();
    });

    it('respects the caller-supplied threshold', () => {
        const script = [
            'function foo() {',
            '    const original = veryUniqueSignatureLineNumber123();',
            '    return original;',
            '}',
        ].join('\n');
        // AI block with one unique line matching the script
        const aiBlock = [
            'function foo() {',
            '    const original = veryUniqueSignatureLineNumber123();',
            '    const next = somethingBrandNew();',
            '    return next;',
            '}',
        ].join('\n');
        // With low threshold, matches. With high threshold, doesn't.
        const low = matchBySimilarity(aiBlock, script, 0.2);
        const high = matchBySimilarity(aiBlock, script, 0.9);
        expect(low).not.toBeNull();
        expect(high).toBeNull();
    });

    it('ignores noise lines (empty / braces / punctuation) when scoring', () => {
        // Match ONE signature line; surrounding noise (braces, empties) must NOT
        // boost the score — the window that contains the signature line wins.
        const script = [
            '{',
            '}',
            '',
            '{',
            '}', // noisy prelude
            'const uniqueBusinessRule = computeSomething();', // line 6, signature
            '{',
            '}', // noisy tail
        ].join('\n');
        const aiBlock = [
            'const uniqueBusinessRule = computeSomething();', // matches
            'const newlyAddedLine = somethingNew();', // does not match
        ].join('\n');
        const res = matchBySimilarity(aiBlock, script, 0.4);
        expect(res).not.toBeNull();
        // The winning anchor must be the signature line, not a noise-heavy window
        expect(res?.range.startLine).toBe(6);
    });

    it('returns null when AI block has fewer than 2 significant lines', () => {
        const script = ['a', 'b', 'c'].join('\n');
        const aiBlock = 'x';
        expect(matchBySimilarity(aiBlock, script)).toBeNull();
    });

    it('returns null when script is shorter than minimum window', () => {
        expect(matchBySimilarity('line1\nline2\nline3\nline4', 'x')).toBeNull();
    });

    it('handles empty inputs', () => {
        expect(matchBySimilarity('', 'x')).toBeNull();
        expect(matchBySimilarity('x', '')).toBeNull();
    });

    it('trims the window from both ends to the actually matching region', () => {
        const script = [
            '// prelude 1',
            '// prelude 2',
            '// prelude 3',
            'const foo = uniqueToken_A();',
            'const bar = uniqueToken_B();',
            'const baz = uniqueToken_C();',
            '// trailing 1',
            '// trailing 2',
            '// trailing 3',
        ].join('\n');
        const aiBlock = [
            'const foo = uniqueToken_A();',
            'const bar = uniqueToken_B();',
            'const baz = uniqueToken_C();',
        ].join('\n');
        const res = matchBySimilarity(aiBlock, script, 0.5);
        expect(res).not.toBeNull();
        expect(res?.range.startLine).toBe(4);
        expect(res?.range.endLine).toBe(6);
    });
});

describe('matchCommentBlock', () => {
    it('matches a reworded JSDoc against the single existing JSDoc', () => {
        const script = [
            '/**',
            ' * Turn off the light when no motion is detected for 5 minutes.',
            ' */',
            'function handleMotion() {',
            '    setState("lamp", false);',
            '}',
        ].join('\n');
        const aiBlock = ['/**', ' * Switch off the kitchen lamp after 5 min of inactivity.', ' */'].join('\n');
        const res = matchCommentBlock(aiBlock, script);
        expect(res).not.toBeNull();
        expect(res?.range.startLine).toBe(1);
        expect(res?.range.endLine).toBe(3);
    });

    it('matches on overlapping text content when multiple blocks exist', () => {
        const script = [
            '/**',
            ' * First unrelated description',
            ' */',
            'function a() {}',
            '',
            '/**',
            ' * Turn the lamp on when motion is detected.',
            ' */',
            'function b() {}',
        ].join('\n');
        const aiBlock = [
            '/**',
            ' * Turn the lamp on when motion is detected.',
            ' * Now with improved threshold handling.',
            ' */',
        ].join('\n');
        const res = matchCommentBlock(aiBlock, script);
        expect(res?.range.startLine).toBe(6);
        expect(res?.range.endLine).toBe(8);
    });

    it('matches a //-style comment run', () => {
        const script = ['// Old explanation', '// Describing the old behavior', 'function doStuff() {}'].join('\n');
        const aiBlock = ['// Old explanation', '// New improved wording'].join('\n');
        const res = matchCommentBlock(aiBlock, script);
        expect(res?.range.startLine).toBe(1);
        expect(res?.range.endLine).toBe(2);
    });

    it('returns null when the AI block is not a pure comment block', () => {
        const script = '/** doc */\nfunction a() {}';
        const aiBlock = 'function a() { return 1; }';
        expect(matchCommentBlock(aiBlock, script)).toBeNull();
    });

    it('returns null when the script has no comment blocks', () => {
        const script = 'function a() {}\nfunction b() {}';
        const aiBlock = '// just a comment';
        expect(matchCommentBlock(aiBlock, script)).toBeNull();
    });

    it('matches the single comment block even with zero token overlap', () => {
        const script = ['/**', ' * Old wording that has nothing in common textually', ' */', 'function a() {}'].join(
            '\n',
        );
        const aiBlock = ['/**', ' * Completely reworded description, no shared tokens', ' */'].join('\n');
        const res = matchCommentBlock(aiBlock, script);
        // With exactly one comment block in the script, we fall through to it.
        expect(res?.range.startLine).toBe(1);
        expect(res?.range.endLine).toBe(3);
    });
});

describe('findBestTarget', () => {
    const script = [
        "on('x.0.a', () => {});",
        '',
        'function updateLighting() {',
        '    setState("lamp", true);',
        '    log("on");',
        '}',
        '',
        'const helper = () => doStuff();',
    ].join('\n');

    it('prefers a name-based match over similarity', () => {
        const aiBlock = [
            'function updateLighting() {',
            '    // completely different body',
            '    const nothingInCommon = true;',
            '}',
        ].join('\n');
        const res = findBestTarget(aiBlock, script);
        expect(res?.method).toBe('name');
        expect(res?.matchedName).toBe('updateLighting');
    });

    it('falls back to similarity when no name matches', () => {
        const aiBlock = [
            // Anonymous code that happens to overlap with the on() line
            "on('x.0.a', () => {});",
            "setState('lamp', false);",
        ].join('\n');
        const res = findBestTarget(aiBlock, script, { similarityThreshold: 0.3 });
        expect(res?.method).toBe('similarity');
    });

    it('returns null when neither stage finds anything', () => {
        const aiBlock = ['const someEntirelyUnrelatedThing = 42;', 'const anotherUnrelatedLine = "hello world";'].join(
            '\n',
        );
        expect(findBestTarget(aiBlock, script)).toBeNull();
    });

    it('prefers the comment-block matcher for pure-comment AI replies', () => {
        const withComment = ['/**', ' * Original description', ' */', 'function foo() { return 1; }'].join('\n');
        const aiBlock = ['/**', ' * Updated description', ' */'].join('\n');
        const res = findBestTarget(aiBlock, withComment);
        // Target is the JSDoc, not the function — we don't double-insert the comment.
        expect(res?.range.startLine).toBe(1);
        expect(res?.range.endLine).toBe(3);
    });
});
