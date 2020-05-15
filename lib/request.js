const _request = require('request');

let logger = {
    error: error => console.error(error),
};

// monkeypatch request
function requestError(error) {
    logger.error('Request error: ' + error);
}
function initParams(verb, uri, options, callback) {
    if (typeof options === 'function') {
        return _request[verb](uri, function (err, state, body) {
            try {
                options(err, state, body);
            } catch (error) {
                logger.error('Error in request callback: ' + error);
            }
        }).on('error', requestError);
    } else if (typeof callback === 'function') {
        return _request[verb](uri, options, function (err, state, body) {
                try {
                    callback(err, state, body);
                } catch (error) {
                    logger.error('Error in request callback: ' + error);
                }
            }).on('error', requestError);
    } else {
        return _request[verb](uri, options, callback).on('error', requestError);
    }
}

const request = function (uri, options, callback) {
    if (typeof options === 'function') {
        return _request(uri, function (err, state, body) {
            try {
                options(err, state, body);
            } catch (error) {
                logger.error('Error in request callback: ' + error);
            }
        }).on('error', requestError);
    } else if (typeof callback === 'function') {
        return _request(uri, options, function (err, state, body) {
            try {
                callback(err, state, body);
            } catch (error) {
                logger.error('Error in request callback: ' + error);
            }
        }).on('error', requestError);
    } else {
        return _request(uri, options, callback).on('error', requestError);
    }
};
request.post = function (uri, options, callback) {
    return initParams('post', uri, options, callback);
};
request.get = function (uri, options, callback) {
    return initParams('get', uri, options, callback);
};
request.put = function (uri, options, callback) {
    return initParams('put', uri, options, callback);
};
request.options = function (uri, options, callback) {
    return initParams('options', uri, options, callback);
};
request.patch = function (uri, options, callback) {
    return initParams('patch', uri, options, callback);
};
request.del = function (uri, options, callback) {
    return initParams('del', uri, options, callback);
};
request['delete'] = function (uri, options, callback) {
    return initParams('delete', uri, options, callback);
};

request.setLogger = function (_logger) {
    logger =_logger;
};

// end of monkeypatching
module.exports = request;