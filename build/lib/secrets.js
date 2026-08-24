"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretsManager = exports.SECRETS_PREFIX = void 0;
exports.isSecretId = isSecretId;
exports.getSecretName = getSecretName;
/**
 * Access to the central ioBroker credential store (`system.credentials.*`) from scripts.
 *
 * The admin UI manages the credentials under "Basic settings" → "Credentials". Every credential
 * has an ID like `system.credentials.CameraPassword` and holds either a single `key` (API keys)
 * or a `login`/`password` pair. The secret fields are stored encrypted with the system secret.
 *
 * This manager keeps all credentials decrypted in memory and exposes them to the scripts as the
 * global `SECRETS` object, so a script can simply write:
 *
 * ```js
 * const password = SECRETS.CameraPassword.key;
 * ```
 *
 * The cache is kept up to date while the adapter is running, so editing a credential in the admin
 * UI takes effect immediately - without restarting the adapter or the scripts.
 */
const adapter_core_1 = require("@iobroker/adapter-core");
/** Prefix of all credential object IDs */
exports.SECRETS_PREFIX = 'system.credentials.';
/**
 * Checks if the given object ID belongs to the central credential store.
 *
 * @param id Object ID, e.g. `system.credentials.CameraPassword`
 */
function isSecretId(id) {
    return id.startsWith(exports.SECRETS_PREFIX) && id.length > exports.SECRETS_PREFIX.length;
}
/**
 * Extracts the name a credential is exposed under in `SECRETS`.
 *
 * @param id Object ID, e.g. `system.credentials.CameraPassword`
 */
function getSecretName(id) {
    return id.substring(exports.SECRETS_PREFIX.length);
}
class SecretsManager {
    adapter;
    /** Decrypted credentials, keyed by name (the credential ID without the `system.credentials.` prefix) */
    cache = new Map();
    /** If the scripts may read the credentials at all (adapter option `enableSecrets`) */
    enabled = false;
    /** Warn only once per script run that the feature is disabled */
    disabledWarningShown = false;
    /**
     * The object handed to the scripts as the global `SECRETS`.
     *
     * It is a read-only view on the cache, so the values stay up to date without the scripts
     * having to re-read anything, and a script cannot modify the credentials of another script.
     */
    secrets;
    constructor(adapter) {
        this.adapter = adapter;
        this.secrets = new Proxy(Object.create(null), {
            get: (_target, prop) => typeof prop === 'string' ? this.get(prop) : undefined,
            has: (_target, prop) => typeof prop === 'string' && this.cache.has(prop),
            ownKeys: () => (this.enabled ? Array.from(this.cache.keys()) : []),
            getOwnPropertyDescriptor: (_target, prop) => {
                const value = typeof prop === 'string' ? this.get(prop) : undefined;
                return value === undefined
                    ? undefined
                    : { value, enumerable: true, configurable: true, writable: false };
            },
            // The credentials belong to the system - scripts may read them, but never change them
            set: () => false,
            defineProperty: () => false,
            deleteProperty: () => false,
        });
    }
    /** Reads one credential from the cache and warns if the whole feature is switched off */
    get(name) {
        if (!this.enabled) {
            if (!this.disabledWarningShown) {
                this.disabledWarningShown = true;
                this.adapter.log.warn(`A script tried to read the secret "${name}", but the access to the credentials is disabled. Enable "Allow scripts to read the credentials" in the instance settings.`);
            }
            return undefined;
        }
        return this.cache.get(name);
    }
    /**
     * Reads all credentials of the central store and decrypts them.
     *
     * @param enabled Value of the adapter option `enableSecrets`
     */
    async load(enabled) {
        this.cache.clear();
        this.disabledWarningShown = false;
        this.enabled = enabled;
        if (!enabled) {
            return;
        }
        if (!adapter_core_1.Credentials?.listCredentials) {
            this.adapter.log.warn('Cannot read the credentials for "SECRETS": the credentials API is only available with js-controller 7.2 or newer');
            this.enabled = false;
            return;
        }
        try {
            const list = await adapter_core_1.Credentials.listCredentials(this.adapter);
            for (const entry of list) {
                await this.update(entry.id);
            }
            this.adapter.log.debug(`${this.cache.size} secret(s) available in the scripts as "SECRETS"`);
        }
        catch (e) {
            this.adapter.log.warn(`Cannot read the credentials: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    /**
     * Reads one credential and decrypts it. Called for every change of a `system.credentials.*`
     * object, so edits in the admin UI are visible in the scripts immediately.
     *
     * @param id Object ID, e.g. `system.credentials.CameraPassword`
     */
    async update(id) {
        if (!this.enabled || !isSecretId(id)) {
            return;
        }
        const name = getSecretName(id);
        try {
            const credentials = await adapter_core_1.Credentials.getCredentials(this.adapter, id);
            this.cache.set(name, Object.freeze({ ...credentials.values }));
        }
        catch (e) {
            this.cache.delete(name);
            this.adapter.log.warn(`Cannot read the secret "${name}": ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    /**
     * Forgets one credential because its object was deleted.
     *
     * @param id Object ID, e.g. `system.credentials.CameraPassword`
     */
    remove(id) {
        if (isSecretId(id) && this.cache.delete(getSecretName(id))) {
            this.adapter.log.debug(`Secret "${getSecretName(id)}" was deleted`);
        }
    }
    /**
     * The structure of the credential store without any secret value: which credentials exist and
     * which fields each of them has. Used by the instance settings and the Blockly editor to show
     * the user what `SECRETS.<name>.<field>` expressions are available.
     */
    getStructure() {
        return Array.from(this.cache.entries())
            .map(([name, values]) => ({ name, fields: Object.keys(values).sort() }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }
    /**
     * Builds the ambient TypeScript declarations for the credentials that currently exist, so the
     * editor can suggest their names after typing `SECRETS.` and their fields after the next dot.
     * The names are merged into the `iobJS.Secrets` interface, which has an index signature for
     * all other names.
     */
    getDeclarations() {
        const lines = [
            '// Generated by ioBroker.javascript from the central credential store - do not edit',
            'declare namespace iobJS {',
            '    interface Secrets {',
        ];
        for (const { name, fields } of this.getStructure()) {
            const values = this.cache.get(name);
            // Declare the fields this credential really has, so the editor suggests exactly those
            const members = fields.map(field => `${JSON.stringify(field)}: ${typeof values[field]}`).join('; ');
            lines.push(`        ${JSON.stringify(name)}: { ${members} };`);
        }
        lines.push('    }', '}', '');
        return lines.join('\n');
    }
    /** Forgets all decrypted credentials */
    destroy() {
        this.cache.clear();
        this.enabled = false;
    }
}
exports.SecretsManager = SecretsManager;
//# sourceMappingURL=secrets.js.map