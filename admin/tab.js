function Scripts(main) {
    var that            = this;
    this.list           = [];
    this.groups         = [];
    this.$grid          = $('#grid-scripts');
    this.$dialog        = $('#dialog-script');
    this.$dialogCron    = $('#dialog-cron');
    this.editor         = null;
    this.changed        = false;
    this.main           = main;
    this.currentId      = null;
    this.engines        = [];

    function addScript(group) {
        group = group || 'script.js.common';
        // Find new unique name
        var newText = _('Script');
        var idx     = 1;
        var name    = newText + idx;

        while (that.main.objects[group + '.' + name]) {
            if (idx === '') idx = 0;
            idx++;
            name = newText + idx;
        }
        var instance = '';
        var engineType = '';

        // find first instance
        for (var i = 0; i < that.main.instances.length; i++) {
            if (that.main.objects[that.main.instances[i]] && that.main.objects[that.main.instances[i]] && that.main.objects[that.main.instances[i]].common.engineTypes) {
                instance = that.main.instances[i];
                if (typeof that.main.objects[main.instances[i]].common.engineTypes == 'string') {
                    engineType = that.main.objects[that.main.instances[i]].common.engineTypes;
                } else {
                    engineType = that.main.objects[that.main.instances[i]].common.engineTypes[0];
                }
                break;
            }
        }

        var id = group + '.' + name.replace(/ /g, '_');
        that.main.socket.emit('setObject', id, {
            common: {
                name:       name,
                engineType: engineType,
                source:     '',
                enabled:    false,
                engine:     instance
            },
            type: 'script'
        }, function (err) {
            if (err) {
                that.main.showError(err);
                that.init(true);
            } else {
                setTimeout(function () {
                    that.$grid.selectId('show', id);
                    editScript(id);
                }, 500);
            }
        });
    }

    function addScriptInGroup(_group) {
        fillGroups('edit-new-group-group');

        if (that.main.objects[_group] && that.main.objects[_group].type === 'script') {
            _group = getGroup(_group);
        }
        $('#edit-new-group-group').val(_group || 'script.js');

        if (!that.$newGroupDialog) {
            that.$newGroupDialog = $('#dialog-new-group').dialog({
                autoOpen:   false,
                modal:      true,
                width:      400,
                height:     220,
                resizable:  false,
                title:      _('Create new group'),
                buttons: [
                    {
                        id: 'script-group-button-save',
                        text: _('Ok'),
                        click: function () {
                            var group = $('#edit-new-group-group').val() || 'script.js';
                            var name  = $('#edit-new-group-name').val();
                            if (!name) {
                                that.main.showError(_('No group name'));
                                that.$newGroupDialog.dialog('close');
                                return;
                            }
                            group += '.' + name.replace(/[\s.]+/g, '_');

                            $('#script-group-button-save').button('disable');
                            $('#script-group-button-cancel').button('disable');

                            that.main.socket.emit('setObject', group, {
                                common: {
                                    name: name
                                },
                                type: 'channel'
                            }, function (err) {
                                that.$newGroupDialog.dialog('close');
                                if (err) {
                                    that.main.showError(err);
                                    that.init(true);
                                } else {
                                    setTimeout(function () {
                                        that.$grid.selectId('show', group);
                                        editScript(group);
                                    }, 500);
                                }
                            });
                        }
                    },
                    {
                        id: 'script-group-button-cancel',
                        text: _('Cancel'),
                        click: function () {
                            that.$newGroupDialog.dialog('close');
                        }
                    }
                ],
                open: function () {
                    $('#script-group-button-save').button('disable');
                    $('#script-group-button-cancel').button('enable');
                    $('#edit-new-group-name').val('');
                }
            });

            $('#edit-new-group-name').change(function () {
                if ($(this).val()) {
                    $('#script-group-button-save').button('enable');
                } else {
                    $('#script-group-button-save').button('disable');
                }
            }).keyup(function () {
                $(this).trigger('change');
            });
        }

        that.$newGroupDialog.dialog('open');
    }

    this.prepare = function () {
        this.$dialogCron.dialog({
            autoOpen:   false,
            modal:      true,
            width:      500,
            height:     150,
            resizable:  false,
            title:      _('Cron expression'),
            buttons: [
                {
                    text: _('Insert'),
                    click: function () {
                        var val = $('#div-cron').cron('value');
                        that.$dialogCron.dialog('close');
                        that.editor.insert('"' + val + '"');
                        that.editor.focus();
                    }
                },
                {
                    text: _('Cancel'),
                    click: function () {
                        that.$dialogCron.dialog('close');
                    }
                }
            ]
        });

        $('#div-cron').cron({
            initial: '* * * * *',
            dom: _('daysofmonth'),
            months:  _('months'),
            days:    _('daysofweek'),
            periods: _('periods'),
            minuteOpts : {
                title     : _('Minutes Past the Hour')
            },
            timeHourOpts : {
                title     : _('Time: Hour')
            },
            domOpts : {
                title     : _('Day of Month')
            },
            timeMinuteOpts : {
                title     : _('Time: Minute')
            },
            every: _('Every'),
            onThe: _('on the'),
            at: _('at'),
            of: _('of'),
            on: _('on')
        });

        $('#script-edit-button-save').button({
            icons: {
                primary: 'ui-icon-disk'
            },
            label: _('Save')
        }).click(function () {
            that.saveScript();
        });

        $('#script-edit-button-cancel').button({
            icons: {
                primary: 'ui-icon-cancel'
            },
            label: _('Cancel')
        }).click(function () {
            editScript(that.currentId);
        });

        $('#script-output-clear').button({
            icons: {
                primary: 'ui-icon-trash'
            },
            text: false
        }).css({width: 20, height: 20}).click(function () {
            $('#script-output').html('');
        }).attr('title', _('Clear output'));

        $('#script-output-down').button({
            icons: {
                primary: 'ui-icon-arrowthickstop-1-s'
            },
            text: false
        }).css({width: 20, height: 20}).click(function () {
            if (that.$parentOutput) that.$parentOutput.scrollTop($('#script-output').height());
        }).attr('title', _('Scroll down'));

        fillGroups('edit-script-group');
    };

    this.resize = function (width, height) {
        if (this.editor) this.editor.resize();
    };

    function editScript(id) {
        that.initEditor();

        if (that.currentId != id) {
            if (that.changed) {
                that.main.confirmMessage(_('Script not saved'), _('Save?'), 'help', [_('Save'), _('Discard'), _('Cancel')], function (result) {
                    if (result === 0) {
                        that.saveScript();
                        that.changed = false;
                        setTimeout(function() {
                            editScript(id);
                        }, 0);
                    } else if (result === 1) {
                        that.changed = false;
                        setTimeout(function() {
                            editScript(id);
                        }, 0);
                    } else {
                        that.$grid.selectId('show', that.currentId);
                        return;
                    }
                });
                return;
            }

            that.currentId = id;
            $('#script-output').html('');
            main.saveConfig('script-editor-current-id', that.currentId);
        }

        if (id && main.objects[id] && main.objects[id].type === 'script') {
            $('#editor-scripts').show();
            applyResizableV('editor-scripts-textarea');
            var obj = main.objects[id];

            $('.script-edit').show();

            $('#edit-script-group').val(getGroup(id));

            $('#edit-script-name').val(obj.common.name);

            // Add engine even if it is not installed
            if (that.engines.indexOf(obj.common.engineType) == -1) {
                $('#edit-script-engine-type').append('<option value="' + obj.common.engineType + '">' + obj.common.engineType + '</option>');
            }

            $('#edit-script-engine-type').val(obj.common.engineType);

            if (obj.common.engineType && obj.common.engineType.match(/^[jJ]ava[sS]cript/)) {
                that.editor.getSession().setMode("ace/mode/javascript");
            } else if (obj.common.engineType && obj.common.engineType.match(/^[cC]offee[sS]cript/)) {
                that.editor.getSession().setMode("ace/mode/coffee");
            }

            that.changed = false;

            //$('#edit-script-source').val(obj.common.source);
            that.editor.setValue(obj.common.source);

            applyResizableV();

            setTimeout(function () {
                that.changed = false;
                $('#script-edit-button-save').button('disable');
                $('#script-edit-button-cancel').button('disable');
                //that.editor.focus();
            }, 100);
        } else
        if (id && main.objects[id] && main.objects[id].type === 'channel' && id !== 'script.js.global' && id !== 'script.js.common') {
            $('#editor-scripts').show();

            var obj = main.objects[id];

            $('#edit-script-group').val(getGroup(id));

            $('#edit-script-name').val(obj.common.name);

            // Add engine even if it is not installed
            $('.script-edit').hide();

            that.changed = false;
            $('#editor-scripts-textarea').height(100);
            if ($('#editor-scripts-textarea').hasClass('ui-resizable')) $('#editor-scripts-textarea').resizable('destroy');

            $('#script-edit-button-save').button('disable');
            $('#script-edit-button-cancel').button('disable');
        } else {
            $('#editor-scripts').hide();
        }
    }

    // Find all script engines
    this.fillEngines = function (elemName) {
        var _engines = [];
        for (var t = 0; t < that.main.instances.length; t++) {
            if (that.main.objects[that.main.instances[t]] && that.main.objects[that.main.instances[t]].common && that.main.objects[that.main.instances[t]].common.engineTypes) {
                var engineTypes = that.main.objects[that.main.instances[t]].common.engineTypes;
                if (typeof engineTypes == 'string') {
                    if (_engines.indexOf(engineTypes) == -1) _engines.push(engineTypes);
                } else {
                    for (var z = 0; z < engineTypes.length; z++) {
                        if (_engines.indexOf(engineTypes[z]) == -1) _engines.push(engineTypes[z]);
                    }
                }
            }
        }

        if (elemName) {
            var text = '';
            for (var u = 0; u < _engines.length; u++) {
                text += '<option value="' + _engines[u] + '">' + _engines[u] + '</option>';
            }
            $('#' + elemName).html(text);
        }
        return _engines;
    };

    function getGroup(id) {
        var parts = id.split('.');
        parts.pop();
        return parts.join('.');
    }

    function fillGroups(elemName) {
        var groups = ['script.js', 'script.js.common', 'script.js.global'];

        for (var i = 0; i < that.list.length; i++) {
            var g = getGroup(that.list[i]);
            if (groups.indexOf(g) === -1 ) groups.push(g);
        }
        for (var j = 0; j < that.groups.length; j++) {
            if (groups.indexOf(that.groups[j]) === -1) groups.push(that.groups[j]);
        }
        var text = '';

        for (g = 0; g < groups.length; g++) {
            var name = groups[g].substring('script.js.'.length);
            if (name === 'global' || name === 'common') {
                name = _(name);
            }

            if (!name) name = _('no group');

            if (that.main.objects[groups[g]] && that.main.objects[groups[g]].common && that.main.objects[groups[g]].common.name) {
                name = that.main.objects[groups[g]].common.name;
            }

            text += '<option value="' + groups[g] + '">' + name + '</option>\n';
            // create group if not exists
            if (groups[g] !== 'script.js' && groups[g] !== 'script' && (!that.main.objects[groups[g]] || !that.main.objects[groups[g]].common)) {
                that.main.socket.emit('setObject', groups[g], {
                    common: {
                        name: groups[g].split('.').pop()
                    },
                    type: 'channel'
                }, function (err) {
                    if (err) {
                        that.main.showError(err);
                        that.init(true);
                    }
                });
            }
        }

        if (elemName) {
            var val = $('#' + elemName).val();
            $('#' + elemName).html(text).val(val);
        }
    }

    this.updateScript = function (oldId, newId, newCommon) {
        this.main.socket.emit('getObject', oldId, function (err, _obj) {
            setTimeout(function () {
                var obj = {common: {}};

                if (newCommon.engine  !== undefined) obj.common.engine  = newCommon.engine;
                if (newCommon.enabled !== undefined) obj.common.enabled = newCommon.enabled;
                if (newCommon.source !== undefined)  obj.common.source  = newCommon.source;

                if (oldId === newId && _obj && _obj.common && newCommon.name == _obj.common.name && (newCommon.engineType === undefined || newCommon.engineType == _obj.common.engineType)) {
                    that.main.socket.emit('extendObject', oldId, obj, function (err) {
                        if (err) {
                            that.main.showError(err);
                            that.init(true);
                        }
                    });
                } else {
                    //var prefix;

                    _obj.common.engineType = newCommon.engineType || _obj.common.engineType || 'Javascript/js';
                    var parts = _obj.common.engineType.split('/');

                    //prefix = 'script.' + (parts[1] || parts[0]) + '.';

                    if (_obj) {
                        that.main.socket.emit('delObject', oldId, function (err) {
                            if (err) {
                                that.main.showError(err);
                                that.init(true);
                            }
                        });
                        if (obj.common.engine  !== undefined) _obj.common.engine  = obj.common.engine;
                        if (obj.common.enabled !== undefined) _obj.common.enabled = obj.common.enabled;
                        if (obj.common.source  !== undefined) _obj.common.source  = obj.common.source;
                        if (obj.common.name    !== undefined) _obj.common.name    = obj.common.name;
                        delete _obj._rev;
                    } else {
                        _obj = obj;
                    }

                    // Name must always exist
                    _obj.common.name = newCommon.name;

                    _obj._id = newId; // prefix + newCommon.name.replace(/ /g, '_');

                    that.main.socket.emit('setObject', newId, _obj, function (err) {
                        if (err) {
                            that.main.showError(err);
                            that.init(true);
                        } else {
                            setTimeout(function () {
                                that.$grid.selectId('show', newId);
                            }, 500);
                        }
                    });
                }
            }, 0);
        });
    };

    this.initEditor = function () {
        if (!this.editor) {
            this.editor = ace.edit('script-editor');
            
            //this.editor.setTheme("ace/theme/monokai");
            this.editor.getSession().setMode("ace/mode/javascript");

            $('#edit-insert-id').button({
                icons: {primary: 'ui-icon-note'}
            }).css('height', '30px').click(function () {
                var sid = that.main.initSelectId();
                sid.selectId('show', function (newId) {
                    that.editor.insert('"' + newId + '"' + ((that.main.objects[newId] && that.main.objects[newId].common && that.main.objects[newId].common.name) ? ('/*' + that.main.objects[newId].common.name + '*/') : ''));
                    that.editor.focus();
                });
            });

            $('#edit-cron-id').button({
                icons: {primary: 'ui-icon-clock'}
            }).css('height', '30px').click(function () {
                var text = that.editor.getSession().doc.getTextRange(that.editor.selection.getRange());
                if (text) {
                    text = text.replace(/\"/g, '').replace(/\'/g, '');
                    if (text) {
                        try {
                            $('#div-cron').cron('value', text);
                        } catch (e) {
                            alert(_('Cannot parse text as cron message'));
                        }
                    }
                }

                that.$dialogCron.dialog('open');
            });

            this.editor.on('input', function() {
                that.changed = true;
                $('#script-edit-button-save').button('enable');
                $('#script-edit-button-cancel').button('enable');
            });

            $('#edit-script-name').change(function () {
                that.changed = true;
                $('#script-edit-button-save').button('enable');
                $('#script-edit-button-cancel').button('enable');
            }).keyup(function () {
                $(this).trigger('change');
            });

            $('#edit-script-engine-type').change(function () {
                that.changed = true;
                $('#script-edit-button-save').button('enable');
                $('#script-edit-button-cancel').button('enable');
            });
            $('#edit-script-group').change(function () {
                that.changed = true;
                $('#script-edit-button-save').button('enable');
                $('#script-edit-button-cancel').button('enable');
            });
        }
    };

    function _deleteGroup(id, originalGroup, confirmed) {
        confirmed.push(id);
        // find all elements
        for (var l = 0; l < that.list.length; l++) {
            if (that.list[l].substring(0, id.length + 1) == id + '.') {
                deleteId(that.list[l], id, confirmed);
                return;
            }
        }
        for (var g = 0; g < that.groups.length; g++) {
            if (that.groups[g].substring(0, id.length + 1) == id + '.') {
                deleteId(that.groups[g], id, confirmed);
                return;
            }
        }
        that.main.socket.emit('delObject', id, function (err) {
            if (err) {
                if (err) {
                    that.main.showError(err);
                    that.init(true);
                }
            } else if (originalGroup !== id) {
                setTimeout(function () {
                    deleteId(originalGroup, null, confirmed);
                }, 0);
            } else {
                // finish
            }
        });
    }
    function deleteId(id, originalGroup, confirmed) {
        originalGroup = originalGroup || id;
        confirmed = confirmed || [];

        if (that.main.objects[id] && that.main.objects[id].type === 'script') {
            that.main.confirmMessage(_('Are you sure to delete script %s?', that.main.objects[id].common.name), null, 'help', function (result) {
                if (result) {
                    that.main.socket.emit('delObject', id, function (err) {
                        if (err) {
                            if (err) {
                                that.main.showError(err);
                                that.init(true);
                            }
                        } else {
                            setTimeout(function () {
                                deleteId(originalGroup, null, confirmed);
                            }, 0);
                        }
                    });
                } else {

                }
            });
        } else {
            var name = id;
            if (confirmed.indexOf(id) === -1) {
                if (that.main.objects[id] && that.main.objects[id].common && that.main.objects[id].common.name) name = that.main.objects[id].common.name;

                that.main.confirmMessage(_('Are you sure to delete group <span style="color: blue">%s</span> and <span style="color: red">all</span> scripts in it?', name), null, 'help', function (result) {
                    if (result) {
                        _deleteGroup(id, originalGroup, confirmed);
                    }
                });
            } else {
                _deleteGroup(id, originalGroup, confirmed);
            }
        }
    }

    function renameGroup(id, newId, newName, _list) {
        if (!_list) {
            _list = [];
            that.currentId = newId;

            that.renaming = true;
            // collect all elements to rename
            // find all elements
            for (var l = 0; l < that.list.length; l++) {
                if (that.list[l].substring(0, id.length + 1) == id + '.') _list.push(that.list[l]);
            }
            for (var g = 0; g < that.groups.length; g++) {
                if (that.groups[g].substring(0, id.length + 1) == id + '.') _list.push(that.list[l]);
            }

            that.main.socket.emit('getObject', id, function (err, obj) {
                if (err) {
                    that.renaming = false;
                    that.main.showError(err);
                    that.init(true);
                } else {
                    obj = obj || {common: {}};
                    obj.common.name = newName;
                    obj._id = newId;
                    that.main.socket.emit('delObject', id, function (err) {
                        if (err) {
                            that.renaming = false;
                            that.main.showError(err);
                            that.init(true);
                        } else {
                            that.main.socket.emit('setObject', newId, obj, function (err) {
                                if (err) {
                                    that.renaming = false;
                                    that.main.showError(err);
                                    that.init(true);
                                } else {
                                    setTimeout(function () {
                                        renameGroup(id, newId, newName, _list);
                                    }, 0);
                                }
                            });
                        }
                    });
                }
            });
        } else {
            if (_list.length) {
                var nId = _list.pop();

                that.main.socket.emit('getObject', nId, function (err, obj) {
                    if (err) {
                        that.renaming = false;
                        that.main.showError(err);
                        that.init(true);
                    } else {
                        that.main.socket.emit('delObject', nId, function (err) {
                            if (err) {
                                that.renaming = false;
                                that.main.showError(err);
                                that.init(true);
                            } else {
                                nId = newId + nId.substring(id.length);
                                that.main.socket.emit('setObject', nId, obj, function (err) {
                                    if (err) {
                                        that.renaming = false;
                                        that.main.showError(err);
                                        that.init(true);
                                    } else {
                                        setTimeout(function () {
                                            renameGroup(id, newId, newName, _list);
                                        }, 0);
                                    }
                                });
                            }

                        });
                    }

                });
            } else {
                fillGroups('edit-script-group');
                that.$grid.selectId('reinit');
                applyResizableH(true, 1000);
            }
        }
    }

    this.init = function (update) {
        if (!this.main.objectsLoaded) {
            setTimeout(function () {
                that.init(update);
            }, 250);
            return;
        }

        if (typeof this.$grid !== 'undefined' && (!this.$grid.data('inited') || update)) {
            this.$grid.data('inited', true);

            that.engines = this.fillEngines('edit-script-engine-type');

            this.$grid.selectId('init', {
                objects:        main.objects,
                noDialog:       true,
                texts: {
                    select:   _('Select'),
                    cancel:   _('Cancel'),
                    all:      _('All'),
                    id:       _('Scripts'),
                    name:     _('Name'),
                    role:     _('Role'),
                    room:     _('Room'),
                    value:    _('Value'),
                    type:     _('Type'),
                    selectid: _('Select ID'),
                    from:     _('From'),
                    lc:       _('Last changed'),
                    ts:       _('Time stamp'),
                    wait:     _('Processing...'),
                    ack:      _('Acknowledged'),
                    edit:     _('Edit'),
                    ok:       _('Ok'),
                    enum:     _('Members')
                },
                noCopyToClipboard: true,
                root:           'script.js.',
                useNameAsId:    true,
                noColumnResize: true,
                firstMinWidth:  '*',
                columns: ['button'],
                widths:  ['140px'],
                buttons: [
                    {
                        text: false,
                        icons: {
                            primary:'ui-icon-play'
                        },
                        click: function (id) {
                            // toggle state
                            that.main.socket.emit('extendObject', id, {
                                common: {
                                    enabled: !(that.main.objects[id] && that.main.objects[id].common && that.main.objects[id].common.enabled)
                                }
                            }, function (err) {
                                if (err) {
                                    that.main.showError(err);
                                    that.init(true);
                                }
                            });
                        },
                        match: function (id) {
                            if (that.main.objects[id] && that.main.objects[id].type ==='script') {
                                if (that.main.objects[id] && that.main.objects[id].common && that.main.objects[id].common.enabled) {
                                    this.button('option', 'icons', {
                                        primary:'ui-icon-pause'
                                    }).attr('title', _('Activated. Click to stop.')).css({'background-color': 'lightgreen'});
                                } else {
                                    this.button('option', 'icons', {
                                        primary:'ui-icon-play'
                                    }).attr('title', _('Deactivated. Click to start.')).css({'background-color': '#FF9999'});
                                }
                            } else {
                                this.hide();
                            }
                        },
                        width: 26,
                        height: 20
                    },
                    {
                        text: false,
                        icons: {
                            primary:'ui-icon-pencil'
                        },
                        click: function (id) {
                            that.editScript(id);
                        },
                        match: function (id) {
                            if (!that.main.objects[id] || that.main.objects[id].type !=='script') this.hide();
                        },
                        width: 26,
                        height: 20
                    },
                    {
                        text: false,
                        icons: {
                            primary:'ui-icon-trash'
                        },
                        click: function (id) {
                            if (!that.main.objects[id] || that.main.objects[id].type !== 'script') {
                                deleteId(id);
                            } else {
                                that.main.confirmMessage(_('Are you sure to delete script %s?', that.main.objects[id].common.name), null, 'help', function (result) {
                                    if (result) that.main.socket.emit('delObject', id);
                                });
                            }
                        },
                        match: function (id) {
                            if (!main.objects[id] || !main.objects[id].common || main.objects[id].common.nondeletable) this.hide();
                        },
                        width: 26,
                        height: 20
                    },
                    {
                        text: false,
                        icons: {
                            primary:'ui-icon-copy'
                        },
                        click: function (id) {
                            that.main.socket.emit('getObject', id, function (err, obj) {
                                if (err) {
                                    that.main.showError(err);
                                    return;
                                }
                                // find new name
                                var i = 0;
                                //build name
                                var newId;
                                do {
                                    i++;
                                    if (obj._id.match(/\(\d+\)/)) {
                                        newId = obj._id.replace(/\(\d+\)/, '(' + i + ')');
                                    } else {
                                        newId = obj._id + '(' + i + ')';
                                    }
                                } while (that.list.indexOf(newId) != -1);

                                obj._id = newId;
                                that.main.socket.emit('setObject', newId, obj, function (err, obj) {
                                    if (err) {
                                        that.main.showError(err);
                                        return;
                                    }
                                });
                            });
                        },
                        match: function (id) {
                            if (!that.main.objects[id] || that.main.objects[id].type !=='script') this.hide();
                        },
                        width: 26,
                        height: 20
                    },
                    {
                        text: false,
                        icons: {
                            primary:'ui-icon-refresh'
                        },
                        click: function (id) {
                            that.main.socket.emit('extendObject', id, {});
                        },
                        match: function (id) {
                            if (!that.main.objects[id] || that.main.objects[id].type !=='script') this.hide();
                        },
                        width: 26,
                        height: 20
                    }
                ],
                panelButtons: [
                    {
                        text: false,
                        title: _('New script'),
                        icons: {
                            primary: 'ui-icon-document'
                        },
                        click: function () {
                            var group = that.currentId || 'script.js';
                            if (that.main.objects[group] && that.main.objects[group].type === 'script') group = getGroup(group);

                            addScript(group);
                        }
                    },
                    {
                        text: false,
                        title: _('New group'),
                        icons: {
                            primary: 'ui-icon ui-icon-circle-plus'
                        },
                        click: function () {
                            addScriptInGroup(that.currentId);
                        }
                    }
                ],
                onChange: function (id) {
                    editScript(id);
                }
            }).selectId('show', update ? undefined : main.config['script-editor-current-id'] || undefined);

            // Show add button
            setTimeout(function () {
                // show blink on start
                var $addNew = $('#btn_custom_0_0');
                var background = $addNew.css('background-color');
                $addNew
                    .css({
                        'background-color': 'red'
                    }, 'red')
                    .animate({'background-color': background}, 500, function () {
                        $addNew.animate({'background-color': 'red'}, 500, function () {
                            $addNew.animate({'background-color': background}, 3000);
                        });
                    });
            }, 500);

            applyResizableH(true);
        }
    };

    this.saveScript = function () {

        var obj = {};
        var newId      = $('#edit-script-group').val() + '.' + $('#edit-script-name').val().replace(/[\s.]/g, '_');
        obj.name       = $('#edit-script-name').val();
        obj.source     = this.editor.getValue();
        obj.engineType = $('#edit-script-engine-type').val() || '';

        if (this.currentId != newId && that.main.objects[newId]) {
            that.main.showError(_('Duplicate name'));
            return;
        }

        this.changed = false;
        $('#script-edit-button-save').button('disable');
        $('#script-edit-button-cancel').button('disable');


        if (that.main.objects[this.currentId] && that.main.objects[this.currentId].type === 'script') {
            this.updateScript(this.currentId, newId, obj);
        } else {
            renameGroup(this.currentId, newId, obj.name);
        }
    };

    this.objectChange = function (id, obj) {
        // Update scripts
        if (id.match(/^script\./)) {
            if (obj) {
                if (this.list.indexOf(id) == -1) this.list.push(id);
            } else {
                // deleted
                var j = this.list.indexOf(id);
                if (j != -1) this.list.splice(j, 1);
            }

            if (this.updateTimer) clearTimeout(this.updateTimer);

            this.updateTimer = setTimeout(function () {
                that.updateTimer = null;
                that.$grid.selectId('reinit');
                applyResizableH(true, 1000);
            }, 200);

            if (this.$grid) this.$grid.selectId('object', id, obj);
        } else
        if (id.match(/^system\.adapter\.[-\w]+\.[0-9]+$/)) {
            var val = $('#edit-script-engine-type').val();
            that.engines = that.fillEngines('edit-script-engine-type');
            $('#edit-script-engine-type').val(val);
        }

        if (id.match(/^script\.js\./) && obj && obj.type === 'channel') {
            scripts.groups.push(id);
            if (!that.renaming) fillGroups('edit-script-group');
        }
    };

    function getTimeString(d) {
        var text = '';
        var i = d.getHours();
        if (i < 10) i = '0' + i.toString();
        text = i + ':';

        i = d.getMinutes();
        if (i < 10) i = '0' + i.toString();
        text += i + ':';
        i = d.getSeconds();
        if (i < 10) i = '0' + i.toString();
        text += i + '.';
        i = d.getMilliseconds();
        if (i < 10) {
            i = '00' + i.toString();
        } else if (i < 100) {
            i = '0' + i.toString();
        }
        text += i;
        return text;
    }

    this.onLog = function (message) {
        if (!this.$parentOutput) this.$parentOutput = $('#script-output').parent().parent();

        //{"message":"javascript.0 Stop script script.js.Script4","severity":"info","from":"javascript.0","ts":1455490697111,"_id":364}
        if (that.currentId && message.message.indexOf(that.currentId) !== -1) {
            var text = '<tr class="' + message.severity + '"><td>' + getTimeString(new Date(message.ts)) + '</td><td>[' + message.severity + ']</td><td>' + message.message + '</td></tr>';
            var h          = this.$parentOutput.height();

            var oldHeight  = $('#script-output').height();
            var scrollTop  = this.$parentOutput.scrollTop();
            var shiftToEnd = (scrollTop + h >= oldHeight - 5);

            if (oldHeight > 2000) {
                $('#script-output tr:first').remove();
                var oldHeight1 = $('#script-output').height();
                this.$parentOutput.scrollTop(scrollTop - (oldHeight - oldHeight1));

                oldHeight = oldHeight1;
            }

            var scrollTop = this.$parentOutput.scrollTop();
            var shiftToEnd = (scrollTop + h >= oldHeight - 5);

            $('#script-output').append(text);

            if (shiftToEnd) {
                this.$parentOutput.scrollTop(oldHeight + 50);
            }
        }
    }
}

var main = {
    socket:         io.connect(),
    saveConfig:     function (attr, value) {
        if (!main.config) return;
        if (attr) main.config[attr] = value;

        if (typeof storage != 'undefined') {
            storage.set('adminConfig', JSON.stringify(main.config));
        }
    },
    showError:      function (error) {
        main.showMessage(_(error),  _('Error'), 'alert');
    },
    showMessage:    function (message, title, icon) {
        $dialogMessage.dialog('option', 'title', title || _('Message'));
        $('#dialog-message-text').html(message);
        if (icon) {
            $('#dialog-message-icon').show();
            $('#dialog-message-icon').attr('class', '');
            $('#dialog-message-icon').addClass('ui-icon ui-icon-' + icon);
        } else {
            $('#dialog-message-icon').hide();
        }
        $dialogMessage.dialog('open');
    },
    confirmMessage: function (message, title, icon, buttons, callback) {
        if (typeof buttons === 'function') {
            callback = buttons;
            $dialogConfirm.dialog('option', 'buttons', [
                {
                    text: _('Ok'),
                    click: function () {
                        var cb = $(this).data('callback');
                        $(this).dialog('close');
                        if (cb) cb(true);
                    }
                },
                {
                    text: _('Cancel'),
                    click: function () {
                        var cb = $(this).data('callback');
                        $(this).dialog('close');
                        if (cb) cb(false);
                    }
                }

            ]);
        } else if (typeof buttons === 'object') {
            for (var b = 0; b < buttons.length; b++) {
                buttons[b] = {
                    text: buttons[b],
                    id: 'dialog-confirm-button-' + b,
                    click: function (e) {
                        var id = parseInt(e.currentTarget.id.substring('dialog-confirm-button-'.length), 10);
                        var cb = $(this).data('callback');
                        $(this).dialog('close');
                        if (cb) cb(id);
                    }
                }
            }
            $dialogConfirm.dialog('option', 'buttons', buttons);
        }

        $dialogConfirm.dialog('option', 'title', title || _('Message'));
        $('#dialog-confirm-text').html(message);
        if (icon) {
            $('#dialog-confirm-icon').show();
            $('#dialog-confirm-icon').attr('class', '');
            $('#dialog-confirm-icon').addClass('ui-icon ui-icon-' + icon);
        } else {
            $('#dialog-confirm-icon').hide();
        }
        $dialogConfirm.data('callback', callback);
        $dialogConfirm.dialog('open');
    },
    initSelectId:   function () {
        if (main.selectId) return main.selectId;
        main.selectId = $('#dialog-select-member').selectId('init',  {
            objects: main.objects,
            states:  main.states,
            noMultiselect: true,
            imgPath: '../../lib/css/fancytree/',
            filter: {type: 'state'},
            texts: {
                select:   _('Select'),
                cancel:   _('Cancel'),
                all:      _('All'),
                id:       _('ID'),
                name:     _('Name'),
                role:     _('Role'),
                room:     _('Room'),
                value:    _('Value'),
                selectid: _('Select ID'),
                from:     _('From'),
                lc:       _('Last changed'),
                ts:       _('Time stamp'),
                wait:     _('Processing...'),
                ack:      _('Acknowledged')
            },
            columns: ['image', 'name', 'role', 'room', 'value']
        });
        return main.selectId;
    },
    objects:        {},
    states:         {},
    currentHost:    '',
    instances:      [],
    objectsLoaded:  false,
    waitForRestart: false,
    selectId:       null
};

var $dialogMessage =        $('#dialog-message');
var $dialogConfirm =        $('#dialog-confirm');

// Read all positions, selected widgets for every view,
// Selected view, selected menu page,
// Selected widget or view page
// Selected filter
if (typeof storage != 'undefined') {
    try {
        main.config = storage.get('adminConfig');
        if (main.config) {
            main.config = JSON.parse(main.config);
        } else {
            main.config = {};
        }
    } catch (e) {
        console.log('Cannot load edit config');
        main.config = {};
    }
}
var firstConnect = true;
var scripts  = new Scripts(main);

function getStates(callback) {
    main.socket.emit('getStates', function (err, res) {
        main.states = res;
        if (typeof callback === 'function') {
            setTimeout(function () {
                callback();
            }, 0);
        }
    });
}

function getObjects(callback) {
    main.socket.emit('getObjects', function (err, res) {
        setTimeout(function () {
            var obj;
            main.objects = res;
            for (var id in main.objects) {
                if (id.slice(0, 7) === '_design') continue;

                obj = res[id];
                if (obj.type === 'instance') main.instances.push(id);
                if (obj.type === 'script')   scripts.list.push(id);
                if (obj.type === 'channel' && id.match(/^script\.js\./)) scripts.groups.push(id);
            }
            main.objectsLoaded = true;

            scripts.prepare();
            scripts.init();

            if (typeof callback === 'function') callback();
        }, 0);
    });
}

function objectChange(id, obj) {
    // update main.objects cache
    if (obj) {
        if (obj._rev && main.objects[id]) main.objects[id]._rev = obj._rev;
        if (!main.objects[id] || JSON.stringify(main.objects[id]) != JSON.stringify(obj)) {
            main.objects[id] = obj;
        }
    } else if (main.objects[id]) {
        var oldObj = {_id: id, type: main.objects[id].type};
        delete main.objects[id];
        if (oldObj.type === 'instance') {
            var pos = main.instances.indexOf(id);
            if (pos !== -1) main.instances.splice(pos, 1);
        } else
        if (oldObj.type === 'script') {
            var pos = main.instances.indexOf(id);
            if (pos !== -1) main.instances.splice(pos, 1);
        } else
        if (id.match(/^script\.js\./) && oldObj.type === 'channel') {
            var pos = main.instances.indexOf(id);
            if (pos !== -1) main.instances.splice(pos, 1);
        }
    }

    if (main.selectId) main.selectId.selectId('object', id, obj);

    if (id.match(/^system\.adapter\.[-\w]+\.[0-9]+$/)) {
        // Disable scripts tab if no one script engine instance found
        var engines = scripts.fillEngines();
        $('#tabs').tabs('option', 'disabled', (engines && engines.length) ? [] : [4]);
    }

    scripts.objectChange(id, obj);
}

function stateChange(id, state) {
    var rowData;
    id = id ? id.replace(/ /g, '_') : '';

    if (!id || !id.match(/\.messagebox$/)) {
        if (main.selectId) main.selectId.selectId('state', id, state);
    }
}

function onLog(message) {
    scripts.onLog(message);
}
main.socket.on('permissionError', function (err) {
    main.showMessage(_('Has no permission to %s %s %s', err.operation, err.type, (err.id || '')));
});
main.socket.on('objectChange', function (id, obj) {
    setTimeout(objectChange, 0, id, obj);
});
main.socket.on('stateChange', function (id, obj) {
    setTimeout(stateChange, 0, id, obj);
});
main.socket.on('connect', function () {
    $('#connecting').hide();
    if (firstConnect) {
        firstConnect = false;

        main.socket.emit('getUserPermissions', function (err, acl) {
            main.acl = acl;
            // Read system configuration
            main.socket.emit('getObject', 'system.config', function (err, data) {
                main.systemConfig = data;
                if (!err && main.systemConfig && main.systemConfig.common) {
                    systemLang = main.systemConfig.common.language;
                } else {
                    systemLang = window.navigator.userLanguage || window.navigator.language;

                    if (systemLang !== 'en' && systemLang !== 'de' && systemLang !== 'ru') {
                        main.systemConfig.common.language = 'en';
                        systemLang = 'en';
                    }
                }

                translateAll();

                $dialogMessage.dialog({
                    autoOpen: false,
                    modal:    true,
                    buttons: [
                        {
                            text: _('Ok'),
                            click: function () {
                                $(this).dialog("close");
                            }
                        }
                    ]
                });

                $dialogConfirm.dialog({
                    autoOpen: false,
                    modal:    true,
                    width:    400,
                    height:   200,
                    buttons: [
                        {
                            text: _('Ok'),
                            click: function () {
                                var cb = $(this).data('callback');
                                $(this).dialog('close');
                                if (cb) cb(true);
                            }
                        },
                        {
                            text: _('Cancel'),
                            click: function () {
                                var cb = $(this).data('callback');
                                $(this).dialog('close');
                                if (cb) cb(false);
                            }
                        }

                    ]
                });

                getStates(getObjects);
            });
        });
    }
    if (main.waitForRestart) {
        location.reload();
    }
});
main.socket.on('disconnect', function () {
    $('#connecting').show();
});
main.socket.on('reconnect', function () {
    $('#connecting').hide();
    if (main.waitForRestart) {
        location.reload();
    }
});
main.socket.on('reauthenticate', function () {
    location.reload();
});
main.socket.on('log', function (message) {
    setTimeout(onLog, 0, message);
});

function applyResizableH(install, timeout) {
    if (timeout) {
        setTimeout(function () {
            applyResizableH(install);
        }, timeout);
    } else {
        if ($('#grid-scripts').hasClass('ui-resizable')) $('#grid-scripts').resizable('destroy');

        if (!install) return;

        var width = parseInt(main.config['script-editor-width'] || '30%', 10);

        $('#grid-scripts').width(width + '%').next().width(100 - width + '%');

        $('#grid-scripts').resizable({
            autoHide:   false,
            handles:    'e',
            resize:     function(e, ui) {
                var parent = ui.element.parent();
                var remainingSpace = parent.width() - ui.element.outerWidth(),
                    divTwo = ui.element.next(),
                    divTwoWidth = (remainingSpace - (divTwo.outerWidth() - divTwo.width())) / parent.width() * 100 + "%";
                divTwo.width(divTwoWidth);
            },
            stop: function(e, ui) {
                var parent = ui.element.parent();
                var width  = ui.element.width() / parent.width() * 100 + '%';
                ui.element.css({
                    width: width
                });
                main.saveConfig('script-editor-width', width);
                if (scripts.editor) scripts.editor.resize();
            }
        });
    }
}

function applyResizableV() {
    var height = parseInt(main.config['script-editor-height'] || '80%', 10);
    $('#editor-scripts-textarea').height(height + '%').next().height(100 - height + '%');

    $('#editor-scripts-textarea').resizable({
        autoHide:   false,
        handles:    's',
        resize:     function(e, ui) {
            var parent = ui.element.parent();
            var remainingSpace = parent.height() - ui.element.outerHeight(),
                divTwo = ui.element.next(),
                divTwoWidth = (remainingSpace - (divTwo.outerHeight() - divTwo.height())) / parent.height() * 100 + "%";
            divTwo.height(divTwoWidth);
        },
        stop: function(e, ui) {
            var parent = ui.element.parent();
            var height = ui.element.height() / parent.height() * 100 + '%';
            ui.element.css({
                height: height
            });
            main.saveConfig('script-editor-height', height);
            if (scripts.editor) scripts.editor.resize();
        }
    });
}
