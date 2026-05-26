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
        this.maxDisplayLength = 200;

        // Live value display (only meaningful for state IDs)
        this._showValue = false; // whether the value is shown inline next to the ID
        this._stateValueText = null; // last formatted value, used by tooltip + inline display
        this._valueBadge = null; // clickable "=" badge element
        this._hoverHandler = null; // mouseenter prefetch handler
    }

    dispose() {
        Blockly.WidgetDiv.hideIfOwner(this);
        if (this.fieldGroup_ && this._hoverHandler) {
            this.fieldGroup_.removeEventListener('mouseenter', this._hoverHandler);
            this._hoverHandler = null;
        }
        if (this._valueBadge) {
            this._valueBadge.remove();
            this._valueBadge = null;
        }
        super.dispose();
    }

    initView() {
        super.initView();
        const id = this.getValue();
        if (id) {
            this.updateIcon_(id);
        }
        // Prefetch the value when the pointer enters the field, so the tooltip
        // (shown by Blockly after a short delay) already contains a fresh value.
        if (this._type === 'state' && this.fieldGroup_ && !this._hoverHandler) {
            this._hoverHandler = () => this._fetchStateValue();
            this.fieldGroup_.addEventListener('mouseenter', this._hoverHandler);
        }
        this._ensureValueBadge();
    }

    static _resolveObjectName(id) {
        const objects = window.main.objects;
        if (!objects || !objects[id] || !objects[id].common || !objects[id].common.name) {
            return null;
        }
        let name = objects[id].common.name;
        if (typeof name === 'object') {
            name = name[systemLang] || name.en;
        }
        return name || null;
    }

    static computeDisplayText(id, maxLen) {
        const mode = FieldOID.displayMode;
        const objects = window.main.objects;
        let text;

        switch (mode) {
            case 1: { // Path: all parent names joined with "."
                const parts = id.split('.');
                const names = [];
                for (let i = 0; i < parts.length; i++) {
                    const ancestorId = parts.slice(0, i + 1).join('.');
                    const name = FieldOID._resolveObjectName(ancestorId);
                    names.push(name || parts[i]);
                }
                text = names.join('.');
                break;
            }
            case 2: // State ID: last segment only
                text = id.split('.').pop() || id;
                break;
            case 3: // Full ID
                text = id;
                break;
            default: { // Mode 0: Name (current behavior)
                text = FieldOID._resolveObjectName(id) || id;
                break;
            }
        }

        // Append type suffix for non-state objects
        if (objects && objects[id]?.type && !['state', 'meta', 'script'].includes(objects[id].type)) {
            text += ` (${objects[id].type})`;
        }

        if (maxLen && text.length > maxLen) {
            text = text.substring(0, maxLen - 2) + '\u2026';
        }

        // Replace whitespace with non-breaking spaces so the text doesn't collapse.
        text = text.replace(/\s/g, Blockly.Field.NBSP);

        return text || Blockly.Field.NBSP;
    }

    refreshDisplay() {
        const id = this.getValue();
        if (id) {
            this._idName = FieldOID.computeDisplayText(id, this.maxDisplayLength);
            this.updateIcon_(id);
            this.forceRerender();
            // For path mode, async-fetch parent objects to resolve names
            if (FieldOID.displayMode === 1) {
                this._resolvePathNamesAsync(id);
            }
        }
    }

    _resolvePathNamesAsync(id) {
        if (typeof window.main.getObject !== 'function') return;
        const objects = window.main.objects;
        const parts = id.split('.');
        let pending = 0;
        let updated = false;
        for (let i = 0; i < parts.length; i++) {
            const ancestorId = parts.slice(0, i + 1).join('.');
            if (objects[ancestorId]) continue; // already cached
            pending++;
            window.main.getObject(ancestorId, (err, obj) => {
                if (obj) {
                    objects[obj._id] = objects[obj._id] || obj;
                    updated = true;
                }
                pending--;
                if (pending === 0 && updated) {
                    this._idName = FieldOID.computeDisplayText(id, this.maxDisplayLength);
                    this.forceRerender();
                }
            });
        }
    }

    _getIconOffset() {
        return (FieldOID.showIcon && this._iconElement) ? 20 : 0;
    }

    // Override Blockly's size + position to account for icon
    updateSize_(margin) {
        const constants = this.getConstants();
        const xPad = margin !== undefined ? margin :
            (this.isFullBlockField() ? 0 : constants.FIELD_BORDER_RECT_X_PADDING);
        const iconOffset = this._getIconOffset();
        const badgeOffset = this._getBadgeOffset();

        let textWidth = 0;
        if (this.textElement_) {
            textWidth = this.textElement_.getComputedTextLength();
        }

        let totalWidth = 2 * xPad + textWidth + iconOffset + badgeOffset;
        let totalHeight = constants.FIELD_TEXT_HEIGHT;
        if (!this.isFullBlockField()) {
            totalHeight = Math.max(totalHeight, constants.FIELD_BORDER_RECT_HEIGHT);
        }

        this.size_.height = totalHeight;
        this.size_.width = totalWidth;

        this.positionTextElement_(xPad + iconOffset, textWidth);
        this.positionBorderRect_();
        this._positionValueBadge(totalWidth, xPad, totalHeight);
    }

    updateIcon_(id) {
        if (!this.fieldGroup_) {
            return;
        }
        if (!FieldOID.showIcon) {
            if (this._iconElement) {
                this._iconElement.remove();
                this._iconElement = null;
                this._iconUrl = null;
            }
            return;
        }
        // First try synchronous resolve with cached objects
        const iconUrl = FieldOID.resolveIcon(id);
        if (iconUrl) {
            this._applyIcon(iconUrl);
        }
        // Then async-fetch parent objects to find a closer (more specific) icon
        this._resolveIconAsync(id);
    }

    _applyIcon(iconUrl) {
        if (!this.fieldGroup_) return;
        if (this._iconUrl === iconUrl && this._iconElement) {
            return;
        }
        this._iconUrl = iconUrl;
        const iconSize = 16;
        if (!this._iconElement) {
            this._iconElement = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            this._iconElement.setAttribute('width', String(iconSize));
            this._iconElement.setAttribute('height', String(iconSize));
            if (this.textElement_) {
                this.fieldGroup_.insertBefore(this._iconElement, this.textElement_);
            } else {
                this.fieldGroup_.appendChild(this._iconElement);
            }
        }
        this._iconElement.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', iconUrl);
        this._positionIcon();
    }

    _positionIcon() {
        if (!this._iconElement || !this.textElement_) return;
        const iconSize = 16;
        try {
            // Position icon at the start of the field content area
            const constants = this.getConstants();
            const xPad = this.borderRect_ ? constants.FIELD_BORDER_RECT_X_PADDING : 0;
            this._iconElement.setAttribute('x', String(xPad + 2));

            // Vertically center icon with text
            const textBBox = this.textElement_.getBBox();
            if (textBBox.height > 0) {
                const textMidY = textBBox.y + textBBox.height / 2;
                this._iconElement.setAttribute('y', String(textMidY - iconSize / 2));
            }
        } catch (e) {
            // getBBox can fail if element is not in DOM yet
        }
    }

    _resolveIconAsync(id) {
        if (!FieldOID.showIcon || typeof window.main.getObject !== 'function') {
            return;
        }
        const objects = window.main.objects;
        const parts = id.split('.');
        const adapterName = parts[0];
        // Fetch ancestors from state level up to adapter instance level
        // Start from the state itself, go up - first icon found wins
        let remaining = parts.length;
        const tryNext = (idx) => {
            if (idx < 1) return;
            const ancestorId = parts.slice(0, idx).join('.');
            // Already in cache?
            if (objects[ancestorId]) {
                if (objects[ancestorId].common && objects[ancestorId].common.icon) {
                    this._applyIcon(FieldOID._buildIconUrl(objects[ancestorId].common.icon, adapterName));
                    return; // Found closest icon, stop
                }
                tryNext(idx - 1); // No icon here, try parent
                return;
            }
            // Fetch this ancestor
            window.main.getObject(ancestorId, (err, obj) => {
                if (obj) {
                    objects[obj._id] = objects[obj._id] || obj;
                    if (obj.common && obj.common.icon) {
                        this._applyIcon(FieldOID._buildIconUrl(obj.common.icon, adapterName));
                        return; // Found closest icon, stop
                    }
                }
                tryNext(idx - 1); // Try parent
            });
        };
        tryNext(remaining);
    }

    // ---- Live state value: tooltip (always) + clickable inline badge ----

    /** Format a state value for display: value + unit, truncated, with a "not acked" marker. */
    static _formatStateValue(id, state) {
        if (!state || state.val === undefined || state.val === null) {
            return 'null';
        }
        let v = state.val;
        if (typeof v === 'object') {
            try {
                v = JSON.stringify(v);
            } catch (e) {
                v = String(v);
            }
        } else {
            v = String(v);
        }
        if (v.length > 60) {
            v = v.substring(0, 60) + '…';
        }
        const objects = window.main && window.main.objects;
        const common = objects && objects[id] && objects[id].common;
        if (common && common.unit) {
            v += ' ' + common.unit;
        }
        if (state.ack === false) {
            v += ' (?)'; // value not acknowledged
        }
        return v;
    }

    /** Fetch the current value from the backend and remember it for tooltip/inline display. */
    _fetchStateValue(cb) {
        const id = this.getValue();
        if (!id || !window.main || typeof window.main.getState !== 'function') {
            cb && cb();
            return;
        }
        window.main.getState(id, (err, state) => {
            this._stateValueText = state ? FieldOID._formatStateValue(id, state) : null;
            cb && cb();
        });
    }

    /** Tooltip text: object name + ID + (for states) the current value. */
    _composeTooltip() {
        const id = this.getValue();
        if (!id) {
            return '';
        }
        const name = FieldOID._resolveObjectName(id);
        let txt = name ? name + '\n' + id : id;
        if (this._type === 'state' && this._stateValueText) {
            txt += '\n= ' + this._stateValueText;
        }
        return txt;
    }

    _getBadgeOffset() {
        return this._valueBadge ? 18 : 0;
    }

    /** Create the clickable "=" badge for state fields (once, lazily). */
    _ensureValueBadge() {
        if (this._type !== 'state' || this._valueBadge || !this.fieldGroup_ || !this.getValue()) {
            return;
        }
        const badge = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        badge.setAttribute('class', 'blocklyText');
        badge.setAttribute('text-anchor', 'middle');
        badge.style.fill = '#2196f3';
        badge.style.fontWeight = 'bold';
        badge.style.cursor = 'pointer';
        badge.textContent = '=';
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = 'Show/hide current value';
        badge.appendChild(title);
        // Don't let a click on the badge open the ID-selector dialog or start a drag.
        const stop = e => e.stopPropagation();
        badge.addEventListener('pointerdown', stop);
        badge.addEventListener('mousedown', stop);
        badge.addEventListener('click', e => {
            e.stopPropagation();
            this._toggleValue();
        });
        this._valueBadge = badge;
        this.fieldGroup_.appendChild(badge);
        if (this.sourceBlock_ && this.sourceBlock_.rendered) {
            this.forceRerender();
        }
    }

    /** Position the badge at the right edge of the field. */
    _positionValueBadge(totalWidth, xPad, totalHeight) {
        if (!this._valueBadge) {
            return;
        }
        this._valueBadge.setAttribute('x', String(totalWidth - xPad - 9));
        this._valueBadge.setAttribute('y', String(totalHeight / 2 + 4));
    }

    /** Toggle inline value display (the "button press" behaviour). */
    _toggleValue() {
        this._showValue = !this._showValue;
        if (this._valueBadge) {
            this._valueBadge.textContent = this._showValue ? '×' : '=';
        }
        if (this._showValue) {
            this._stateValueText = this._stateValueText || '…';
            this.forceRerender();
            this._fetchStateValue(() => this.forceRerender());
        } else {
            this.forceRerender();
        }
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
                    const text = FieldOID.computeDisplayText(id, this.maxDisplayLength);
                    if (text) {
                        this._idName = text;
                        this.forceRerender();
                    }
                    // Resolve parent names for path mode
                    if (FieldOID.displayMode === 1) {
                        this._resolvePathNamesAsync(id);
                    }
                }
            });
        } else {
            this._idName = FieldOID.computeDisplayText(id, this.maxDisplayLength);
            // Resolve parent names for path mode
            if (FieldOID.displayMode === 1) {
                this._resolvePathNamesAsync(id);
            }
        }

        this.updateIcon_(id);
        super.setValue(id);
        // Tooltip is a function so it always reflects the latest fetched value.
        super.setTooltip(() => this._composeTooltip());
        this._ensureValueBadge();
    }

    getDisplayText_() {
        let text = this._idName || this.text_;
        if (this._showValue && this._stateValueText) {
            text = (text || '') + '  =  ' + this._stateValueText;
        }
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
        const div = Blockly.WidgetDiv.getDiv();
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
        if (goog.userAgent.GECKO && Blockly.WidgetDiv.getDiv().style.top) {
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
            const style = Blockly.WidgetDiv.getDiv().style;
            style.width = 'auto';
            style.height = 'auto';
            style.fontSize = '';
        };
    }
}

