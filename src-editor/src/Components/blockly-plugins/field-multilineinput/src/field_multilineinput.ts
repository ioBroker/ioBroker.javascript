/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Multiline text input field.
 */

import type { WorkspaceSvg } from 'blockly/core/workspace_svg';
import type { BlockSvg } from 'blockly/core/block_svg';
import type { FieldTextInputConfig, FieldTextInputValidator } from 'blockly/core/field_textinput';
import type { Rect } from 'blockly/core/utils/rect';

const Blockly = (window as any).Blockly;

export class UnattachedFieldError extends Error {
    /** @internal */
    constructor() {
        super(`The field has not yet been attached to its input. Call appendField to attach it.`);
    }
}

/**
 * Class for an editable text area input field.
 */
export class FieldMultilineInput extends Blockly.Field {
    /**
     * The SVG group element that will contain a text element for each text row
     *     when initialized.
     */
    textGroup: SVGGElement | null = null;

    protected borderRect_: SVGRectElement | null = null;

    /**
     * Defines the maximum number of lines of field.
     * If exceeded, scrolling functionality is enabled.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    protected maxLines_ = Infinity;

    /** Whether Y overflow is currently occurring. */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    protected isOverflowedY_ = false;

    /**
     * @param value The initial content of the field.  Should cast to a string.
     *     Defaults to an empty string if null or undefined.  Also accepts
     *     Field.SKIP_SETUP if you wish to skip setup (only used by subclasses
     *     that want to handle configuration and setting the field value after
     *     their own constructors have run).
     * @param validator An optional function that is called to validate any
     *     constraints on what the user entered.  Takes the new text as an
     *     argument and returns either the accepted text, a replacement text, or
     *     null to abort the change.
     * @param config A map of options used to configure the field.
     *     See the [field creation documentation]{@link
     * https://developers.google.com/blockly/guides/create-custom-blocks/fields/built-in-fields/multiline-text-input#creation}
     * for a list of properties this parameter supports.
     */
    constructor(value?: string | symbol, validator?: FieldMultilineInputValidator, config?: FieldMultilineInputConfig) {
        super(value);

        if (value === Symbol('SKIP_SETUP')) {
            return;
        }
        if (config) {
            this.configure_(config);
        }

        this.SERIALIZABLE = true;

        this.setValue(value?.toString() || '');
        if (validator) {
            this.setValidator(validator);
        }
    }

    /**
     * Configure the field based on the given map of options.
     *
     * @param config A map of options to configure the field based on.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    protected configure_(config: FieldMultilineInputConfig): void {
        super.configure_(config);
        if (config.maxLines) {
            this.setMaxLines(config.maxLines);
        }
    }

    /**
     * Serializes this field's value to XML.
     * Should only be called by Blockly.Xml.
     *
     * @param fieldElement The element to populate with info about the field's
     *     state.
     * @returns The element containing info about the field's state.
     */
    toXml(fieldElement: Element): Element {
        // Replace '\n' characters with HTML-escaped equivalent '&#10'.  This is
        // needed so the plain-text representation of the XML produced by
        // `Blockly.Xml.domToText` will appear on a single line (this is a
        // limitation of the plain-text format).
        fieldElement.textContent = (this.getValue() as string).replace(/\n/g, '&#10;');
        return fieldElement;
    }

