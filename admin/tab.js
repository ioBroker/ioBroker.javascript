function Scripts(main) {
    var that            = this;
    this.list           = [];
    this.$grid          = $('#grid-scripts');
    this.$dialog        = $('#dialog-script');
    this.$dialogCron    = $('#dialog-cron');
    this.editor         = null;
    this.editorConstant = null;
    this.changed        = false;
    this.main           = main;
    this.currentScript  = null;
    this.engines        = [];

    function addScript() {
        // Find new unique name
        var found;
        var newText = _('Script');
        var idx = 1;
        do {
            found = true;
            for (var _id = 0; _id < that.list.length; _id++) {
                var obj = that.main.objects[that.list[_id]];
                if (obj && obj._id == 'script.js.common' + newText + idx)  {
                    idx++;
                    found = false;
                    break;
                }
            }
        } while (!found);
        var name = 'common.' + newText + idx;
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

        that.main.socket.emit('setObject', 'script.js.' + name.replace(/ /g, '_'), {
            common: {
                name:       name,
                engineType: engineType,
                source:     '',
                enabled:    false,
                engine:     instance
            },
            type: 'script'
        });
    }

    this.prepare = function () {
        /*this.$grid.jqGrid({
            datatype: 'local',
            colNames: ['_id', 'id', _('name'), _('engine type'), _('enabled'), _('engine'), ''],
            colModel: [
                {name: '_id',        index: '_id', hidden: true},
                {name: '_obj_id',    index: '_obj_id'},
                {name: 'name',       index: 'name',     editable: true},
                {name: 'engineType', index: 'engineType'},
                {name: 'enabled',    index: 'enabled',  editable: true, edittype: 'checkbox', editoptions: {value: _('true') + ':' + _('false')}},
                {name: 'engine',     index: 'engine',   editable: true, edittype: 'select',   editoptions: ''},
                {name: 'commands',   index: 'commands', editable: false, minWidth: 190, align: 'center'}
            ],
            pager: $('#pager-scripts'),
            rowNum: 100,
            rowList: [20, 50, 100],
            sortname: 'id',
            sortorder: 'desc',
            viewrecords: true,
            caption: _('Scripts'),
            ignoreCase: true,
            ondblClickRow: function (rowid) {
                that.onEditLine(rowid.substring('script_'.length));
            },
            gridComplete: function () {
                //$('#del-script').addClass('ui-state-disabled');
                // $('#edit-script').addClass('ui-state-disabled');
            },
            loadComplete: function () {
                that.initButtons();
            },
            postData: that.main.config.scriptsFilter ? { filters: that.main.config.scriptsFilter} : undefined,
            search: !!that.main.config.scriptsFilter
        }).jqGrid('filterToolbar', {
            defaultSearch: 'cn',
            autosearch:    true,
            searchOnEnter: false,
            enableClear:   false,
            afterSearch:   function () {
                that.initButtons();
                // Save filter
                that.main.saveConfig('scriptsFilter', that.$grid.getGridParam("postData").filters);
            }
        }).navGrid('#pager-scripts', {
            search:  false,
            edit:    false,
            add:     false,
            del:     false,
            refresh: false
        }).jqGrid('navButtonAdd', '#pager-scripts', {
            caption: '',
            buttonicon: 'ui-icon-plus',
            onClickButton: function () {
                // Find last id;
                var id = 1;
                var ids = that.$grid.jqGrid('getDataIDs');
                while (ids.indexOf('script_' + id) != -1) {
                    id++;
                }
                // Find new unique name
                var found;
                var newText = _("Script");
                var idx = 1;
                do {
                    found = true;
                    for (var _id = 0; _id < ids.length; _id++) {
                        var obj = that.$grid.jqGrid('getRowData', ids[_id]);
                        if (obj && obj.name == newText + idx)  {
                            idx++;
                            found = false;
                            break;
                        }
                    }
                } while (!found);
                var name = newText + idx;
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

                that.main.socket.emit('setObject', 'script.js.' + name.replace(/ /g, '_').replace(/\./g, '_'), {
                    common: {
                        name:       name,
                        engineType: engineType,
                        source:     '',
                        enabled:    false,
                        engine:     instance
                    },
                    type: 'script'
                });
            },
            position: 'first',
            id:       'add-script',
            title:    _('new script'),
            cursor:   'pointer'
        });*/

        this.$dialog.dialog({
            autoOpen:   false,
            modal:      true,
            width:      800,
            height:     540,
            buttons: [
                {
                    id: 'script-edit-button-save',
                    text: _('Save'),
                    click: function () {
                        that.saveScript();
                    }
                },
                {
                    id: 'script-edit-button-cancel',
                    text: _('Cancel'),
                    click: function () {
                        that.$dialog.dialog('close');
                    }
                }
            ],
            beforeClose: function () {
                if (that.changed) {
                    return confirm(_('Are you sure? Changes are not saved.'));
                }
                var pos = $(this).parent().position();
                that.main.saveConfig('scripts-edit-top',  pos.top);
                that.main.saveConfig('scripts-edit-left', pos.left);

                return true;
            },
            resize: function () {
                that.main.saveConfig('scripts-edit-width',  $(this).parent().width());
                that.main.saveConfig('scripts-edit-height', $(this).parent().height() + 10);
                that.editor.resize();
            }
        });

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

        //$("#load_grid-scripts").show();
    };

    this.resize = function (width, height) {
        if (this.editorConstant) this.editorConstant.resize();
        if (this.editor) this.editor.resize();
    };

    function displayScript(id) {
        that.initEditor('editorConstant', 'script-editor-constant');
        that.currentScript = id;

        if (id && main.objects[id]) {
            $('#editor-scripts').show();
            var obj = main.objects[id];

            $('#edit-script-id-constant').val(obj._id);
            $('#edit-script-name-constant').val(obj.common.name);

            $('#edit-script-global-constant').prop('checked', obj.common.name.match(/^global\./));

            // Add engine even if it is not installed
            if (that.engines.indexOf(obj.common.engineType) == -1) {
                $('#edit-script-engine-type-constant').append('<option value="' + obj.common.engineType + '">' + obj.common.engineType + '</option>');
                $('#edit-script-engine-type').append('<option value="' + obj.common.engineType + '">' + obj.common.engineType + '</option>');
            }
            $('#edit-script-engine-type-constant').val(obj.common.engineType);

            if (obj.common.engineType.match(/^[jJ]ava[sS]cript/)) {
                that.editorConstant.getSession().setMode("ace/mode/javascript");
            } else if (obj.common.engineType.match(/^[cC]offee[sS]cript/)) {
                that.editorConstant.getSession().setMode("ace/mode/coffee");
            }

            that.changed = false;

            //$('#edit-script-source').val(obj.common.source);
            that.editorConstant.setValue(obj.common.source);

            //this.editorConstant.resize();

            setTimeout(function () {
                that.changed = false;
                $('#script-edit-button-save-constant').button('disable');
                //that.editorConstant.focus();
            }, 100);
        } else {
            $('#editor-scripts').hide();
        }
    }

    // Find all script engines
    this.fillEngines = function (elemName) {
        var _engines = [];
        for (var t = 0; t < main.instances.length; t++) {
            if (main.objects[main.instances[t]] && main.objects[main.instances[t]].common && main.objects[main.instances[t]].common.engineTypes) {
                var engineTypes = main.objects[main.instances[t]].common.engineTypes;
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

    this.onEditLine = function (id) {
        $('#add-script').addClass('ui-state-disabled');
        $('.script-edit-submit').hide();
        $('.script-edit-file-submit').hide();
        $('.script-delete-submit').hide();
        $('.script-reload-submit').hide();
        $('.script-copy-submit').hide();
        $('.script-ok-submit[data-script-id="' + id + '"]').show();
        $('.script-cancel-submit[data-script-id="' + id + '"]').show();

        // Set the colors
        var a = $('td[aria-describedby="grid-scripts_enabled"]');
        var htmlTrue  = that.htmlBoolean(true);
        var htmlFalse = that.htmlBoolean(false);
        a.each(function (index) {
            var text = $(this).html();
            if (text == htmlTrue) {
                $(this).html(_('true'));
            } else if (text == htmlFalse) {
                $(this).html(_('false'));
            }
        });

        var list = {};
        for (var i = 0; i < this.main.instances.length; i++) {
            if (this.main.instances[i].indexOf('.javascript.') != -1) {
                list[this.main.instances[i]] = this.main.instances[i];
            }
        }

        this.$grid.setColProp('engine', {
            editable:    true,
            edittype:    'select',
            editoptions: {value: list},
            align:       'center'
        });

        this.$grid.jqGrid('editRow', 'script_' + id, {"url": "clientArray"});
    };

    this.htmlBoolean = function (value) {
        if (value === 'true' || value === true) {
            if (!this.lTrue) this.lTrue = '<span style="color:green;font-weight:bold">' + _('true') + '</span>';
            return this.lTrue;
        } else if (value === 'false' || value === false) {
            if (!this.lFalse) this.lFalse = '<span style="color:red">' + _('false') + '</span>';
            return this.lFalse;
        } else {
            return value;
        }
    };

    this.updateScript = function (id, newCommon) {
        this.main.socket.emit('getObject', id, function (err, _obj) {
            setTimeout(function () {
                var obj = {common: {}};

                if (newCommon.engine  !== undefined) obj.common.engine  = newCommon.engine;
                if (newCommon.enabled !== undefined) obj.common.enabled = newCommon.enabled;

                if (obj.common.enabled === _('true'))  obj.common.enabled = true;
                if (obj.common.enabled === _('false')) obj.common.enabled = false;

                if (newCommon.source !== undefined) obj.common.source = newCommon.source;

                if (_obj && _obj.common && newCommon.name == _obj.common.name && (newCommon.engineType === undefined || newCommon.engineType == _obj.common.engineType)) {
                    that.main.socket.emit('extendObject', id, obj, function (err) {
                        if (err) {
                            that.main.showError(err);
                            that.init(true);
                        }
                    });
                } else {
                    var prefix;

                    _obj.common.engineType = newCommon.engineType || _obj.common.engineType || 'Javascript/js';
                    var parts = _obj.common.engineType.split('/');

                    prefix = 'script.' + (parts[1] || parts[0]) + '.';

                    if (_obj) {
                        that.main.socket.emit('delObject', _obj._id, function (err) {
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

                    _obj._id = prefix + newCommon.name.replace(/ /g, '_');
                    that.main.socket.emit('setObject', _obj._id, _obj, function (err) {
                        if (err) {
                            that.main.showError(err);
                            that.init(true);
                        }
                    });
                }
            }, 0);
        });
    };

    this.initEditor = function (editorName, divName) {
        if (!this[editorName]) {
            this[editorName] = ace.edit(divName);
            //this[editorName].setTheme("ace/theme/monokai");
            this[editorName].getSession().setMode("ace/mode/javascript");

            $('#edit-insert-id').button({
                icons: {primary: 'ui-icon-note'}
            }).css('height', '30px').click(function () {
                var sid = that.main.initSelectId();
                sid.selectId('show', function (newId) {
                    that[editorName].insert('"' + newId + '"' + ((that.main.objects[newId] && that.main.objects[newId].common && that.main.objects[newId].common.name) ? ('/*' + that.main.objects[newId].common.name + '*/') : ''));
                    that[editorName].focus();
                });
            });

            $('#edit-cron-id').button({
                icons: {primary: 'ui-icon-clock'}
            }).css('height', '30px').click(function () {
                var text = that[editorName].getSession().doc.getTextRange(that[editorName].selection.getRange());
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

            this[editorName].on('input', function() {
                that.changed = true;
                $('#script-edit-button-save').button('enable');
            });

            $('#edit-script-name').change(function () {
                that.changed = true;
                $('#script-edit-button-save').button('enable');

                $('#edit-script-global').prop('checked', $('#edit-script-name').val().match(/^global\./));
            }).keyup(function () {
                $(this).trigger('change');
            });

            $('#edit-script-global').change(function () {
                var name = $('#edit-script-name').val();
                if ($(this).prop('checked')) {
                    if (!name.match(/^global\./)) {
                        $('#edit-script-name').val('global.' + name).trigger('change');
                    }
                } else {
                    if (name.match(/^global\./)) {
                        $('#edit-script-name').val(name.replace('global.', '')).trigger('change');
                    }
                }
            });
        }

    };

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
            this.fillEngines('edit-script-engine-type-constant');

            this.$grid.selectId('init', {
                objects: main.objects,
                noDialog: true,
                texts: {
                    select:   _('Select'),
                    cancel:   _('Cancel'),
                    all:      _('All'),
                    id:       _('ID'),
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
                filter: {type: 'script'},
                columns: ['name', 'script', 'button'],
                widths:  ['150', '*', '120'],
                buttons: [
                    {
                        text: false,
                        icons: {
                            primary:'ui-icon-pencil'
                        },
                        click: function (id) {
                            that.editScript(id);
                        },
                        match: function (id) {
                            if (id.split('.').length <= 2) this.hide();
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
                            that.main.confirmMessage(_('Are you sure to delete script %s?', that.main.objects[id].common.name), null, 'help', function (result) {
                                if (result) that.main.socket.emit('delObject', id);
                            });
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
                            if (!main.objects[id] || !main.objects[id].common || main.objects[id].common.nondeletable) this.hide();
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
                            if (!main.objects[id] || !main.objects[id].common || main.objects[id].common.nondeletable) this.hide();
                        },
                        width: 26,
                        height: 20
                    }
                ],
                /*editEnd: function (id, newValues) {
                    var pos = id.lastIndexOf('.');
                    if (pos != -1) {
                        var original = id.substring(0, pos);
                        // rename all children
                        enumRename(id, original + '.' + newValues.id.replace(/ /g, '_').toLowerCase(), newValues.name);
                    }
                },
                editStart: function (id, inputs) {
                    var pos = id.lastIndexOf('.');
                    if (pos != -1) inputs.id.val(id.substring(pos + 1));
                },*/
                panelButtons: [
                    {
                        text: false,
                        title: _('New script'),
                        icons: {
                            primary:'ui-icon-plus'
                        },
                        click: function () {
                            addScript();
                        }
                    }
                ],
                onChange: function (id) {
                    displayScript(id);
                }
            }).selectId('show');

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
        }

        /*if (update || typeof this.$grid != 'undefined' && !this.$grid[0]._isInited) {
            this.$grid[0]._isInited = true;
            this.$grid.jqGrid('clearGridData');
            var id = 1;
            var htmlTrue  = that.htmlBoolean(true);
            var htmlFalse = that.htmlBoolean(false);

            var globals = [];
            for (var h = this.list.length - 1; h >= 0; h--) {
                if (this.list[h].match(/_global$/)) {
                    globals.push(this.list[h]);
                    this.list.splice(h, 1);
                }
            }
            globals.sort();
            this.list.sort();

            for (var h = globals.length - 1; h >= 0; h--) {
                this.list.unshift(globals[h]);
            }

            for (var i = 0; i < this.list.length; i++) {
                var obj = main.objects[this.list[i]];
                if (!obj) continue;

                this.$grid.jqGrid('addRowData', 'script_' + id, {
                    _id:        id,
                    _obj_id:    obj._id,
                    name:       obj.common ? obj.common.name : '',
                    engineType: obj.common ? obj.common.engineType : '',
                    enabled:    obj.common ? (obj.common.enabled ? htmlTrue : htmlFalse) : '',
                    engine:     obj.common ? obj.common.engine   : '',
                    commands:   '<table class="no-space"><tr class="no-space">' +
                        '<td class="no-space"><button data-script-id="' + id + '" class="script-edit-submit">'      + _('edit')   + '</button></td>' +
                        '<td class="no-space"><button data-script-id="' + id + '" class="script-edit-file-submit">' + _('edit file') + '</button></td>' +
                        '<td class="no-space"><button data-script-id="' + id + '" class="script-reload-submit">'    + _('restart script') + '</button></td>' +
                        '<td class="no-space"><button data-script-id="' + id + '" class="script-copy-submit">'      + _('copy') + '</button></td>' +
                        '<td class="no-space"><button data-script-id="' + id + '" class="script-delete-submit">'    + _('delete') + '</button></td>' +
                        '<td class="no-space"><button data-script-id="' + id + '" class="script-ok-submit"     style="display:none">' + _('ok')     + '</button></td>' +
                        '<td class="no-space"><button data-script-id="' + id + '" class="script-cancel-submit" style="display:none">' + _('cancel') + '</button></td>'+
                        '</tr></table>'
                });
                id++;
            }
            this.$grid.trigger('reloadGrid');
            this.initButtons();

            // Show add button
            if (!this.list.length) {
                setTimeout(function () {
                    var w = $('#add-script').width();
                    var b = $('#add-script').css('backgroundColor');
                    $('#add-script').css({width: 150, opacity: 0.5, backgroundColor: "#aa0000"});
                    $('#add-script').animate({
                        opacitiy: 1, width: w, backgroundColor: b
                    }, 1000);
                }, 500);
            }
            // set cursor
            $('.ui-jqgrid-resize').css('cursor', 'e-resize');
        }*/
    };

    this.initButtons = function () {
        $('.script-edit-submit').unbind('click').button({
            icons: {primary: 'ui-icon-pencil'},
            text:  false
        }).click(function () {
            that.onEditLine($(this).attr('data-script-id'));
        });

        $('.script-edit-file-submit').unbind('click').button({
            icons: {primary: 'ui-icon-note'},
            text:  false
        }).click(function () {
            var id = $(this).attr('data-script-id');
            var objSelected = that.$grid.jqGrid('getRowData', 'script_' + id);
            if (objSelected) that.editScript(objSelected._obj_id);
        });

        $('.script-copy-submit').unbind('click').button({
            icons: {primary: 'ui-icon-copy'},
            text:  false
        }).click(function () {
            var id = $(this).attr('data-script-id');
            var objSelected = that.$grid.jqGrid('getRowData', 'script_' + id);
            that.main.socket.emit('getObject', objSelected._obj_id, function (err, obj) {
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

                var newObject = JSON.parse(JSON.stringify(obj));
                obj._id = newId;
                that.main.socket.emit('setObject', newId, obj, function (err, obj) {
                    if (err) {
                        that.main.showError(err);
                        return;
                    }
                });
            });
        });

        $('.script-reload-submit').unbind('click').button({
            icons: {primary: 'ui-icon-refresh'},
            text:  false
        }).click(function () {
            var id = $(this).attr('data-script-id');
            var objSelected = that.$grid.jqGrid('getRowData', 'script_' + id);
            that.main.socket.emit('extendObject', objSelected._obj_id, {});
        });

        $('.script-delete-submit').unbind('click').button({
            icons: {primary: 'ui-icon-trash'},
            text:  false
        }).click(function () {
            var id = $(this).attr('data-script-id');
            var objNew = that.$grid.jqGrid('getRowData', 'script_' + id);

            that.main.confirmMessage(_('Are you sure to delete script %s?', objNew.name), null, 'help', function (result) {
                if (result) that.main.socket.emit('delObject', objNew._obj_id);
            });

            //that.$grid.jqGrid('delRowData', 'script_' + id);
        });

        $('.script-ok-submit').unbind('click').button({
            icons: {primary: 'ui-icon-check'},
            text:  false
        }).click(function () {
            var id = $(this).attr('data-script-id');
            $('.script-edit-submit').show();
            $('.script-edit-file-submit').show();
            $('.script-delete-submit').show();
            $('.script-reload-submit').show();
            $('.script-copy-submit').show();
            $('.script-ok-submit').hide();
            $('.script-cancel-submit').hide();
            $('#add-script').removeClass('ui-state-disabled');

            that.$grid.jqGrid('saveRow', 'script_' + id, {"url": "clientArray"});
            // afterSave
            setTimeout(function () {
                var objNew = that.$grid.jqGrid('getRowData', 'script_' + id);
                that.updateScript(objNew._obj_id, objNew);

                // Set the colors

                var a = $('td[aria-describedby="grid-scripts_enabled"]');
                var htmlTrue  = that.htmlBoolean(true);
                var htmlFalse = that.htmlBoolean(false);

                a.each(function (index) {
                    var text = $(this).html();
                    if (text == _('true')) {
                        $(this).html(htmlTrue);
                    } else if (text == _('false')) {
                        $(this).html(htmlFalse);
                    }
                });
                /* main.socket.emit('getObject', objNew._obj_id, function (err, _obj) {
                 var obj = {common:{}};
                 obj.common.engine  = objNew.engine;
                 obj.common.enabled = objNew.enabled;
                 if (obj.common.enabled === 'true')  obj.common.enabled = true;
                 if (obj.common.enabled === 'false') obj.common.enabled = false;

                 if (_obj && _obj.common && objNew.name == _obj.common.name) {
                 main.socket.emit('extendObject', objNew._obj_id, obj);
                 } else {
                 var prefix = 'script.js.';
                 if (_obj) {
                 var parts = _obj._id.split('.', 3);
                 prefix = 'script.' + parts[1] + '.';
                 main.socket.emit('delObject', _obj._id);
                 _obj.common.engine  = obj.common.engine;
                 _obj.common.enabled = obj.common.enabled;
                 delete _obj._rev;
                 } else {
                 _obj = obj;
                 }
                 _obj.common.name = objNew.name;
                 _obj.common.platform = _obj.common.platform || 'Javascript/Node.js';

                 _obj._id         = prefix + objNew.name.replace(/ /g, '_').replace(/\./g, '_');
                 main.socket.emit('setObject', _obj._id, _obj)
                 }
                 });*/
            }, 100);
        });

        $('.script-cancel-submit').unbind('click').button({
            icons: {primary: 'ui-icon-close'},
            text:  false
        }).click(function () {
            var id = $(this).attr('data-script-id');
            $('.script-edit-submit').show();
            $('.script-edit-file-submit').show();
            $('.script-reload-submit').show();
            $('.script-delete-submit').show();
            $('.script-copy-submit').show();
            $('.script-ok-submit').hide();
            $('.script-cancel-submit').hide();
            $('#add-script').removeClass('ui-state-disabled');
            that.$grid.jqGrid('restoreRow', 'script_' + id, false);
            // Set the colors

            var a = $('td[aria-describedby="grid-scripts_enabled"]');
            var htmlTrue  = that.htmlBoolean(true);
            var htmlFalse = that.htmlBoolean(false);

            a.each(function (index) {
                var text = $(this).html();
                if (text == _('true')) {
                    $(this).html(htmlTrue);
                } else if (text == _('false')) {
                    $(this).html(htmlFalse);
                }
            });
        });

        $('td[aria-describedby="grid-scripts_name"]').each(function () {
            if ($(this).html().match(/^global\./)) {
                $(this).css({'font-weight': 'bold'});
            } else {
                $(this).css({'font-weight': 'normal'});
            }
        });

        $('td[aria-describedby="grid-scripts__obj_id"]').each(function () {
            if ($(this).html().match(/^global\./)) {
                $(this).css({'font-weight': 'bold'});
            } else {
                $(this).css({'font-weight': 'normal'});
            }
        });
    };

    this.editScript = function (id) {
        this.initEditor('editor', 'script-editor');
        that.currentScript = id;

        if (id) {
            var obj    = main.objects[id];
            var width  = 800;
            var height = 540;

            if (this.main.config['scripts-edit-width'])  width  = this.main.config['scripts-edit-width'];
            if (this.main.config['scripts-edit-height']) height = this.main.config['scripts-edit-height'];

            this.$dialog.dialog('option', 'title', id);
            $('#edit-script-id').val(obj._id);
            $('#edit-script-name').val(obj.common.name);

            $('#edit-script-global').prop('checked', obj.common.name.match(/^global\./));

            // Add engine even if it is not installed
            if (that.engines.indexOf(obj.common.engineType) == -1) {
                $('#edit-script-engine-type').append('<option value="' + obj.common.engineType + '">' + obj.common.engineType + '</option>');
                $('#edit-script-engine-type-constant').append('<option value="' + obj.common.engineType + '">' + obj.common.engineType + '</option>');
            }
            $('#edit-script-engine-type').val(obj.common.engineType);

            if (obj.common.engineType.match(/^[jJ]ava[sS]cript/)) {
                this.editor.getSession().setMode("ace/mode/javascript");
            } else if (obj.common.engineType.match(/^[cC]offee[sS]cript/)) {
                this.editor.getSession().setMode("ace/mode/coffee");
            }

            this.changed = false;

            //$('#edit-script-source').val(obj.common.source);
            this.editor.setValue(obj.common.source);
            this.$dialog
                .dialog('option', 'width',  width)
                .dialog('option', 'height', height)
                .dialog('open');

            if (this.main.config['scripts-edit-top'])  this.$dialog.parent().css({top:  this.main.config['scripts-edit-top']});
            if (this.main.config['scripts-edit-left']) this.$dialog.parent().css({left: this.main.config['scripts-edit-left']});
            this.editor.resize();
            setTimeout(function () {
                that.changed = false;
                $('#script-edit-button-save').button('disable');
                that.editor.focus();
            }, 100);
        } else {
            this.main.showMessage(_('This should never come!'), '', 'alert');
            /*// Should never come
             that.$dialog.dialog('option', 'title', 'new script');
             $('#edit-script-id').val('');
             $('#edit-script-name').val('');
             $('#edit-script-engine-type').val('Javascript');
             //$('#edit-script-source').val('');
             this[editorName].setValue('');
             that.$dialog.dialog('open');*/
        }
    };

    this.saveScript = function () {
        that.changed = false;
        $('#script-edit-button-save').button('disable');
        var obj = {};
        obj._id        = $('#edit-script-id').val();
        obj.name       = $('#edit-script-name').val();
        obj.source     = this.editor.getValue();
        obj.engineType = $('#edit-script-engine-type').val() || '';

        this.updateScript(obj._id, obj);
        that.$dialog.dialog('close');
    };

    this.objectChange = function (id, obj) {
        // Update scripts
        if (id.match(/^script\./)) {
            if (obj) {
                if (this.list.indexOf(id) == -1) this.list.push(id);
            } else {
                j = this.list.indexOf(id);
                if (j != -1) this.list.splice(j, 1);
            }

            if (this.updateTimer) {
                clearTimeout(this.updateTimer);
            }
            this.updateTimer = setTimeout(function () {
                that.updateTimer = null;
                that.init(true);
            }, 200);
            if (this.$grid) this.$grid.selectId('object', id, obj);
        } else
        if (id.match(/^system\.adapter\.[-\w]+\.[0-9]+$/)) {
            var val = $('#edit-script-engine-type').val();
            that.engines = that.fillEngines('edit-script-engine-type');
            $('#edit-script-engine-type').val(val);

            val = $('#edit-script-engine-type-constant').val();
            that.fillEngines('edit-script-engine-type-constant');
            $('#edit-script-engine-type-constant').val(val);
        }
    };

    this.onLog = function (message) {
        //{"message":"javascript.0 Stop script script.js.Script4","severity":"info","from":"javascript.0","ts":1455490697111,"_id":364}
        if (that.currentScript && message.message.indexOf(that.currentScript) !== -1) {
            var text = new Date(message.ts).toString()  + '[' + message.severity + ']' + message.message;

            $('#output').append(text + '\n');
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
    confirmMessage: function (message, title, icon, callback) {
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
                if (obj.type === 'instance') {
                    main.instances.push(id);
                }
                if (obj.type === 'script') {
                    scripts.list.push(id);
                }
            }
            main.objectsLoaded = true;

            scripts.prepare();
            scripts.init();

            //var engines = scripts.fillEngines();

            $(window).resize(function () {
                var x = $(window).width();
                var y = $(window).height();
                if (x < 720) {
                    x = 720;
                }
                if (y < 480) {
                    y = 480;
                }

                scripts.resize(x, y);
            });
            $(window).trigger('resize');

            if (typeof callback === 'function') callback();
        }, 0);
    });
}

function objectChange(id, obj) {
    var changed = false;
    var i;
    var j;
    var oldObj = null;
    var isNew = false;
    var isUpdate = false;

    // update main.objects cache
    if (obj) {
        if (obj._rev && main.objects[id]) main.objects[id]._rev = obj._rev;
        if (!main.objects[id]) {
            isNew = true;
            //treeInsert(id);
        }
        if (isNew || JSON.stringify(main.objects[id]) != JSON.stringify(obj)) {
            main.objects[id] = obj;
            changed = true;
        }
    } else if (main.objects[id]) {
        changed = true;
        oldObj = {_id: id, type: main.objects[id].type};
        delete main.objects[id];
    }

    if (main.selectId) main.selectId.selectId('object', id, obj);

    if (id.match(/^system\.adapter\.[-\w]+\.[0-9]+$/)) {
        // Disable scripts tab if no one script engine instance found
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
                //initGridLanguage(main.systemConfig.common.language);

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
