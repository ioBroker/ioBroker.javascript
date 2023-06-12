'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.FieldScript');

    goog.require('Blockly.Field');
    goog.require('Blockly.Msg');
    goog.require('goog.asserts');
    goog.require('goog.dom');
    goog.require('goog.userAgent');
}

Blockly.b64EncodeUnicode = function(text) {
    return btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, function(match, p) {
        return String.fromCharCode(parseInt(p, 16));
    }));
};

// Decoding base64 ⇢ UTF8
Blockly.b64DecodeUnicode = function(text) {
    try {
        return decodeURIComponent(Array.prototype.map.call(atob(text), function(s) {
            return '%' + ('00' + s.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    } catch (e) {
        // old style
        return atob(text || '');
    }
};

class FieldScript extends Blockly.Field {
    constructor(value, type) {
        super(value);

        this.FONTSIZE = 11;
        this.CURSOR = 'pointer';
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
        var that   = this;
        var base64 = that.getValue();
        var args = null;
        var isReturn = false;

        if (this.sourceBlock_ && this.sourceBlock_.arguments_) {
            args = this.sourceBlock_.arguments_;
        }
        if (this.sourceBlock_.getProcedureDef) {
            var options = this.sourceBlock_.getProcedureDef();
            isReturn = options[2];
        }

        window.main.showScriptDialog(Blockly.b64DecodeUnicode(base64 || ''), args, isReturn, function (newScript) {
            newScript !== undefined && newScript !== null && that.setValue(Blockly.b64EncodeUnicode(newScript));
        });
    }

    /**
     * Draws the border with the correct width.
     * Saves the computed width in a property.
     * @private
     */
    render_() {
        // the implementation is taken from field.js => Blockly.Field.prototype.updateSize_
        var constants = this.getConstants();
        var xOffset = this.borderRect_ ? this.getConstants().FIELD_BORDER_RECT_X_PADDING : 0;
        var totalWidth = xOffset * 2 + 12;
        var totalHeight = constants.FIELD_TEXT_HEIGHT;

        if (this.borderRect_) {
            totalHeight = Math.max(totalHeight, constants.FIELD_BORDER_RECT_HEIGHT);
        }

        this.size_.height = totalHeight;
        this.size_.width = totalWidth;

        this.positionTextElement_(xOffset, 12);
        this.positionBorderRect_();
        this.textElement_.textContent = '...';
    }

    /**
     * Update the text node of this field to display the current text.
     * @private
     */
    updateTextNode_() {
        var width = (Blockly.BlockSvg.SEP_SPACE_X || 5) * 3;
        if (!this.textElement_) {
            // Not rendered yet.
            return;
        }
        // Empty the text element.
        goog.dom.removeChildren(/** @type {!Element} */ (this.textElement_));

        var textNode = document.createTextNode('...');
        this.textElement_.appendChild(textNode);

        // Cached width is obsolete.  Clear it.
        this.size_.width = width;
    }

    /**
     * Close the editor, save the results, and dispose of the editable
     * text field's elements.
     * @return {!Function} Closure to call on destruction of the WidgetDiv.
     * @private
     */
    /*widgetDispose_() {
        var thisField = this;
        return function() {
            var htmlInput = Blockly.FieldScript.htmlInput_;

            // Save the edit (if it validates).
            var text = htmlInput.value;
            thisField.setValue(text);
            thisField.sourceBlock_.rendered && thisField.sourceBlock_.render();
            Blockly.unbindEvent_(htmlInput.onKeyDownWrapper_);
            Blockly.unbindEvent_(htmlInput.onKeyUpWrapper_);
            Blockly.unbindEvent_(htmlInput.onKeyPressWrapper_);

            thisField.workspace_.removeChangeListener(
                htmlInput.onWorkspaceChangeWrapper_);

            Blockly.FieldScript.htmlInput_ = null;

            // Delete style properties.
            var style = Blockly.WidgetDiv.DIV.style;
            style.width = 'auto';
            style.height = 'auto';
            style.fontSize = '';
        };
    }*/
}

Blockly.FieldScript = FieldScript;

// Blockly.fieldRegistry.register('field_script', FieldScript);
