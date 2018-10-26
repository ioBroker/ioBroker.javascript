import PropTypes from 'prop-types';

export const PROGRESS = {
    CONNECTING: 0,
    CONNECTED: 1,
    DATA_LOADED: 2,
    READY: 3
};

class Connection {
    constructor(props) {
        props = props || {};
        this.props = props;
        this.socket = window.io.connect(
            window.location.protocol + '//' + window.location.host.replace('3000', 8081),
            {query: 'ws=true'});
        this.states = {};
        this.objects = {};
        this.instances = [];
        this.acl = null;
        this.objectsLoaded = false;
        this.firstConnect = true;
        this.waitForRestart = false;
        this.systemLang = 'en';
        this.props.onProgress = this.props.onProgress || function () {};

        this.socket.on('connect', () => {
            if (this.firstConnect) {
                this.props.onProgress(PROGRESS.CONNECTED);
                this.firstConnect = false;
                this.socket.emit('getUserPermissions', (err, acl) => {
                    this.acl = acl;
                    // Read system configuration
                    this.socket.emit('getObject', 'system.config', (err, data) => {
                        this.systemConfig = data;
                        if (!err && this.systemConfig && this.systemConfig.common) {
                            this.systemLang = this.systemConfig.common.language;
                        } else {
                            this.systemLang = window.navigator.userLanguage || window.navigator.language;

                            if (this.systemLang !== 'en' && this.systemLang !== 'de' && this.systemLang !== 'ru') {
                                this.systemConfig.common.language = 'en';
                                this.systemLang = 'en';
                            }
                        }
                        this.props.onLanguage && this.props.onLanguage(this.systemLang);

                        this.getScripts(() => {
                            this.props.onProgress(PROGRESS.READY);
                            this.props.onReady && this.props.onReady(this.objects);
                        });
                    });
                });
            } else {
                this.props.onProgress(PROGRESS.READY);
            }

            this.subscribeLog(true);

            if (this.waitForRestart) {
                window.location.reload();
            }
        });
        this.socket.on('disconnect', () => this.props.onProgress(PROGRESS.CONNECTING));
        this.socket.on('reconnect', () => {
            this.props.onProgress(PROGRESS.READY);
            if (this.waitForRestart) {
                window.location.reload();
            }
        });
        this.socket.on('reauthenticate', () => window.location.reload());
        this.socket.on('log', message => this.props.onLog && this.props.onLog(message));

        this.socket.on('permissionError', err =>
            this.props.onError && this.props.onError({message: 'no permission', operation: err.operation, type: err.type, id: (err.id || '')}));

        this.socket.on('objectChange', (id, obj) => setTimeout(this.objectChange, 0, id, obj));
        this.socket.on('stateChange', (id, state) => setTimeout(this.stateChange, 0, id, state))
    }

    objectChange(id, obj) {
        // update main.objects cache
        if (obj) {
            if (obj._rev && this.objects[id]) {
                this.objects[id]._rev = obj._rev;
            }
            if (!this.objects[id] || JSON.stringify(this.objects[id]) !== JSON.stringify(obj)) {
                this.objects[id] = obj;
                let pos;
                if (obj.type === 'instance') {
                    pos = this.instances.indexOf(id);
                    if (pos === -1) this.instances.push(id);
                } else
                if (obj.type === 'script') {
                    pos = this.scripts.list.indexOf(id);
                    if (pos === -1) this.scripts.list.push(id);
                } else
                if (id.match(/^script\.js\./) && obj.type === 'channel') {
                    pos = this.scripts.groups.indexOf(id);
                    if (pos === -1) this.scripts.groups.push(id);
                }
            }
        } else if (this.objects[id]) {
            const oldObj = {_id: id, type: this.objects[id].type};
            delete this.objects[id];
            let pos;
            if (oldObj.type === 'instance') {
                pos = this.instances.indexOf(id);
                if (pos !== -1) this.instances.splice(pos, 1);
            } else
            if (oldObj.type === 'script') {
                pos = this.scripts.list.indexOf(id);
                if (pos !== -1) this.scripts.list.splice(pos, 1);
            } else
            if (id.match(/^script\.js\./) && oldObj.type === 'channel') {
                pos = this.scripts.groups.indexOf(id);
                if (pos !== -1) this.scripts.groups.splice(pos, 1);
            }
        }
    }

