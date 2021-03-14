const fork           = require('child_process').fork;

const adapter = {
    log: {
        error: text => console.error(text),
        info: text => console.log(text),
        warn: text => console.warn(text),
        debug: text => console.log(text),
    },
    setState: (id, val) => {
        try {
            val = JSON.parse(val);
        } catch (e) {
            console.error(e);
        }
        console.log('FROM: ' + JSON.stringify(val));
    }
};
const context = {
    objects: {}
};

const debugState = {
    scriptName: '',
    child: null,
    promiseOnEnd: null,
    paused: false,
};

function stopDebug() {
    if (debugState.child) {
        sendToInspector({cmd: 'end'});
        debugState.endTimeout = setTimeout(() => {
            debugState.endTimeout = null;
            debugState.child.kill('SIGTERM');
        });
    } else {
        debugState.promiseOnEnd = Promise.resolve();
    }

    return debugState.promiseOnEnd
        .then(() => {
            debugState.child = null;
            debugState.running = false;
            debugState.scriptName = '';
            debugState.endTimeout && clearTimeout(debugState.endTimeout);
            debugState.endTimeout = null;
        });
}

function disableScript(id) {
    const obj = context.objects[id];
    if (obj && obj.common && obj.common.enabled) {
        return adapter.extendForeignObjectAsync(obj._id, {common: {enabled: false}});
    } else {
        return Promise.resolve();
    }
}

function sendToInspector(message) {
    if (typeof message === 'string') {
        try {
            message = JSON.parse(message);
        } catch (e) {
            adapter.log.error(`Cannot parse message to inspector: ${message}`);
            return adapter.setState('debug.from', JSON.stringify({error: 'Cannot parse message to inspector'}));
        }
    }

    if (debugState.child) {
        debugState.child.send(JSON.stringify(message));
    } else {
        adapter.log.error(`Cannot send command to terminated inspector`);
        return adapter.setState('debug.from', JSON.stringify({error: `Cannot send command to terminated inspector`}));
    }
}

function childPrint(text) {
    console.log(
        text.toString()
            .split(/\r\n|\r|\n/g)
            .filter((chunk) => !!chunk)
            .map((chunk) => `< ${chunk}`)
            .join('\n')
    );
}

function debugScript(data) {
    // stop script if it running

    return disableScript(data.scriptName)
        .then(() => stopDebug())
        .then(() => {
            debugState.scriptName   = data.scriptName;
            debugState.breakOnStart = data.breakOnStart;

            const options = {
                stdio: ['ignore', 'inherit', 'inherit', 'ipc']
            };

            debugState.child = fork(__dirname + '/../inspect.js', [], options);

            /*debugState.child.stdout.setEncoding('utf8');
            debugState.child.stderr.setEncoding('utf8');
            debugState.child.stdout.on('data', childPrint);
            debugState.child.stderr.on('data', childPrint);*/

            debugState.child.on('message', message => {
                try {
                    message = JSON.parse(message);
                } catch (e) {
                    return adapter.log.error(`Cannot parse message from inspector: ${message}`);
                }

                adapter.setState('debug.from', JSON.stringify(message));

                switch (message.cmd) {
                    case 'ready': {
                        debugState.child.send(JSON.stringify({cmd: 'start', scriptName: debugState.scriptName}));
                        break;
                    }

                    case 'watched': {
                        console.log(`WATCHED: ${JSON.stringify(message)}`);
                        break;
                    }

                    case 'paused': {
                        debugState.paused = true;
                        console.log(`PAUSED`);
                        break;
                    }

                    case 'resumed' : {
                        debugState.paused = false;
                        console.log(`STARTED`);
                        break;
                    }

                    case 'log' : {
                        console.log(`[${message.severity}] ${message.text}`);
                        break;
                    }

                    case 'readyToDebug': {
                        console.log(`readyToDebug (set breakpoints): [${message.scriptId}] ${message.script}`);
                        break;
                    }
                }
            });
        });
}

debugScript({scriptName: 'script.js.Skript_1'});