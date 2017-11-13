(function ($) {
    'use strict';

    if ($.fn.treeTable) return;

    function nodeExpand() {
        var id = this.id;
        var $table = this.row.parent().parent(); // table > tbody > tr
        var options = $table.data('data');

        if (options.name) {
            options.expanded = options.expanded || [];
            if (options.expanded.indexOf(id) === -1) {
                options.expanded.push(id);
                if (typeof Storage !== 'undefined') {
                    window.localStorage.setItem(options.name + '-treetable', JSON.stringify(options.expanded));
                }
            }
        }

        var parentNode = $table.treetable('node', id);
    }

    function nodeCollapse() {
        var id = this.id;
        var $table = this.row.parent().parent(); // table > tbody > tr
        var options = $table.data('data');

        if (options.name && options.expanded) {
            var pos = options.expanded.indexOf(id);
            if (pos !== -1) {
                options.expanded.splice(pos, 1);
                if (typeof Storage !== 'undefined') {
                    window.localStorage.setItem(options.name + '-treetable', JSON.stringify(options.expanded));
                }
            }
        }

        var parentNode = $table.treetable('node', id);
    }

    function filter($table, word) {
        if (word) {
            word = word.toLowerCase();
            var options = $table.data('options');
            $table.find('tr').each(function () {
                if ($(this).hasClass('tree-table-main-header')) return;

                if (!$(this).data('tt-branch') && $(this).find('td:first-child').text().indexOf(word) === -1) {
                    $(this).addClass('filtered-out');
                } else {
                    $(this).removeClass('filtered-out');
                }
            });
            var branch = '';
            var isOneVisible = false;
            // hide branches without children
            $table.find('tr').each(function () {
                if ($(this).data('tt-branch')) {
                    if (branch) {
                        if (!isOneVisible) {
                            $table.find('tr[data-tt-id="' + branch + '"]').addClass('filtered-out');
                        } else {
                            $table.find('tr[data-tt-id="' + branch + '"]').removeClass('filtered-out');
                        }
                    }
                    isOneVisible = false;
                    branch = $(this).data('tt-id');
                } else if (branch) {
                    if (!$(this).hasClass('filtered-out')) isOneVisible = true;
                }
            });
            if (branch) {
                if (!isOneVisible) {
                    $table.find('tr[data-tt-id="' + branch + '"]').addClass('filtered-out');
                } else {
                    $table.find('tr[data-tt-id="' + branch + '"]').removeClass('filtered-out');
                }
            }
        } else {
            $table.find('tr').removeClass('filtered-out');
        }
    }

    function buildTable(options) {
        var table = '';
        if (options.panelButtons) {
            table += '<div>';
            for (var z = 0; z < options.panelButtons.length; z++) {
                table += '<button class="btn-custom-' + z + '" style="margin-right: 3px;"></button>';
            }
            table += '</div>';
        }

        // build table
        table += '<table class="tree-table-main">';
        table += '  <thead>';
        table += '      <tr class="tree-table-main-header">';
        table += '      <th' + (options.widths && options.widths[0] ? ' style="padding: .1em .1em; width: ' + options.widths[0] + '"' : '') + '>';
        table += '      <input placeholder="' + _('name') + '" style="width: calc(100% - 24px); padding: 0; padding-left: 5px; font-size: 12px; border: 0; line-height: 1.5em;" class="filter_name">';
        table += '      <button data-id="filter_name" role="button" class="filter-clear" style="width: 18px; height: 18px; border: 0; background: #fff;"></button>';
        table += '</th>';
        table += '      <th' + (options.widths && options.widths[1] ? ' style="width: ' + options.widths[1] + '"' : '') + '>Inst.</th>';
        table += '      <th' + (options.widths && options.widths[2] ? ' style="width: ' + options.widths[2] + '"' : '') + '></th>';
        table += '  </tr>';
        table += '</thead>';
        table += '<tbody>';
        // <tr data-tt-id="system.adapter.0" data-tt-branch='true'>
        var rows = [];
        var rootEx = options.root ? new RegExp('^' + options.root.replace(/\./g, '\\.') + '\\.') : null;
        var instances = [];
        for (var id in options.objects) {
            if (!options.objects.hasOwnProperty(id)) continue;
            var m;
            if (options.objects[id].type === 'instance' &&
                (m = id.match(/^system\.adapter\.javascript\.(\d+)$/))) {
                instances.push(m[1]);
            }

            if (rootEx && !rootEx.test(id)) continue;

            if (options.objects[id].type === 'channel') {
                rows.push({
                    parent: null,
                    id: id
                });
            } else {
                var instance = options.objects[id].common ? options.objects[id].common.engine.split('.').pop() : 0;
                rows.push({
                    parent: null,
                    id: id,
                    instance: instance
                })
            }
        }
        // find parents
        for (var pp = 0; pp < rows.length; pp++) {
            // find parent:
            var parts = rows[pp].id.split('.');
            var title = parts.pop();
            var parent = parts.join('.');
            rows[pp].title = title;
            for (var p = 0; p < rows.length; p++) {
                if (rows[p].id === parent) {
                    rows[pp].parent = parent;
                    rows[p].children = rows[p].children || [];
                    rows[p].children.push(p);
                    break;
                }
            }
        }
        // sort
        rows.sort(function (a, b) {
            if (a.id > b.id) return 1;
            if (a.id < b.id) return -1;
            return 0;
        });
        var instSelect = '';

        for (var i = 0; i < rows.length; i++) {
            // title
            table += '<tr data-tt-id="' + rows[i].id + '"' + (!!rows[i].children ? ' data-tt-branch="true"' : '') + (rows[i].parent ? ' data-tt-parent-id="' + rows[i].parent + '"' : '') + '>';
            var titleStyle = '';
            if (rows[i].instance === undefined) {
                titleStyle = 'font-weight: bold;';
                if (rows[i].id === 'script.js.global') {
                    titleStyle += ' color: rgb(0, 128, 0);'
                } else {
                    titleStyle += ' color: rgb(0, 0, 128);'
                }
            }

            // edit instance
            table += '<td style="' + titleStyle + '">' + rows[i].title + '</td>';
            if (rows[i].instance !== undefined && instances.length > 1) {
                instSelect = '<select>';
                for (var ii = 0; ii < instances.length; ii++) {
                    instSelect += '<option value="' + instances[ii] + '" ' + (instances[ii] === rows[i].instance ? 'selected' : '') + '>' + instances[ii] + '</option>';
                }
                instSelect += '</select>';

                table += '<td>' + instSelect + '</td>';
            } else {
                table += '<td>' + (rows[i].instance === undefined ? '' : rows[i].instance) + '</td>';
            }
            table += '<td>';

            // add buttons
            if (options.buttons) {
                var text = '';
                for (var jj = 0; jj < options.buttons.length; jj++) {
                    text += '<button data-id="' + rows[i].id + '" class="select-button-' + jj + ' select-button-custom td-button"  style="margin-right: 3px;"></button>';
                }

                table += text;
            }

            table += '</td>';
            table += '</tr>';
        }

        var $dlg = $(this);
        var $table = $(table);
        $dlg.html($table);
        $table.data('data', options);
        options.rows = rows;
        $table.treetable({
            expandable:         true,
            clickableNodeNames: true,
            onNodeExpand:       nodeExpand,
            onNodeCollapse:     nodeCollapse,
            stringCollapse:     _('collapse'),
            stringExpand:       _('expand')
        });
        var $tbody = $table.find('tbody');
        $tbody.on('mousedown', 'tr', function() {
            $('.selected').not(this).removeClass('selected');
            $(this).addClass('selected');
            var $table = $(this).parent().parent();
            var options = $table.data('data');
            var id = $(this).data('tt-id');
            options.onChange && options.onChange($(this).data('tt-id'), options.oldId);
            options.oldId = id;
        });

        for (var b = 0; b < options.buttons.length; b++) {
            var $btn = $tbody.find('.select-button-' + b).button(options.buttons[b]).click(function () {
                var cb = $(this).data('callback');
                if (cb) cb.call ($(this), $(this).data('id'));
            }).data ('callback', options.buttons[b].click).attr('title', options.buttons[b].title || '');

            if ($btn.length === 0) continue;
            if (options.buttons[b].width) $btn.css({width: options.buttons[b].width});
            if (options.buttons[b].height) $btn.css({height: options.buttons[b].height});
            if (options.buttons[b].match) $btn.each(function () {
                options.buttons[b].match.call($(this), $(this).data('id'));
            });
        }
        if (options.panelButtons) {
            for (var zz = 0; zz < options.panelButtons.length; zz++) {
                $table.find('.btn-custom-' + zz)
                    .button(options.panelButtons[zz])
                    .click(options.panelButtons[zz].click)
                    .attr('title', options.panelButtons[zz].title || '').css({width: 24, height: 24});
            }
        }

        $table.find('.filter_name').change(function () {
            var timer = $(this).data('timer');
            if (timer) {
                clearTimeout(timer);
            }
            var $this = $(this);
            $this.data('timer', setTimeout(function () {
                $this.data('timer', null);
                var val = $table.find('.filter_name').val();
                if (val) {
                    $this.addClass('input-not-empty');
                } else {
                    $this.removeClass('input-not-empty');
                }
                filter($($table[1]), $table.find('.filter_name').val());
            }));
        }).keyup(function () {
            $(this).trigger('change');
        });
        $table.find('.filter-clear').button({icons: {primary: 'ui-icon-close'}, text: false}).click(function () {
            var name = $(this).data('id');
            $table.find('.' + name).val('').trigger('change');
        });
    }

    function reInit() {
        var $table = $(this).find('.tree-table-main');
        // remember selected
        var id = $table.find('.selected').data('tt-id');
        var expanded = $table.find('.expanded');
        var exIDs = [];
        expanded.each(function (el) {
            exIDs.push($(this).data('tt-id'));
        });
        var nameFilter = $table.find('.filter_name').val();
        var options = $table.data('data');
        buildTable.call(this, options);
        $table = $(this).find('.tree-table-main');
        for (var e = 0; e < exIDs.length; e++) {
			try {
				$table.treetable('expandNode', exIDs[e]);
			} catch (e) {
			}
        }
        if (id) {
            var node = $table.treetable('node', id);
            node && $table.treetable('reveal', id);
            node && node.addClass('selected');
        }
        if (nameFilter) $table.find('.filter_name').val(nameFilter).trigger('change');
    }

    var methods = {
        init: function (options) {
            for (var i = 0; i < this.length; i++) {
                buildTable.call(this[i], options);

                if (typeof Storage !== 'undefined') {
                    var exIDs = window.localStorage.getItem(options.name + '-treetable');
                    if (exIDs) {
                        exIDs = JSON.parse(exIDs);
                        var $table = $(this[i]).find('.tree-table-main');
                        for (var e = 0; e < exIDs.length; e++) {
							try {
								$table.treetable('expandNode', exIDs[e]);
							} catch (e) {
							}
                        }
                    }
                }
            }
            return this;
        },
        show: function (currentId, filter, onSuccess) {
            if (typeof filter === 'function') {
                onSuccess = filter;
                filter = undefined;
            }
            if (typeof currentId === 'function') {
                onSuccess = currentId;
                currentId = undefined;
            }
            for (var i = 0; i < this.length; i++) {
                var $table = $(this[i]).find('.tree-table-main');
                var data = $table.data('data');
                $table.find('.selected').removeClass('selected');
				try {
					$table.treetable('reveal', currentId);
				} catch (e) {
				}
                var node = $table.treetable('node', currentId);
                node && node.row.addClass('selected');
            }
            onSuccess && onSuccess();
            return this;
        },
        reinit: function () {
            for (var i = 0; i < this.length; i++) {
                reInit.call(this[i]);
            }
            return this;
        },
        'object': function (id, obj) {
            for (var i = 0; i < this.length; i++) {
                var $table = $(this[i]).find('.tree-table-main');
                if ($table.updateTimer) {
                    clearTimeout($table.updateTimer);
                }
                var options = $table.data('data');
                if (options.root && !id.match('^' + options.root.replace(/\./g, '\\.') + '\\.')) continue;

                var elem = this[i];
				// do not update too often. de-bounce it
                (function (_elem, _$table) {
                    _$table.updateTimer = setTimeout(function () {
                        reInit.call(_elem);
                    }, 300);
                })(elem, $table);
            }
            return this;
        }
    };

    $.fn.treeTable = function (method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method "' +  method + '" not found in jQuery.treeTable');
        }
    };
})(jQuery);