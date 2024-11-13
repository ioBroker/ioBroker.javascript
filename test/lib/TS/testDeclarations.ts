/*
	This file is used to test the embedded declarations. It is run in
	strict mode in order to make use of control flow analysis
*/

import { Equals, AssignableTo } from 'alcalzone-shared/types';

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
setState('id', 1, id => {
    id!.toLowerCase();
});

const selected = $('selector');
selected.getState<number>()!.val.toFixed();

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
if (state1.notExist) {
    assertTrue<Equals<typeof state1, iobJS.AbsentState>>();
    assertFalse<AssignableTo<typeof state1, iobJS.State<any>>>();
} else if (state1.ack) {
    assertTrue<AssignableTo<typeof state1, iobJS.State<any>>>();
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
