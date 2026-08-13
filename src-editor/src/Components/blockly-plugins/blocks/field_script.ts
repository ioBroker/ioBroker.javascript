/**
 * The script field - converted from `public/google-blockly/own/field_script.js`.
 *
 * The class and the two base64 helpers stay on `window.Blockly`: `blocks_procedures.js`
 * instantiates `new Blockly.FieldScript(...)` and calls `Blockly.b64DecodeUnicode()`.
 *
 * `updateTextNode_` was dropped rather than converted - it is part of the field API of Blockly 1.x,
 * nothing calls it any more, and it uses `goog.dom.removeChildren` and `Blockly.BlockSvg.SEP_SPACE_X`,
 * neither of which exists in Blockly 13. `render_` on the other hand is still live and was kept.
 */
import { Field, WidgetDiv, type Block } from 'blockly/core';

/** Encoding UTF8 ⇢ base64 */
export function b64EncodeUnicode(text: string): string {
    return btoa(
        encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_match, p: string) =>
            String.fromCharCode(parseInt(p, 16)),
        ),
    );
}

/** Decoding base64 ⇢ UTF8 */
export function b64DecodeUnicode(text: string): string {
    try {
        return decodeURIComponent(
            Array.prototype.map
                .call(atob(text), (s: string) => `%${`00${s.charCodeAt(0).toString(16)}`.slice(-2)}`)
                .join(''),
        );
    } catch {
        // old style
        return atob(text || '');
    }
}

/** The block a script field sits on may declare procedure arguments */
type ProcedureBlock = Block & {
    arguments_?: string[];
    getProcedureDef?: () => [string, string[], boolean, boolean];
};

export class FieldScript extends Field<string> {
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

    /** Opens the script dialog the editor provides */
    protected override showEditor_(): void {
        const base64 = this.getValue();
        const sourceBlock = this.getSourceBlock() as ProcedureBlock | null;
        let args: string[] | null = null;
        let isReturn = false;

        if (sourceBlock?.arguments_) {
            args = sourceBlock.arguments_;
        }
        if (sourceBlock?.getProcedureDef) {
            const options = sourceBlock.getProcedureDef();
            isReturn = options[2];
        }

        window.main.showScriptDialog(b64DecodeUnicode(base64 || ''), args as string[], isReturn, newScript => {
            if (newScript !== undefined && newScript !== null) {
                this.setValue(b64EncodeUnicode(newScript));
            }
        });
    }

    /**
     * Draws the border with the correct width and shows "..." instead of the script.
     * The implementation is taken from `Blockly.Field.prototype.updateSize_`.
     */
    protected override render_(): void {
        const constants = this.getConstants();
        if (!constants) {
            // only null while the field is not attached to a rendered workspace, where the original
            // would have thrown
            return;
        }

        const xOffset = this.borderRect_ ? constants.FIELD_BORDER_RECT_X_PADDING : 0;
        const totalWidth = xOffset * 2 + 12;
        let totalHeight = constants.FIELD_TEXT_HEIGHT;

        if (this.borderRect_) {
            totalHeight = Math.max(totalHeight, constants.FIELD_BORDER_RECT_HEIGHT);
        }

        this.size_.height = totalHeight;
        this.size_.width = totalWidth;

        this.positionTextElement_(xOffset, 12);
        this.positionBorderRect_();
        this.getTextElement().textContent = '...';
    }
}

export function install(): void {
    window.Blockly.FieldScript = FieldScript;
    window.Blockly.b64EncodeUnicode = b64EncodeUnicode;
    window.Blockly.b64DecodeUnicode = b64DecodeUnicode;
}
