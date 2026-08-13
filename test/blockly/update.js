/**
 * Regenerates the golden files: `npm run test:blockly:update`
 *
 * Run this only when a change to the generated code is intended, and review the resulting diff -
 * it is the exact list of blocks whose output changed.
 */
const { buildSnapshots, writeSnapshots } = require('./snapshot');

const { snapshots, blockCount, failures } = buildSnapshots();
const written = writeSnapshots(snapshots);

console.log(`${blockCount} blocks -> ${written.length} snapshot(s): ${written.join(', ')}`);

if (failures.length) {
    console.log(`\n${failures.length} block(s) could not be generated:`);
    failures.forEach(f => console.log(`  ${f}`));
}
