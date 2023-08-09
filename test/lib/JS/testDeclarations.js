/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

/*
	This file is used to test the embedded declarations in JS.
	It is NOT run in strict mode in order to test most users'
	coding style
*/

// All these method invocations should be valid
getState('id');
getState('id').ack;
getState('id').val;
getState('id').ts;

setState('id', 1);
setState('id', 1, true);
setState('id', 1, (id) => {
    id && id.toLowerCase();
});

getBinaryState('id').readInt16LE(0);
setBinaryState('id', new Buffer(0));

const selected = $('selector');
const test1 = selected.getState();
test1 && test1.val.toFixed();
const test2 = selected.getBinaryState();
test2 && test2.readInt16BE(0);

schedule({ astro: 'night' }, () => { });

// TODO: Add more tests

// ===========================
// Regression tests:

// Repro from https://forum.iobroker.net/viewtopic.php?t=19990

const state1 = getState('rollo_wz_sued');
if (state1.ack) {
    let test2 = state1.val * 100;
    test2 += 100;
}

// Repro from #539
$('*').setState(1);

// Repro from #636
$('*').each(async () => {});
