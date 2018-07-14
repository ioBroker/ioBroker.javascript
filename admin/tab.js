/// <reference path="./monaco-editor/monaco.d.ts" />
/* global _, monaco */

function Scripts(main) {
    /** @type {Scripts} */
    const that            = this;
    this.list           = [];
    this.groups         = [];
    this.hosts          = [];
    this.$grid          = $('#grid-scripts');
    this.$dialogCron    = $('#dialog-cron');
    this.$dialogScript  = $('#dialog-script');
    this.$dialogExport  = $('#dialog-export-blockly');
    this.editor         = null;
    this.editorDialog   = null;
    this.changed        = false;
    this.main           = main;
    this.currentId      = null;
    this.engines        = [];
    this.currentEngine  = '';
    this.languageLoaded = [false, false];
    this.blocklyWorkspace = null;
    this.prepared       = false;
    this.typings        = {}; // TypeScript declarations
    this.globalTypingHandles  = []; // Handles to the global typings added to the editor
    this.alive          = false;

    function setChanged(isChanged) {
        that.changed = isChanged;
        if (typeof parent !== 'undefined' && parent) {
            parent.configNotSaved = isChanged;
        }
    }
    
    function addScript(group) {
        $('#dialog-new-script').data('callback', function (type) {
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
            var instance   = '';
            var engineType = type;

            // find first instance
            for (var i = 0; i < that.main.instances.length; i++) {
                if (that.main.objects[that.main.instances[i]] && that.main.objects[that.main.instances[i]] && that.main.objects[that.main.instances[i]].common.engineTypes) {
                    instance = that.main.instances[i];
                    if (!engineType) {
                         if (typeof that.main.objects[main.instances[i]].common.engineTypes === 'string') {
                            engineType = that.main.objects[that.main.instances[i]].common.engineTypes;
                         } else {
                            engineType = that.main.objects[that.main.instances[i]].common.engineTypes[0];
                         }
                    }
                    break;
                }
            }

            var id = group + '.' + name.replace(/[\s"']/g, '_');
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
                        that.$grid.treeTable('show', id);
                        editScript(id);
                    }, 500);
                }
            });

        }).dialog('open');
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
                            group += '.' + name.replace(/["'\s.]+/g, '_');
                            
                            // check if object with such name exists
                            if (that.main.objects[group]) {
                                that.main.showMessage(_('Object %s yet exists', group));
                                that.$newGroupDialog.dialog('close');
                            } else {
                                $('#script-group-button-save').button('disable');
                                $('#script-group-button-cancel').button('disable');
                                that.main.socket.emit('setObject', group, {
                                    common: {
                                        name: name
                                    },
                                    type: 'channel'
                                }, function (err) {
                                    $('#script-group-button-cancel').button('enable');
                                    that.$newGroupDialog.dialog('close');
                                    if (err) {
                                        that.main.showError(err);
                                        that.init(true);
                                    } else {
                                        setTimeout(function () {
                                            that.$grid.treeTable('show', group);
                                            editScript(group);
                                        }, 500);
                                    }
                                });
                            }
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
                open: function (event) {
                    $(event.target).parent().find('.ui-dialog-titlebar-close .ui-button-text').html('');
                    $('#script-group-button-save').button('disable');
                    $('#script-group-button-cancel').button('enable');
                    $('#edit-new-group-name').val('');
                }
            });

            $('#edit-new-group-name').on('change', function () {
                if ($(this).val()) {
                    $('#script-group-button-save').button('enable');
                } else {
                    $('#script-group-button-save').button('disable');
                }
            }).on('keyup', function (e) {
                $(this).trigger('change');
                if (e.keyCode === 13) $('#script-group-button-save').trigger('click');
            });
        }

        that.$newGroupDialog.dialog('open');
    }

    this.prepare = function () {
        if (this.prepared) return;
        this.prepared = true;
        this.$dialogCron.dialog({
            autoOpen:   false,
            modal:      true,
            width:      700,
            height:     550,
            resizable:  false,
            title:      _('Cron expression'),
            buttons: [
                {
                    id:     'dialog_cron_insert',
                    text:   _('Insert'),
                    click:  function () {
                        var val = $('#div-cron').cron('value');
                        that.$dialogCron.dialog('close');

                        if (!$('#dialog-script').is(':visible')) {
                            insertTextIntoEditor(that.editor, '"' + val + '"');
                            that.editor.focus();
                        } else {
                            insertTextIntoEditor(that.editorDialog, '"' + val + '"');
                            that.editorDialog.focus();
                        }
                    }
                },
                {
                    id:     'dialog_cron_clear',
                    text: _('Clear'),
                    click: function () {
                        $('#div-cron').cron('value', '* * * * *');
                    }
                },
                {
                    id:     'dialog_cron_callback',
                    text:   _('Set CRON'),
                    click:  function () {
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

        // used to store the size difference between the dialog and the editor
        // the monaco editor has problems automatically resizing to a smaller size
        let dialogSizeDelta = {};

        this.$dialogScript.dialog({
            autoOpen:   false,
            modal:      true,
            width:      700,
            height:     550,
            resizable:  true,
            title:      _('Edit script'),
            resize:     function () {
                that.main.saveConfig('script-edit-width',  $(this).parent().width());
                that.main.saveConfig('script-edit-height', $(this).parent().height() + 10);
                if (that.editorDialog) {
                    // restore the editor layout using the stored values
                    that.editorDialog.layout({
                        width: that.$dialogScript.width() - dialogSizeDelta.width,
                        height: that.$dialogScript.height() - dialogSizeDelta.height
                    });
                }
            },
            open: function() {
                that.$dialogScript.css('overflow', 'hidden');
                if (that.editorDialog) {
                    that.editorDialog.layout();
                    // remember how the editor is arranged in the dialog
                    dialogSizeDelta = {
                        width: that.$dialogScript.width() - $('#dialog-script-editor').width(),
                        height: that.$dialogScript.height() - $('#dialog-script-editor').height()
                    };
                }
            },
            beforeClose:      function () {
                if (that.editorDialog._changed) {
                    if (window.confirm(_('Script changes are not saved. Discard?'))) {
                        that.editorDialog._changed = false;
                        return null;
                    } else {
                        return false;
                    }
                }
            },
            buttons: [
                {
                    id:     'dialog_script_save',
                    text:   _('Save'),
                    click:  function () {
                        that.editorDialog._changed = false;
                        that.$dialogScript.dialog('close');

                        const val = that.editorDialog.getValue();
                        var cb = that.$dialogScript.data('callback');
                        that.$dialogScript.data('callback', null);

                        if (typeof cb === 'function') cb(val);
                        if (that.editorDialog._isReturn && val.indexOf('return ') === -1) {
                            that.main.showMessage(_('No return found'), _('Error'), 'alert');
                        }
                    }
                },
                {
                    text: _('Cancel'),
                    click: function () {
                        that.$dialogScript.dialog('close');
                    }
                }
            ]
        });
        
        $('#div-cron').cron({
            value: '* * * * *'
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

        $('#edit-wrap-lines').on('change', function () {
            that.main.saveConfig('script-editor-wrap-lines', $(this).prop('checked'));
            setEditorOptions(that.editor, {
                lineWrap: $(this).prop('checked')
            });
        });

        $('#dialog-edit-wrap-lines').on('change', function () {
            that.main.saveConfig('script-editor-dialog-wrap-lines', $(this).prop('checked'));
            setEditorOptions(that.editorDialog, {
                lineWrap: $(this).prop('checked')
            });
        });
        
        fillGroups('edit-script-group');

        $('.import-drop-file').on('change', function (e) {
            fileHandler(e);
        });
        $('.import-text-drop').click(function (e) {
            $('.import-drop-file').trigger('click');
        });
        $('#start_import_scripts').button().click(function () {
            $('#dialog_import_scripts').dialog('close');
            main.confirmMessage(_('Existing scripts will be overwritten. Are you sure?'), null, null, 700, function (result) {
                if (result) {
                    var host = getLiveHost();

                    if (!host) {
                        window.alert('No active host found');
                        return;
                    }
                    main.socket.emit('sendToHost', host, 'writeObjectsAsZip', {
                        data:    $('.import-file-name').data('file'),
                        adapter: 'javascript',
                        id:      'script.js'
                    }, function (data) {
                        if (data === 'permissionError') {
                            main.showError(_(data));
                        } else if (!data || data.error) {
                            main.showError(data ? data.error : 'Unknown error');
                        } else {
                            main.showMessage(_('Ok'));
                            that.init(true);
                        }
                    });
                }
            });
        });

        window.addEventListener('resize', this.resize, false);

        // Load typings for the JS editor
        /** @type {string} */
        let scriptAdapterInstance = that.main.instances.find(function (inst) {return /javascript\.\d+$/.test(inst)});
        if (scriptAdapterInstance != null) {
            scriptAdapterInstance = scriptAdapterInstance.substr(scriptAdapterInstance.indexOf('javascript.'));
            that.main.socket.emit('sendTo', scriptAdapterInstance, 'loadTypings', null, function (result) {
                that.alive = true;
                setTypeCheck(that.alive);
                if (result.typings) {
                    that.typings = result.typings;
                    setEditorTypings();
                } else {
                    console.error(`failed to load typings: ${result.error}`);
                }
            });
        }

        // load blockly language
        var fileLang = document.createElement('script');
        fileLang.setAttribute('type', 'text/javascript');
        fileLang.setAttribute('src', 'google-blockly/msg/js/' + (systemLang || 'en') + '.js');
        // most browsers
        fileLang.onload = function () {
            that.languageLoaded[0] = true;
        };
        // IE 6 & 7
        fileLang.onreadystatechange = function() {
            if (this.readyState === 'complete') {
                that.languageLoaded[0] = true;
            }
        };
        document.getElementsByTagName('head')[0].appendChild(fileLang);

        var fileCustom = document.createElement('script');
        fileCustom.setAttribute('type', 'text/javascript');
        fileCustom.setAttribute('src', 'google-blockly/own/msg/' + (systemLang || 'en') + '.js');
        // most browsers
        fileCustom.onload = function () {
            that.languageLoaded[1] = true;
        };
        // IE 6 & 7
        fileCustom.onreadystatechange = function() {
            if (this.readyState === 'complete') {
                that.languageLoaded[1] = true;
            }
        };
        document.getElementsByTagName('head')[0].appendChild(fileCustom);
    };

    this.resize = function (width, height) {
        var $blocklyEditor = $('#blockly-editor');
        var wasVisible = $blocklyEditor.data('wasVisible');
        if (wasVisible !== true && wasVisible !== false) {
            wasVisible = $blocklyEditor.is(':visible');
        }
        // Set the height of svg
        if (wasVisible === true) {
            $blocklyEditor.hide();
            $blocklyWidgetDiv = $('.blocklyWidgetDiv');
            $blocklyTooltipDiv = $('.blocklyTooltipDiv');
            $blocklyToolboxDiv = $('.blocklyToolboxDiv');
            $blocklyWidgetDiv.hide();
            $blocklyTooltipDiv.hide();
            $blocklyToolboxDiv.hide();
            $blocklyEditor.find('svg').height($('#height-editor').height());
            $blocklyEditor.show();
            $blocklyWidgetDiv.show();
            $blocklyTooltipDiv.show();
            $blocklyToolboxDiv.show();
        } else {
            $blocklyEditor.find('svg').height($('#height-editor').height());
        }

        $blocklyEditor.data('wasVisible', null);

        if (that.blocklyWorkspace) Blockly.svgResize(that.blocklyWorkspace);

        if (that.editor) {
            that.editor.layout();
        }
        var $scriptEditor = $('#script-editor');
        wasVisible = $scriptEditor.data('wasVisible');
        if (wasVisible !== true && wasVisible !== false) {
            wasVisible = $scriptEditor.is(':visible');
        }
        if (wasVisible === true) {
            $scriptEditor.show();
        }
    };

    /** @typedef {"javascript" | "typescript" | "coffee"} EditorLanguage */

    /**
     * Sets the language of the code editor
     * @param {monaco.editor.IStandaloneCodeEditor} editorInstance The editor instance to change the options for
     * @param {EditorLanguage} language 
     */
    function setEditorLanguage(editorInstance, language) {
        monaco.editor.setModelLanguage(
            editorInstance.getModel(),
            language
        );
    }

    /**
     * Sets some options of the code editor
     * @param {monaco.editor.IStandaloneCodeEditor} editorInstance The editor instance to change the options for
     * @param {Partial<{readOnly: boolean, lineWrap: boolean, language: EditorLanguage, typeCheck: boolean}>} options
     */
    function setEditorOptions(editorInstance, options) {
        if (!options) return;
        if (!editorInstance) return;
        if (options.language != null) setEditorLanguage(editorInstance, options.language);
        if (options.readOnly != null) editorInstance.updateOptions({readOnly: options.readOnly});
        if (options.lineWrap != null) editorInstance.updateOptions({wordWrap: options.lineWrap ? 'on' : 'off'});
        if (options.typeCheck != null) setTypeCheck(options.typeCheck);
    }

    /**
     * Enables or disables the type checking in the editor
     * @param {boolean} enabled - Whether type checking is enabled or not
     */
    function setTypeCheck(enabled) {
        const options = {
            noSemanticValidation: !that.alive || !enabled, // toggle the type checking
            noSyntaxValidation: !that.alive // always check the syntax
        };
        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions(options);
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(options);
    }

    /**
     * Adds the given declaration file to the editor
     * @param {string} path The file path of the typings to add
     * @param {string} typings The declaration file to add
     * @param {boolean} [isGlobal=false] Whethere the file is a global declaration file
     * @returns {void}
     */
    function addTypingsToEditor(path, typings, isGlobal) {
        try {
            const handle = monaco.languages.typescript.javascriptDefaults.addExtraLib(typings, path);
            if (isGlobal) that.globalTypingHandles.push(handle);
        } catch (e) { /* might be added already */}
        try {
            const handle = monaco.languages.typescript.typescriptDefaults.addExtraLib(typings, path);
            if (isGlobal) that.globalTypingHandles.push(handle);
        } catch (e) { /* might be added already */}
    }

    function setEditorTypings() {
        // clear previously added global typings
        for (const handle of that.globalTypingHandles) {
            if (handle != null) handle.dispose();
        }

        const isGlobalScript = isIdOfGlobalScript(that.currentId);
        // The filename of the declarations this script can see if it is a global script
        const partialDeclarationsPath = that.currentId + '.d.ts';
        for (const path of Object.keys(that.typings)) {
            // global scripts don't get to see all other global scripts
            // but only a part of them
            if (isGlobalScript) {
                if (path === 'global.d.ts') continue;
                if (path.startsWith('script.js.global') && path !== partialDeclarationsPath) continue;
            }
            addTypingsToEditor(path, that.typings[path], isGlobalScript);
        }
    }

    /**
     * Inserts some text into the given editor
     * @param {monaco.editor.IStandaloneCodeEditor} editorInstance The editor instance to add the code into
     * @param {string} text The text to add
     */
    function insertTextIntoEditor(editorInstance, text) {
        const selection = editorInstance.getSelection();
        const range = new monaco.Range(
            selection.startLineNumber, selection.startColumn,
            selection.endLineNumber, selection.endColumn
        );
        editorInstance.executeEdits('', [{range: range, text: text, forceMoveMarkers: true}]);
    }

    function blockly2JS(oneWay) {
        $('#edit-script-engine-type').find('option[value="Blockly"]').remove();
        blocklyCode2JSCode(oneWay);

        setEditorOptions(that.editor, {
            readOnly: false
        });
        // that.editor.setReadOnly(false);

        setChanged(true);
        $('#script-edit-button-save').button('enable');
        $('#script-edit-button-cancel').button('enable');

        switchViews(false, that.currentEngine);

        if (that.currentEngine.match(/^[jJ]ava[sS]cript/)) {
            //that.editor.getSession().setMode('ace/mode/javascript');
            setEditorOptions(that.editor, {
                language: 'javascript',
                typeCheck: true // not suppported
            });
        } else if (that.currentEngine.match(/^[cC]offee[sS]cript/)) {
            // that.editor.getSession().setMode('ace/mode/coffee');
            setEditorOptions(that.editor, {
                language: 'coffee',
                typeCheck: false // not suppported
            });
        } else if (that.currentEngine.match(/^[tT]ype[sS]cript/)) {
            // that.editor.getSession().setMode('ace/mode/typescript');
            setEditorOptions(that.editor, {
                language: 'typescript',
                typeCheck: true // not suppported
            });
        }
    }

    function blocklyCode2JSCode(oneWay, justConvert) {
        var code = Blockly.JavaScript.workspaceToCode(that.blocklyWorkspace);
        if (!oneWay) {
            code += '\n';
            var dom = Blockly.Xml.workspaceToDom(that.blocklyWorkspace);
            var text = Blockly.Xml.domToText(dom);
            code += '//' + btoa(encodeURIComponent(text));
        }

        if (!justConvert) that.editor.setValue(code /*, -1*/);
        return code;
    }

    function jsCode2Blockly(text) {
        text = text || '';
        var lines = text.split(/[\r\n]+|\r|\n/g);
        var xml = '';
        for (var l = lines.length - 1; l >= 0; l--) {
            if (lines[l].substring(0, 2) === '//') {
                xml = lines[l].substring(2);
                break;
            }
        }
        if (xml.substring(0, 4) === '<xml') {
            return xml;
        } else {
            var code;
            try {
                code = decodeURIComponent(atob(xml));
            } catch (e) {
                code = null;
                console.error('cannot decode: ' + xml);
                console.error(e);
            }
            return code;
        }
    }

    function removeBlocklyFromCode(text) {
        text = text || '';
        var lines = text.split(/[\r\n]+|\r|\n/g);
        var xml = '';
        for (var l = lines.length - 1; l >= 0; l--) {
            if (lines[l].substring(0, 2) === '//') {
                xml = lines[l].substring(2);
                if (xml.substring(0, 4) === '<xml') {
                    lines.splice(l, 1);
                    break;
                } else {
                    try {
                        if (decodeURIComponent(atob(xml)).substring(0, 4) === '<xml') {
                            lines.splice(l, 1);
                            break;
                        }
                    } catch (e) {
                        console.error('cannot decode: ' + xml);
                        console.error(e);
                    }
                }
            }
        }
        return lines.join('\n');
    }

    function buildRules() {
        var rules_basic = {
            condition: 'AND',
            rules: [{
                id: 'id',
                operator: 'is',
                value: 'abc'
            }]
        };
        var $builderWidgets = $('#builder-widgets');
        // Fix for Selectize
        $builderWidgets.on('afterCreateRuleInput.queryBuilder', function(e, rule) {
            if (rule.filter.plugin === 'selectize') {
                rule.$el.find('.rule-value-container').css('min-width', '200px')
                    .find('.selectize-control').removeClass('form-control');
            }
        }).queryBuilder({
            //plugins: ['bt-tooltip-errors'],
            operators: [
                { type: 'equal', optgroup: 'basic' },
                { type: 'not_equal', optgroup: 'basic' },
                { type: 'is', optgroup: 'custom', nb_inputs: 2, multiple: false, apply_to: ['string'] }
            ],
            filters: [{
                id:    'id',
                label: _('Value of'),
                type: 'string',
                operators: ['is']
            }, {
                id:    'time',
                label: _('Time'),
                placeholder: 'HH:mm',
                //input: 'select',
                type: 'string',
                validation: {
                    format: /^\d{2}:\d{2}$/
                },
                operators: ['equal']
            }, {
                id:    'test',
                label: _('test'),
                placeholder: 'HH:mm',
                //input: 'select',
                type: 'string',
                operators: ['is'],
                input: function(rule, name) {
                    var $container = rule.$el.find('.rule-value-container');

                    $container.on('change', '[name='+ name +'_1]', function(){
                        var h = '';

                        switch ($(this).val()) {
                            case 'A':
                                h = '<option value="-1">-</option> <option value="1">1</option> <option value="2">2</option>';
                                break;
                            case 'B':
                                h = '<option value="-1">-</option> <option value="3">3</option> <option value="4">4</option>';
                                break;
                            case 'C':
                                h = '<option value="-1">-</option> <option value="5">5</option> <option value="6">6</option>';
                                break;
                        }

                        $container.find('[name$=_2]')
                            .html(h).toggle(!!h)
                            .val('-1').trigger('change');
                    });

                    return '\
                      <select name="' + name + '_id"> \
                        <option value="-1">-</option> \
                        <option value="A">A</option> \
                        <option value="B">B</option> \
                        <option value="C">C</option> \
                      </select> \
                      is \
                      <input name="' + name + '_value" />';
                },
                valueGetter: function(rule) {
                    return rule.$el.find('.rule-value-container [name$=_1]').val()
                        +'.'+ rule.$el.find('.rule-value-container [name$=_2]').val();
                },
                valueSetter: function(rule, value) {
                    if (rule.operator.nb_inputs > 0) {
                        var val = value.split('.');

                        rule.$el.find('.rule-value-container [name$=_1]').val(val[0]).trigger('change');
                        rule.$el.find('.rule-value-container [name$=_2]').val(val[1]).trigger('change');
                    }
                }
            }],
            /*filters: [{
             id: 'date',
             label: 'Datepicker',
             type: 'date',
             validation: {
             format: 'YYYY/MM/DD'
             },
             plugin: 'datepicker',
             plugin_config: {
             format: 'yyyy/mm/dd',
             todayBtn: 'linked',
             todayHighlight: true,
             autoclose: true
             }
             }, {
             id: 'rate',
             label: 'Slider',
             type: 'integer',
             validation: {
             min: 0,
             max: 100
             },
             plugin: 'slider',
             plugin_config: {
             min: 0,
             max: 100,
             value: 0
             },
             valueSetter: function(rule, value) {
             if (rule.operator.nb_inputs == 1) value = [value];
             rule.$el.find('.rule-value-container input').each(function(i) {
             //$(this).slider('setValue', value[i] || 0);
             });
             },
             valueGetter: function(rule) {
             var value = [];
             rule.$el.find('.rule-value-container input').each(function() {
             //value.push($(this).slider('getValue'));
             });
             return rule.operator.nb_inputs == 1 ? value[0] : value;
             }
             }, {
             id: 'category',
             label: 'Selectize',
             type: 'string',
             plugin: 'selectize',
             plugin_config: {
             valueField: 'id',
             labelField: 'name',
             searchField: 'name',
             sortField: 'name',
             create: true,
             maxItems: 1,
             plugins: ['remove_button'],
             onInitialize: function() {
             var that = this;

             //if (localStorage.demoData === undefined) {
             //    $.getJSON(baseurl + '/assets/demo-data.json', function(data) {
             //        localStorage.demoData = JSON.stringify(data);
             //        data.forEach(function(item) {
             //            that.addOption(item);
             //        });
             //    });
             //}
             //else {
             //    JSON.parse(localStorage.demoData).forEach(function(item) {
             //        that.addOption(item);
             //    });
             //}
             }
             },
             valueSetter: function(rule, value) {
             rule.$el.find('.rule-value-container input')[0].selectize.setValue(value);
             }
             }, {
             id: 'coord',
             label: 'Coordinates',
             type: 'string',
             validation: {
             format: /^[A-C]{1}.[1-6]{1}$/
             },
             input: function(rule, name) {
             var $container = rule.$el.find('.rule-value-container');

             $container.on('change', '[name='+ name +'_1]', function(){
             var h = '';

             switch ($(this).val()) {
             case 'A':
             h = '<option value="-1">-</option> <option value="1">1</option> <option value="2">2</option>';
             break;
             case 'B':
             h = '<option value="-1">-</option> <option value="3">3</option> <option value="4">4</option>';
             break;
             case 'C':
             h = '<option value="-1">-</option> <option value="5">5</option> <option value="6">6</option>';
             break;
             }

             $container.find('[name$=_2]')
             .html(h).toggle(!!h)
             .val('-1').trigger('change');
             });

             return '\
             <select name="'+ name +'_1"> \
             <option value="-1">-</option> \
             <option value="A">A</option> \
             <option value="B">B</option> \
             <option value="C">C</option> \
             </select> \
             <select name="'+ name +'_2" style="display:none;"></select>';
             },
             valueGetter: function(rule) {
             return rule.$el.find('.rule-value-container [name$=_1]').val()
             +'.'+ rule.$el.find('.rule-value-container [name$=_2]').val();
             },
             valueSetter: function(rule, value) {
             if (rule.operator.nb_inputs > 0) {
             var val = value.split('.');

             rule.$el.find('.rule-value-container [name$=_1]').val(val[0]).trigger('change');
             rule.$el.find('.rule-value-container [name$=_2]').val(val[1]).trigger('change');
             }
             }
             }],*/

            rules: rules_basic
        });

        $('#btn-reset').on('click', function() {
            $builderWidgets.queryBuilder('reset');
        });

        $('#btn-set').on('click', function() {
            $builderWidgets.queryBuilder('setRules', rules_basic);
        });

        $('#btn-get').on('click', function() {
            var result = $builderWidgets.queryBuilder('getRules');

            if (!$.isEmptyObject(result)) {
                alert(JSON.stringify(result, null, 2));
            }
        });
    }

    function editScript(id) {
        that.initEditor();

        if (that.currentId !== id) {
            if (that.changed) {
                that.main.confirmMessage(_('Script not saved'), _('Save?'), 'help', [_('Save'), _('Discard'), _('Cancel')], function (result) {
                    if (result === 0) {
                        that.saveScript();
                        setChanged(false);
                        setTimeout(function() {
                            editScript(id);
                        }, 0);
                    } else if (result === 1) {
                        setChanged(false);
                        setTimeout(function() {
                            editScript(id);
                        }, 0);
                    } else {
                        that.$grid.treeTable('show', that.currentId);
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
            applyResizableV();
            var obj = main.objects[id];

            $('.script-edit').show();

            if (isIdOfGlobalScript(id)) {
                $('#global_hint').show();
            } else {
                $('#global_hint').hide();
            }

            $('#edit-script-group').val(getGroup(id));

            $('#edit-script-name').val(obj.common.name);

            $('#edit-script-debug').prop('checked', !!obj.common.debug);
            $('#edit-script-verbose').prop('checked', !!obj.common.verbose);
            
            setEditorOptions(that.editor, {
                lineWrap: $('#edit-wrap-lines').prop('checked')
            });

            var $editType = $('#edit-script-engine-type');
            if (obj.common.engineType !== 'Blockly' && obj.common.engineType !== 'Rule') {
                // remove Blockly from list
                $editType.find('option[value="Blockly"]').remove();
                $editType.find('option[value="Rule"]').remove();
            } else if (obj.common.engineType === 'Blockly') {
                $editType.find('option[value="Rule"]').remove();
                if (!$editType.find('option[value="Blockly"]').length) {
                    $editType.prepend('<option value="Blockly">Blockly</option>');
                }
            } else if (obj.common.engineType === 'Rule') {
                $editType.find('option[value="Blockly"]').remove();
                if (!$editType.find('option[value="Rule"]').length) {
                    $editType.prepend('<option value="Rule">' + _('Rule') + '</option>');
                }
            }
            that.currentEngine = obj.common.engineType;

            // Add engine even if it is not installed
            if (that.engines.indexOf(obj.common.engineType) === -1) {
                if (!$editType.find('option[value="' + obj.common.engineType + '"]').length) {
                    $editType.append('<option value="' + obj.common.engineType + '">' + obj.common.engineType + '</option>');
                }
            }

            $editType.val(obj.common.engineType);

            setEditorTypings();

            if (obj.common.engineType === 'Blockly') {
                setEditorOptions(that.editor, {
                    language: 'javascript',
                    readOnly: true,
                    typeCheck: false,
                });

                switchViews(true, obj.common.engineType);
                if (!that.blocklyWorkspace) return;

                that.blocklyWorkspace.clear();

                try {
                    var xml = jsCode2Blockly(obj.common.source) || '<xml xmlns="http://www.w3.org/1999/xhtml"></xml>';
                    var dom = Blockly.Xml.textToDom(xml);
                    Blockly.Xml.domToWorkspace(dom, that.blocklyWorkspace);
                } catch (e) {
                    console.error(e);
                    window.alert('Cannot extract Blockly code!');
                }
            } else if (obj.common.engineType && obj.common.engineType.match(/^[jJ]ava[sS]cript/)) {
                setEditorOptions(that.editor, {
                    language: 'javascript',
                    readOnly: false,
                    typeCheck: true
                });
                switchViews(false, obj.common.engineType);
            } else if (obj.common.engineType && obj.common.engineType.match(/^[cC]offee[sS]cript/)) {
                setEditorOptions(that.editor, {
                    language: 'coffee',
                    readOnly: false,
                    typeCheck: false // not supported
                });
                switchViews(false, obj.common.engineType);
            } else if (obj.common.engineType && obj.common.engineType.match(/^[tT]ype[sS]cript/)) {
                setEditorOptions(that.editor, {
                    language: 'typescript',
                    readOnly: false,
                    typeCheck: true
                });
                switchViews(false, obj.common.engineType);
            } else if(obj.common.engineType === 'Rule') {
                switchViews(true, obj.common.engineType);
                buildRules();
            }

            setChanged(false);

            //$('#edit-script-source').val(obj.common.source);
            // that.editor.setValue(obj.common.source, -1);
            that.editor.setValue(obj.common.source);

            applyResizableV();

            setTimeout(function () {
                setChanged(false);
                $('#script-edit-button-save').button('disable');
                $('#script-edit-button-cancel').button('disable');
                //that.editor.focus();
            }, 100);
        } else if (id && main.objects[id] && main.objects[id].type === 'channel' && id !== 'script.js.global' && id !== 'script.js.common') {
            $('#editor-scripts').show();

            var obj = main.objects[id];

            $('#edit-script-group').val(getGroup(id));

            $('#edit-script-name').val(obj.common.name);

            $('#edit-script-debug').prop('checked', !!obj.common.debug);
            $('#edit-script-verbose').prop('checked', !!obj.common.verbose);

            setChanged(false);
            var $editorScriptsTextarea = $('#editor-scripts-textarea');
            $editorScriptsTextarea.height(100);
            if ($editorScriptsTextarea.hasClass('ui-resizable')) $('#editor-scripts-textarea').resizable('destroy');

            switchViews(false, null);

            $('#script-edit-button-save').button('disable');
            $('#script-edit-button-cancel').button('disable');
        } else {
            $('#editor-scripts').hide();
        }

        setTimeout(function () {
            that.resize();
        }, 100)
    }

    function blocklyBlinkBlock(block) {
        for (var i = 300; i < 3000; i = i + 300) {
            setTimeout(function () {
                block.select();
            }, i);
            setTimeout(function () {
                block.unselect();
            }, i + 150);
        }
    }

    function blocklyCheckBlocks(cb) {
        var warningText;
        if (that.blocklyWorkspace.getAllBlocks().length === 0) {
            cb && cb('no blocks found');
            return;
        }
        var badBlock = blocklyGetUnconnectedBlock();
        if (badBlock) {
            warningText = 'not properly connected';
        } else {
            badBlock = blocklyGetBlockWithWarning();
            if (badBlock) warningText = 'warning on this block';
        }

        if (badBlock) {
            if (cb) {
                cb(warningText, badBlock);
            } else {
                blocklyBlinkBlock(badBlock);
            }
            return false;
        }

        cb();

        return true;
    }

    //get unconnected block
    function blocklyGetUnconnectedBlock () {
        var blocks = that.blocklyWorkspace.getAllBlocks();
        for (var i = 0, block; block = blocks[i]; i++) {
            var connections = block.getConnections_(true);
            for (var j = 0, conn; conn = connections[j]; j++) {
                if (!conn.sourceBlock_ || ((conn.type === Blockly.INPUT_VALUE || conn.type === Blockly.OUTPUT_VALUE) && !conn.targetConnection && !conn._optional)) {
                    return block;
                }
            }
        }
        return null;
    }

    //get block with warning
    function blocklyGetBlockWithWarning() {
        var blocks = that.blocklyWorkspace.getAllBlocks();
        for (var i = 0, block; block = blocks[i]; i++) {
            if (block.warning) {
                return block;
            }
        }
        return null;
    }

    // Find all script engines
    this.fillEngines = function (elemName) {
        var _engines = [];
        for (var t = 0; t < that.main.instances.length; t++) {
            if (that.main.objects[that.main.instances[t]] && that.main.objects[that.main.instances[t]].common && that.main.objects[that.main.instances[t]].common.engineTypes) {
                var engineTypes = that.main.objects[that.main.instances[t]].common.engineTypes;
                if (typeof engineTypes === 'string') {
                    if (_engines.indexOf(engineTypes) === -1) _engines.push(engineTypes);
                } else {
                    for (var z = 0; z < engineTypes.length; z++) {
                        if (_engines.indexOf(engineTypes[z]) === -1) _engines.push(engineTypes[z]);
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
        var g;
        for (var i = 0; i < that.list.length; i++) {
            g = getGroup(that.list[i]);
            if (groups.indexOf(g) === -1 ) {
                groups.push(g);
            }
        }
        for (var j = 0; j < that.groups.length; j++) {
            if (groups.indexOf(that.groups[j]) === -1) {
                groups.push(that.groups[j]);
            }
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
            if (name.indexOf('.') === -1) {
                var parts = groups[g].split('.');
                if (parts.length > 3) {
                    parts.splice(0, 2);
                    parts.pop();
                    name = parts.join('/') + '/' + name;
                }
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
            var $elemName = $('#' + elemName);
            var val = $elemName.val();
            $elemName.html(text).val(val);
        }
    }

    this.updateScript = function (oldId, newId, newCommon, cb) {
        this.main.socket.emit('getObject', oldId, function (err, _obj) {
            setTimeout(function () {
                var obj = {common: {}};

                if (newCommon.engine  !== undefined) obj.common.engine  = newCommon.engine;
                if (newCommon.enabled !== undefined) obj.common.enabled = newCommon.enabled;
                if (newCommon.source  !== undefined) obj.common.source  = newCommon.source;
                if (newCommon.debug   !== undefined) obj.common.debug   = newCommon.debug;
                if (newCommon.verbose !== undefined) obj.common.verbose = newCommon.verbose;

                if (oldId === newId && _obj && _obj.common && newCommon.name === _obj.common.name) {
                    if (!newCommon.engineType || newCommon.engineType !== _obj.common.engineType) {
                        if (newCommon.engineType !== undefined) obj.common.engineType  = newCommon.engineType || 'Javascript/js';

                        that.main.socket.emit('extendObject', oldId, obj, function (err) {
                            if (err) {
                                that.main.showError(err);
                                that.init(true);
                            }
                            cb && cb(err);
                        });
                    } else {
                        that.main.socket.emit('extendObject', oldId, obj, function (err) {
                            if (err) {
                                that.main.showError(err);
                                that.init(true);
                            }
                            cb && cb(err);
                        });
                    }
                } else {
                    // var prefix;

                    // var parts = _obj.common.engineType.split('/');

                    // prefix = 'script.' + (parts[1] || parts[0]) + '.';

                    if (_obj && _obj.common) {
                        _obj.common.engineType = newCommon.engineType || _obj.common.engineType || 'Javascript/js';
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
                        if (obj.common.debug   !== undefined) _obj.common.debug   = obj.common.debug;
                        if (obj.common.verbose !== undefined) _obj.common.verbose = obj.common.verbose;

                        delete _obj._rev;
                    } else {
                        _obj = obj;
                    }

                    // Name must always exist
                    _obj.common.name = newCommon.name;

                    _obj._id = newId; // prefix + newCommon.name.replace(/[\s"']/g, '_');

                    that.main.socket.emit('setObject', newId, _obj, function (err) {
                        if (err) {
                            that.main.showError(err);
                            that.init(true);
                        } else {
                            setTimeout(function () {
                                that.$grid.treeTable('show', newId);
                            }, 500);
                        }
                        cb && cb(err);
                    });
                }
            }, 0);
        });
    };

    function switchViews(isBlocklyView, engineType) {
        if (engineType === null) {
            $('#builder-widgets').hide();
            $('#script-buttons').hide();
            $('.script-edit').hide();
            $('#show-blockly-id').hide();
            $('#script-editor').hide();
            $('#blockly-editor').hide();
            $('.edit-wrap-lines').hide();
            $('.blocklyWidgetDiv').hide();
            $('.blocklyTooltipDiv').hide();
            $('.blocklyToolboxDiv').hide();
            $('#edit-check-blocks').hide();
            $('#edit-export-blocks').hide();
            $('#edit-import-blocks').hide();
            return;
        }
        $('.script-edit').show();
        $('#script-buttons').show();
        engineType = engineType || 'Blockly';

        if (engineType === 'Blockly') {
            if (isBlocklyView === undefined) {
                isBlocklyView = !$('#script-editor').is(':visible');
            }
            $('#edit-insert-id').hide();
            $('.edit-cron-id').hide();

            if (isBlocklyView) {

                $('#show-blockly-id')
                    .button('option', 'label', _('Show code'))
                    .button('option', 'icons', {primary: 'ui-icon-script'}).show();

                $('#builder-widgets').hide();
                $('#script-editor').hide();
                $('#blockly-editor').show();
                $('.blocklyWidgetDiv').show();
                $('.blocklyTooltipDiv').show();
                $('.blocklyToolboxDiv').show();
                $('.edit-wrap-lines').hide();
                 $('#edit-check-blocks').show();
                $('#edit-export-blocks').show();
                $('#edit-import-blocks').show();
                if (that.blocklyWorkspace) Blockly.svgResize(that.blocklyWorkspace);
            } else {
                $('#show-blockly-id')
                    .button('option', 'label', _('Show blockly'))
                    .button('option', 'icons', {primary: 'ui-icon-calculator'}).show();

                // update script editor
                $('#builder-widgets').hide();
                $('#script-editor').show();
                if (that.editor) that.editor.layout();
                $('#blockly-editor').hide();
                $('.blocklyWidgetDiv').hide();
                $('.blocklyTooltipDiv').hide();
                $('.blocklyToolboxDiv').hide();
                $('.edit-wrap-lines').show();
                $('#edit-check-blocks').hide();
                $('#edit-export-blocks').hide();
                $('#edit-import-blocks').hide();
            }
        } else if (engineType === 'Rule') {
            $('#edit-insert-id').hide();
            $('.edit-cron-id').hide();
            $('#builder-widgets').show();
            $('#show-blockly-id').hide();
            $('#script-editor').hide();
            $('#blockly-editor').hide();
            $('.edit-wrap-lines').show();
            $('.blocklyWidgetDiv').hide();
            $('.blocklyTooltipDiv').hide();
            $('.blocklyToolboxDiv').hide();
            $('#edit-check-blocks').hide();
            $('#edit-export-blocks').hide();
            $('#edit-import-blocks').hide();
        } else {
            $('#edit-insert-id').show();
            $('.edit-cron-id').show();
            $('#builder-widgets').hide();
            $('#show-blockly-id').hide();
            $('#script-editor').show();
            if (that.editor) that.editor.layout();
            $('#blockly-editor').hide();
            $('.edit-wrap-lines').show();
            $('.blocklyWidgetDiv').hide();
            $('.blocklyTooltipDiv').hide();
            $('.blocklyToolboxDiv').hide();
            $('#edit-check-blocks').hide();
            $('#edit-export-blocks').hide();
            $('#edit-import-blocks').hide();
        }
    }

    // used for ace editor
    /*var funcNames = [
        {score: 1001, meta: 'iobroker', value: 'getState'},
        {score: 1001, meta: 'iobroker', value: 'setState'},
        {score: 1000, meta: 'iobroker', value: 'request'},
        {score: 1000, meta: 'iobroker', value: 'getObject'},
        {score: 1000, meta: 'iobroker', value: 'setObject'},
        {score: 1000, meta: 'iobroker', value: 'require'},
        {score: 1000, meta: 'iobroker', value: 'console'},
        {score: 1000, meta: 'iobroker', value: 'exec'},
        {score: 1000, meta: 'iobroker', value: 'email'},
        {score: 1000, meta: 'iobroker', value: 'pushover'},
        {score: 1000, meta: 'iobroker', value: 'subscribe'},
        {score: 1000, meta: 'iobroker', value: 'getSubscriptions'},
        {score: 1000, meta: 'iobroker', value: 'adapterSubscribe'},
        {score: 1000, meta: 'iobroker', value: 'adapterUnsubscribe'},
        {score: 1000, meta: 'iobroker', value: 'unsubscribe'},
        {score: 1000, meta: 'iobroker', value: 'on'},
        {score: 1000, meta: 'iobroker', value: 'schedule'},
        {score: 1000, meta: 'iobroker', value: 'getAstroDate'},
        {score: 1000, meta: 'iobroker', value: 'isAstroDay'},
        {score: 1000, meta: 'iobroker', value: 'clearSchedule'},
        {score: 1000, meta: 'iobroker', value: 'setStateDelayed'},
        {score: 1000, meta: 'iobroker', value: 'clearStateDelayed'},
        {score: 1000, meta: 'iobroker', value: 'getStateDelayed'},
        {score: 1000, meta: 'iobroker', value: 'existsState'},
        {score: 1000, meta: 'iobroker', value: 'existsObject'},
        {score: 1000, meta: 'iobroker', value: 'getIdByName'},
        {score: 1000, meta: 'iobroker', value: 'extendObject'},
        {score: 1000, meta: 'iobroker', value: 'getEnums'},
        {score: 1000, meta: 'iobroker', value: 'createState'},
        {score: 1000, meta: 'iobroker', value: 'deleteState'},
        {score: 1000, meta: 'iobroker', value: 'sendTo'},
        {score: 1000, meta: 'iobroker', value: 'sendToHost'},
        {score: 1000, meta: 'iobroker', value: 'setInterval'},
        {score: 1000, meta: 'iobroker', value: 'clearInterval'},
        {score: 1000, meta: 'iobroker', value: 'setTimeout'},
        {score: 1000, meta: 'iobroker', value: 'clearTimeout'},
        {score: 1000, meta: 'iobroker', value: 'setImmediate'},
        {score: 1000, meta: 'iobroker', value: 'compareTime'},
        {score: 1000, meta: 'iobroker', value: 'onStop'},
        {score: 1000, meta: 'iobroker', value: 'formatValue'},
        {score: 1000, meta: 'iobroker', value: 'formatDate'},
        {score: 1000, meta: 'iobroker', value: 'getDateObject'},
        {score: 1000, meta: 'iobroker', value: 'writeFile'},
        {score: 1000, meta: 'iobroker', value: 'readFile'},
        {score: 1000, meta: 'iobroker', value: 'unlink'},
        {score: 1000, meta: 'iobroker', value: 'delFile'},
        {score: 1000, meta: 'iobroker', value: 'getHistory'},
        {score: 1000, meta: 'iobroker', value: 'runScript'},
        {score: 1000, meta: 'iobroker', value: 'startScript'},
        {score: 1000, meta: 'iobroker', value: 'stopScript'},
        {score: 1000, meta: 'iobroker', value: 'isScriptActive'},
        {score: 1000, meta: 'iobroker', value: 'toInt'},
        {score: 1000, meta: 'iobroker', value: 'toFloat'},
        {score: 1000, meta: 'iobroker', value: 'toBoolean'}
    ];*/

    this.initEditor = function () {
        if (!this.editor) {

            // compiler options
            const compilerOptions = {
                target: monaco.languages.typescript.ScriptTarget.ES6,
                lib: [],
                noLib: true, // we manually provide the lib files because the editor includes the DOM typings
                allowNonTsExtensions: true,
                moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                module: monaco.languages.typescript.ModuleKind.CommonJS,
                typeRoots: ['node_modules/@types'],
            };
            monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);
            monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);

            setTypeCheck(!that.alive);

            this.editor = monaco.editor.create(document.getElementById('script-editor'), {
                language: 'javascript',
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true
            });

            this.editorDialog = monaco.editor.create(document.getElementById('dialog-script-editor'), {
                language: 'javascript',
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true
            });

            // this.editorDialog = ace.edit('dialog-script-editor');
            // this.editorDialog.getSession().setMode('ace/mode/javascript');
            // this.editorDialog.setOptions({
            //     enableBasicAutocompletion: true,
            //     enableSnippets: true,
            //     enableLiveAutocompletion: true
            // });
            // this.editorDialog.completers && this.editorDialog.completers.push({
            //     getCompletions: function (editor, session, pos, prefix, callback) {
            //         callback(null, funcNames);
            //     }
            // });
            // this.editorDialog.$blockScrolling = Infinity;
            $('#dialog-edit-insert-id').button({
                icons: {primary: 'ui-icon-note'}
            }).css('height', '30px').click(function () {
                var sid = that.main.initSelectId();
                sid.selectId('show', function (newId) {
                    insertTextIntoEditor(that.editorDialog, '"' + newId + '"' + ((that.main.objects[newId] && that.main.objects[newId].common && that.main.objects[newId].common.name) ? ('/*' + that.main.objects[newId].common.name + '*/') : ''));
                    that.editorDialog.focus();
                });
            });

            $('#edit-insert-id').button({
                icons: {primary: 'ui-icon-note'}
            }).css('height', '30px').click(function () {
                var sid = that.main.initSelectId();
                sid.selectId('show', function (newId) {
                    insertTextIntoEditor(that.editor, '"' + newId + '"' + ((that.main.objects[newId] && that.main.objects[newId].common && that.main.objects[newId].common.name) ? ('/*' + that.main.objects[newId].common.name + '*/') : ''));
                    that.editor.focus();
                });
            });

            $('.edit-cron-id').button({
                icons: {primary: 'ui-icon-clock'}
            }).css('height', '30px').click(function () {
                var text;
                if (!$('#dialog-script').is(':visible')) {
                    text = that.editor.getModel().getValueInRange(that.editor.getSelection());
                } else {
                    text = that.editorDialog.getModel().getValueInRange(that.editorDialog.getSelection());
                }
                if (text) {
                    text = text.replace(/"/g, '').replace(/'/g, '');
                    if (text) {
                        try {
                            $('#div-cron').cron('value', text);
                        } catch (e) {
                            alert(_('Cannot parse text as cron message'));
                        }
                    }
                }

                $('#dialog_cron_callback').hide();
                $('#dialog_cron_insert').show();
                that.$dialogCron.dialog('open');
            });

            // toggle blockly <=> javascript
            $('#show-blockly-id').button({
                icons: {primary: 'ui-icon-script'}
            }).css({height: 30, width: 200}).click(function () {
                if ($('#script-editor').is(':visible')) {
                    switchViews(true);
                } else {
                    blocklyCode2JSCode();
                    switchViews(false);
                }
            });

            // this.editor.on('input', function() {
            this.editor.onDidChangeModelContent(function (e) {
                if (that.currentEngine !== 'Blockly') {
                    setChanged(true);
                    $('#script-edit-button-save').button('enable');
                    $('#script-edit-button-cancel').button('enable');
                }
            });

            this.editorDialog.onDidChangeModelContent(function (e) {
                that.editorDialog._changed = true;
                $('#dialog_script_save').button('enable');
            });

            $('#edit-script-name').on('change', function () {
                setChanged(true);
                $('#script-edit-button-save').button('enable');
                $('#script-edit-button-cancel').button('enable');
            }).on('keyup', function () {
                $(this).trigger('change');
            });

            $('#edit-script-debug').on('change', function () {
                if ($(this).prop('checked')) {
                    that.main.showMessage(_('debug_help'));
                }
                setChanged(true);
                $('#script-edit-button-save').button('enable');
                $('#script-edit-button-cancel').button('enable');
            });
            $('#edit-script-verbose').on('change', function () {
                if ($(this).prop('checked')) {
                    that.main.showMessage(_('verbose_help'));
                }

                setChanged(true);
                $('#script-edit-button-save').button('enable');
                $('#script-edit-button-cancel').button('enable');
            });

            $('#edit-script-engine-type').on('change', function () {
                if (that.currentEngine === 'Blockly' && that.editor.getValue()) {
                    main.confirmMessage(_('You cannot go back!'), null, null, function (result) {
                        if (result) {
                            that.currentEngine = $('#edit-script-engine-type').val();
                            blockly2JS(true);
                        } else {
                            // return value back
                            $('#edit-script-engine-type').val('Blockly');
                        }
                    });
                    return;
                }

                if (that.currentEngine === 'Blockly') {
                    that.currentEngine = $(this).val();
                    switchViews(false, that.currentEngine);
                    blockly2JS(true);
                } else {
                    that.currentEngine = $(this).val();
                    switchViews(false, that.currentEngine);
                }

                setChanged(true);
                $('#script-edit-button-save').button('enable');
                $('#script-edit-button-cancel').button('enable');
            });
            $('#edit-script-group').on('change', function () {
                setChanged(true);
                $('#script-edit-button-save').button('enable');
                $('#script-edit-button-cancel').button('enable');
            });

            setEditorOptions(that.editor, {
                lineWrap: $('#edit-wrap-lines').prop('checked')
            });

        }
    };

    function _deleteGroup(id, originalGroup, confirmed, deleted) {
        if (confirmed.indexOf(id) === -1) {
            confirmed.push(id);
        }

        // find all elements
        for (var l = 0; l < that.list.length; l++) {
            if (that.list[l].substring(0, id.length + 1) === id + '.' && (!deleted || deleted.indexOf(that.list[l]) === -1)) {
                deleteId(that.list[l], id, confirmed, deleted);
                return;
            }
        }

        for (var g = 0; g < that.groups.length; g++) {
            if (that.groups[g].substring(0, id.length + 1) === id + '.') {
                deleteId(that.groups[g], id, confirmed, deleted);
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
                    deleteId(originalGroup, null, confirmed, deleted);
                }, 0);
            } else {
                // finish
            }
        });
    }
    function deleteId(id, originalGroup, confirmed, deleted) {
        originalGroup = originalGroup || id;
        confirmed     = confirmed     || [];
        deleted       = deleted       || [];

        if (that.main.objects[id] && that.main.objects[id].type === 'script') {
            that.main.confirmMessage(_('Are you sure to delete script %s?', that.main.objects[id].common.name), null, 'help', function (result) {
                if (result) {
                    that.main.socket.emit('delObject', id, function (err) {
                        if (err) {
                            that.main.showError(err);
                            that.init(true);
                        } else {
                            deleted.push(id);
                            setTimeout(function () {
                                deleteId(originalGroup, null, confirmed, deleted);
                            }, 0);
                        }
                    });
                } else {
                    // Do nothing
                }
            });
        } else {
            var name = id;
            if (confirmed.indexOf(id) === -1) {
                if (that.main.objects[id] && that.main.objects[id].common && that.main.objects[id].common.name) {
                    name = that.main.objects[id].common.name;
                }

                that.main.confirmMessage(_('Are you sure to delete group <span style="color: blue">%s</span> and <span style="color: red">all</span> scripts in it?', name), null, 'help', function (result) {
                    if (result) {
                        _deleteGroup(id, originalGroup, confirmed, deleted);
                    }
                });
            } else {
                _deleteGroup(id, originalGroup, confirmed, deleted);
            }
        }
    }

    function renameGroup(id, newId, newName, _list, cb) {
        if (typeof _list === 'function') {
            cb = _list;
            _list = null;
        }
        if (!_list) {
            _list = [];

            that.renaming = true;
            // collect all elements to rename
            // find all elements
            for (var l = 0; l < that.list.length; l++) {
                if (that.list[l].substring(0, id.length + 1) === id + '.') _list.push(that.list[l]);
            }
            for (var g = 0; g < that.groups.length; g++) {
                if (that.groups[g].substring(0, id.length + 1) === id + '.') _list.push(that.list[l]);
            }

            that.main.socket.emit('getObject', id, function (err, obj) {
                if (err) {
                    that.renaming = false;
                    that.main.showError(err);
                    that.init(true);
                    cb && cb(err);
                } else {
                    obj = obj || {common: {}};
                    obj.common.name = newName;
                    obj._id = newId;

                    that.main.socket.emit('delObject', id, function (err) {
                        if (err) {
                            that.renaming = false;
                            that.main.showError(err);
                            that.init(true);
                            cb && cb(err);
                        } else {
                            that.main.socket.emit('setObject', newId, obj, function (err) {
                                if (err) {
                                    that.renaming = false;
                                    that.main.showError(err);
                                    that.init(true);
                                    cb && cb(err);
                                } else {
                                    setTimeout(function () {
                                        renameGroup(id, newId, newName, _list, cb);
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
                        cb && cb(err);
                    } else {
                        that.main.socket.emit('delObject', nId, function (err) {
                            if (err) {
                                that.renaming = false;
                                that.main.showError(err);
                                that.init(true);
                                cb && cb(err);
                            } else {
                                nId = newId + nId.substring(id.length);
                                that.main.socket.emit('setObject', nId, obj, function (err) {
                                    if (err) {
                                        that.renaming = false;
                                        that.main.showError(err);
                                        that.init(true);
                                        cb && cb(err);
                                    } else {
                                        setTimeout(function () {
                                            renameGroup(id, newId, newName, _list, cb);
                                        }, 0);
                                    }
                                });
                            }
                        });
                    }
                });
            } else {
                fillGroups('edit-script-group');
                that.$grid.treeTable('reinit');
                applyResizableH(true, 1000);
                cb && cb();
            }
        }
    }

    function getLiveHost () {
        var _hosts = [];
        for (var h = 0; h < that.hosts.length; h++) {
            if (main.states[that.hosts[h] + '.alive'] && main.states[that.hosts[h] + '.alive'].val) {
                return that.hosts[h];
            }

        }
        return '';
    }

    function exportScripts() {
        var host = getLiveHost();
        if (!host) {
            window.alert('No active host found');
            return;
        }
        main.socket.emit('sendToHost', host, 'readObjectsAsZip', {
            adapter: 'javascript',
            id:      'script.js'
        }, function (data) {
            if (data.error) console.error(data.error);
            if (data.data) {
                var d = new Date();
                var date = d.getFullYear();
                var m = d.getMonth() + 1;
                if (m < 10) m = '0' + m;
                date += '-' + m;
                m = d.getDate();
                if (m < 10) m = '0' + m;
                date += '-' + m + '-';

                $('body').append('<a id="zip_download" href="data: application/zip;base64,' + data.data + '" download="' + date + 'scripts.zip"></a>');
                document.getElementById('zip_download').click();
                document.getElementById('zip_download').remove();
            }
        });
    }

    function editGetReadableSize (bytes) {
        var text;
        if (bytes < 1024) {
            text = bytes + ' ' + _('bytes');
        } else if (bytes < 1024 * 1024) {
            text = Math.round(bytes * 10 / 1024) / 10 + ' ' + _('Kb');
        } else {
            text = Math.round(bytes * 10 / (1024 * 1024)) / 10 + ' ' + _('Mb');
        }
        if (main.systemConfig.common.isFloatComma) text = text.replace('.', ',');
        return text;
    }

    function fileHandler (event) {
        event.preventDefault();
        var file = event.dataTransfer ? event.dataTransfer.files[0] : event.target.files[0];

        var $dz = $('.import-drop-zone').show();
        if (!file || !file.name || !file.name.match(/\.zip$/)) {
            $('.import-drop-text').html(_('Invalid file extenstion!'));
            $dz.addClass('import-dropzone-error').animate({opacity: 0}, 1000, function () {
                $dz.hide().removeClass('import-dropzone-error').css({opacity: 1});
                $('.import-drop-text').html(_('Drop the files here'));
            });
            return false;
        }

        if (file.size > 50000000) {
            $('.import-drop-text').html(_('File is too big!'));
            $dz.addClass('import-dropzone-error').animate({opacity: 0}, 1000, function () {
                $dz.hide().removeClass('import-dropzone-error').css({opacity: 1});
                $('.import-drop-text').html(_('Drop the files here'));
            });
            return false;
        }
        $dz.hide();
        var reader = new FileReader();
        reader.onload = function (evt) {
            var $importFileName = $('.import-file-name');
            $importFileName.html('<img src="zip.png" /><br><span style="color: black; font-weight: bold">[' + editGetReadableSize(file.size) + ']</span><br><span style="color: black; font-weight: bold">' + file.name + '</span>');
            // string has form data:;base64,TEXT==
            $importFileName.data('file', evt.target.result.split(',')[1]);
            $('.import-text-drop-plus').hide();
            if ($importFileName.data('file')) {
                $('#start_import_scripts').button('enable');
            } else {
                $('#start_import_scripts').button('disable');
            }
        };
        reader.readAsDataURL(file);
    }

    function importScripts() {
        $('#dialog_import_scripts').dialog({
            autoOpen:   true,
            resizable: false,
            width:      600,
            height:     280,
            modal:      true,
            open: function (event, ui) {
                $(event.target).parent().find('.ui-dialog-titlebar-close .ui-button-text').html('');
                $('[aria-describedby="dialog_import_scripts"]').css('z-index', 1002);
                $('.ui-widget-overlay').css('z-index', 1001);
                $('.import-file-name').data('file', null).html(_('Drop files here or click to select one'));
                $('#start_import_scripts').button('disable');
                $('.import-drop-file').val('');
                $('.import-text-drop-plus').show();

                var $dropZone = $('#dialog_import_scripts');
                if (typeof(window.FileReader) !== 'undefined' && !$dropZone.data('installed')) {
                    $dropZone.data('installed', true);
                    var $dz = $('.import-drop-zone');
                    $('.import-drop-text').html(_('Drop the files here'));
                    $dropZone[0].ondragover = function() {
                        $dz.unbind('click');
                        $dz.show();
                        return false;
                    };
                    $dz.click(function () {
                        $dz.hide();
                    });

                    $dz[0].ondragleave = function() {
                        $dz.hide();
                        return false;
                    };

                    $dz[0].ondrop = function (e) {
                        fileHandler(e);
                    }
                }
            }
        });
    }

    function initBlocklyDialog(title) {
        if (!that.$dialogExport.data('inited')) {
            that.$dialogExport.dialog({
                autoOpen:   false,
                modal:      true,
                width:      700,
                height:     400,
                resizable:  false,
                title:      _('Export selected blocks'),
                close: function () {
                    $('#dialog-export-blockly-textarea').val('');
                },
                open: function (event) {
                    $(event.target).parent().find('.ui-dialog-titlebar-close .ui-button-text').html('');
                    $('#dialog-export-blockly-textarea').focus();
                },
                buttons: [
                    {
                        id: 'blockly-export-button-ok',
                        text: _('Ok'),
                        click: function () {
                            var val = $('#dialog-export-blockly-textarea').val();
                            if (val.trim()) {
                                try {
                                    var xmlBlocks = Blockly.Xml.textToDom(val);
                                    if (xmlBlocks.nodeName === 'xml') {
                                        for (var b = 0; b < xmlBlocks.children.length; b++) {
                                            that.blocklyWorkspace.paste(xmlBlocks.children[b]);
                                        }
                                    } else {
                                        that.blocklyWorkspace.paste(xmlBlocks);
                                    }
                                    that.$dialogExport.dialog('close');
                                } catch (e) {
                                    that.main.showError(e, _('Import error'));
                                }
                            } else {
                                that.main.showMessage(_('Nothing imported'));
                                that.$dialogExport.dialog('close');
                            }
                        }
                    },
                    {
                        text: _('Cancel'),
                        click: function () {
                            that.$dialogExport.dialog('close');
                        }
                    }
                ]
            });
            that.$dialogExport.data('inited', true);
        }
        that.$dialogExport.dialog('option', 'title',  title || _('Export selected blocks'));
    }

    function showExportBlocklyDialog() {
        initBlocklyDialog(_('Export selected blocks'));
        if (Blockly.selected) {
            var xmlBlock = Blockly.Xml.blockToDom(Blockly.selected);
            if (Blockly.dragMode_ != Blockly.DRAG_FREE) {
                Blockly.Xml.deleteNext(xmlBlock);
            }
            // Encode start position in XML.
            var xy = Blockly.selected.getRelativeToSurfaceXY();
            xmlBlock.setAttribute('x', Blockly.selected.RTL ? -xy.x : xy.x);
            xmlBlock.setAttribute('y', xy.y);

            $('#dialog-export-blockly-textarea').val(Blockly.Xml.domToPrettyText(xmlBlock)).prop('readonly', true).select();
        } else {
            var dom = Blockly.Xml.workspaceToDom(that.blocklyWorkspace);
            var text = Blockly.Xml.domToPrettyText(dom);
            $('#dialog-export-blockly-textarea').val(text).prop('readonly', true).select()
        }
        $('#blockly-export-button-ok').hide();
        that.$dialogExport.dialog('open');
    }

    function showImportBlocklyDialog() {
        initBlocklyDialog(_('Import selected blocks'));
        $('#blockly-export-button-ok').show();
        $('#dialog-export-blockly-textarea').prop('readonly', false).val('');
        that.$dialogExport.dialog('open');
    }

    function loadScripts(scripts, callback) {
        if (!scripts || !scripts.length) {
            return callback();
        }
        var adapter = scripts.pop();
        $.getScript('../../adapter/' + adapter + '/blockly.js', function (/*data, textStatus, jqxhr*/) {
            setTimeout(function () {
                loadScripts(scripts, callback);
            }, 0);
        }).fail(function (jqxhr, settings, exception) {
            console.warn('cannot load ' + '../../adapter/' + adapter + '/blockly.js: ' + exception);
            setTimeout(function () {
                loadScripts(scripts, callback);
            }, 0);
        });
    }

    function loadCustomBlockly(callback) {
        // get all adapters, that can have blockly
        var toLoad = [];
        for (var id in that.main.objects) {
            if (!that.main.objects.hasOwnProperty(id) || !that.main.objects[id]) continue;
            if (!id.match(/^system\.adapter\./)) continue;
            if (that.main.objects[id].type !== 'adapter') continue;
            if (that.main.objects[id].common && that.main.objects[id].common.blockly) {
                console.log('Detected custom blockly: ' + that.main.objects[id].common.name);
                toLoad.push(that.main.objects[id].common.name);
            }
        }

        loadScripts(toLoad, callback);
    }

    function enableScript(id, isEnable) {
        that.main.socket.emit('extendObject', id, {
            common: {
                enabled: isEnable
            }
        }, function (err) {
            if (err) {
                that.main.showError(err);
                that.init(true);
            }
        });
    }

    this.init = function (update) {
        if (this.inited && !update) return;
        var that = this;
        if (!this.main.objectsLoaded || !this.languageLoaded[0] || !this.languageLoaded[1]) {
            setTimeout(function () {
                that.init(update);
            }, 250);
            return;
        }
        this.inited = true;

        var $blocklyEditor = $('#blockly-editor');
        if (!$blocklyEditor.data('inited')) {
            $blocklyEditor.data('inited', true);
            loadCustomBlockly(function () {
                MSG.catSystem = Blockly.Words['System'][systemLang];
                MSG.catSendto = Blockly.Words['Sendto'][systemLang];

                // Interpolate translated messages into toolbox.
                var toolboxText = document.getElementById('toolbox').outerHTML;
                toolboxText = toolboxText.replace(/{(\w+)}/g,
                    function(m, p1) {return MSG[p1]});

                var blocks = '';
                for (var cb = 0; cb < Blockly.CustomBlocks.length; cb++) {
                    var name = Blockly.CustomBlocks[cb];
                    // add blocks
                    blocks += '<category name="' + Blockly.Words[name][systemLang] + '" colour="' + Blockly[name].HUE + '">';
                    for (var _b in Blockly[name].blocks) {
                        if (Blockly[name].blocks.hasOwnProperty(_b)) {
                            blocks += Blockly[name].blocks[_b];
                        }
                    }
                    blocks += '</category>';
                }
                toolboxText = toolboxText.replace('<category><block>%%CUSTOM_BLOCKS%%</block></category>', blocks);

                var toolboxXml = Blockly.Xml.textToDom(toolboxText);

                that.blocklyWorkspace = Blockly.inject(
                    'blockly-editor',
                    {
                        media: '/adapter/javascript/google-blockly/media/',
                        toolbox: toolboxXml,
                        zoom: {
                            controls:   true,
                            wheel:      false,
                            startScale: 1.0,
                            maxScale:   3,
                            minScale:   0.3,
                            scaleSpeed: 1.2
                        },
                        trashcan: true,
                        grid: {
                            spacing:    25,
                            length:     3,
                            colour:     '#ccc',
                            snap:       true
                        }
                    }
                );
                if (that.currentId) {
                    var obj = main.objects[that.currentId];
                    if (obj && obj.common && obj.common.engineType === 'Blockly') {
                        editScript(that.currentId);
                    }
                }
                // Listen to events on master workspace.
                that.blocklyWorkspace.addChangeListener(function (masterEvent) {
                    if (masterEvent.type === Blockly.Events.UI) {
                        return;  // Don't mirror UI events.
                    }
                    setChanged(true);
                    $('#script-edit-button-save').button('enable');
                    $('#script-edit-button-cancel').button('enable');
                });
            });

            $('#dialog-new-script').dialog({
                autoOpen: false,
                modal:    true,
                width: 550,
                height: 170,
                open: function (event)  {
                    $(event.target).parent().find('.ui-dialog-titlebar-close .ui-button-text').html('');
                    $('#dialog-new-script').css({height: 170, overflow: 'hidden'});
                },
                resizable: false,
                buttons: {}
            });
            $('.dialog-new-script-button').click(function () {
                var callback = $('#dialog-new-script').dialog('close').data('callback');
                if (callback) {
                    callback($(this).data('type'));
                }
            });
        }

        if (typeof this.$grid !== 'undefined') {
            that.engines = this.fillEngines('edit-script-engine-type');

            /*this.$grid.selectId('init', {
                objects:        main.objects,
                noDialog:       true,
                texts:          {
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
                columns: [
                    {
                        name: 'instance',
                        data: function (id, name) {
                            return that.main.objects[id] && that.main.objects[id].common && that.main.objects[id].common.engine ? that.main.objects[id].common.engine.substring('system.adapter.javascript.'.length) : '';
                        },
                        title: function (id, name) {
                            return that.main.objects[id] && that.main.objects[id].common && that.main.objects[id].common.engine ? _('Instance')  + ' ' + that.main.objects[id].common.engine : '';
                        }
                    },
                    'button'
                ],
                widths:  ['100px', '140px'],
                buttons: [
                    {
                        text: false,
                        icons: {
                            primary:'ui-icon-play'
                        },
                        click: function (id) {
                            if (this.length === 1) this.button('disable');

                            var enabled = !(that.main.objects[id] && that.main.objects[id].common && that.main.objects[id].common.enabled);
                            // If script not saved ask about saving
                            if (enabled && !$('#script-edit-button-save').hasClass('ui-button-disabled')) {
                                that.main.confirmMessage(_('Do you want to save script %s?', that.main.objects[id].common.name), null, 'help', function (result) {
                                    if (result) {
                                        that.saveScript(function () {
                                            // toggle state
                                            enableScript(id, enabled);
                                        });
                                    } else {
                                        // toggle state
                                        enableScript(id, enabled);
                                    }
                                });
                            } else {
                                // toggle state
                                enableScript(id, enabled);
                            }
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
                                } while (that.list.indexOf(newId) !== -1);

                                obj._id = newId;
                                that.main.socket.emit('setObject', newId, obj, function (err, obj) {
                                    if (err) {
                                        that.main.showError(err);
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
                            primary: 'ui-icon-circle-plus'
                        },
                        click: function () {
                            addScriptInGroup(that.currentId);
                        }
                    },
                    {
                        text: false,
                        title: _('Export'),
                        icons: {
                            primary: 'ui-icon-arrowthickstop-1-s'
                        },
                        click: function () {
                            exportScripts();
                        }
                    },
                    {
                        text: false,
                        title: _('Import'),
                        icons: {
                            primary: 'ui-icon-arrowthickstop-1-n'
                        },
                        click: function () {
                            importScripts();
                        }
                    }
                ],
                onChange: function (id, oldId) {
                    if (id !== oldId || !that.editor) {
                        editScript(id);
                    } else {
                        // focus again on editor
                        that.editor.focus();
                    }
                },
                quickEdit: [{
                    name:    'instance',
                    options: function (id, name) {
                        var ins = {};
                        if (that.main.objects[id].type !== 'script') {
                            return false;
                        }
                        for (var i = 0; i < main.instances.length; i++) {
                            if (main.instances[i].substring(0, 'system.adapter.javascript.'.length) === 'system.adapter.javascript.') {
                                var inst = main.instances[i].substring('system.adapter.javascript.'.length);
                                ins[inst] = inst;
                            }
                        }
                        return ins;
                    }
                }],
                quickEditCallback: function (id, attr, newValue, oldValue) {
                    main.socket.emit('getObject', id, function (err, _obj) {
                        if (err) return that.main.showError(err);

                        _obj.common.engine = 'system.adapter.javascript.' + newValue;
                        main.socket.emit('setObject', _obj._id, _obj, function (err) {
                            if (err) that.main.showError(err);
                        });
                    });
                }
            }).selectId('show', update ? undefined : main.config['script-editor-current-id'] || undefined);
*/
            this.$grid.treeTable({
                objects:    that.main.objects,
                root:       'script.js',
                widths:     ['calc(100% - 106px)', '20px'],
                columns:    ['name', 'instance'],
                name:       'scripts',
                buttonsWidth: '86px',
                buttonsStyle: 'text-align: left',
                buttons:    [
                    {
                        text: false,
                        icons: {
                            primary:'ui-icon-play'
                        },
                        click: function (id) {
                            if (this.length === 1) this.button('disable');

                            var enabled = !(that.main.objects[id] && that.main.objects[id].common && that.main.objects[id].common.enabled);
                            // If script not saved ask about saving
                            if (enabled && !$('#script-edit-button-save').hasClass('ui-button-disabled')) {
                                that.main.confirmMessage(_('Do you want to save script %s?', that.main.objects[id].common.name), null, 'help', function (result) {
                                    if (result) {
                                        that.saveScript(function () {
                                            // toggle state
                                            enableScript(id, enabled);
                                        });
                                    } else {
                                        // toggle state
                                        enableScript(id, enabled);
                                    }
                                });
                            } else {
                                // toggle state
                                enableScript(id, enabled);
                            }
                        },
                        match: function (id) {
                            if (typeof this.hide !== 'function') return;
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
                            if (typeof this.hide !== 'function') return;
                            if (id === 'script.js.global' || id === 'script.js.common' || !main.objects[id] || !main.objects[id].common || main.objects[id].common.nondeletable) this.hide();
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
                                } while (that.list.indexOf(newId) !== -1);

                                obj._id = newId;
                                that.main.socket.emit('setObject', newId, obj, function (err, obj) {
                                    if (err) {
                                        that.main.showError(err);
                                    }
                                });
                            });
                        },
                        match: function (id) {
                            if (typeof this.hide !== 'function') return;
                            if (!that.main.objects[id] || that.main.objects[id].type !== 'script') this.hide();
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
                            if (typeof this.hide !== 'function') return;
                            if (!that.main.objects[id] || that.main.objects[id].type !== 'script') this.hide();
                        },
                        width: 26,
                        height: 20
                    }
                ],
                moveId:     function (oldId, newId, callback) {
                    var obj = that.main.objects[oldId];
                    if (newId[0] === '.') {
                        newId = 'script.js' + newId;
                    }

                    if (obj === undefined) {
                        callback && callback('Not found');
                    } else {
                        that.main.socket.emit('delObject', oldId, function (err) {
                            obj._id = newId;
                            that.main.socket.emit('setObject', newId, obj, callback);
                        });
                    }
                },
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
                            primary: 'ui-icon-circle-plus'
                        },
                        click: function () {
                            addScriptInGroup(that.currentId);
                        }
                    },
                    {
                        text: false,
                        title: _('Export'),
                        icons: {
                            primary: 'ui-icon-arrowthickstop-1-s'
                        },
                        click: function () {
                            exportScripts();
                        }
                    },
                    {
                        text: false,
                        title: _('Import'),
                        icons: {
                            primary: 'ui-icon-arrowthickstop-1-n'
                        },
                        click: function () {
                            importScripts();
                        }
                    },
                    {
                        text: false,
                        title: _('Expert mode'),
                        icons: {
                            primary: 'ui-icon-arrowthickstop-1-n'
                        },
                        click: function () {

                        }
                    }
                ],
                onChange:   function (id, oldId) {
                    if (id !== oldId || !that.editor) {
                        editScript(id);
                    } else {
                        // focus again on editor
                        that.editor.focus();
                    }
                },
                onEdit: function (id, attr, value) {
                    if (attr === 'instance') {
                        that.main.socket.emit('getObject', id, function (err, obj) {
                            if (obj) {
                                obj.common.engine = 'system.adapter.javascript.' + value;
                                that.main.socket.emit('setObject', obj._id, obj, function (err) {
                                    if (err) {
                                        that.main.showError(err);
                                        that.init(true);
                                    }
                                });
                            } else {
                                window.alert('Object "' + id + '" not exists');
                                that.init(true);
                            }
                        });
                    }
                }
            }).treeTable('show', update ? undefined : main.config['script-editor-current-id'] || undefined);

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

            if (this.main.config['script-editor-wrap-lines'])        $('#edit-wrap-lines').prop('checked', true);
            if (this.main.config['script-editor-dialog-wrap-lines']) $('#dialog-edit-wrap-lines').prop('checked', true);

            $('#edit-check-blocks').button({
                icons: {
                    primary: 'ui-icon-check'
                }
            }).click(function () {
                blocklyCheckBlocks(function (err, badBlock) {
                    if (!err) {
                        that.main.showMessage(_('Ok'));
                    } else {
                        if (badBlock) blocklyBlinkBlock(badBlock);
                        that.main.showError(_(err), function () {
                            if (badBlock) blocklyBlinkBlock(badBlock);
                        });
                    }
                });
            });

            $('#edit-export-blocks')
                .button({
                    icons: {
                        primary: 'ui-icon-arrowthickstop-1-s'
                    },
                    text: false
                })
                .attr('title', _('Export blocks'))
                .css({width: 32, height: 32})
                .click(function () {
                    showExportBlocklyDialog();
                });

            $('#edit-import-blocks')
                .button({
                    icons: {
                        primary: 'ui-icon-arrowthickstop-1-n'
                    },
                    text: false
                })
                .attr('title', _('Import blocks'))
                .css({width: 32, height: 32})
                .click(function () {
                    showImportBlocklyDialog();
                });

            if (!update && main.config['script-editor-current-id']) {
                editScript(main.config['script-editor-current-id']);
            }
        }
    };

    this.saveScript = function (isConvert, cb) {
        if (typeof isConvert === 'function') {
            cb = isConvert;
            isConvert = false;
        }
        var that       = this;
        var obj        = {};
        var name       = $('#edit-script-name').val();
        var newId      = $('#edit-script-group').val() + '.' + name.replace(/["'\s.]/g, '_');
        obj.name       = name;
        obj.engineType = $('#edit-script-engine-type').val() || '';
        obj.debug      = $('#edit-script-debug').prop('checked');
        obj.verbose    = $('#edit-script-verbose').prop('checked');

        // Try to detect blockly type
        if (obj.engineType === 'Blockly') {
            if (!isConvert) {
                obj.source = blocklyCode2JSCode(false, true);
            } else {
                obj.source = that.editor.getValue();
            }
        }

        if (that.currentId !== newId && that.main.objects[newId]) {
            that.main.showError(_('Duplicate name'));
            cb && cb();
            return;
        }

        if (obj.engineType !== 'Blockly') {
            obj.source = that.editor.getValue();
            var blocklyText = jsCode2Blockly(obj.source);
            if (blocklyText && blocklyText.substring(0, 4) === '<xml') {
                // ask about change the script type
                that.main.confirmMessage(_('Convert to Blockly'), _('Convert?'), 'help', function (result) {
                    if (result) {
                        obj.engineType = 'Blockly';
                        if (!$('#edit-script-engine-type').find('option[value="Blockly"]').length) {
                            $('#edit-script-engine-type').prepend('<option value="Blockly">Blockly</option>');
                        }
                        $('#edit-script-engine-type').val(obj.engineType);
                        setChanged(true);

                        that.saveScript(true, function () {
                            setTimeout(function () {
                                editScript(that.currentId);
                            }, 500);
                        });
                    } else {
                        // remove blockly text
                        obj.source = removeBlocklyFromCode(obj.source);
                        that.editor.setValue(obj.source /*, -1*/);
                        // wait till editor script updates
                        setTimeout(function () {
                            that.saveScript();
                        }, 300);
                    }
                });
                return;
            }
        }

        setChanged(false);
        $('#script-edit-button-save').button('disable');
        $('#script-edit-button-cancel').button('disable');

        if (that.main.objects[that.currentId] && that.main.objects[that.currentId].type === 'script') {
            that.updateScript(that.currentId, newId, obj, function (err) {
                if (err) {
                    console.error(err);
                    $('#script-edit-button-save').button('enable');
                    $('#script-edit-button-cancel').button('enable');
                }
                cb && cb();
            });
        } else {
            renameGroup(that.currentId, newId, obj.name, function (err) {
                if (err) {
                    console.error(err);
                    $('#script-edit-button-save').button('enable');
                    $('#script-edit-button-cancel').button('enable');
                }
                cb && cb();
            });
        }
        that.currentId = newId;
    };

    this.objectChange = function (id, obj) {
        // Update scripts
        if (id.match(/^script\./)) {
            if (obj) {
                if (this.list.indexOf(id) === -1) this.list.push(id);

                // if script type was changed
                if (id === this.currentId) {
                    var $name = $('#edit-script-name');
                    if (obj.common.name !== $name.val()) {
                        $name.val(obj.common.name);
                    }
                    if (obj.common.engineType !== $('#edit-script-engine-type').val()) {
                        editScript(id);
                    }
                }
            } else {
                // deleted
                var j = this.list.indexOf(id);
                if (j !== -1) this.list.splice(j, 1);
                if (id === this.currentId) {
                    setChanged(false);
                    editScript(null);
                }
            }

            if (this.updateTimer) clearTimeout(this.updateTimer);

            this.updateTimer = setTimeout(function () {
                that.updateTimer = null;
                that.$grid.treeTable('reinit');
                applyResizableH(true, 1000);
            }, 200);

            if (this.$grid) {
                this.$grid.treeTable('object', id, obj);
            }
        } else
        if (id.match(/^system\.adapter\.[-\w\d]+\.[0-9]+$/)) {
            var $editScript = $('#edit-script-engine-type');
            var val = $editScript.val();
            that.engines = that.fillEngines('edit-script-engine-type');
            $editScript.val(val);
        }
        else
        if (id.match(/^system\.adapter\.[-\w\d]+\$/)) {
            if (obj[id].common && obj[id].common.blockly) {
                main.confirmMessage(_('Some blocks were updated. Reload admin?'), null, null, 700, function (result) {
                    if (result) {
                        window.location.reload();
                    }
                });
            }
        }

        if (id.match(/^script\.js\./) && obj && obj.type === 'channel') {
            scripts.groups.push(id);
            if (!that.renaming) {
                fillGroups('edit-script-group');
            }
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
    };

    this.showCronDialog = function (value, cb) {
        if (value) {
            value = value.replace(/\"/g, '').replace(/\'/g, '');
            if (value) {
                try {
                    $('#div-cron').cron('value', value);
                } catch (e) {
                    alert(_('Cannot parse value as cron'));
                }
            }
        }
        $('#dialog_cron_callback').show();
        $('#dialog_cron_insert').hide();

        $('#dialog_cron_callback').unbind('click').click(function () {
            var val = $('#div-cron').cron('value');
            that.$dialogCron.dialog('close');
            if (cb) cb(val);
        });

        this.$dialogCron.dialog('open');
    };

    this.showScriptDialog = function (value, args, isReturn, cb) {
        this.editorDialog.setValue(value || '');

        var width  = 700;
        var height = 550;

        if (this.main.config['script-edit-width'])  width  = this.main.config['script-edit-width'];
        if (this.main.config['script-edit-height']) height = this.main.config['script-edit-height'];

        this.$dialogScript.data('callback', cb);

        if (args && args.length) {
            this.$dialogScript.dialog('option', 'title', _('Edit script') + '. ' + _('Arguments: ') + args.join(', '));
        } else {
            this.$dialogScript.dialog('option', 'title', _('Edit script'));
        }

        setEditorOptions(this.editorDialog, {
            lineWrap: $('#dialog-edit-wrap-lines').prop('checked'),
        });

        this.$dialogScript
            .dialog('option', 'width',  width)
            .dialog('option', 'height', height)
            .dialog('open');

        this.editorDialog.focus();

        that.editorDialog._isReturn = isReturn;

        setTimeout(function () {
            that.editorDialog._changed = false;
            $('#dialog_script_save').button('disable');
        }, 100);
    };
}

/**
 * Tests if the given ID belongs to a global script
 * @param {string} id
 * @returns {boolean}
 */
function isIdOfGlobalScript(id) {
    return /^script\.js\.global\./.test(id);
}

var main = {
    socket:         io.connect(location.protocol + '//' + location.host, {
        query: 'ws=true'
    }),
    saveConfig:     function (attr, value) {
        if (!main.config) return;
        if (attr) main.config[attr] = value;

        if (typeof storage !== 'undefined') {
            storage.set('adminConfig', JSON.stringify(main.config));
        }
    },
    showError:      function (error, cb) {
        main.showMessage(_(error),  _('Error'), 'alert', cb);
    },
    showMessage:    function (message, title, icon, cb) {
        if (typeof title === 'function') {
            cb = title;
            title = null;
            icon = null;
        }
        if (typeof icon === 'function') {
            cb = icon;
            icon = null;
        }
        $dialogMessage.dialog('option', 'title', title || _('Message'));
        $('#dialog-message-text').html(message);

        if (icon) {
            if (!icon.match(/^ui\-icon\-/)) icon = 'ui-icon-' + icon;

            $('#dialog-message-icon')
                .show()
                .attr('class', '')
                .addClass('ui-icon ' + icon);
        } else {
            $('#dialog-message-icon').hide();
        }
        $dialogMessage.data('callback', cb);
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
            $('#dialog-confirm-icon')
                .show()
                .attr('class', '')
                .addClass('ui-icon ui-icon-' + icon);
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
            getObjects: getObjects,
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
    subscribe:      function (isSubscribe) {
        if (!main.socket) return;
        if (isSubscribe) {
            main.socket.emit('subscribeObjects', 'script.*');
            main.socket.emit('subscribeObjects', 'system.adapter.*');
            main.socket.emit('requireLog', true);
        } else {
            main.socket.emit('unsubscribeObjects', 'script.*');
            main.socket.emit('unsubscribeObjects', 'system.adapter.*');
            main.socket.emit('requireLog', false);
        }
    },
    objects:        {},
    states:         {},
    currentHost:    '',
    instances:      [],
    objectsLoaded:  false,
    waitForRestart: false,
    selectId:       null
};

var $dialogMessage = $('#dialog-message');
var $dialogConfirm = $('#dialog-confirm');

// Read all positions, selected widgets for every view,
// Selected view, selected menu page,
// Selected widget or view page
// Selected filter
if (typeof storage !== 'undefined') {
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
    main.socket.emit('getAllObjects', function (err, res) {
        setTimeout(function () {
            var obj;
            main.objects = res;
            for (var id in main.objects) {
                if (!main.objects.hasOwnProperty(id) || id.slice(0, 7) === '_design') continue;

                obj = res[id];
                if (obj.type === 'instance') main.instances.push(id);
                if (obj.type === 'script')   scripts.list.push(id);
                if (obj.type === 'channel' && id.match(/^script\.js\./)) scripts.groups.push(id);
                if (obj.type === 'host')     scripts.hosts.push(id);
            }
            main.objectsLoaded = true;

            scripts.prepare();
            scripts.init();

            if (typeof callback === 'function') callback(null, res);
        }, 0);
    });
}

function objectChange(id, obj) {
    // update main.objects cache
    if (obj) {
        if (obj._rev && main.objects[id]) main.objects[id]._rev = obj._rev;
        if (!main.objects[id] || JSON.stringify(main.objects[id]) !== JSON.stringify(obj)) {
            main.objects[id] = obj;
            if (obj.type === 'instance') {
                pos = main.instances.indexOf(id);
                if (pos === -1) main.instances.push(id);
            } else
            if (obj.type === 'script') {
                pos = scripts.list.indexOf(id);
                if (pos === -1) scripts.list.push(id);
            } else
            if (id.match(/^script\.js\./) && obj.type === 'channel') {
                pos = scripts.groups.indexOf(id);
                if (pos === -1) scripts.groups.push(id);
            }
        }
    } else if (main.objects[id]) {
        var oldObj = {_id: id, type: main.objects[id].type};
        delete main.objects[id];
        var pos;
        if (oldObj.type === 'instance') {
            pos = main.instances.indexOf(id);
            if (pos !== -1) main.instances.splice(pos, 1);
        } else
        if (oldObj.type === 'script') {
            pos = scripts.list.indexOf(id);
            if (pos !== -1) scripts.list.splice(pos, 1);
        } else
        if (id.match(/^script\.js\./) && oldObj.type === 'channel') {
            pos = scripts.groups.indexOf(id);
            if (pos !== -1) scripts.groups.splice(pos, 1);
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
    id = id ? id.replace(/[\s'"]/g, '_') : '';

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
                                $(this).dialog('close');
                                var cb = $(this).data('callback');
                                if (typeof cb === 'function') {
                                    $(this).data('callback', null);
                                    cb();
                                }
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
    main.subscribe(true);
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
        var $gridScripts = $('#grid-scripts');
        if ($gridScripts.hasClass('ui-resizable')) {
            $gridScripts.resizable('destroy');
        }

        if (!install) return;

        var width = parseInt(main.config['script-editor-width'] || '30%', 10);

        $gridScripts.width(width + '%').next().width(100 - width + '%');

        $gridScripts.resizable({
            autoHide:   false,
            handles:    'e',
            start:      function (e, ui) {
                var $editor = $('#blockly-editor');
                $editor.data('wasVisible', $editor.is(':visible'));
                $editor.hide();
                $editor = $('#script-editor');
                $editor.data('wasVisible', $editor.is(':visible'));
                $editor.hide();
                $('.blocklyWidgetDiv').hide();
                $('.blocklyTooltipDiv').hide();
                $('.blocklyToolboxDiv').hide();
            },
            resize:     function(e, ui) {
                var parent = ui.element.parent();
                var remainingSpace = parent.width() - ui.element.outerWidth();
                var divTwo = ui.element.next();
                var divTwoWidth = (remainingSpace - (divTwo.outerWidth() - divTwo.width())) / parent.width() * 100 + '%';
                divTwo.width(divTwoWidth);
            },
            stop: function(e, ui) {
                var parent = ui.element.parent();
                var width  = ui.element.width() / parent.width() * 100 + '%';
                ui.element.css({
                    width: width
                });
                main.saveConfig('script-editor-width', width);
                scripts.resize();
            }
        });
    }
}

function applyResizableV() {
    var height = parseInt(main.config['script-editor-height'] || '80%', 10);
    var $textarea = $('#editor-scripts-textarea');
    $textarea
            .height(height + '%')
                .next()
                .height(100 - height + '%');

    $textarea.resizable({
        autoHide:   false,
        handles:    's',
        start:      function (e, ui) {
            var $editor = $('#blockly-editor');
            $editor.data('wasVisible', $editor.is(':visible'));
            $editor.hide();
            $('.blocklyWidgetDiv').hide();
            $('.blocklyTooltipDiv').hide();
            $('.blocklyToolboxDiv').hide();
        },
        resize:     function (e, ui) {
            var parent = ui.element.parent();
            var remainingSpace = parent.height() - ui.element.outerHeight();
            var divTwo = ui.element.next();
            var divTwoWidth = (remainingSpace - (divTwo.outerHeight() - divTwo.height())) / parent.height() * 100 + '%';
            divTwo.height(divTwoWidth);
        },
        stop: function (e, ui) {
            var parent = ui.element.parent();
            var height = ui.element.height() / parent.height() * 100 + '%';
            ui.element.css({
                height: height
            });
            main.saveConfig('script-editor-height', height);

            scripts.resize();
        }
    });
}

window.onbeforeunload = function (evt) {
    if (scripts.changed) {
        if (window.confirm(_('Script changes are not saved. Discard?'))) {
            main.subscribe(false);
            return null;
        } else {
            return _('Configuration not saved.');
        }
    }
    main.subscribe(false);

    return null;
};