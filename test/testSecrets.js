const assert = require('node:assert').strict;
const { SecretsManager, isSecretId, getSecretName, SECRETS_PREFIX } = require('../build/lib/secrets');

function createCredentialObject(name, native) {
    return {
        _id: `${SECRETS_PREFIX}${name}`,
        type: 'config',
        common: { name },
        native,
    };
}

function createAdapter(objects) {
    const logs = { warn: [], debug: [], error: [], info: [] };
    return {
        logs,
        objects,
        log: {
            warn: text => logs.warn.push(text),
            debug: text => logs.debug.push(text),
            error: text => logs.error.push(text),
            info: text => logs.info.push(text),
        },
        decrypt: value => `decrypted:${value}`,
        getForeignObjectsAsync: async () => objects,
        getForeignObjectAsync: async id => objects[id] || null,
    };
}

function createObjects() {
    return {
        [`${SECRETS_PREFIX}CameraPassword`]: createCredentialObject('CameraPassword', {
            type: 'custom',
            version: 1,
            encryptedFields: ['key'],
            key: 'camera-secret',
        }),
        [`${SECRETS_PREFIX}MyMail`]: createCredentialObject('MyMail', {
            type: 'email',
            version: 1,
            encryptedFields: ['password'],
            login: 'user@example.com',
            password: 'mail-secret',
        }),
    };
}

