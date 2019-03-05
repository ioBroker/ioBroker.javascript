const expect = require('chai').expect;
const Scheduler = require('../lib/scheduler');
const tk = require('timekeeper');

describe('Test Scheduler', function() {

    it('Test Scheduler: Should trigger on 23:59 every year', function (done) {
        const time = new Date(2030, 11, 31, 23, 58, 57);
        console.log('Wait ...');
        tk.travel(time);

        console.log(new Date());
        const s = new Scheduler(null, Date);
        s.add( '{"time":{"exactTime":true,"start":"23:59"},"period":{"years":1,"yearDate":31,"yearMonth":12}}', () => {
            console.log(new Date());
            done();
        });
    }).timeout(65000);

    it('Test Scheduler: Should not trigger on 23:59 every year day before', function (done) {
        const time = new Date(2030, 11, 30, 23, 58, 57);
        console.log('Wait 5 seconds...');
        tk.travel(time);

        console.log(new Date());
        const s = new Scheduler(null, Date);
        s.add( '{"time":{"exactTime":true,"start":"23:59"},"period":{"years":1,"yearDate":31,"yearMonth":12}}', () => {
            expect(false).to.be.true;
        });
        setTimeout(done, 5000);
    }).timeout(65000);
});