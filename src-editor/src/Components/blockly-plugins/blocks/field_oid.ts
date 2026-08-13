/**
 * The object-ID field - converted from `public/google-blockly/own/field_oid.js`.
 *
 * The class stays on `window.Blockly` because `blocks_trigger.js`, `blocks_system.js` and others
 * instantiate it as `new Blockly.FieldOID(...)`, and `BlocklyEditor.tsx` reads its static display
 * settings.
 *
 * Unlike the other two fields, most of this file is live, modern code - the icons, the value badge
 * and the display modes. Only the same four Blockly 1.x editor methods were dropped instead of
 * converted (`onHtmlInputChange_`, `validate_`, `resizeEditor_`, `widgetDispose_`); nothing has
 * called them for many major versions and every symbol they use was removed from Blockly long ago.
 *
 * One more removal: `getDisplayText_()` fell back to `this.text_`, which Blockly 13 no longer has,
 * so that fallback could only ever yield `undefined`.
 */
import { Field, WidgetDiv, type Block } from 'blockly/core';

/** The editor's object cache holds arbitrary ioBroker objects, so it is read loosely here */
type CachedObjects = Record<string, any>;

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';
const ICON_SIZE = 16;

export class FieldOID extends Field<string> {
    static DISPLAY_MODE_KEYS = ['oid_display_name', 'oid_display_path', 'oid_display_id', 'oid_display_full_id'];
    static displayMode = parseInt(localStorage.getItem('Blockly.FieldOID.displayMode') || '0', 10) || 0;
    static showIcon = localStorage.getItem('Blockly.FieldOID.showIcon') === 'true';

    FONTSIZE: number;
    CURSOR: string;
    SERIALIZABLE: boolean;
    spellcheck_: boolean;
    maxDisplayLength: number;

    private readonly _type: string | undefined;
    private _idName: string | null = null;
    private _iconElement: SVGImageElement | null = null;
    private _iconUrl: string | null = null;
    /** whether the value is shown inline next to the ID */
    private _showValue = false;
    /** last formatted value, used by tooltip + inline display */
    private _stateValueText: string | null = null;
    /** clickable "=" badge element */
    private _valueBadge: SVGTextElement | null = null;
    /** mouseenter prefetch handler */
    private _hoverHandler: (() => void) | null = null;
    /** set on dispose() so late async callbacks are dropped */
    private _disposed = false;

    constructor(value: string, type?: string) {
        super(value);

        this._type = type;

        this.FONTSIZE = 11;
        this.CURSOR = 'pointer';
        this.SERIALIZABLE = true;
        this.spellcheck_ = false;
        this.maxDisplayLength = 200;
    }

