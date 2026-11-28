import { describe, expect, it } from 'vitest';

import { RenderError, TemplateError, escapeXml, parseTemplate, renderTemplate } from '../template';
import type { RecipeDevice, RecipeInput } from '../types';

const lamp = (id: string, type = 'light', states: Record<string, string> = { SET: `${id}.SET` }): RecipeDevice => ({
    id,
    name: id,
    type,
    states,
});

describe('recipes: {{name}}', () => {
    it('puts in values of every type', () => {
        const inputs: Record<string, RecipeInput> = {
            n: { type: 'number' },
            d: { type: 'duration' },
            b: { type: 'boolean' },
            f: { type: 'boolean' },
            s: { type: 'string' },
            t: { type: 'time' },
            o: { type: 'select', options: [] },
            st: { type: 'state' },
            dev: { type: 'device', deviceType: 'light' },
        };
        const out = renderTemplate(
            '{{n}}|{{d}}|{{b}}|{{f}}|{{s}}|{{t}}|{{t.hour}}|{{t.minute}}|{{o}}|{{st}}|{{dev}}|{{dev.SET}}|{{dev.type}}',
            inputs,
            { n: 1.5, d: 120, b: true, f: false, s: 'hi', t: '07:05', o: 'eco', st: 'a.0.b', dev: lamp('hm.0.l1') },
        );
        expect(out).toBe('1.5|120|TRUE|FALSE|hi|07:05|7|5|eco|a.0.b|hm.0.l1|hm.0.l1.SET|light');
    });

    it('escapes for XML, in text and in attributes', () => {
        const out = renderTemplate('<a b="{{s}}">{{s}}</a>', { s: { type: 'string' } }, { s: `<"x" & 'y'>` });
        expect(out).toBe(
            '<a b="&lt;&quot;x&quot; &amp; &apos;y&apos;&gt;">&lt;&quot;x&quot; &amp; &apos;y&apos;&gt;</a>',
        );
        expect(escapeXml('a&amp;b')).toBe('a&amp;amp;b');
    });

    it('fails for a value that is missing', () => {
        const inputs: Record<string, RecipeInput> = {
            s: { type: 'string', optional: true },
            dev: { type: 'device', deviceType: 'light' },
        };
        expect(() => renderTemplate('{{s}}', inputs, {})).toThrow(RenderError);
        expect(() => renderTemplate('{{dev.ON_SET}}', inputs, { dev: lamp('l1') })).toThrow(/has no value/);
        expect(() => renderTemplate('{{nothing}}', inputs, {})).toThrow(/there is no input "nothing"/);
    });
});

describe('recipes: {{#each}}', () => {
    const inputs: Record<string, RecipeInput> = {
        light: { type: 'device', deviceType: ['light', 'dimmer'], multiple: true },
    };

    it('links repeated blocks with <next>, as Blockly stores statements', () => {
        const out = renderTemplate(
            '<statement name="DO0">{{#each light}}\n  <block type="control"><field name="OID">{{light.SET}}</field></block>\n{{/each}}</statement>',
            inputs,
            { light: [lamp('l1'), lamp('l2'), lamp('l3')] },
        );
        expect(out).toBe(
            '<statement name="DO0"><block type="control"><field name="OID">l1.SET</field><next>' +
                '<block type="control"><field name="OID">l2.SET</field><next>' +
                '<block type="control"><field name="OID">l3.SET</field></block>' +
                '</next></block></next></block></statement>',
        );
    });

    it('links self-closing blocks, repeats other XML as it is, knows {{@index}}', () => {
        expect(
            renderTemplate('{{#each light}}<block type="x"/>{{/each}}', inputs, { light: [lamp('a'), lamp('b')] }),
        ).toBe('<block type="x"><next><block type="x"/></next></block>');
        expect(
            renderTemplate(
                '<mutation items="{{light.count}}"/>{{#each light}}<value name="ADD{{@index}}">{{light}}</value>{{/each}}',
                inputs,
                { light: [lamp('l1'), lamp('l2')] },
            ),
        ).toBe('<mutation items="2"/><value name="ADD0">l1</value><value name="ADD1">l2</value>');
        expect(renderTemplate('[{{#each light}}<block type="x"/>{{/each}}]', inputs, { light: [] })).toBe('[]');
    });

    it('refuses to link a block that has a <next> of its own', () => {
        expect(() =>
            renderTemplate('{{#each light}}<block type="x"><next><block type="y"/></next></block>{{/each}}', inputs, {
                light: [lamp('a'), lamp('b')],
            }),
        ).toThrow(/must not have a <next> of its own/);
    });
});

describe('recipes: {{#if}}', () => {
    const inputs: Record<string, RecipeInput> = {
        light: { type: 'device', deviceType: ['light', 'dimmer'], multiple: true },
        sensor: { type: 'state', optional: true },
        flag: { type: 'boolean' },
        mode: { type: 'select', options: [] },
    };

    it('takes the branch by the type and the states of each device', () => {
        const template =
            '{{#each light}}[{{#if light.ON_SET}}on:{{light.ON_SET}}{{else}}{{#if light.type == "dimmer"}}level:{{light.SET}}{{else}}switch:{{light.SET}}{{/if}}{{/if}}]{{/each}}';
        const out = renderTemplate(template, inputs, {
            light: [lamp('a'), lamp('b', 'dimmer'), lamp('c', 'dimmer', { SET: 'c.SET', ON_SET: 'c.ON' })],
        });
        expect(out).toBe('[switch:a.SET][level:b.SET][on:c.ON]');
    });

    it('knows whether an optional input is given, and what is false', () => {
        const template = '{{#if sensor}}s{{else}}-{{/if}}{{#if flag}}f{{else}}!f{{/if}}{{#if mode != "eco"}}x{{/if}}';
        expect(renderTemplate(template, inputs, { sensor: 'a.b', flag: true, mode: 'eco' })).toBe('sf');
        expect(renderTemplate(template, inputs, { flag: false, mode: 'comfort' })).toBe('-!fx');
    });
});

describe('recipes: parse errors', () => {
    it.each([
        ['{{#each}}', /must name one input/],
        ['{{#if}}x{{/if}}', /no valid condition/],
        ['{{#if a}}x', /\{\{#if\}\} is not closed/],
        ['{{/each}}', /closes nothing/],
        ['{{else}}', /\{\{else\}\} without \{\{#if\}\}/],
        ['{{a b}}', /is no placeholder/],
    ])('rejects %s', (template, message) => {
        expect(() => parseTemplate(template)).toThrow(TemplateError);
        expect(() => parseTemplate(template)).toThrow(message);
    });

    it('names the line', () => {
        expect(() => parseTemplate('<xml>\n  <a>\n  {{#if x}}\n</xml>')).toThrow(/line 3, column 3/);
    });
});
