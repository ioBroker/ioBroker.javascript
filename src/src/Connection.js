import PropTypes from 'prop-types';

export const PROGRESS = {
    CONNECTING: 0,
    CONNECTED: 1,
    OBJECTS_LOADED: 2,
    READY: 3
};

class Connection {
    constructor(props) {
        props = props || {};
        this.props = props;
        this.autoSubscribes = this.props.autoSubscribes || [];
        this.autoSubscribeLog = this.props.autoSubscribeLog;
        this.socket = window.io.connect(
            window.location.protocol + '//' + window.location.host.replace('3000', 8081),
            {query: 'ws=true'});
        this.states = {};
        this.objects = null;
        this.scripts = {
            list: [],
            hosts: [],
            groups: [],
            instances: []
        };
        this.acl = null;
        this.firstConnect = true;
        this.waitForRestart = false;
        this.systemLang = 'en';
        this.connected = false;
        this.statesSubscribes = {}; // subscribe for states
        this.onProgress = this.props.onProgress || function () {};
        this.onError = this.props.onError || function (err) {console.error(err);};

        this.socket.on('connect', () => {
            this.connected = true;
            if (this.firstConnect) {
                this.onProgress(PROGRESS.CONNECTED);
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

                        this.getObjects(() => {
                            this.onProgress(PROGRESS.READY);
                            this.props.onReady && this.props.onReady(this.objects, this.scripts);
                        });
                    });
                });
            } else {
                this.onProgress(PROGRESS.READY);
            }

            this.subscribe(true);

            if (this.waitForRestart) {
                window.location.reload();
            }
        });
        this.socket.on('disconnect', () => {
            this.connected = false;
            this.subscribed = false;
            this.onProgress(PROGRESS.CONNECTING)
        });
        this.socket.on('reconnect', () => {
            this.onProgress(PROGRESS.READY);
            if (this.waitForRestart) {
                window.location.reload();
            }
        });
        this.socket.on('reauthenticate', () => window.location.reload());
        this.socket.on('log', message => {
            this.props.onLog && this.props.onLog(message);
            this.onLogHandler && this.onLogHandler(message);
        });

        this.socket.on('permissionError', err =>
            this.onError({message: 'no permission', operation: err.operation, type: err.type, id: (err.id || '')}));

        this.socket.on('objectChange', (id, obj) => setTimeout(() => this.objectChange(id, obj), 0));
        this.socket.on('stateChange', (id, state) => setTimeout(() => this.stateChange(id, state), 0))
    }

    subscribeState(id, cb) {
        if (!this.statesSubscribes[id]) {
            this.statesSubscribes[id] = {reg: new RegExp(id.replace(/\./g, '\\.').replace(/\*/g, '.*')), cbs: []};
            this.statesSubscribes[id].cbs.push(cb);
            if (this.connected) {
                this.socket.emit('subscribe', id);
            }
        } else {
            this.statesSubscribes[id].cbs.indexOf(cb) === -1 && this.statesSubscribes[id].cbs.push(cb);
        }
        this.getState(id, cb);
    }

    objectChange(id, obj) {
        // update main.objects cache
        if (!this.objects) return;

        let changed = false;
        if (obj) {
            if (obj._rev && this.objects[id]) {
                this.objects[id]._rev = obj._rev;
            }

            if (!this.objects[id] || JSON.stringify(this.objects[id]) !== JSON.stringify(obj)) {
                this.objects[id] = obj;
                changed = true;
                let pos;
                if (obj.type === 'instance') {
                    pos = this.scripts.instances.indexOf(id);
                    if (pos === -1) this.scripts.instances.push(id);
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
                pos = this.scripts.instances.indexOf(id);
                if (pos !== -1) this.scripts.instances.splice(pos, 1);
            } else
            if (oldObj.type === 'script') {
                pos = this.scripts.list.indexOf(id);
                if (pos !== -1) this.scripts.list.splice(pos, 1);
            } else
            if (id.match(/^script\.js\./) && oldObj.type === 'channel') {
                pos = this.scripts.groups.indexOf(id);
                if (pos !== -1) this.scripts.groups.splice(pos, 1);
            }
            changed = true;
        }

        if (id.match(/^system\.adapter\.[-\w\d]+\$/)) {
            if (obj[id].common && obj[id].common.blockly) {
                this.props.onBlocklyChanges(id);
            }
        }
        if (changed) {
            this.props.onObjectChange && this.props.onObjectChange(this.objects, this.scripts);
        }
    }

    stateChange(id, state) {
        id = id ? id.replace(/[\s'"]/g, '_') : '';
        for (const task in this.statesSubscribes) {
            if (this.statesSubscribes.hasOwnProperty(task) && this.statesSubscribes[task].reg.test(id)) {
                this.statesSubscribes[task].cbs.forEach(cb => cb(id, state));
            }
        }
    }

    getStates(cb, disableProgressUdpate) {
        this.socket.emit('getStates', (err, res) => {
            this.states = res;
            !disableProgressUdpate && this.onProgress(PROGRESS.STATES_LOADED);
            cb && setTimeout(() => cb(this.states), 0);
        });
    }

    getState(id, cb) {
        if (!cb) {
            return new Promise((resolve, reject) =>
                this.getState(id, (err, state) => err ? reject(err) : resolve(state)));
        } else {
            this.socket.emit('getState', id, cb);
        }
    }

    getObjects(refresh, cb, disableProgressUdpate) {
        if (typeof refresh === 'function') {
            disableProgressUdpate = cb;
            cb = refresh;
            refresh = false;
        }

        if (!refresh && this.objects) {
            return setTimeout(() => cb && cb(this.objects), 0);
        }

        this.socket.emit('getAllObjects', (err, res) => {
            setTimeout(() => {
                let obj;
                this.objects = res;
                for (const id in this.objects) {
                    if (!this.objects.hasOwnProperty(id) || id.slice(0, 7) === '_design') continue;

                    obj = res[id];
                    if (obj.type === 'instance') {
                        id.startsWith('system.adapter.javascript.') && this.scripts.instances.push(parseInt(id.split('.').pop()));
                    }
                    if (obj.type === 'script')   this.scripts.list.push(id);
                    if (obj.type === 'channel' && id.match(/^script\.js\./)) this.scripts.groups.push(id);
                    if (obj.type === 'host')     this.scripts.hosts.push(id);
                }
                disableProgressUdpate && this.onProgress(PROGRESS.OBJECTS_LOADED);

                cb && cb(this.objects);
            }, 0);
        });
    }

    subscribe(isEnable) {
        if (isEnable && !this.subscribed) {
            this.subscribed = true;
            console.log('Subscribe logs');
            this.autoSubscribes.forEach(id => this.socket.emit('subscribeObjects', id));
            this.autoSubscribeLog && this.socket.emit('requireLog', true);

            Object.keys(this.statesSubscribes).forEach(id => this.socket.emit('subscribe', id));
        } else if (!isEnable && this.subscribed) {
            this.subscribed = false;
            console.log('Unsubscribe logs');
            this.autoSubscribes.forEach(id => this.socket.emit('unsubscribeObjects', id));
            this.autoSubscribeLog && this.socket.emit('requireLog', false);

            Object.keys(this.statesSubscribes).forEach(id => this.socket.emit('unsubscribe', id));
        }
    }

    delObject(id) {
        return new Promise((resolve, reject) => {
            this.socket.emit('delObject', id, err => {
                err ? reject(err) : resolve();
            });
        });
    }

    setObject(id, obj) {
        return new Promise((resolve, reject) => {
            this.socket.emit('setObject', id, obj, err => {
                err ? reject(err) : resolve();
            });
        });
    }

    updateScript(oldId, newId, newCommon) {
        return new Promise((resolve, reject) => {
            this.socket.emit('getObject', oldId, (err, _obj) => {
                setTimeout(() => {
                    const obj = {common: {}};

                    if (newCommon.engine  !== undefined) obj.common.engine  = newCommon.engine;
                    if (newCommon.enabled !== undefined) obj.common.enabled = newCommon.enabled;
                    if (newCommon.source  !== undefined) obj.common.source  = newCommon.source;
                    if (newCommon.debug   !== undefined) obj.common.debug   = newCommon.debug;
                    if (newCommon.verbose !== undefined) obj.common.verbose = newCommon.verbose;

                    if (oldId === newId && _obj && _obj.common && newCommon.name === _obj.common.name) {
                        if (!newCommon.engineType || newCommon.engineType !== _obj.common.engineType) {
                            if (newCommon.engineType !== undefined) obj.common.engineType  = newCommon.engineType || 'Javascript/js';

                            this.socket.emit('extendObject', oldId, obj, err => err ? reject(err) : resolve());
                        } else {
                            this.socket.emit('extendObject', oldId, obj, err => err ? reject(err) : resolve());
                        }
                    } else {
                        // let prefix;

                        // let parts = _obj.common.engineType.split('/');

                        // prefix = 'script.' + (parts[1] || parts[0]) + '.';

                        if (_obj && _obj.common) {
                            _obj.common.engineType = newCommon.engineType || _obj.common.engineType || 'Javascript/js';
                            this.socket.emit('delObject', oldId, err => {
                                if (err) {
                                    reject(err);
                                } else {
                                    if (obj.common.engine  !== undefined) _obj.common.engine  = obj.common.engine;
                                    if (obj.common.enabled !== undefined) _obj.common.enabled = obj.common.enabled;
                                    if (obj.common.source  !== undefined) _obj.common.source  = obj.common.source;
                                    if (obj.common.name    !== undefined) _obj.common.name    = obj.common.name;
                                    if (obj.common.debug   !== undefined) _obj.common.debug   = obj.common.debug;
                                    if (obj.common.verbose !== undefined) _obj.common.verbose = obj.common.verbose;

                                    delete _obj._rev;

                                    // Name must always exist
                                    _obj.common.name = newCommon.name;

                                    _obj._id = newId; // prefix + newCommon.name.replace(/[\s"']/g, '_');

                                    this.socket.emit('setObject', newId, _obj, err => err ? reject(err) : resolve());
                                }
                            });
                            return;
                        } else {
                            _obj = obj;
                        }

                        // Name must always exist
                        _obj.common.name = newCommon.name;

                        _obj._id = newId; // prefix + newCommon.name.replace(/[\s"']/g, '_');

                        this.socket.emit('setObject', newId, _obj, err => err ? reject(err) : resolve());
                    }
                }, 0);
            });
        });
    }

    _deleteGroup(id, originalGroup, confirmed, deleted) {
        if (confirmed.indexOf(id) === -1) {
            confirmed.push(id);
        }

        return new Promise((resolve, reject) => {
            // find all elements
            for (let l = 0; l < this.scripts.list.length; l++) {
                if (this.scripts.list[l].substring(0, id.length + 1) === id + '.' &&
                    (!deleted || deleted.indexOf(this.scripts.list[l]) === -1)) {
                    return this.deleteId(this.scripts.list[l], id, confirmed, deleted);
                }
            }

            for (let g = 0; g < this.scripts.groups.length; g++) {
                if (this.scripts.groups[g].substring(0, id.length + 1) === id + '.') {
                    return this.deleteId(this.scripts.groups[g], id, confirmed, deleted);
                }
            }

            this.socket.emit('delObject', id, err => {
                if (err) {
                    reject(err);
                } else if (originalGroup !== id) {
                    return this.deleteId(originalGroup, null, confirmed, deleted);
                } else {
                    // finish
                    resolve();
                }
            });
        });
    }

    deleteId(id, originalGroup, confirmed, deleted) {
        originalGroup = originalGroup || id;
        confirmed     = confirmed     || [];
        deleted       = deleted       || [];

        return new Promise((resolve, reject) => {
            if (this.objects[id] && this.objects[id].type === 'script') {
                if (this.props.onConfirmDelete) {
                    this.props.onConfirmDelete(false, this.objects[id].common.name, result => {
                        if (result) {
                            this.socket.emit('delObject', id, err => {
                                if (err) {
                                    reject(err);
                                } else {
                                    deleted.push(id);
                                    return this.deleteId(originalGroup, null, confirmed, deleted);
                                }
                            });
                        } else {
                            // Do nothing
                            reject('canceled');
                        }
                    });
                } else {
                    this.socket.emit('delObject', id, err => {
                        if (err) {
                            reject(err);
                        } else {
                            deleted.push(id);
                            return this.deleteId(originalGroup, null, confirmed, deleted);
                        }
                    });
                }
            } else {
                let name = id;
                if (confirmed.indexOf(id) === -1) {
                    if (this.objects[id] && this.objects[id].common && this.objects[id].common.name) {
                        name = this.objects[id].common.name;
                    }

                    if (this.props.onConfirmDelete) {
                        this.props.onConfirmDelete(true, name, result => {
                            if (result) {
                                return this._deleteGroup(id, originalGroup, confirmed, deleted);
                            } else {
                                reject('canceled');
                            }
                        });
                    } else {
                        return this._deleteGroup(id, originalGroup, confirmed, deleted);
                    }
                } else {
                    return this._deleteGroup(id, originalGroup, confirmed, deleted);
                }
            }
        });
    }

    renameGroup(id, newId, newName, _list) {
        return new Promise((resolve, reject) => {
            if (!_list) {
                _list = [];

                // collect all elements to rename
                // find all elements
                for (let l = 0; l < this.scripts.list.length; l++) {
                    if (this.scripts.list[l].substring(0, id.length + 1) === id + '.') {
                        _list.push(this.scripts.list[l]);
                    }
                }
                for (let g = 0; g < this.scripts.groups.length; g++) {
                    if (this.scripts.groups[g].substring(0, id.length + 1) === id + '.') {
                        _list.push(this.scripts.list[g]);
                    }
                }

                this.socket.emit('getObject', id, (err, obj) => {
                    if (err) {
                        reject(err);
                    } else {
                        obj = obj || {common: {}};
                        obj.common.name = newName;
                        obj._id = newId;

                        this.socket.emit('delObject', id, err => {
                            if (err) {
                                reject(err);
                            } else {
                                this.socket.emit('setObject', newId, obj, err => {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        return this.renameGroup(id, newId, newName, _list);
                                    }
                                });
                            }
                        });
                    }
                });
            } else {
                if (_list.length) {
                    let nId = _list.pop();

                    this.socket.emit('getObject', nId, (err, obj) => {
                        if (err) {
                            reject(err);
                        } else {
                            this.socket.emit('delObject', nId, err => {
                                if (err) {
                                    reject(err);
                                } else {
                                    nId = newId + nId.substring(id.length);
                                    this.socket.emit('setObject', nId, obj, err => {
                                        if (err) {
                                            reject(err);
                                        } else {
                                            return this.renameGroup(id, newId, newName, _list);
                                        }
                                    });
                                }
                            });
                        }
                    });
                } else {
                    resolve();
                }
            }
        });
    }

    getScripts() {
        return this.scripts;
    }

    sendTo(instance, command, data, cb) {
        this.socket.emit('sendTo', instance, command, data, cb);
    }
    extendObject(id, obj, cb) {
        this.socket.emit('extendObject', id, obj, cb);
    }

    registerLogHandler(handler) {
        this.onLogHandler = handler;
    }
    unregisterLogHandler(handler) {
        this.onLogHandler = null;
    }

}

Connection.Connection = {
    onLog: PropTypes.func,
    onReady: PropTypes.func,
    onProgress: PropTypes.func,
};

export default Connection;