    override dispose(): void {
        this._disposed = true;
        WidgetDiv.hideIfOwner(this);
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

    override initView(): void {
        super.initView();
        const id = this.getValue();
        if (id) {
            this.updateIcon_(id);
        }
        // Prefetch the value when the pointer enters the field, so the tooltip
        // (shown by Blockly after a short delay) already contains a fresh value.
        if (this.fieldGroup_ && !this._hoverHandler) {
            this._hoverHandler = (): void => this._fetchStateValue();
            this.fieldGroup_.addEventListener('mouseenter', this._hoverHandler);
        }
        this._ensureValueBadge();
    }

    private static _objects(): CachedObjects {
        return window.main?.objects as CachedObjects;
    }

    private static _resolveObjectName(id: string): string | null {
        const objects = FieldOID._objects();
        if (!objects?.[id]?.common?.name) {
            return null;
        }
        let name = objects[id].common.name;
        if (typeof name === 'object') {
            name = name[window.systemLang] || name.en;
        }
        return name || null;
    }

    static computeDisplayText(id: string, maxLen?: number): string {
        const mode = FieldOID.displayMode;
        const objects = FieldOID._objects();
        let text: string;

        switch (mode) {
            case 1: {
                // Path: all parent names joined with "."
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
            default: {
                // Mode 0: Name (current behavior)
                text = FieldOID._resolveObjectName(id) || id;
                break;
            }
        }

        // Append type suffix for non-state objects
        if (objects?.[id]?.type && !['state', 'meta', 'script'].includes(objects[id].type)) {
            text += ` (${objects[id].type})`;
        }

        if (maxLen && text.length > maxLen) {
            text = `${text.substring(0, maxLen - 2)}…`;
        }

        // Replace whitespace with non-breaking spaces so the text doesn't collapse.
        text = text.replace(/\s/g, Field.NBSP);

        return text || Field.NBSP;
    }

    refreshDisplay(): void {
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

    private _resolvePathNamesAsync(id: string): void {
        if (typeof window.main?.getObject !== 'function') {
            return;
        }
        const objects = FieldOID._objects();
        const parts = id.split('.');
        let pending = 0;
        let updated = false;
        for (let i = 0; i < parts.length; i++) {
            const ancestorId = parts.slice(0, i + 1).join('.');
            if (objects[ancestorId]) {
                continue; // already cached
            }
            pending++;
            window.main.getObject(ancestorId, (_err, obj) => {
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

    private _getIconOffset(): number {
        return FieldOID.showIcon && this._iconElement ? 20 : 0;
    }

    /** Override Blockly's size + position to account for icon */
    protected override updateSize_(margin?: number): void {
        const constants = this.getConstants();
        if (!constants) {
            return;
        }

        const xPad = margin !== undefined ? margin : this.isFullBlockField() ? 0 : constants.FIELD_BORDER_RECT_X_PADDING;
        const iconOffset = this._getIconOffset();
        const badgeOffset = this._getBadgeOffset();

        let textWidth = 0;
        if (this.textElement_) {
            textWidth = this.textElement_.getComputedTextLength();
        }

        const totalWidth = 2 * xPad + textWidth + iconOffset + badgeOffset;
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

    private updateIcon_(id: string): void {
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

    private _applyIcon(iconUrl: string | null): void {
        if (!this.fieldGroup_ || !iconUrl) {
            return;
        }
        if (this._iconUrl === iconUrl && this._iconElement) {
            return;
        }
        this._iconUrl = iconUrl;
        if (!this._iconElement) {
            this._iconElement = document.createElementNS(SVG_NS, 'image');
            this._iconElement.setAttribute('width', String(ICON_SIZE));
            this._iconElement.setAttribute('height', String(ICON_SIZE));
            if (this.textElement_) {
                this.fieldGroup_.insertBefore(this._iconElement, this.textElement_);
            } else {
                this.fieldGroup_.appendChild(this._iconElement);
            }
        }
        this._iconElement.setAttributeNS(XLINK_NS, 'xlink:href', iconUrl);
        this._positionIcon();
    }

    private _positionIcon(): void {
        if (!this._iconElement || !this.textElement_) {
            return;
        }
        try {
            // Position icon at the start of the field content area
            const constants = this.getConstants();
            const xPad = this.borderRect_ && constants ? constants.FIELD_BORDER_RECT_X_PADDING : 0;
            this._iconElement.setAttribute('x', String(xPad + 2));

            // Vertically center icon with text
            const textBBox = this.textElement_.getBBox();
            if (textBBox.height > 0) {
                const textMidY = textBBox.y + textBBox.height / 2;
                this._iconElement.setAttribute('y', String(textMidY - ICON_SIZE / 2));
            }
        } catch {
            // getBBox can fail if element is not in DOM yet
        }
    }

    private _resolveIconAsync(id: string): void {
        if (!FieldOID.showIcon || typeof window.main?.getObject !== 'function') {
            return;
        }
        const objects = FieldOID._objects();
        const parts = id.split('.');
        const adapterName = parts[0];
        // Fetch ancestors from state level up to adapter instance level
        // Start from the state itself, go up - first icon found wins
        const tryNext = (idx: number): void => {
            if (idx < 1) {
                return;
            }
            const ancestorId = parts.slice(0, idx).join('.');
            // Already in cache?
            if (objects[ancestorId]) {
                if (objects[ancestorId].common?.icon) {
                    this._applyIcon(FieldOID._buildIconUrl(objects[ancestorId].common.icon, adapterName));
                    return; // Found closest icon, stop
                }
                tryNext(idx - 1); // No icon here, try parent
                return;
            }
            // Fetch this ancestor
            window.main.getObject(ancestorId, (_err, obj) => {
                const found = obj as CachedObjects[string];
                if (found) {
                    objects[found._id] = objects[found._id] || found;
                    if (found.common?.icon) {
                        this._applyIcon(FieldOID._buildIconUrl(found.common.icon, adapterName));
                        return; // Found closest icon, stop
                    }
                }
                tryNext(idx - 1); // Try parent
            });
        };
        tryNext(parts.length);
    }

    // ---- Live state value: tooltip (always) + clickable inline badge ----

    /** Format a state value for display: value + unit, truncated, with a "not acked" marker. */
    private static _formatStateValue(id: string, state: ioBroker.State | null | undefined): string {
        if (state?.val === undefined || state?.val === null) {
            return 'null';
        }
        let v: string;
        if (typeof state.val === 'object') {
            try {
                v = JSON.stringify(state.val);
            } catch {
                v = String(state.val);
            }
        } else {
            v = String(state.val);
        }
        if (v.length > 60) {
            v = `${v.substring(0, 60)}…`;
        }
        const common = FieldOID._objects()?.[id]?.common;
        if (common?.unit) {
            v += ` ${common.unit}`;
        }
        if (state.ack === false) {
            v += ' (?)'; // value not acknowledged
        }
        return v;
    }

    /** Fetch the current value from the backend and remember it for tooltip/inline display. */
    private _fetchStateValue(cb?: () => void): void {
        const id = this.getValue();
        if (!id || typeof window.main?.getState !== 'function') {
            cb?.();
            return;
        }
        window.main.getState(id, (_err, state) => {
            if (this._disposed) {
                return;
            }
            this._stateValueText = state ? FieldOID._formatStateValue(id, state) : null;
            cb?.();
        });
    }

    /** Tooltip text: object name + ID + (for states) the current value. */
    private _composeTooltip(): string {
        const id = this.getValue();
        if (!id) {
            return '';
        }
        const name = FieldOID._resolveObjectName(id);
        let txt = name ? `${name}\n${id}` : id;
        if (this._stateValueText) {
            txt += `\n= ${this._stateValueText}`;
        }
        return txt;
    }

    private _getBadgeOffset(): number {
        return this._valueBadge ? 18 : 0;
    }

    /** Create the clickable "=" badge for state fields (once, lazily). */
    private _ensureValueBadge(): void {
        if (this._type !== 'state' || this._valueBadge || !this.fieldGroup_ || !this.getValue()) {
            return;
        }
        const badge = document.createElementNS(SVG_NS, 'text');
        badge.setAttribute('class', 'blocklyText');
        badge.setAttribute('text-anchor', 'middle');
        badge.style.fill = '#2196f3';
        badge.style.fontWeight = 'bold';
        badge.style.cursor = 'pointer';
        badge.textContent = '=';
        const title = document.createElementNS(SVG_NS, 'title');
        title.textContent = 'Show/hide current value';
        badge.appendChild(title);
        // Don't let a click on the badge open the ID-selector dialog or start a drag.
        const stop = (e: Event): void => e.stopPropagation();
        badge.addEventListener('pointerdown', stop);
        badge.addEventListener('mousedown', stop);
        badge.addEventListener('click', e => {
            e.stopPropagation();
            this._toggleValue();
        });
        this._valueBadge = badge;
        this.fieldGroup_.appendChild(badge);
        if ((this.getSourceBlock() as Block & { rendered?: boolean })?.rendered) {
            this.forceRerender();
        }
    }

    /** Position the badge at the right edge of the field. */
    private _positionValueBadge(totalWidth: number, xPad: number, totalHeight: number): void {
        if (!this._valueBadge) {
            return;
        }
        this._valueBadge.setAttribute('x', String(totalWidth - xPad - 9));
        this._valueBadge.setAttribute('y', String(totalHeight / 2 + 4));
    }

    /** Toggle inline value display (the "button press" behaviour). */
    private _toggleValue(): void {
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

    override setValue(id: string | null): void {
        if (id === null) {
            return; // No change if null.
        }

        const objects = FieldOID._objects();

        if (objects && !objects[id] && typeof window.main?.getObject === 'function') {
            this._idName = id || Field.NBSP;
            window.main.getObject(id, (_err, obj) => {
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

    protected override getDisplayText_(): string {
        let text = this._idName;
        if (this._showValue && this._stateValueText) {
            text = `${text || ''}  =  ${this._stateValueText}`;
        }
        if (!text) {
            // Prevent the field from disappearing if empty.
            return Field.NBSP;
        }
        if (text.length > this.maxDisplayLength) {
            // Truncate displayed string and add an ellipsis ('...').
            text = `${text.substring(0, this.maxDisplayLength - 2)}…`;
        }
        // Replace whitespace with non-breaking spaces so the text doesn't collapse.
        text = text.replace(/\s/g, Field.NBSP);
        if (this.getSourceBlock()?.RTL) {
            // The SVG is LTR, force text to be RTL.
            text += '‏';
        }
        return text;
    }

    protected override showEditor_(): void {
        window.main?.selectIdDialog?.(this.getValue(), this._type as 'state' | 'all', newId => {
            if (newId !== null) {
                this.setValue(newId);
            }
        });
    }

    private static _buildIconUrl(icon: string, adapterName: string): string | null {
        if (!icon) {
            return null;
        }
        // base64 data URIs and absolute URLs are used as-is
        if (icon.startsWith('data:') || icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('/')) {
            return icon;
        }
        return `/adapter/${adapterName}/${icon}`;
    }

    static resolveIcon(id: string): string | null {
        const objects = FieldOID._objects();
        if (!objects) {
            return null;
        }
        const parts = id.split('.');
        const adapterName = parts[0];
        // Walk up the object hierarchy looking for common.icon
        for (let i = parts.length; i >= 1; i--) {
            const ancestorId = parts.slice(0, i).join('.');
            const obj = objects[ancestorId];
            if (obj?.common?.icon) {
                return FieldOID._buildIconUrl(obj.common.icon, adapterName);
            }
        }
        // Fallback: check system.adapter.{adapterName}.{instance} (e.g. system.adapter.zigbee2mqtt.0)
        if (parts.length >= 2) {
            const sysInstance = objects[`system.adapter.${parts[0]}.${parts[1]}`];
            if (sysInstance?.common?.icon) {
                return FieldOID._buildIconUrl(sysInstance.common.icon, adapterName);
            }
        }
        return null;
    }

    /** Refreshes every OID field of the workspace after a display setting changed */
    private static _refreshAll(workspace: { getAllBlocks: (ordered: boolean) => Block[] }): void {
        for (const block of workspace.getAllBlocks(false)) {
            for (const input of block.inputList) {
                for (const field of input.fieldRow) {
                    if (field instanceof FieldOID) {
                        field.refreshDisplay();
                    }
                }
            }
        }
    }

    static setDisplayMode(mode: number, workspace: { getAllBlocks: (ordered: boolean) => Block[] }): void {
        FieldOID.displayMode = mode;
        localStorage.setItem('Blockly.FieldOID.displayMode', String(mode));

        FieldOID._refreshAll(workspace);
    }

    static setShowIcon(show: boolean, workspace: { getAllBlocks: (ordered: boolean) => Block[] }): void {
        FieldOID.showIcon = show;
        localStorage.setItem('Blockly.FieldOID.showIcon', String(show));

        FieldOID._refreshAll(workspace);
    }
}

export function install(): void {
    window.Blockly.FieldOID = FieldOID;
}
