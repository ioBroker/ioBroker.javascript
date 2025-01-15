const expect = require('chai').expect;
const tk = require('timekeeper');
const suncalc = require('suncalc2');
const Scheduler = require('../lib/scheduler');

describe('Test Scheduler', function () {
    it('Test Scheduler: Should trigger on 23:59 every year', function (done) {
        const time = new Date(2030, 11, 31, 23, 58, 57);
        console.log('Wait ...');
        tk.travel(time);

        console.log(new Date());
        const s = new Scheduler(null, Date, suncalc);
        s.add(
            '{"time":{"exactTime":true,"start":"23:59"},"period":{"years":1,"yearDate":31,"yearMonth":12}}',
            'someName',
            () => {
                console.log(new Date());
                done();
            },
        );
    }).timeout(65000);

    it('Test Scheduler: Should not trigger on 23:59 every year day before', function (done) {
        const time = new Date(2030, 11, 30, 23, 58, 57);
        console.log('Wait 5 seconds...');
        tk.travel(time);

        console.log(new Date());
        const s = new Scheduler(null, Date, suncalc);
        s.add(
            '{"time":{"exactTime":true,"start":"23:59"},"period":{"years":1,"yearDate":31,"yearMonth":12}}',
            'someName1',
            () => {
                expect(false).to.be.true;
            },
        );
        setTimeout(done, 5000);
    }).timeout(65000);

    it('Test Scheduler: Should trigger on case independent names', function (done) {
        const kcLat = 49.0068705;
        const kcLon = 8.4034195;
        const dat = new Date('2030-6-21 12:00:00');
        const evtName = 'dusk';
        const time = suncalc.getTimes(dat, kcLat, kcLon)[evtName];
        time.setSeconds(-3);
        console.log('Wait ...');
        tk.travel(time);

        console.log(new Date());
        const s = new Scheduler(null, Date, suncalc, kcLat, kcLon);
        s.add(
            '{"time":{"exactTime":true,"start":"' + evtName.toUpperCase() + '"},"period":{"days":1}}',
            'someName2',
            () => {
                console.log(new Date());
                done();
            },
        );
    }).timeout(65000);

    it('Test Scheduler: Should not trigger on wrong name', function (done) {
        const kcLat = 49.0068705;
        const kcLon = 8.4034195;
        const dat = new Date('2030-6-21 12:00:00');
        const evtName = 'dusk';
        const time = suncalc.getTimes(dat, kcLat, kcLon)[evtName];
        time.setSeconds(-3);
        console.log('Wait ...');
        tk.travel(time);

        console.log(new Date());
        const s = new Scheduler(null, Date, suncalc, kcLat, kcLon);
        s.add(
            '{"time":{"exactTime":true,"start":"' + evtName.toUpperCase() + 'x"},"period":{"days":1}}',
            'someName3',
            () => {
                expect(false).to.be.true;
            },
        );
        setTimeout(done, 5000);
    }).timeout(65000);

    it('Test Scheduler: Should not trigger on empty name', function (done) {
        const kcLat = 49.0068705;
        const kcLon = 8.4034195;
        const dat = new Date('2030-6-21 12:00:00');
        const evtName = 'dusk';
        const time = suncalc.getTimes(dat, kcLat, kcLon)[evtName];
        time.setSeconds(-3);
        console.log('Wait ...');
        tk.travel(time);

        console.log(new Date());
        const s = new Scheduler(null, Date, suncalc, kcLat, kcLon);
        s.add('{"time":{"exactTime":true,"start":""},"period":{"days":1}}', 'someName3', () => {
            expect(false).to.be.true;
        });
        setTimeout(done, 5000);
    }).timeout(65000);
});