describe('Test Secrets (global SECRETS object)', function () {
    describe('module graph', function () {
        it('does not pull js-controller into the test process', function () {
            // The package index of `@iobroker/adapter-core` looks for js-controller while it is
            // being loaded and terminates the process with exit code 10 when it is missing (see
            // its `utils.js`). Mocha loads every test file before the integration tests install a
            // controller, so a unit test that reaches the index kills the whole run on a clean
            // machine - which is invisible on a developer box that has ioBroker installed.
            // `@iobroker/adapter-core/credentials` is the entry point without that side effect.
            const loaded = Object.keys(require.cache).map(file => file.split('\\').join('/'));
            const forbidden = loaded
                .filter(file => /@iobroker\/adapter-core\/build\/[a-z]+\/(index|utils)\.js$/.test(file))
                .map(file => file.substring(file.indexOf('@iobroker')));

            assert.deepEqual(forbidden, []);
        });
    });

    describe('helpers', function () {
        it('detects credential IDs', function () {
            assert.equal(isSecretId('system.credentials.CameraPassword'), true);
            assert.equal(isSecretId('system.credentials.'), false);
            assert.equal(isSecretId('system.config'), false);
            assert.equal(isSecretId('javascript.0.scriptEnabled.test'), false);
        });

        it('extracts the name of a credential', function () {
            assert.equal(getSecretName('system.credentials.CameraPassword'), 'CameraPassword');
            assert.equal(getSecretName('system.credentials.My Mail Account'), 'My Mail Account');
        });
    });

    describe('load', function () {
        it('decrypts the key of a "key" credential', async function () {
            const manager = new SecretsManager(createAdapter(createObjects()));
            await manager.load(true);
            assert.equal(manager.secrets.CameraPassword.key, 'decrypted:camera-secret');
        });

        it('decrypts only the encrypted fields of a "login" credential', async function () {
            const manager = new SecretsManager(createAdapter(createObjects()));
            await manager.load(true);
            assert.equal(manager.secrets.MyMail.login, 'user@example.com');
            assert.equal(manager.secrets.MyMail.password, 'decrypted:mail-secret');
        });

        it('does not expose the meta fields of a credential', async function () {
            const manager = new SecretsManager(createAdapter(createObjects()));
            await manager.load(true);
            assert.deepEqual(Object.keys(manager.secrets.CameraPassword), ['key']);
        });

        it('is enumerable', async function () {
            const manager = new SecretsManager(createAdapter(createObjects()));
            await manager.load(true);
            assert.deepEqual(Object.keys(manager.secrets).sort(), ['CameraPassword', 'MyMail']);
            assert.equal('CameraPassword' in manager.secrets, true);
            assert.equal('NotExisting' in manager.secrets, false);
        });

        it('returns undefined for an unknown credential', async function () {
            const manager = new SecretsManager(createAdapter(createObjects()));
            await manager.load(true);
            assert.equal(manager.secrets.NotExisting, undefined);
        });

        it('reads nothing and warns if the access is disabled', async function () {
            const adapter = createAdapter(createObjects());
            const manager = new SecretsManager(adapter);
            await manager.load(false);
            assert.equal(manager.secrets.CameraPassword, undefined);
            assert.deepEqual(Object.keys(manager.secrets), []);
            assert.equal(adapter.logs.warn.length, 1);
            // The warning is shown only once
            assert.equal(manager.secrets.CameraPassword, undefined);
            assert.equal(adapter.logs.warn.length, 1);
        });
    });

    describe('read-only', function () {
        it('cannot be replaced by a script', async function () {
            const manager = new SecretsManager(createAdapter(createObjects()));
            await manager.load(true);
            assert.throws(() => {
                'use strict';
                manager.secrets.CameraPassword = { key: 'hacked' };
            }, TypeError);
            assert.equal(manager.secrets.CameraPassword.key, 'decrypted:camera-secret');
        });

        it('cannot be changed by a script', async function () {
            const manager = new SecretsManager(createAdapter(createObjects()));
            await manager.load(true);
            assert.throws(() => {
                'use strict';
                manager.secrets.CameraPassword.key = 'hacked';
            }, TypeError);
            assert.equal(manager.secrets.CameraPassword.key, 'decrypted:camera-secret');
        });

        it('cannot be deleted by a script', async function () {
            const manager = new SecretsManager(createAdapter(createObjects()));
            await manager.load(true);
            assert.throws(() => {
                'use strict';
                delete manager.secrets.CameraPassword;
            }, TypeError);
            assert.equal(manager.secrets.CameraPassword.key, 'decrypted:camera-secret');
        });
    });

    describe('update/remove', function () {
        it('picks up changes of a credential', async function () {
            const objects = createObjects();
            const manager = new SecretsManager(createAdapter(objects));
            await manager.load(true);

            objects[`${SECRETS_PREFIX}CameraPassword`].native.key = 'new-camera-secret';
            await manager.update(`${SECRETS_PREFIX}CameraPassword`);
            assert.equal(manager.secrets.CameraPassword.key, 'decrypted:new-camera-secret');
        });

        it('picks up new credentials', async function () {
            const objects = createObjects();
            const manager = new SecretsManager(createAdapter(objects));
            await manager.load(true);

            objects[`${SECRETS_PREFIX}Later`] = createCredentialObject('Later', {
                type: 'custom',
                version: 1,
                encryptedFields: ['key'],
                key: 'later-secret',
            });
            await manager.update(`${SECRETS_PREFIX}Later`);
            assert.equal(manager.secrets.Later.key, 'decrypted:later-secret');
        });

        it('forgets deleted credentials', async function () {
            const objects = createObjects();
            const manager = new SecretsManager(createAdapter(objects));
            await manager.load(true);

            delete objects[`${SECRETS_PREFIX}CameraPassword`];
            manager.remove(`${SECRETS_PREFIX}CameraPassword`);
            assert.equal(manager.secrets.CameraPassword, undefined);
            assert.equal(manager.secrets.MyMail.password, 'decrypted:mail-secret');
        });

        it('ignores changes while the access is disabled', async function () {
            const objects = createObjects();
            const manager = new SecretsManager(createAdapter(objects));
            await manager.load(false);

            await manager.update(`${SECRETS_PREFIX}CameraPassword`);
            assert.equal(manager.secrets.CameraPassword, undefined);
        });

        it('ignores IDs outside of the credential store', async function () {
            const objects = createObjects();
            const manager = new SecretsManager(createAdapter(objects));
            await manager.load(true);

            await manager.update('system.config');
            assert.deepEqual(Object.keys(manager.secrets).sort(), ['CameraPassword', 'MyMail']);
        });
    });

    describe('getStructure', function () {
        it('reports the fields of every credential without any value', async function () {
            const manager = new SecretsManager(createAdapter(createObjects()));
            await manager.load(true);
            assert.deepEqual(manager.getStructure(), [
                { name: 'CameraPassword', fields: ['key'] },
                { name: 'MyMail', fields: ['login', 'password'] },
            ]);
        });

        it('reports nothing if the access is disabled', async function () {
            const manager = new SecretsManager(createAdapter(createObjects()));
            await manager.load(false);
            assert.deepEqual(manager.getStructure(), []);
        });
    });

    describe('getDeclarations', function () {
        it('declares the real fields of every credential for the editor', async function () {
            const manager = new SecretsManager(createAdapter(createObjects()));
            await manager.load(true);
            const declarations = manager.getDeclarations();
            assert.ok(declarations.includes('declare namespace iobJS {'));
            assert.ok(declarations.includes('interface Secrets {'));
            assert.ok(declarations.includes('"CameraPassword": { "key": string };'));
            assert.ok(declarations.includes('"MyMail": { "login": string; "password": string };'));
        });

        it('quotes names that are no valid identifiers', async function () {
            const objects = createObjects();
            objects[`${SECRETS_PREFIX}My camera`] = createCredentialObject('My camera', {
                type: 'custom',
                version: 1,
                encryptedFields: ['key'],
                key: 'secret',
            });
            const manager = new SecretsManager(createAdapter(objects));
            await manager.load(true);
            assert.ok(manager.getDeclarations().includes('"My camera": { "key": string };'));
        });

        it('declares nothing if the access is disabled', async function () {
            const manager = new SecretsManager(createAdapter(createObjects()));
            await manager.load(false);
            assert.equal(manager.getDeclarations().includes(': {'), false);
        });
    });

    describe('destroy', function () {
        it('forgets all decrypted credentials', async function () {
            const manager = new SecretsManager(createAdapter(createObjects()));
            await manager.load(true);
            manager.destroy();
            assert.deepEqual(Object.keys(manager.secrets), []);
        });
    });
});
