/*
	This file is used to test the embedded declarations. It is run in
	strict mode in order to make use of control flow analysis
*/

import type { Equals, AssignableTo } from 'alcalzone-shared/types';

// Used to test the types
function assertTrue<T extends true>() {
    return undefined!;
}
function assertFalse<T extends false>() {
    return undefined!;
}

// All these method invocations should be valid
getState('id');
getState('id').ack;
getState('id').val;
getState('id').ts;

setState('id', 1);
setState('id', 1, true);
setState('id', 1, (error: Error | null | undefined, id?: string): void => {
    id!.toString().toLowerCase();
});

const selected = $('selector');
selected.getState<number>()!.val?.toFixed();

// Repro from #539
$('*').setState(1);

// Repro from #636
$('*').each(async () => {});

schedule({ astro: 'night' }, () => {});

// TODO: Add more tests

// ===========================
// Regression tests:

// Repro from https://forum.iobroker.net/viewtopic.php?t=19990

const state1 = getState('rollo_wz_sued');
if ((state1 as iobJS.AbsentState).notExist) {
    // assertTrue<Equals<typeof state1, iobJS.AbsentState>>();
    assertFalse<AssignableTo<typeof state1, iobJS.TypedState<any>>>();
} else if (state1.ack) {
    assertTrue<AssignableTo<typeof state1, iobJS.TypedState<any>>>();
    assertFalse<Equals<typeof state1, iobJS.AbsentState>>();

    let test1 = state1.val! * 100;
    test1 += 100;
}

onFile('vis.0', 'main/*', true, (id, fileName, size, data, mimeType) => {
    assertTrue<Equals<typeof id, string>>();
    assertTrue<Equals<typeof fileName, string>>();
    assertTrue<Equals<typeof size, number>>();
    assertTrue<Equals<typeof data, string | Buffer>>();
    assertTrue<Equals<typeof mimeType, string | undefined>>();
});

onFile('vis.0', 'main/*', false, (id, fileName, size, data, mimeType) => {
    assertTrue<Equals<typeof data, undefined>>();
    assertTrue<Equals<typeof mimeType, undefined>>();
});

onFile('vis.0', 'main/*', Math.random() > 0, (id, fileName, size, data, mimeType) => {
    assertTrue<Equals<typeof data, string | Buffer | undefined>>();
    assertTrue<Equals<typeof mimeType, string | undefined>>();
});

// Central credential store.
// The adapter generates an exact type for every credential that exists, so only the fallback for
// unknown names can be checked here - there the fields are optional, because a credential has
// either a "key" or a "login"/"password".
const cameraPassword = SECRETS.CameraPassword.key;
assertTrue<Equals<typeof cameraPassword, string | undefined>>();
const mailLogin = SECRETS['My Mail Account'].login;
assertTrue<Equals<typeof mailLogin, string | undefined>>();
const anyField = SECRETS.CameraPassword.somethingElse;
assertTrue<Equals<typeof anyField, string | number | boolean | undefined>>();

// File functions and ACL of files and objects
readDir('vis.0', '/main', (err, entries) => {
    assertTrue<Equals<typeof err, Error | null>>();
    assertTrue<Equals<typeof entries, iobJS.ReadDirResult[] | undefined>>();
});
readDir('/backups', (err, entries) => {
    assertTrue<Equals<typeof entries, iobJS.ReadDirResult[] | undefined>>();
});
fileExists('vis.0', '/main/vis-views.json', (err, exists) => {
    assertTrue<Equals<typeof exists, boolean | undefined>>();
});
chmodFile('vis.0', '/main/*', 0x644);
chownFile('vis.0', '/main/*', 'admin', (err, processed) => {
    assertTrue<Equals<typeof processed, iobJS.ChownFileResult[] | undefined>>();
});
chownFile(null, '/main/*', 'admin', 'administrator');
chmodObject('0_userdata.0.test', 0x664, '660', (err, acl) => {
    assertTrue<Equals<typeof acl, iobJS.StateACL | undefined>>();
});
chmodObject('0_userdata.0.test', null, 0x660);
chownObject('0_userdata.0.test', 'admin', (err, acl) => {
    assertTrue<Equals<typeof acl, iobJS.StateACL | undefined>>();
});
(async () => {
    const entries = await readDirAsync('vis.0', '/main');
    assertTrue<Equals<typeof entries, iobJS.ReadDirResult[]>>();
    const exists = await fileExistsAsync('/backups/a.json');
    assertTrue<Equals<typeof exists, boolean>>();
    const processed = await chmodFileAsync('vis.0', '/main/*', '644');
    assertTrue<Equals<typeof processed, iobJS.ChownFileResult[]>>();
    const acl = await chownObjectAsync('0_userdata.0.test', 'admin', 'administrator');
    assertTrue<Equals<typeof acl.state, number>>();
    await chmodObjectAsync('0_userdata.0.test', 0x664);
})();
