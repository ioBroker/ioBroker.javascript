/**
 * The CRON field - converted from `public/google-blockly/own/field_cron.js`.
 *
 * The class stays on `window.Blockly` because `blocks_trigger.js` instantiates it as
 * `new Blockly.FieldCRON(...)`, and so may block files of other adapters.
 *
 * Four methods of the original were dropped rather than converted: `onHtmlInputChange_`,
 * `validate_`, `resizeEditor_` and `widgetDispose_`. They belong to the field editor API of
 * Blockly 1.x - nothing has called them for many major versions, and every symbol they use
 * (`goog.userAgent`, `goog.asserts`, `Blockly.addClass_`, `Blockly.unbindEvent_`,
 * `Blockly.FieldCRON.htmlInput_`) was removed from Blockly long ago. Keeping them would mean
 * carrying code that cannot compile and could only ever throw.
 */
import { Field, WidgetDiv } from 'blockly/core';

export class FieldCRON extends Field<string> {
    FONTSIZE: number;
    CURSOR: string;
    SERIALIZABLE: boolean;
    spellcheck_: boolean;

    constructor(value: string) {
        super(value);

        this.FONTSIZE = 11;
        this.CURSOR = 'pointer';
        this.SERIALIZABLE = true;
        this.spellcheck_ = false;
    }

    override dispose(): void {
        WidgetDiv.hideIfOwner(this);
        super.dispose();
    }

    /**
     * Set the text in this field.
     *
     * @param text New text
     */
    override setValue(text: string | null): void {
        if (text === null) {
            return; // No change if null.
        }

        super.setValue(text);
    }

    /** Opens the CRON dialog the editor provides */
    protected override showEditor_(): void {
        window.main.cronDialog(this.getValue(), newId => {
            if (newId !== undefined && newId !== null) {
                this.setValue(newId);
            }
        });
    }
}

export function install(): void {
    window.Blockly.FieldCRON = FieldCRON;
}
