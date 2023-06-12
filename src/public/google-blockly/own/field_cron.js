/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2012 Google Inc.
 * https://developers.google.com/blockly/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Text input field.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.FieldCRON');

    goog.require('Blockly.Field');
    goog.require('Blockly.Msg');
    goog.require('goog.asserts');
    goog.require('goog.dom');
    goog.require('goog.userAgent');
}

/**
 * Class for an editable text field.
 * @param {string} text The initial content of the field.
 * @param {Function=} opt_validator An optional function that is called
 *     to validate any constraints on what the user entered.  Takes the new
 *     text as an argument and returns either the accepted text, a replacement
 *     text, or null to abort the change.
 * @extends {Blockly.Field}
 * @constructor
 */
Blockly.FieldCRON = function(text) {
    Blockly.FieldCRON.superClass_.constructor.call(this, text);
};
if (typeof goog !== 'undefined') {
    goog.inherits(Blockly.FieldCRON, Blockly.Field);
} else {
    Blockly.utils.object.inherits(Blockly.FieldCRON, Blockly.Field);
}

/**
 * Point size of text.  Should match blocklyText's font-size in CSS.
 */
Blockly.FieldCRON.FONTSIZE = 11;

/**
 * Mouse cursor style when over the hotspot that initiates the editor.
 */
Blockly.FieldCRON.prototype.CURSOR = 'pointer';

/**
 * Allow browser to spellcheck this field.
 * @private
 */
Blockly.FieldCRON.prototype.spellcheck_ = false;

/**
 * Close the input widget if this input is being deleted.
 */
Blockly.FieldCRON.prototype.dispose = function() {
    Blockly.WidgetDiv.hideIfOwner(this);
    Blockly.FieldCRON.superClass_.dispose.call(this);
};

/**
 * Set the text in this field.
 * @param {?string} text New text.
 * @override
 */
Blockly.FieldCRON.prototype.setValue = function(text) {
    if (text === null) {
        return;  // No change if null.
    }
    
    Blockly.Field.prototype.setValue.call(this, text);
};

/**
 * Show the inline free-text editor on top of the text.
 * @param {boolean=} opt_quietInput True if editor should be created without
 *     focus.  Defaults to false.
 * @private
 */
Blockly.FieldCRON.prototype.showEditor_ = function(opt_quietInput) {
    this.workspace_ = this.sourceBlock_.workspace;
    var that = this;
    main.cronDialog(that.getValue(), function (newId) {
        if (newId !== undefined && newId !== null) that.setValue(newId);
    });
};

/**
 * Handle a change to the editor.
 * @param {!Event} e Keyboard event.
 * @private
 */
Blockly.FieldCRON.prototype.onHtmlInputChange_ = function(e) {
    var htmlInput = Blockly.FieldCRON.htmlInput_;
    // Update source block.
    var text = htmlInput.value;
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
};

/**
 * Check to see if the contents of the editor validates.
 * Style the editor accordingly.
 * @private
 */
Blockly.FieldCRON.prototype.validate_ = function() {
    goog.asserts.assertObject(Blockly.FieldCRON.htmlInput_);

    var htmlInput = Blockly.FieldCRON.htmlInput_;

    if (htmlInput.value) {
        Blockly.addClass_(htmlInput, 'blocklyInvalidInput');
    } else {
        Blockly.removeClass_(htmlInput, 'blocklyInvalidInput');
    }
};

/**
 * Resize the editor and the underlying block to fit the text.
 * @private
 */
Blockly.FieldCRON.prototype.resizeEditor_ = function() {
    var div = Blockly.WidgetDiv.DIV;
    var bBox = this.fieldGroup_.getBBox();
    div.style.width = bBox.width * this.workspace_.scale + 'px';
    div.style.height = bBox.height * this.workspace_.scale + 'px';
    var xy = this.getAbsoluteXY_();
    // In RTL mode block fields and LTR input fields the left edge moves,
    // whereas the right edge is fixed.  Reposition the editor.
    if (this.sourceBlock_.RTL) {
        var borderBBox = this.getScaledBBox_();
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
};

/**
 * Close the editor, save the results, and dispose of the editable
 * text field's elements.
 * @return {!Function} Closure to call on destruction of the WidgetDiv.
 * @private
 */
Blockly.FieldCRON.prototype.widgetDispose_ = function() {
    var thisField = this;
    return function() {
        var htmlInput = Blockly.FieldCRON.htmlInput_;
        // Save the edit (if it validates).
        var text = htmlInput.value;
        thisField.setValue(text);
        thisField.sourceBlock_.rendered && thisField.sourceBlock_.render();
        Blockly.unbindEvent_(htmlInput.onKeyDownWrapper_);
        Blockly.unbindEvent_(htmlInput.onKeyUpWrapper_);
        Blockly.unbindEvent_(htmlInput.onKeyPressWrapper_);

        thisField.workspace_.removeChangeListener(
            htmlInput.onWorkspaceChangeWrapper_);

        Blockly.FieldCRON.htmlInput_ = null;

        // Delete style properties.
        var style = Blockly.WidgetDiv.DIV.style;
        style.width = 'auto';
        style.height = 'auto';
        style.fontSize = '';
    };
};
