'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.FieldCRON');

    goog.require('Blockly.Field');
    goog.require('Blockly.Msg');
    goog.require('goog.asserts');
    goog.require('goog.dom');
    goog.require('goog.userAgent');
}

class FieldCRON extends Blockly.Field {
    constructor(value, type) {
        super(value);

        this.FONTSIZE = 11;
        this.CURSOR = 'pointer';
        this.SERIALIZABLE = true;
        this.spellcheck_ = false;
    }

    dispose() {
        Blockly.WidgetDiv.hideIfOwner(this);
        super.dispose();
    }

    /**
     * Set the text in this field.
     * @param {?string} text New text.
     * @override
     */
    setValue(text) {
        if (text === null) {
            return;  // No change if null.
        }

        super.setValue(text);
    }

    /**
     * Show the inline free-text editor on top of the text.
     * @param {boolean=} opt_quietInput True if editor should be created without
     *     focus.  Defaults to false.
     * @private
     */
    showEditor_(opt_quietInput) {
        this.workspace_ = this.sourceBlock_.workspace;
        window.main.cronDialog(this.getValue(), (newId) => {
            if (newId !== undefined && newId !== null) this.setValue(newId);
        });
    }

    /**
     * Handle a change to the editor.
     * @param {!Event} e Keyboard event.
     * @private
     */
    onHtmlInputChange_(e) {
        const htmlInput = this.htmlInput_;
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

    /**
     * Check to see if the contents of the editor validates.
     * Style the editor accordingly.
     * @private
     */
    validate_() {
        goog.asserts.assertObject(Blockly.FieldCRON.htmlInput_);

        const htmlInput = Blockly.FieldCRON.htmlInput_;

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
        const thisField = this;
        return function() {
            const htmlInput = Blockly.FieldCRON.htmlInput_;
            // Save the edit (if it validates).
            const text = htmlInput.value;
            thisField.setValue(text);
            thisField.sourceBlock_.rendered && thisField.sourceBlock_.render();
            Blockly.unbindEvent_(htmlInput.onKeyDownWrapper_);
            Blockly.unbindEvent_(htmlInput.onKeyUpWrapper_);
            Blockly.unbindEvent_(htmlInput.onKeyPressWrapper_);

            thisField.workspace_.removeChangeListener(
                htmlInput.onWorkspaceChangeWrapper_);

            Blockly.FieldCRON.htmlInput_ = null;

            // Delete style properties.
            const style = Blockly.WidgetDiv.DIV.style;
            style.width = 'auto';
            style.height = 'auto';
            style.fontSize = '';
        };
    }
}

Blockly.FieldCRON = FieldCRON;

Blockly.Field.register('field_cron', FieldCRON);