FieldOID.DISPLAY_MODE_KEYS = ['oid_display_name', 'oid_display_path', 'oid_display_id', 'oid_display_full_id'];
FieldOID.displayMode = parseInt(localStorage.getItem('Blockly.FieldOID.displayMode') || '0', 10) || 0;
FieldOID.showIcon = localStorage.getItem('Blockly.FieldOID.showIcon') === 'true';

FieldOID._buildIconUrl = function (icon, adapterName) {
    if (!icon) return null;
    // base64 data URIs and absolute URLs are used as-is
    if (icon.startsWith('data:') || icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('/')) {
        return icon;
    }
    return '/adapter/' + adapterName + '/' + icon;
};

FieldOID.resolveIcon = function (id) {
    const objects = window.main.objects;
    if (!objects) return null;
    const parts = id.split('.');
    const adapterName = parts[0];
    // Walk up the object hierarchy looking for common.icon
    for (let i = parts.length; i >= 1; i--) {
        const ancestorId = parts.slice(0, i).join('.');
        const obj = objects[ancestorId];
        if (obj && obj.common && obj.common.icon) {
            return FieldOID._buildIconUrl(obj.common.icon, adapterName);
        }
    }
    // Fallback: check system.adapter.{adapterName}.{instance} (e.g. system.adapter.zigbee2mqtt.0)
    if (parts.length >= 2) {
        const instanceId = 'system.adapter.' + parts[0] + '.' + parts[1];
        const sysInstance = objects[instanceId];
        if (sysInstance && sysInstance.common && sysInstance.common.icon) {
            return FieldOID._buildIconUrl(sysInstance.common.icon, adapterName);
        }
    }
    return null;
};

FieldOID.setDisplayMode = function (mode, workspace) {
    FieldOID.displayMode = mode;
    localStorage.setItem('Blockly.FieldOID.displayMode', String(mode));

    const blocks = workspace.getAllBlocks(false);
    for (const block of blocks) {
        for (const input of block.inputList) {
            for (const field of input.fieldRow) {
                if (field instanceof FieldOID) {
                    field.refreshDisplay();
                }
            }
        }
    }
};

FieldOID.setShowIcon = function (show, workspace) {
    FieldOID.showIcon = show;
    localStorage.setItem('Blockly.FieldOID.showIcon', String(show));

    const blocks = workspace.getAllBlocks(false);
    for (const block of blocks) {
        for (const input of block.inputList) {
            for (const field of input.fieldRow) {
                if (field instanceof FieldOID) {
                    field.refreshDisplay();
                }
            }
        }
    }
};

Blockly.FieldOID = FieldOID;

//Blockly.Field.register('field_oid', FieldOID);