    /**
     * Sets the field's value based on the given XML element.  Should only be
     * called by Blockly.Xml.
     *
     * @param fieldElement The element containing info about the field's state.
     */
    fromXml(fieldElement: Element): void {
        this.setValue((fieldElement.textContent as string).replace(/&#10;/g, '\n'));
    }

    /**
     * Saves this field's value.
     * This function only exists for subclasses of FieldMultilineInput which
     * predate the load/saveState API and only define to/fromXml.
     *
     * @returns The state of this field.
     */
    saveState(): string {
        const legacyState = this.saveLegacyState(FieldMultilineInput);
        if (legacyState !== null) {
            return legacyState;
        }
        return this.getValue();
    }

    /**
     * Sets the field's value based on the given state.
     * This function only exists for subclasses of FieldMultilineInput which
     * predate the load/saveState API and only define to/fromXml.
     *
     * @param state The state of the variable to assign to this variable field.
     */
    loadState(state: unknown): void {
        if (this.loadLegacyState(Blockly.Field, state)) {
            return;
        }
        this.setValue(state);
    }

    /**
     * Create the block UI for this field.
     */
    initView(): void {
        this.createBorderRect_();
        this.textGroup = Blockly.utils.dom.createSvgElement(
            Blockly.utils.Svg.G,
            {
                class: 'blocklyEditableText',
            },
            this.fieldGroup_,
        );
    }

    /**
     * Handle key down to the editor.
     *
     * @param e Keyboard event.
     */
    protected onHtmlInputKeyDownSuper_(e: KeyboardEvent): void {
        if (e.key === 'Enter') {
            Blockly.WidgetDiv.hideIfOwner(this);
            Blockly.dropDownDiv.hideWithoutAnimation();
        } else if (e.key === 'Escape') {
            this.setValue(this.htmlInput_!.getAttribute('data-untyped-default-value'), false);
            Blockly.WidgetDiv.hideIfOwner(this);
            Blockly.dropDownDiv.hideWithoutAnimation();
        } else if (e.key === 'Tab') {
            Blockly.WidgetDiv.hideIfOwner(this);
            Blockly.dropDownDiv.hideWithoutAnimation();
            // @ts-expect-error
            (this.sourceBlock_ as BlockSvg).tab(this, !e.shiftKey);
            e.preventDefault();
        }
    }
    /**
     * Handle a change to the editor.
     *
     * @param _e Keyboard event.
     */
    private onHtmlInputChange_(_e: Event): void {
        // Intermediate value changes from user input are not confirmed until the
        // user closes the editor, and may be numerous. Inhibit reporting these as
        // normal block change events, and instead report them as special
        // intermediate changes that do not get recorded in undo history.
        const oldValue = this.value_;
        // Change the field's value without firing the normal change event.
        this.setValue(this.getValueFromEditorText_(this.htmlInput_!.value), /* fireChangeEvent= */ false);
        if (this.sourceBlock_ && Blockly.Events.isEnabled() && this.value_ !== oldValue) {
            // Fire a special event indicating that the value changed but the change
            // isn't complete yet and normal field change listeners can wait.
            Blockly.Events.fire(
                new (Blockly.Events.get(
                    'block_field_intermediate_change' /* EventType.BLOCK_FIELD_INTERMEDIATE_CHANGE */,
                ))(this.sourceBlock_, this.name || null, oldValue, this.value_),
            );
        }
    }

    /**
     * A callback triggered when the user is done editing the field via the UI.
     *
     * @param _value The new value of the field.
     */
    // eslint-disable-next-line class-methods-use-this
    onFinishEditing_(_value: any): void {}

    // eslint-disable-next-line class-methods-use-this
    protected getValueFromEditorText_(text: string): any {
        return text;
    }

    /**
     * Bind handlers for user input on the text input field's editor.
     *
     * @param htmlInput The htmlInput to which event handlers will be bound.
     */
    protected bindInputEvents_(htmlInput: HTMLElement): void {
        // Trap Enter without IME and Esc to hide.
        this.onKeyDownWrapper_ = Blockly.browserEvents.conditionalBind(
            htmlInput,
            'keydown',
            this,
            this.onHtmlInputKeyDown_,
        );
        // Resize after every input change.
        this.onKeyInputWrapper_ = Blockly.browserEvents.conditionalBind(
            htmlInput,
            'input',
            this,
            this.onHtmlInputChange_,
        );
    }

    /**
     * Get the text from this field as displayed on screen.  May differ from
     * getText due to ellipsis, and other formatting.
     *
     * @returns Currently displayed text.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    protected getDisplayText_(): string {
        const block = this.getSourceBlock();
        if (!block) {
            throw new Error(`The field has not yet been attached to its input. Call appendField to attach it.`);
        }
        let textLines = this.getText();
        if (!textLines) {
            // Prevent the field from disappearing if empty.
            return Blockly.Field.NBSP;
        }
        const lines = textLines.split('\n');
        textLines = '';
        const displayLinesNumber = this.isOverflowedY_ ? this.maxLines_ : lines.length;
        for (let i = 0; i < displayLinesNumber; i++) {
            let text: string = lines[i] || '';
            if (text.length > this.maxDisplayLength) {
                // Truncate displayed string and add an ellipsis ('...').
                text = `${text.substring(0, this.maxDisplayLength - 4)}...`;
            } else if (this.isOverflowedY_ && i === displayLinesNumber - 1) {
                text = `${text.substring(0, text.length - 3)}...`;
            }
            // Replace whitespace with non-breaking spaces so the text doesn't
            // collapse.
            text = text.replace(/\s/g, Blockly.Field.NBSP);

            textLines += text;
            if (i !== displayLinesNumber - 1) {
                textLines += '\n';
            }
        }
        if (block.RTL) {
            // The SVG is LTR, force value to be RTL.
            textLines += '\u200F';
        }
        return textLines;
    }

    /**
     * Called by setValue if the text input is valid.  Updates the value of the
     * field, and updates the text of the field if it is not currently being
     * edited (i.e. handled by the htmlInput_).  Is being redefined here to update
     * overflow state of the field.
     *
     * @param newValue The value to be saved.  The default validator guarantees
     *     that this is a string.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    protected doValueUpdate_(newValue: string): void {
        super.doValueUpdate_(newValue);
        if (this.value_ !== null) {
            this.isOverflowedY_ = this.value_.split('\n').length > this.maxLines_;
        }
    }

    /** Updates the text of the textElement. */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    protected render_(): void {
        const block = this.getSourceBlock();
        if (!block) {
            throw new Error(`The field has not yet been attached to its input. Call appendField to attach it.`);
        }
        // Remove all text group children.
        let currentChild;
        const textGroup = this.textGroup as SVGElement;
        while ((currentChild = textGroup.firstChild)) {
            textGroup.removeChild(currentChild);
        }

        const constants = this.getConstants();
        // This can't happen, but TypeScript thinks it can and lint forbids `!.`.
        if (!constants) {
            throw Error('Constants not found');
        }
        // Add in text elements into the group.
        const lines = this.getDisplayText_().split('\n');
        let y = 0;
        for (let i = 0; i < lines.length; i++) {
            const lineHeight = constants.FIELD_TEXT_HEIGHT + constants.FIELD_BORDER_RECT_Y_PADDING;
            const span = Blockly.utils.dom.createSvgElement(
                Blockly.utils.Svg.TEXT,
                {
                    class: 'blocklyText blocklyMultilineText',
                    x: constants.FIELD_BORDER_RECT_X_PADDING,
                    y: y + constants.FIELD_BORDER_RECT_Y_PADDING,
                    dy: constants.FIELD_TEXT_BASELINE,
                },
                textGroup,
            );
            span.appendChild(document.createTextNode(lines[i]));
            y += lineHeight;
        }

        if (this.isBeingEdited_) {
            const htmlInput = this.htmlInput_ as HTMLElement;
            if (this.isOverflowedY_) {
                Blockly.utils.dom.addClass(htmlInput, 'blocklyHtmlTextAreaInputOverflowedY');
            } else {
                Blockly.utils.dom.removeClass(htmlInput, 'blocklyHtmlTextAreaInputOverflowedY');
            }
        }

        this.updateSize_();

        if (this.isBeingEdited_) {
            if (block.RTL) {
                // in RTL, we need to let the browser reflow before resizing
                // in order to get the correct bounding box of the borderRect
                // avoiding issue #2777.
                setTimeout(this.resizeEditor_.bind(this), 0);
            } else {
                this.resizeEditor_();
            }
            const htmlInput = this.htmlInput_ as HTMLElement;
            if (!this.isTextValid_) {
                Blockly.utils.dom.addClass(htmlInput, 'blocklyInvalidInput');
                Blockly.utils.aria.setState(htmlInput, Blockly.utils.aria.State.INVALID, true);
            } else {
                Blockly.utils.dom.removeClass(htmlInput, 'blocklyInvalidInput');
                Blockly.utils.aria.setState(htmlInput, Blockly.utils.aria.State.INVALID, false);
            }
        }
    }

    /** Updates the size of the field based on the text. */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    protected updateSize_(): void {
        const constants = this.getConstants();
        // This can't happen, but TypeScript thinks it can and lint forbids `!.`.
        if (!constants) {
            throw Error('Constants not found');
        }
        const nodes = (this.textGroup as SVGElement).childNodes;
        const fontSize = constants.FIELD_TEXT_FONTSIZE;
        const fontWeight = constants.FIELD_TEXT_FONTWEIGHT;
        const fontFamily = constants.FIELD_TEXT_FONTFAMILY;
        let totalWidth = 0;
        let totalHeight = 0;
        for (let i = 0; i < nodes.length; i++) {
            const tspan = nodes[i] as SVGTextElement;
            const textWidth = Blockly.utils.dom.getFastTextWidth(tspan, fontSize, fontWeight, fontFamily);
            if (textWidth > totalWidth) {
                totalWidth = textWidth;
            }
            totalHeight += constants.FIELD_TEXT_HEIGHT + (i > 0 ? constants.FIELD_BORDER_RECT_Y_PADDING : 0);
        }
        if (this.isBeingEdited_) {
            // The default width is based on the longest line in the display text,
            // but when it's being edited, width should be calculated based on the
            // absolute longest line, even if it would be truncated after editing.
            // Otherwise we would get wrong editor width when there are more
            // lines than this.maxLines_.
            const actualEditorLines = String(this.value_).split('\n');
            const dummyTextElement = Blockly.utils.dom.createSvgElement(Blockly.utils.Svg.TEXT, {
                class: 'blocklyText blocklyMultilineText',
            });

            for (let i = 0; i < actualEditorLines.length; i++) {
                if (actualEditorLines[i].length > this.maxDisplayLength) {
                    actualEditorLines[i] = actualEditorLines[i].substring(0, this.maxDisplayLength);
                }
                dummyTextElement.textContent = actualEditorLines[i];
                const lineWidth = Blockly.utils.dom.getFastTextWidth(
                    dummyTextElement,
                    fontSize,
                    fontWeight,
                    fontFamily,
                );
                if (lineWidth > totalWidth) {
                    totalWidth = lineWidth;
                }
            }

            const htmlInput = this.htmlInput_ as HTMLElement;
            const scrollbarWidth = htmlInput.offsetWidth - htmlInput.clientWidth;
            totalWidth += scrollbarWidth;
        }
        if (this.borderRect_) {
            totalHeight += constants.FIELD_BORDER_RECT_Y_PADDING * 2;
            // NOTE: Adding 1 extra px to prevent wrapping. Based on browser zoom,
            // the rounding of the calculated value can result in the line wrapping
            // unintentionally.
            totalWidth += constants.FIELD_BORDER_RECT_X_PADDING * 2 + 1;
            this.borderRect_.setAttribute('width', `${totalWidth}`);
            this.borderRect_.setAttribute('height', `${totalHeight}`);
        }
        this.size_.width = totalWidth;
        this.size_.height = totalHeight;

        this.positionBorderRect_();
    }

    private showInlineEditor_(quietInput: boolean): void {
        const block = this.getSourceBlock();
        if (!block) {
            throw new UnattachedFieldError();
        }
        Blockly.WidgetDiv.show(this, block.RTL, this.widgetDispose_.bind(this), this.workspace_);
        this.htmlInput_ = this.widgetCreate_();
        this.isBeingEdited_ = true;
        this.valueWhenEditorWasOpened_ = this.value_;

        if (!quietInput) {
            (this.htmlInput_ as HTMLElement).focus({
                preventScroll: true,
            });
            this.htmlInput_.select();
        }
    }

    protected getEditorText_(value: any): string {
        return `${value}`;
    }

    /**
     * Returns the bounding box of the rendered field, accounting for workspace
     * scaling.
     *
     * @returns An object with top, bottom, left, and right in pixels relative to
     *     the top left corner of the page (window coordinates).
     * @internal
     */
    getScaledBBox(): Rect {
        let scaledWidth;
        let scaledHeight;
        let xy;
        const block = this.getSourceBlock();
        if (!block) {
            throw new UnattachedFieldError();
        }

        if (this.isFullBlockField()) {
            // Browsers are inconsistent in what they return for a bounding box.
            // - Webkit / Blink: fill-box / object bounding box
            // - Gecko: stroke-box
            const bBox = (this.sourceBlock_ as BlockSvg).getHeightWidth();
            const scale = (block.workspace as WorkspaceSvg).scale;
            xy = this.getAbsoluteXY_();
            scaledWidth = (bBox.width + 1) * scale;
            scaledHeight = (bBox.height + 1) * scale;

            if (Blockly.utils.userAgent.GECKO) {
                xy.x += 1.5 * scale;
                xy.y += 1.5 * scale;
            } else {
                xy.x -= 0.5 * scale;
                xy.y -= 0.5 * scale;
            }
        } else {
            const bBox = this.borderRect_!.getBoundingClientRect();
            xy = Blockly.utils.style.getPageOffset(this.borderRect_!);
            scaledWidth = bBox.width;
            scaledHeight = bBox.height;
        }
        return new Blockly.utils.Rect(xy.y, xy.y + scaledHeight, xy.x, xy.x + scaledWidth);
    }

    /** Resize the editor to fit the text. */
    protected resizeEditor_(): void {
        Blockly.renderManagement.finishQueuedRenders().then(() => {
            const block = this.getSourceBlock();
            if (!block) {
                throw new UnattachedFieldError();
            }
            const div = Blockly.WidgetDiv.getDiv();
            const bBox = this.getScaledBBox();
            div!.style.width = `${bBox.right - bBox.left}px`;
            div!.style.height = `${bBox.bottom - bBox.top}px`;

            // In RTL mode block fields and LTR input fields the left edge moves,
            // whereas the right edge is fixed.  Reposition the editor.
            const x = block.RTL ? bBox.right - div!.offsetWidth : bBox.left;
            const y = bBox.top;

            div!.style.left = `${x}px`;
            div!.style.top = `${y}px`;
        });
    }

    /** Unbind handlers for user input and workspace size changes. */
    protected unbindInputEvents_(): void {
        if (this.onKeyDownWrapper_) {
            Blockly.browserEvents.unbind(this.onKeyDownWrapper_);
            this.onKeyDownWrapper_ = null;
        }
        if (this.onKeyInputWrapper_) {
            Blockly.browserEvents.unbind(this.onKeyInputWrapper_);
            this.onKeyInputWrapper_ = null;
        }
    }

    /**
     * The element to bind the click handler to. If not set explicitly, defaults
     * to the SVG root of the field. When this element is
     * clicked on an editable field, the editor will open.
     *
     * @returns Element to bind click handler to.
     */
    protected getClickTarget_(): Element | null {
        return this.clickTarget_ || this.getSvgRoot();
    }

    /**
     * Closes the editor, saves the results, and disposes of any events or
     * DOM-references belonging to the editor.
     */
    protected widgetDispose_(): void {
        // Non-disposal related things that we do when the editor closes.
        this.isBeingEdited_ = false;
        this.isTextValid_ = true;
        // Make sure the field's node matches the field's internal value.
        this.forceRerender();
        this.onFinishEditing_(this.value_);

        if (
            this.sourceBlock_ &&
            Blockly.Events.isEnabled() &&
            this.valueWhenEditorWasOpened_ !== null &&
            this.valueWhenEditorWasOpened_ !== this.value_
        ) {
            // When closing a field input widget, fire an event indicating that the
            // user has completed a sequence of changes. The value may have changed
            // multiple times while the editor was open, but this will fire an event
            // containing the value when the editor was opened as well as the new one.
            Blockly.Events.fire(
                new (Blockly.Events.get('change' /* EventType.BLOCK_CHANGE */))(
                    this.sourceBlock_,
                    'field',
                    this.name || null,
                    this.valueWhenEditorWasOpened_,
                    this.value_,
                ),
            );
            this.valueWhenEditorWasOpened_ = null;
        }

        Blockly.Events.setGroup(false);

        // Actual disposal.
        this.unbindInputEvents_();
        const style = Blockly.WidgetDiv.getDiv()!.style;
        style.width = 'auto';
        style.height = 'auto';
        style.fontSize = '';
        style.transition = '';
        style.boxShadow = '';
        this.htmlInput_ = null;

        const clickTarget = this.getClickTarget_();
        if (!clickTarget) {
            throw new Error('A click target has not been set.');
        }
        Blockly.utils.dom.removeClass(clickTarget, 'editing');
    }

    /**
     * Show the inline free-text editor on top of the text.
     * Overrides the default behaviour to force rerender in order to
     * correct block size, based on editor text.
     *
     * @param e Optional mouse event that triggered the field to open, or
     *     undefined if triggered programmatically.
     * @param quietInput True if editor should be created without focus.
     *     Defaults to false.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    showEditor_(e?: Event, quietInput?: boolean): void {
        // super.showEditor_(e, quietInput);
        this.workspace_ = (this.sourceBlock_ as BlockSvg).workspace;
        if (
            !quietInput &&
            this.workspace_.options.modalInputs &&
            (Blockly.utils.userAgent.MOBILE || Blockly.utils.userAgent.ANDROID || Blockly.utils.userAgent.IPAD)
        ) {
            this.showPromptEditor_();
        } else {
            this.showInlineEditor_(!!quietInput);
        }
        this.forceRerender();
    }

    /**
     * Create the text input editor widget.
     *
     * @returns The newly created text input editor.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    protected widgetCreate_(): HTMLTextAreaElement {
        const div = Blockly.WidgetDiv.getDiv() as HTMLDivElement;
        const scale = (this.workspace_ as WorkspaceSvg).getScale();
        const constants = this.getConstants();
        // This can't happen, but TypeScript thinks it can and lint forbids `!.`.
        if (!constants) {
            throw Error('Constants not found');
        }

        const htmlInput = document.createElement('textarea');
        htmlInput.className = 'blocklyHtmlInput blocklyHtmlTextAreaInput';
        htmlInput.setAttribute('spellcheck', String(this.spellcheck_));
        const fontSize = `${constants.FIELD_TEXT_FONTSIZE * scale}pt`;
        div.style.fontSize = fontSize;
        htmlInput.style.fontSize = fontSize;
        const borderRadius = `${Blockly.FieldTextInput.BORDERRADIUS * scale}px`;
        htmlInput.style.borderRadius = borderRadius;
        const paddingX = constants.FIELD_BORDER_RECT_X_PADDING * scale;
        const paddingY = (constants.FIELD_BORDER_RECT_Y_PADDING * scale) / 2;
        htmlInput.style.padding = `${paddingY}px ${paddingX}px ${paddingY}px ${paddingX}px`;
        const lineHeight = constants.FIELD_TEXT_HEIGHT + constants.FIELD_BORDER_RECT_Y_PADDING;
        htmlInput.style.lineHeight = `${lineHeight * scale}px`;

        div.appendChild(htmlInput);

        htmlInput.value = htmlInput.defaultValue = this.getEditorText_(this.value_);
        htmlInput.setAttribute('data-untyped-default-value', String(this.value_));
        htmlInput.setAttribute('data-old-value', '');
        if (Blockly.utils.userAgent.GECKO) {
            // In FF, ensure the browser reflows before resizing to avoid issue #2777.
            setTimeout(this.resizeEditor_.bind(this), 0);
        } else {
            this.resizeEditor_();
        }

        this.bindInputEvents_(htmlInput);

        return htmlInput;
    }

    /**
     * Sets the maxLines config for this field.
     *
     * @param maxLines Defines the maximum number of lines allowed, before
     *     scrolling functionality is enabled.
     */
    setMaxLines(maxLines: number): void {
        if (typeof maxLines === 'number' && maxLines > 0 && maxLines !== this.maxLines_) {
            this.maxLines_ = maxLines;
            this.forceRerender();
        }
    }

    /**
     * Returns the maxLines config of this field.
     *
     * @returns The maxLines config value.
     */
    getMaxLines(): number {
        return this.maxLines_;
    }

    /**
     * Handle key down to the editor.  Override the text input definition of this
     * so as to not close the editor when enter is typed in.
     *
     * @param e Keyboard event.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    protected onHtmlInputKeyDown_(e: KeyboardEvent): void {
        if (e.key !== 'Enter') {
            this.onHtmlInputKeyDownSuper_(e);
        }
    }

    /**
     * Construct a FieldMultilineInput from a JSON arg object,
     * dereferencing any string table references.
     *
     * @param options A JSON object with options (text, and spellcheck).
     * @returns The new field instance.
     * @nocollapse
     */
    static fromJson(options: FieldMultilineInputFromJsonConfig): FieldMultilineInput {
        const text = Blockly.utils.parsing.replaceMessageReferences(options.text);
        // `this` might be a subclass of FieldMultilineInput if that class doesn't
        // the static fromJson method.
        return new this(text, undefined, options);
    }
}

/**
 * Register the field and any dependencies.
 */
export function registerFieldMultilineInput(): void {
    Blockly.fieldRegistry.register('field_multilinetext', FieldMultilineInput);
}

/**
 * CSS for multiline field.
 */
Blockly.Css.register(`
.blocklyHtmlTextAreaInput {
  font-family: monospace;
  resize: none;
  overflow: hidden;
  height: 100%;
  text-align: left;
}

.blocklyHtmlTextAreaInputOverflowedY {
  overflow-y: scroll;
}
`);

/**
 * Config options for the multiline input field.
 */
export interface FieldMultilineInputConfig extends FieldTextInputConfig {
    maxLines?: number;
}

/**
 * fromJson config options for the multiline input field.
 */
export interface FieldMultilineInputFromJsonConfig extends FieldMultilineInputConfig {
    text?: string;
}

/**
 * A function that is called to validate changes to the field's value before
 * they are set.
 *
 * @see {@link https://developers.google.com/blockly/guides/create-custom-blocks/fields/validators#return_values}
 * @param newValue The value to be validated.
 * @returns One of three instructions for setting the new value: `T`, `null`,
 * or `undefined`.
 *
 * - `T` to set this function's returned value instead of `newValue`.
 *
 * - `null` to invoke `doValueInvalid_` and not set a value.
 *
 * - `undefined` to set `newValue` as is.
 */
export type FieldMultilineInputValidator = FieldTextInputValidator;
