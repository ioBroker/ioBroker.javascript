const assert = require('node:assert').strict;
const { hasNaNDelay } = require('../build/lib/tools');

/**
 * The editor since 10.1.0 made `NaN` of a variable typed into the time field of "pause", "execute in" and
 * "interval" (#2471). The stored code of such a script is fixed only by saving it again, so the adapter warns
 * when it starts one - these are the shapes the editor generated.
 */
describe('Blockly scripts that wait NaN ms (#2471)', () => {
    it('finds a pause of NaN', () => {
        assert.equal(hasNaNDelay("console.info('1');\nawait wait(NaN);\nconsole.info('2');\n"), true);
    });

    it('finds a timeout and an interval of NaN', () => {
        assert.equal(hasNaNDelay('timeout = setTimeout(async () => {\n  timeout = null;\n}, NaN);\n'), true);
        assert.equal(hasNaNDelay('interval = setInterval(async () => {\n}, NaN);\n'), true);
    });

    it('leaves scripts with real delays alone', () => {
        assert.equal(hasNaNDelay('await wait(dauer);\nawait wait(500);\n'), false);
        assert.equal(hasNaNDelay('timeout = setTimeout(async () => {\n}, (dauer) * 1000);\n'), false);
        // a NaN the script itself works with is no delay
        assert.equal(hasNaNDelay("if (isNaN(x)) { log('NaN'); }\n"), false);
    });
});
