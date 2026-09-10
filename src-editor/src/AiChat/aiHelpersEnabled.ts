/**
 * Global on/off switch for the "AI helpers" that decorate the Monaco editor:
 *
 *   - the code-lens row (Explain / Refactor / Test) above every function and class
 *   - the hover tooltip with the live value of an ioBroker object ID
 *   - the hover tooltip that describes a CRON expression in plain words
 *   - the inline (ghost text) code completions
 *
 * Some users find these distracting, so every javascript instance can switch them off
 * in its settings (`native.aiEditorHelpers`, "AI settings" tab). The value is resolved
 * in `Editor.tsx` for the engine of the currently selected script and published here,
 * because the editor is rendered in several places (main editor, debugger view,
 * blockly source dialog) that would otherwise all have to thread the flag through.
 *
 * The default is `true`: an instance that never saw the setting keeps the helpers,
 * i.e. this is an opt-out and not an opt-in.
 */

type Listener = (enabled: boolean) => void;

let enabled = true;
const listeners = new Set<Listener>();

/** Are the AI helpers currently allowed to decorate the editor? */
export function areAiHelpersEnabled(): boolean {
    return enabled;
}

/** Publish a new value. All registered editors re-register or dispose their providers. */
export function setAiHelpersEnabled(value: boolean): void {
    if (enabled === value) {
        return;
    }
    enabled = value;
    listeners.forEach(listener => {
        try {
            listener(value);
        } catch (e) {
            console.error(`Cannot notify AI helper listener: ${e}`);
        }
    });
}

/** Subscribe to changes. Returns the unsubscribe function. */
export function onAiHelpersEnabledChanged(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
