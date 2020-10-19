async function wait(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
}

function test() {
    console.log('test');
}

/*setTimeout(async function () {
    console.log('Step 1');
    //await wait(1000);
    console.log('Step 2');
}, 2000);*/

async function wrapper() {
    await test();
}

wrapper();
//.then(() => {});