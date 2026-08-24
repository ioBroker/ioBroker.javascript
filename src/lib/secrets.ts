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
import { Credentials } from '@iobroker/adapter-core';

/** Prefix of all credential object IDs */
export const SECRETS_PREFIX = 'system.credentials.';

/** Decrypted fields of one credential, e.g. `{ key: 'abc' }` or `{ login: 'user', password: 'pass' }` */
export type SecretValues = Record<string, string | number | boolean>;

/** The global `SECRETS` object: credential name (ID without the prefix) => decrypted fields */
export type Secrets = Record<string, SecretValues>;

/** One credential without its values: only the name and the names of its fields */
export interface SecretStructure {
    /** Credential name, i.e. the object ID without the `system.credentials.` prefix */
    name: string;
    /** Names of the fields this credential has, e.g. `['key']` or `['login', 'password']` */
    fields: string[];
}

/**
 * Checks if the given object ID belongs to the central credential store.
 *
 * @param id Object ID, e.g. `system.credentials.CameraPassword`
 */
export function isSecretId(id: string): boolean {
    return id.startsWith(SECRETS_PREFIX) && id.length > SECRETS_PREFIX.length;
}

/**
 * Extracts the name a credential is exposed under in `SECRETS`.
 *
 * @param id Object ID, e.g. `system.credentials.CameraPassword`
 */
export function getSecretName(id: string): string {
    return id.substring(SECRETS_PREFIX.length);
}

export class SecretsManager {
    private readonly adapter: ioBroker.Adapter;

    /** Decrypted credentials, keyed by name (the credential ID without the `system.credentials.` prefix) */
    private readonly cache: Map<string, Readonly<SecretValues>> = new Map();

    /** If the scripts may read the credentials at all (adapter option `enableSecrets`) */
    private enabled = false;

    /** Warn only once per script run that the feature is disabled */
    private disabledWarningShown = false;

    /**
     * The object handed to the scripts as the global `SECRETS`.
     *
     * It is a read-only view on the cache, so the values stay up to date without the scripts
     * having to re-read anything, and a script cannot modify the credentials of another script.
     */
    public readonly secrets: Secrets;

    constructor(adapter: ioBroker.Adapter) {
        this.adapter = adapter;

        this.secrets = new Proxy(Object.create(null) as Secrets, {
            get: (_target: Secrets, prop: string | symbol): SecretValues | undefined =>
                typeof prop === 'string' ? this.get(prop) : undefined,
            has: (_target: Secrets, prop: string | symbol): boolean => typeof prop === 'string' && this.cache.has(prop),
            ownKeys: (): string[] => (this.enabled ? Array.from(this.cache.keys()) : []),
            getOwnPropertyDescriptor: (_target: Secrets, prop: string | symbol): PropertyDescriptor | undefined => {
                const value = typeof prop === 'string' ? this.get(prop) : undefined;
                return value === undefined
                    ? undefined
                    : { value, enumerable: true, configurable: true, writable: false };
            },
            // The credentials belong to the system - scripts may read them, but never change them
            set: (): boolean => false,
            defineProperty: (): boolean => false,
            deleteProperty: (): boolean => false,
        });
    }

    /** Reads one credential from the cache and warns if the whole feature is switched off */
    private get(name: string): SecretValues | undefined {
        if (!this.enabled) {
            if (!this.disabledWarningShown) {
                this.disabledWarningShown = true;
                this.adapter.log.warn(
                    `A script tried to read the secret "${name}", but the access to the credentials is disabled. Enable "Allow scripts to read the credentials" in the instance settings.`,
                );
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
    async load(enabled: boolean): Promise<void> {
        this.cache.clear();
        this.disabledWarningShown = false;
        this.enabled = enabled;

        if (!enabled) {
            return;
        }

        if (!Credentials?.listCredentials) {
            this.adapter.log.warn(
                'Cannot read the credentials for "SECRETS": the credentials API is only available with js-controller 7.2 or newer',
            );
            this.enabled = false;
            return;
        }

        try {
            const list = await Credentials.listCredentials(this.adapter);
            for (const entry of list) {
                await this.update(entry.id);
            }
            this.adapter.log.debug(`${this.cache.size} secret(s) available in the scripts as "SECRETS"`);
        } catch (e: unknown) {
            this.adapter.log.warn(`Cannot read the credentials: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    /**
     * Reads one credential and decrypts it. Called for every change of a `system.credentials.*`
     * object, so edits in the admin UI are visible in the scripts immediately.
     *
     * @param id Object ID, e.g. `system.credentials.CameraPassword`
     */
    async update(id: string): Promise<void> {
        if (!this.enabled || !isSecretId(id)) {
            return;
        }
        const name = getSecretName(id);

        try {
            const credentials = await Credentials.getCredentials(this.adapter, id);
            this.cache.set(name, Object.freeze({ ...credentials.values }));
        } catch (e: unknown) {
            this.cache.delete(name);
            this.adapter.log.warn(`Cannot read the secret "${name}": ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    /**
     * Forgets one credential because its object was deleted.
     *
     * @param id Object ID, e.g. `system.credentials.CameraPassword`
     */
    remove(id: string): void {
        if (isSecretId(id) && this.cache.delete(getSecretName(id))) {
            this.adapter.log.debug(`Secret "${getSecretName(id)}" was deleted`);
        }
    }

    /**
     * The structure of the credential store without any secret value: which credentials exist and
     * which fields each of them has. Used by the instance settings and the Blockly editor to show
     * the user what `SECRETS.<name>.<field>` expressions are available.
     */
    getStructure(): SecretStructure[] {
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
    getDeclarations(): string {
        const lines = [
            '// Generated by ioBroker.javascript from the central credential store - do not edit',
            'declare namespace iobJS {',
            '    interface Secrets {',
        ];
        for (const { name, fields } of this.getStructure()) {
            const values = this.cache.get(name)!;
            // Declare the fields this credential really has, so the editor suggests exactly those
            const members = fields.map(field => `${JSON.stringify(field)}: ${typeof values[field]}`).join('; ');
            lines.push(`        ${JSON.stringify(name)}: { ${members} };`);
        }
        lines.push('    }', '}', '');
        return lines.join('\n');
    }

    /** Forgets all decrypted credentials */
    destroy(): void {
        this.cache.clear();
        this.enabled = false;
    }
}
