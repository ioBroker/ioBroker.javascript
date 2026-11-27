'use strict';

const assert = require('node:assert/strict');

const {
    RecipeCatalog,
    DEFAULT_RECIPES_URL,
    RECIPES_MAX_AGE_MS,
    parseCatalog,
    recipeRunsWith,
} = require('../build/lib/recipes');

const recipe = (id, minJavascript = '8.0.0') => ({ id, version: '1.0.0', minJavascript });
const catalogText = recipes => JSON.stringify({ format: 1, buildTime: '2026-11-27T12:00:00.000Z', recipes });

/** A catalog with a fake internet and a fake file storage */
function create({ version = '10.6.0', responses = [] } = {}) {
    let now = 1_000_000;
    const requests = [];
    const storage = { text: null, writes: 0 };
    const catalog = new RecipeCatalog({
        version,
        now: () => now,
        fetchText: async url => {
            requests.push(url);
            const next = responses.length > 1 ? responses.shift() : responses[0];
            if (next instanceof Error) {
                throw next;
            }
            return next;
        },
        readCache: async () => storage.text,
        writeCache: async text => {
            storage.text = text;
            storage.writes++;
        },
    });
    return { catalog, requests, storage, advance: ms => (now += ms) };
}

describe('Recipes: the catalog for the editor', () => {
    it('loads the official catalog when the setting is empty', async () => {
        const { catalog, requests } = create({ responses: [catalogText([recipe('a')])] });
        const answer = await catalog.get('');
        assert.deepEqual(requests, [DEFAULT_RECIPES_URL]);
        assert.deepEqual(
            answer.recipes.map(r => r.id),
            ['a'],
        );
        assert.equal(answer.url, DEFAULT_RECIPES_URL);
        assert.equal(answer.buildTime, '2026-11-27T12:00:00.000Z');
        assert.equal(answer.fromCache, undefined);
        assert.equal(answer.error, undefined);
    });

    it('hides recipes that need a newer adapter, a development version counts as its release', async () => {
        const { catalog } = create({
            version: '10.7.0-alpha.3',
            responses: [catalogText([recipe('old', '8.0.0'), recipe('now', '10.7.0'), recipe('later', '11.0.0')])],
        });
        const answer = await catalog.get('http://local/recipes.json');
        assert.deepEqual(
            answer.recipes.map(r => r.id),
            ['old', 'now'],
        );
        assert.equal(answer.hidden, 1);
        assert.equal(answer.version, '10.7.0-alpha.3');
        assert.equal(recipeRunsWith(recipe('x', 'no version'), '10.0.0'), false);
        assert.equal(recipeRunsWith({ id: 'x', version: '1.0.0' }, '10.0.0'), true);
    });

    it('keeps the catalog for an hour, unless the editor wants it new', async () => {
        const { catalog, requests, advance } = create({ responses: [catalogText([recipe('a')])] });
        await catalog.get('http://local/recipes.json');
        await catalog.get('http://local/recipes.json');
        assert.equal(requests.length, 1, 'from memory');
        await catalog.get('http://local/recipes.json', true);
        assert.equal(requests.length, 2, 'force');
        advance(RECIPES_MAX_AGE_MS + 1);
        await catalog.get('http://local/recipes.json');
        assert.equal(requests.length, 3, 'older than an hour');
        await catalog.get('http://other/recipes.json');
        assert.equal(requests.length, 4, 'another URL');
    });

    it('asks only once when several editors ask at the same time', async () => {
        const { catalog, requests } = create({ responses: [catalogText([recipe('a')])] });
        const answers = await Promise.all([catalog.get('', true), catalog.get('', true), catalog.get('', true)]);
        assert.equal(requests.length, 1);
        assert.ok(answers.every(answer => answer.recipes.length === 1));
    });

    it('uses the stored copy without internet, also after a restart', async () => {
        const first = create({ responses: [catalogText([recipe('a'), recipe('b')])] });
        await first.catalog.get('');
        assert.equal(first.storage.writes, 1);

        // a new instance of the adapter: nothing in memory, no internet
        const second = create({ responses: [new Error('getaddrinfo ENOTFOUND iobroker.github.io')] });
        second.storage.text = first.storage.text;
        const answer = await second.catalog.get('');
        assert.deepEqual(
            answer.recipes.map(r => r.id),
            ['a', 'b'],
        );
        assert.equal(answer.fromCache, true);
        assert.match(answer.error, /Cannot load the recipes from https:\/\/iobroker\.github\.io\/.*ENOTFOUND/);
    });

    it('answers with an error and no recipes if there is neither internet nor a copy', async () => {
        const { catalog } = create({ responses: [new Error('timeout of 15000ms exceeded')] });
        const answer = await catalog.get('');
        assert.deepEqual(answer.recipes, []);
        assert.match(answer.error, /timeout/);
        assert.equal(answer.fromCache, undefined);
    });

    it('takes a broken catalog for an error, and keeps the copy it had', async () => {
        const { catalog, storage } = create({
            responses: [catalogText([recipe('a')]), '<html>404</html>', JSON.stringify({ format: 2, recipes: [] })],
        });
        await catalog.get('');
        const html = await catalog.get('', true);
        assert.match(html.error, /no valid JSON/);
        assert.equal(html.fromCache, true);
        assert.deepEqual(
            html.recipes.map(r => r.id),
            ['a'],
        );
        const newer = await catalog.get('', true);
        assert.match(newer.error, /format 2, this version of the adapter reads format 1/);
        assert.equal(storage.writes, 1, 'the broken ones were not stored');
    });

    it('parseCatalog wants the list and the format', () => {
        assert.throws(() => parseCatalog('{"format": 1}'), /no list "recipes"/);
        assert.throws(() => parseCatalog('null'), /no list "recipes"/);
        assert.deepEqual(parseCatalog(catalogText([])).recipes, []);
    });
});