    stateChange(id, state) {
        id = id ? id.replace(/[\s'"]/g, '_') : '';

    }

    getStates(cb) {
        this.socket.emit('getStates', (err, res) => {
            this.states = res;
            this.props.onProgress(PROGRESS.STATES_LOADED);
            cb && setTimeout(() => cb(), 0);
        });
    }

    getInstances() {
        this.socket.emit('getObjectView', 'system', 'instance', {startkey: 'system.adapter.', endkey: 'system.adapter.\u9999'}, (err, res) => {
            if (res && res.rows) {
                this.instances = [];
                for (let c = 0; c < res.rows.length; c++) {
                    this.objects[res.rows[c].id] = res.rows[c].value;
                }
                for (const id in this.objects) {
                    if (!this.objects.hasOwnProperty(id)) continue;
                    let obj = res[id];
                    if (obj.type === 'instance')   this.instances.push(id);
                }
            }
        });
    }

    getScripts() {
        this.socket.emit('getObjectView', 'system', 'object', {startkey: 'script.js.', endkey: 'script.js.\u9999'}, (err, res) => {
            this.objects = {};
            if (res && res.rows) {
                for (let c = 0; c < res.rows.length; c++) {
                    this.objects[res.rows[c].id] = res.rows[c].value;
                }
            }

            for (const id in this.objects) {
                if (!this.objects.hasOwnProperty(id)) continue;
                let obj = res[id];
                if (obj.type === 'script')   this.scripts.list.push(id);
                if (obj.type === 'channel' && id.match(/^script\.js\./)) this.scripts.groups.push(id);
            }
            this.props.onProgress(PROGRESS.DATA_LOADED);
        });
    }

    getObjects() {
        this.socket.emit('getAllObjects', (err, res) => {
            setTimeout(() => {
                let obj;
                this.objects = res;
                for (const id in this.objects) {
                    if (!this.objects.hasOwnProperty(id) || id.slice(0, 7) === '_design') continue;

                    obj = res[id];
                    if (obj.type === 'instance') this.instances.push(id);
                    if (obj.type === 'script')   this.scripts.list.push(id);
                    if (obj.type === 'channel' && id.match(/^script\.js\./)) this.scripts.groups.push(id);
                    if (obj.type === 'host')     this.scripts.hosts.push(id);
                }
                this.objectsLoaded = true;
                this.props.onProgress(PROGRESS.OBJECTS_LOADED);

                this.getStates(() => {
                    this.props.onProgress(PROGRESS.READY);
                    this.props.onReady && setTimeout(() => this.props.onReady(this.objects), 0)
                });
            }, 0);
        });
    }

    subscribeLog(isEnable) {
        if (isEnable && !this.subscribed) {
            this.subscribed = true;
            console.log('Subscribe logs');
            this.socket.emit('subscribeObjects', 'script.*');
            this.socket.emit('subscribeObjects', 'system.adapter.*');
            this.socket.emit('requireLog', true);
        } else if (!isEnable && this.subscribed) {
            this.subscribed = false;
            console.log('Unsubscribe logs');
            this.socket.emit('unsubscribeObjects', 'script.*');
            this.socket.emit('unsubscribeObjects', 'system.adapter.*');
            this.socket.emit('requireLog', false);
        }
    }
}

Connection.Connection = {
    onLog: PropTypes.func,
    onReady: PropTypes.func,
    onProgress: PropTypes.func,
};
export default Connection;