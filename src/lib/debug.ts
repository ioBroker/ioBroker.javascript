import { fork, type ForkOptions } from 'node:child_process';

const adapter = {
    log: {
        error: (text: string) => console.error(text),
        info: (text: string) => console.log(text),
        warn: (text: string) => console.warn(text),
        debug: (text: string) => console.log(text),
    },
    setState: (id:string, val: any): void => {
        try {
            val = JSON.parse(val);
        } catch (e) {
            console.error(e);
        }
        console.log(`FROM: ${JSON.stringify(val)}`);
    },
    extendForeignObjectAsync: (id: string, obj: Partial<ioBroker.ScriptObject>) => {
        console.log(`EXTEND: ${id} ${JSON.stringify(obj)}`);
        return Promise.resolve();
    }
};
const context: {
    objects: Record<string, ioBroker.Object>;
} = {
    objects: {},
};

const debugState: {
    scriptName: string;
    child: any;
    promiseOnEnd: any;
    paused: boolean;
    endTimeout: NodeJS.Timeout | null;
    running: boolean;
    breakOnStart: boolean;
} = {
    scriptName: '',
    child: null,
    promiseOnEnd: null,
    paused: false,
    endTimeout: null,
    running: false,
    breakOnStart: false,
};

function stopDebug() {
    if (debugState.child) {
        sendToInspector({ cmd: 'end' });
        debugState.endTimeout = setTimeout(() => {
            debugState.endTimeout = null;
            debugState.child.kill('SIGTERM');
        });
    } else {
        debugState.promiseOnEnd = Promise.resolve();
    }

    return debugState.promiseOnEnd.then(() => {
        debugState.child = null;
        debugState.running = false;
        debugState.scriptName = '';
        debugState.endTimeout && clearTimeout(debugState.endTimeout);
        debugState.endTimeout = null;
    });
}

function disableScript(id) {
    const obj = context.objects[id];
    if (obj?.common?.enabled) {
        return adapter.extendForeignObjectAsync(obj._id, { common: { enabled: false } } as Partial<ioBroker.ScriptObject>);
    }
    return Promise.resolve();
}

function sendToInspector(message: string | Record<string, any>): void {
    if (typeof message === 'string') {
        try {
            message = JSON.parse(message);
        } catch (e) {
            adapter.log.error(`Cannot parse message to inspector: ${message}`);
            return adapter.setState('debug.from', JSON.stringify({ error: 'Cannot parse message to inspector' }));
        }
    }

    if (debugState.child) {
        debugState.child.send(JSON.stringify(message));
    } else {
        adapter.log.error(`Cannot send command to terminated inspector`);
        return adapter.setState('debug.from', JSON.stringify({ error: `Cannot send command to terminated inspector` }));
    }
}

function childPrint(text: string): void {
    console.log(
        text
            .toString()
            .split(/\r\n|\r|\n/g)
            .filter(chunk => !!chunk)
            .map(chunk => `< ${chunk}`)
            .join('\n'),
    );
}

function debugScript(data): Promise<void> {
    // stop a script if it is running

    return disableScript(data.scriptName)
        .then(() => stopDebug())
        .then(() => {
            debugState.scriptName = data.scriptName;
            debugState.breakOnStart = data.breakOnStart;

            const options: ForkOptions = {
                stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
            };

            debugState.child = fork(`${__dirname}/../inspect.js`, [], options);

            /*
            debugState.child.stdout.setEncoding('utf8');
            debugState.child.stderr.setEncoding('utf8');
            debugState.child.stdout.on('data', childPrint);
            debugState.child.stderr.on('data', childPrint);
            */

            debugState.child.on('message', (message: string): void => {
                let debugMessage: {
                    severity: string;
                    text: string;
                    cmd: string;
                    scriptId: string;
                    script: string;
                };
                try {
                    debugMessage = JSON.parse(message);
                } catch (e) {
                    return adapter.log.error(`Cannot parse message from inspector: ${message}`);
                }

                adapter.setState('debug.from', JSON.stringify(debugMessage));

                switch (debugMessage.cmd) {
                    case 'ready': {
                        debugState.child.send(JSON.stringify({ cmd: 'start', scriptName: debugState.scriptName }));
                        break;
                    }

                    case 'watched': {
                        console.log(`WATCHED: ${JSON.stringify(debugMessage)}`);
                        break;
                    }

                    case 'paused': {
                        debugState.paused = true;
                        console.log(`PAUSED`);
                        break;
                    }

                    case 'resumed': {
                        debugState.paused = false;
                        console.log(`STARTED`);
                        break;
                    }

                    case 'log': {
                        console.log(`[${debugMessage.severity}] ${debugMessage.text}`);
                        break;
                    }

                    case 'readyToDebug': {
                        console.log(`readyToDebug (set breakpoints): [${debugMessage.scriptId}] ${debugMessage.script}`);
                        break;
                    }
                }
            });
        });
}

debugScript({ scriptName: 'script.js.Skript_1' })
    .then(() => {
        console.log('Debugging started');
    })
    .catch(e => {
        console.error(e);
    });
