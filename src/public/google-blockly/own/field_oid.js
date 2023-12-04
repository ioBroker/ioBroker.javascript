'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.FieldOID');

    goog.require('Blockly.Field');
    goog.require('Blockly.Msg');
    goog.require('goog.asserts');
    goog.require('goog.dom');
    goog.require('goog.userAgent');
}

class FieldOID extends Blockly.Field {
    constructor(value, type) {
        super(value);

        this._type = type;

        this.FONTSIZE = 11;
        this.CURSOR = 'pointer';
        this.SERIALIZABLE = true;
        this.spellcheck_ = false;
    }

    dispose() {
        Blockly.WidgetDiv.hideIfOwner(this);
        super.dispose();
    }

    setValue(id) {
        if (id === null) {
            return;  // No change if null.
        }

        const objects = window.main.objects;

        if (objects && !objects[id] && typeof window.main.getObject === 'function') {
            this._idName = id || Blockly.Field.NBSP;
            window.main.getObject(id, (err, obj) => {
                if (obj) {
                    objects[obj._id] = objects[obj._id] || obj;
                    let text = objects[obj._id].common && objects[obj._id].common.name && objects[obj._id].common.name;
                    if (text) {
                        if (typeof text === 'object') {
                            text = text[systemLang] || text.en;
                        }
                        if (text.length > this.maxDisplayLength) {
                            // Truncate displayed string and add an ellipsis ('...').
                            text = text.substring(0, this.maxDisplayLength - 2) + '\u2026';
                        }
                        text.trim();
                        // Replace whitespace with non-breaking spaces so the text doesn't collapse.
                        text = text.replace(/\s/g, Blockly.Field.NBSP);

                        if (text) {
                            this._idName = text;
                            this.forceRerender();
                        }
                    }
                }
            });
        } else {
            let text = objects && objects[id] && objects[id].common && objects[id].common.name ? objects[id].common.name : id;
            if (typeof text === 'object') {
                text = text[systemLang] || text.en;
            }
            if (text.length > this.maxDisplayLength) {
                // Truncate the displayed string and add an ellipsis ('...').
                text = text.substring(0, this.maxDisplayLength - 2) + '\u2026';
            }
            // Replace whitespace with non-breaking spaces so the text doesn't collapse.
            text = text.replace(/\s/g, Blockly.Field.NBSP);

            if (!text) {
                // Prevent the field from disappearing if empty.
                text = Blockly.Field.NBSP;
            }
            this._idName = text;
        }

        super.setValue(id);
    }

    getDisplayText_() {
        let text = this._idName || this.text_;
        if (!text) {
            // Prevent the field from disappearing if empty.
            return Blockly.Field.NBSP;
        }
        if (text.length > this.maxDisplayLength) {
            // Truncate displayed string and add an ellipsis ('...').
            text = text.substring(0, this.maxDisplayLength - 2) + '\u2026';
        }
        // Replace whitespace with non-breaking spaces so the text doesn't collapse.
        text = text.replace(/\s/g, Blockly.Field.NBSP);
        if (this.sourceBlock_.RTL) {
            // The SVG is LTR, force text to be RTL.
            text += '\u200F';
        }
        return text;
    }

    showEditor_(opt_quietInput) {
        this.workspace_ = this.sourceBlock_.workspace;
        window.main && window.main.selectIdDialog && window.main.selectIdDialog(this.getValue(), this._type, (newId) => { newId !== null && this.setValue(newId); });
    }

    /**
     * Handle a change to the editor.
     * @param {!Event} e Keyboard event.
     * @private
     */
    onHtmlInputChange_(e) {
        const htmlInput = Blockly.FieldOID.htmlInput_;
        // Update source block.
        const text = htmlInput.value;
        if (text !== htmlInput.oldValue_) {
            htmlInput.oldValue_ = text;
            this.setValue(text);
            this.validate_();
        } else if (goog.userAgent.WEBKIT) {
            // Cursor key.  Render the source block to show the caret moving.
            // Chrome only (version 26, OS X).
            this.sourceBlock_.render();
        }

        this.resizeEditor_();
        Blockly.svgResize(this.sourceBlock_.workspace);
    }

    /*
    * Check to see if the contents of the editor validates.
    * Style the editor accordingly.
    * @private
    */
    validate_() {
        goog.asserts.assertObject(Blockly.FieldOID.htmlInput_);

        const htmlInput = Blockly.FieldOID.htmlInput_;

        if (htmlInput.value) {
            Blockly.addClass_(htmlInput, 'blocklyInvalidInput');
        } else {
            Blockly.removeClass_(htmlInput, 'blocklyInvalidInput');
        }
    }

    /**
     * Resize the editor and the underlying block to fit the text.
     * @private
     */
    resizeEditor_() {
        const div = Blockly.WidgetDiv.DIV;
        const bBox = this.fieldGroup_.getBBox();
        div.style.width = bBox.width * this.workspace_.scale + 'px';
        div.style.height = bBox.height * this.workspace_.scale + 'px';
        const xy = this.getAbsoluteXY_();
        // In RTL mode block fields and LTR input fields the left edge moves,
        // whereas the right edge is fixed.  Reposition the editor.
        if (this.sourceBlock_.RTL) {
            const borderBBox = this.getScaledBBox_();
            xy.x += borderBBox.width;
            xy.x -= div.offsetWidth;
        }
        // Shift by a few pixels to line up exactly.
        xy.y += 1;
        if (goog.userAgent.GECKO && Blockly.WidgetDiv.DIV.style.top) {
            // Firefox mis-reports the location of the border by a pixel
            // once the WidgetDiv is moved into position.
            xy.x -= 1;
            xy.y -= 1;
        }
        if (goog.userAgent.WEBKIT) {
            xy.y -= 3;
        }
        div.style.left = xy.x + 'px';
        div.style.top = xy.y + 'px';
    }

    /**
     * Close the editor, save the results, and dispose of the editable
     * text field's elements.
     * @return {!Function} Closure to call on destruction of the WidgetDiv.
     * @private
     */
    widgetDispose_() {
        return () => {
            const htmlInput = this.htmlInput_;
            // Save the edit (if it validates).
            const text = htmlInput.value;
            this.setValue(text);
            this.sourceBlock_.rendered && this.sourceBlock_.render();

            Blockly.unbindEvent_(htmlInput.onKeyDownWrapper_);
            Blockly.unbindEvent_(htmlInput.onKeyUpWrapper_);
            Blockly.unbindEvent_(htmlInput.onKeyPressWrapper_);

            this.workspace_.removeChangeListener(htmlInput.onWorkspaceChangeWrapper_);

            this.htmlInput_ = null;

            // Delete style properties.
            const style = Blockly.WidgetDiv.DIV.style;
            style.width = 'auto';
            style.height = 'auto';
            style.fontSize = '';
        };
    }
}

Blockly.FieldOID = FieldOID;

Blockly.Field.register('field_oid', FieldOID);
