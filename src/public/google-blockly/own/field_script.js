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
    goog.provide('Blockly.FieldScript');

    goog.require('Blockly.Field');
    goog.require('Blockly.Msg');
    goog.require('goog.asserts');
    goog.require('goog.dom');
    goog.require('goog.userAgent');
}

Blockly.b64EncodeUnicode = function(text) {
    return btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, function(match, p) {
        return String.fromCharCode(parseInt(p, 16))
    }));
};

// Decoding base64 ⇢ UTF8
Blockly.b64DecodeUnicode = function(text) {
    try {
        return decodeURIComponent(Array.prototype.map.call(atob(text), function(s) {
            return '%' + ('00' + s.charCodeAt(0).toString(16)).slice(-2)
        }).join(''));
    } catch (e) {
        // old style
        return atob(text || '');
    }
};

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
Blockly.FieldScript = function(text) {
    Blockly.FieldScript.superClass_.constructor.call(this, text);
};
if (typeof goog !== 'undefined') {
    goog.inherits(Blockly.FieldScript, Blockly.Field);
} else {
    Blockly.utils.object.inherits(Blockly.FieldScript, Blockly.Field);
}
/**
 * Point size of text.  Should match blocklyText's font-size in CSS.
 */
Blockly.FieldScript.FONTSIZE = 11;

/**
 * Mouse cursor style when over the hotspot that initiates the editor.
 */
Blockly.FieldScript.prototype.CURSOR = 'pointer';

/**
 * Allow browser to spellcheck this field.
 * @private
 */
Blockly.FieldScript.prototype.spellcheck_ = false;

/**
 * Close the input widget if this input is being deleted.
 */
Blockly.FieldScript.prototype.dispose = function() {
    Blockly.WidgetDiv.hideIfOwner(this);
    Blockly.FieldScript.superClass_.dispose.call(this);
};

/**
 * Set the text in this field.
 * @param {?string} text New text.
 * @override
 */
Blockly.FieldScript.prototype.setValue = function (text) {
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
Blockly.FieldScript.prototype.showEditor_ = function(opt_quietInput) {
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
};

/**
 * Draws the border with the correct width.
 * Saves the computed width in a property.
 * @private
 */
Blockly.FieldScript.prototype.render_ = function() {
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
};

/**
 * Update the text node of this field to display the current text.
 * @private
 */
Blockly.FieldScript.prototype.updateTextNode_ = function() {
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
};

/**
 * Close the editor, save the results, and dispose of the editable
 * text field's elements.
 * @return {!Function} Closure to call on destruction of the WidgetDiv.
 * @private
 */
/*Blockly.FieldScript.prototype.widgetDispose_ = function() {
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
};*/
