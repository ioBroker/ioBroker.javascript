// This module monkey-patches "request" with axios. It is a part of the migration to axios.
const axios = require('axios');
const URL = require('node:url').URL;

let logger = {
    error: error => console.error(error),
};

function migrateAxiosResponse(response) {
    const res = {
        statusCode: response.status,
        headers: response.headers,
        body: response.data,
    };

    return res;
}

function migrateAxiosError(error) {
    const err = {
        code: error.code,
        message: error.message,
        stack: error.stack,
    };
    if (error.config?.url) {
        const url = new URL(error.config.url);
        err.address = url.hostname;
        err.port = parseInt(url.port, 10) || (url.protocol === 'https:' ? 443 : 80);
    }

    if (error.response) {
        err.statusCode = error.response.status;
        err.headers = error.response.headers;
        err.body = error.response.data;
    }

    return err;
}

function migrateRequestParams(url, requestParams) {
    const axiosParams = {};

    if (!requestParams.method) {
        axiosParams.method = 'GET';
    } else {
        axiosParams.method = requestParams.method.toUpperCase();
    }
    if (typeof requestParams.url === 'string') {
        axiosParams.url = requestParams.url;
    }
    if (typeof url === 'string') {
        axiosParams.url = url;
    }

    if (requestParams.Headers || requestParams.headers) {
        axiosParams.headers = requestParams.Headers || requestParams.headers;
    }
    if (requestParams.auth) {
        axiosParams.headers = axiosParams.headers || {};
        if (requestParams.auth.user || requestParams.auth.username) {
            axiosParams.headers.Authorization = `Basic ${Buffer.from(`${requestParams.auth.user || requestParams.auth.username}:${requestParams.auth.pass || requestParams.auth.password}`).toString('base64')}`;
        } else if (requestParams.auth.bearer) {
            axiosParams.headers.Authorization = `Bearer ${requestParams.auth.bearer}`;
        }
    }
    if (requestParams.method !== 'GET' && requestParams.method !== 'HEAD' && requestParams.method !== 'OPTIONS') {
        if (requestParams.form) {
            axiosParams.headers = axiosParams.headers || {};
            axiosParams.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            axiosParams.data = requestParams.form;
        } else if (requestParams.json) {
            axiosParams.headers = axiosParams.headers || {};
            axiosParams.headers['Content-Type'] = 'application/json';
            axiosParams.data = requestParams.json;
        } else if (requestParams.dataType === 'json') {
            axiosParams.headers = axiosParams.headers || {};
            axiosParams.headers['Content-Type'] = 'application/json';
        } else if (requestParams.dataType === 'form') {
            axiosParams.headers = axiosParams.headers || {};
            axiosParams.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        } else if (requestParams.dataType === 'text') {
            axiosParams.headers = axiosParams.headers || {};
            axiosParams.headers['Content-Type'] = 'text/plain';
        } else if (requestParams.dataType === 'xml') {
            axiosParams.headers = axiosParams.headers || {};
            axiosParams.headers['Content-Type'] = 'application/xml';
        } else if (requestParams.formData) {
            axiosParams.headers = axiosParams.headers || {};
            axiosParams.headers['Content-Type'] = 'multipart/form-data';
            const form = new FormData();
            for (const attr in requestParams.formData) {
                if (Object.prototype.hasOwnProperty.call(requestParams.formData, attr)) {
                    form.append(attr, requestParams.formData[attr]);
                }
            }
            axiosParams.data = form;
            // axiosParams.form = form;
        } else {
            axiosParams.data = requestParams.data;
        }
    }

    if (!axiosParams.headers || axiosParams.headers['Content-Type'] !== 'multipart/form-data') {
        axiosParams.transformResponse = x => x;
    }

    return axiosParams;
}

function migrateMethod(method) {
    return function (url, options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        if (typeof url === 'object') {
            options = url;
        }

        options = options || {};
        if (typeof url === 'string') {
            options.url = url;
        }
        options.method = (method || 'GET').toUpperCase();

        const axiosParams = migrateRequestParams(url, options);

        if (typeof callback === 'function') {
            axios(axiosParams)
                .then(response => {
                    if (options.json) {
                        try {
                            response.data = JSON.parse(response.data);
                        } catch (e) {
                            logger.error(`Cannot parse answer: ${response.data}`);
                        }
                        callback(null, migrateAxiosResponse(response), response.data);
                    } else {
                        callback(null, migrateAxiosResponse(response), response.data);
                    }
                })
                .catch(error => {
                    logger.error(`Request error: ${error}`);
                    callback(migrateAxiosError(error));
                });
        } else {
            axios(axiosParams)
                .catch(error => logger.error(`Request error: ${error}`));
        }
    };
}

const request = migrateMethod();

// Wrap all methods that accept a callback
const methodsWithCallback = [
    'get',
    'post',
    'put',
    'head',
    'patch',
    'del',
    'delete',
    'initParams',
];

// And copy all other properties and methods
const otherPropsAndMethods = [
    'defaults',
    'forever',
    'jar',
    'cookie',
    'debug',
];
for (const method in otherPropsAndMethods) {
    request[method] = function () {
        logger.error(`Request error: method "${method}" is not implemented. Please migrate to axios`);
    };
}

for (const method of methodsWithCallback) {
    request[method] = migrateMethod(method);
}

request.setLogger = function (_logger) {
    logger = _logger;
};

// end of monkeypatching
module.exports = request;
