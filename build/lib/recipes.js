"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecipeCatalog = exports.RECIPES_MAX_AGE_MS = exports.RECIPES_CACHE_FILE = exports.DEFAULT_RECIPES_URL = void 0;
exports.parseCatalog = parseCatalog;
exports.recipeRunsWith = recipeRunsWith;
/**
 * The catalog of the automation recipes (https://github.com/ioBroker/ioBroker.recipes) for the editor.
 *
 * The adapter loads recipes.json from the URL of the instance settings and keeps a copy in the file
 * storage of the instance: without internet the editor gets that copy. Recipes that need a newer
 * version of the adapter (minJavascript) are left out.
 */
exports.DEFAULT_RECIPES_URL = 'https://iobroker.github.io/ioBroker.recipes/recipes.json';
/** The copy of the catalog in the file storage of the instance */
exports.RECIPES_CACHE_FILE = 'recipes/catalog.json';
/** The catalog is loaded again at most this often, unless the editor asks for it */
exports.RECIPES_MAX_AGE_MS = 60 * 60 * 1000;
/** The version of recipes.json this adapter reads */
const CATALOG_FORMAT = 1;
/** Throws if the text is no catalog this adapter can read */
function parseCatalog(text) {
    let catalog;
    try {
        catalog = JSON.parse(text);
    }
    catch (e) {
        throw new Error(`the catalog is no valid JSON: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (!catalog || typeof catalog !== 'object' || !Array.isArray(catalog.recipes)) {
        throw new Error('the catalog has no list "recipes"');
    }
    if (catalog.format !== CATALOG_FORMAT) {
        throw new Error(`the catalog has the format ${catalog.format}, this version of the adapter reads format ${CATALOG_FORMAT}`);
    }
    return catalog;
}
const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;
/** Can this version of the adapter run the recipe? A development version counts as its release */
function recipeRunsWith(recipe, version) {
    const min = recipe.minJavascript;
    if (!min) {
        return true;
    }
    const need = VERSION_RE.exec(min);
    const have = VERSION_RE.exec(version);
    if (!need || !have) {
        return false;
    }
    for (let i = 1; i <= 3; i++) {
        const diff = parseInt(have[i], 10) - parseInt(need[i], 10);
        if (diff) {
            return diff > 0;
        }
    }
    // the same release; a recipe for 10.7.0-beta runs with 10.7.0-alpha as well
    return true;
}
class RecipeCatalog {
    options;
    memory = null;
    loading = null;
    constructor(options) {
        this.options = options;
    }
    now() {
        return this.options.now ? this.options.now() : Date.now();
    }
    answer(cached, fromCache, error) {
        const recipes = cached.catalog.recipes.filter(recipe => recipeRunsWith(recipe, this.options.version));
        const answer = {
            recipes,
            buildTime: cached.catalog.buildTime,
            loaded: cached.loaded,
            hidden: cached.catalog.recipes.length - recipes.length,
            version: this.options.version,
            url: cached.url,
        };
        if (fromCache) {
            answer.fromCache = true;
        }
        if (error) {
            answer.error = error;
        }
        return answer;
    }
    /**
     * The catalog: from memory if it is younger than an hour, else loaded again. If that fails, the
     * stored copy.
     *
     * @param url where recipes.json is
     * @param force load it again in any case
     */
    get(url, force) {
        url = (url || '').trim() || exports.DEFAULT_RECIPES_URL;
        if (!force && this.memory && this.memory.url === url && this.now() - this.memory.loaded < exports.RECIPES_MAX_AGE_MS) {
            return Promise.resolve(this.answer(this.memory, false));
        }
        // one request at a time, the editor may ask from several tabs
        this.loading ||= this.load(url).finally(() => {
            this.loading = null;
        });
        return this.loading;
    }
    async load(url) {
        let error;
        try {
            const catalog = parseCatalog(await this.options.fetchText(url));
            this.memory = { url, loaded: this.now(), catalog };
            try {
                await this.options.writeCache(JSON.stringify(this.memory));
            }
            catch {
                // without a copy it works as well, only not offline
            }
            return this.answer(this.memory, false);
        }
        catch (e) {
            error = `Cannot load the recipes from ${url}: ${e instanceof Error ? e.message : String(e)}`;
        }
        const cached = this.memory || (await this.readCache());
        if (cached) {
            return this.answer(cached, true, error);
        }
        return { recipes: [], hidden: 0, version: this.options.version, url, error };
    }
    async readCache() {
        try {
            const text = await this.options.readCache();
            if (!text) {
                return null;
            }
            const cached = JSON.parse(text);
            parseCatalog(JSON.stringify(cached.catalog));
            return cached;
        }
        catch {
            return null;
        }
    }
}
exports.RecipeCatalog = RecipeCatalog;
//# sourceMappingURL=recipes.js.map