const expect = require('chai').expect;
const http = require('http');
const request = require('../lib/request');
const realRequest = require('request');

const URL = 'http://127.0.0.1:9009';

request.setLogger({
    error: () => { },
    warn: () => { },
    info: () => { },
    debug: () => { },
});

function createServer(options) {
    options = options || {};
    const app = http.createServer((req, res) => {
        if (options.auth) {
            const auth = req.headers.authorization;
            if (!auth || auth !== `Basic ${Buffer.from(`${options.auth.user}:${options.auth.pass}`).toString('base64')}`) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end('{"error": "Unauthorized"}');
                return;
            }
        }
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            let body = '';
            req.on('data', (data) => {
                body += data;
            });
            // mirror answer
            req.on('end', () => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(body);
            });
            return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"message": "Hello, world!"}');
    });

    return new Promise((resolve) => {
        app.on('listening', () => {
            resolve(app);
        });
        app.listen(options.port || 9009, '127.0.0.1');
    });
}
let server;

describe('Request', () => {
    before(async () => {
        server = await createServer();
    });
    it('simple get', (done) => {
        // request('http://localhost:9009/vis-material-widgets/translations/en.json', (error, response, body) => {
        realRequest(URL, (rError, rResponse, rBody) => {
            expect(rError).to.be.null;
            request(URL, (error, response, body) => {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(rResponse.statusCode);
                expect(body).to.equal(rBody);
                done();
            });
        });
    });

    it('simple JSON get', (done) => {
        // request('http://localhost:9009/vis-material-widgets/translations/en.json', (error, response, body) => {
        const options = { json: true };
        realRequest(URL, options, (rError, rResponse, rBody) => {
            expect(rError).to.be.null;
            request(URL, options, (error, response, body) => {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(rResponse.statusCode);
                expect(JSON.stringify(body)).to.equal(JSON.stringify(rBody));
                done();
            });
        });
    });

    it('get method', (done) => {
        // request('http://localhost:9009/vis-material-widgets/translations/en.json', (error, response, body) => {
        const options = { url: URL, method: 'get' };
        realRequest(options, (rError, rResponse, rBody) => {
            expect(rError).to.be.null;
            request(options, (error, response, body) => {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(rResponse.statusCode);
                expect(JSON.stringify(body)).to.equal(JSON.stringify(rBody));
                done();
            });
        });
    });

    it('get method with auth', (done) => {
        // request('http://localhost:9009/vis-material-widgets/translations/en.json', (error, response, body) => {
        const options = { url: 'http://127.0.0.1:9010', method: 'get', auth: { user: 'admin', pass: 'admin' } };

        createServer({ auth: options.auth, port: 9010 })
            .then(_server => realRequest(options, (rError, rResponse, rBody) => {
                expect(rError).to.be.null;
                request(options, (error, response, body) => {
                    expect(error).to.be.null;
                    expect(response.statusCode).to.equal(rResponse.statusCode);
                    expect(JSON.stringify(body)).to.equal(JSON.stringify(rBody));
                    _server.close();
                    done();
                });
            }));
    });

    it('get error', (done) => {
        // request('http://localhost:9009/vis-material-widgets/translations/en.json', (error, response, body) => {
        realRequest('http://127.0.0.1:9019', (rError, rResponse, rBody) => {
            expect(rError).to.be.not.null;
            expect(rResponse).to.be.undefined;
            expect(rBody).to.be.undefined;
            request('http://127.0.0.1:9019', (error, response, body) => {
                expect(error).to.be.not.null;
                expect(error.code).to.be.equal(rError.code);
                expect(error.message).to.be.equal(rError.message);
                expect(error.address).to.be.equal(rError.address);
                expect(error.port).to.be.equal(rError.port);
                expect(response).to.be.undefined;
                expect(body).to.be.undefined;
                done();
            });
        });
    });

    it('post form', (done) => {
        // request('http://localhost:9009/vis-material-widgets/translations/en.json', (error, response, body) => {
        const options = { form: { key: 'value', key2: 'value2' } };

        realRequest.post(URL, options, (rError, rResponse, rBody) => {
            expect(rError).to.be.null;
            request.post(URL, options, (error, response, body) => {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(rResponse.statusCode);
                expect(body).to.equal(rBody);
                done();
            });
        });
    });

    it('post formData', (done) => {
        // request('http://localhost:9009/vis-material-widgets/translations/en.json', (error, response, body) => {
        const options = { formData: { key: 'value', key2: 'value2' } };

        realRequest.post(URL, options, (rError, rResponse, rBody) => {
            expect(rError).to.be.null;
            request.post(URL, options, (error, response, body) => {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(rResponse.statusCode);
                // expect(body).to.equal(rBody);
                done();
            });
        });
    });

    it('post json', (done) => {
        // request('http://localhost:9009/vis-material-widgets/translations/en.json', (error, response, body) => {
        const options = { json: { key: 'value', key2: 'value2' } };

        realRequest.post(URL, options, (rError, rResponse, rBody) => {
            expect(rError).to.be.null;
            request.post(URL, options, (error, response, body) => {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(rResponse.statusCode);
                expect(JSON.stringify(body)).to.equal(JSON.stringify(rBody));
                done();
            });
        });
    });

    after(() => {
        server.close();
    });
});
