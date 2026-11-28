/**
 * The catalog of the automation recipes (https://github.com/ioBroker/ioBroker.recipes) for the editor.
 *
 * The adapter loads recipes.json from the URL of the instance settings and keeps a copy in the file
 * storage of the instance: without internet the editor gets that copy. Recipes that need a newer
 * version of the adapter (minJavascript) are left out.
 */
export const DEFAULT_RECIPES_URL = 'https://iobroker.github.io/ioBroker.recipes/recipes.json';

/** The copy of the catalog in the file storage of the instance */
export const RECIPES_CACHE_FILE = 'recipes/catalog.json';

/** The catalog is loaded again at most this often, unless the editor asks for it */
export const RECIPES_MAX_AGE_MS = 60 * 60 * 1000;

/** The version of recipes.json this adapter reads */
const CATALOG_FORMAT = 1;

interface Recipe {
    id: string;
    version: string;
    minJavascript?: string;
    [key: string]: unknown;
}

interface Catalog {
    format: number;
    buildTime?: string;
    recipes: Recipe[];
}

/** What is stored in the file storage */
interface CachedCatalog {
    url: string;
    loaded: number;
    catalog: Catalog;
}

export interface RecipesAnswer {
    recipes: Recipe[];
    buildTime?: string;
    /** When the catalog was loaded */
    loaded?: number;
    /** The catalog could not be loaded, this is the copy of an earlier one */
    fromCache?: boolean;
    /** Recipes that need a newer version of the adapter */
    hidden: number;
    version: string;
    url: string;
    error?: string;
}

export interface RecipeCatalogOptions {
    /** The version of the adapter */
    version: string;
    /** Loads a URL and returns the text */
    fetchText: (url: string) => Promise<string>;
    readCache: () => Promise<string | null>;
    writeCache: (text: string) => Promise<void>;
    now?: () => number;
}

/** Throws if the text is no catalog this adapter can read */
export function parseCatalog(text: string): Catalog {
    let catalog: Catalog;
    try {
        catalog = JSON.parse(text);
    } catch (e) {
        throw new Error(`the catalog is no valid JSON: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (!catalog || typeof catalog !== 'object' || !Array.isArray(catalog.recipes)) {
        throw new Error('the catalog has no list "recipes"');
    }
    if (catalog.format !== CATALOG_FORMAT) {
        throw new Error(
            `the catalog has the format ${catalog.format}, this version of the adapter reads format ${CATALOG_FORMAT}`,
        );
    }
    return catalog;
}

const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;

/** Can this version of the adapter run the recipe? A development version counts as its release */
export function recipeRunsWith(recipe: Recipe, version: string): boolean {
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

export class RecipeCatalog {
    private memory: CachedCatalog | null = null;

    private loading: Promise<RecipesAnswer> | null = null;

    constructor(private readonly options: RecipeCatalogOptions) {}

    private now(): number {
        return this.options.now ? this.options.now() : Date.now();
    }

    private answer(cached: CachedCatalog, fromCache: boolean, error?: string): RecipesAnswer {
        const recipes = cached.catalog.recipes.filter(recipe => recipeRunsWith(recipe, this.options.version));
        const answer: RecipesAnswer = {
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
    get(url: string, force?: boolean): Promise<RecipesAnswer> {
        url = (url || '').trim() || DEFAULT_RECIPES_URL;
        if (!force && this.memory && this.memory.url === url && this.now() - this.memory.loaded < RECIPES_MAX_AGE_MS) {
            return Promise.resolve(this.answer(this.memory, false));
        }
        // one request at a time, the editor may ask from several tabs
        this.loading ||= this.load(url).finally(() => {
            this.loading = null;
        });
        return this.loading;
    }

    private async load(url: string): Promise<RecipesAnswer> {
        let error: string;
        try {
            const catalog = parseCatalog(await this.options.fetchText(url));
            this.memory = { url, loaded: this.now(), catalog };
            try {
                await this.options.writeCache(JSON.stringify(this.memory));
            } catch {
                // without a copy it works as well, only not offline
            }
            return this.answer(this.memory, false);
        } catch (e) {
            error = `Cannot load the recipes from ${url}: ${e instanceof Error ? e.message : String(e)}`;
        }

        const cached = this.memory || (await this.readCache());
        if (cached) {
            return this.answer(cached, true, error);
        }
        return { recipes: [], hidden: 0, version: this.options.version, url, error };
    }

    private async readCache(): Promise<CachedCatalog | null> {
        try {
            const text = await this.options.readCache();
            if (!text) {
                return null;
            }
            const cached: CachedCatalog = JSON.parse(text);
            parseCatalog(JSON.stringify(cached.catalog));
            return cached;
        } catch {
            return null;
        }
    }
}
