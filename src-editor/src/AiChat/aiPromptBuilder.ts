/**
 * Prompt templates for VS-Code-like AI actions triggered from the editor.
 * Kept as pure functions so they can be unit-tested in isolation.
 *
 * Each template takes:
 *   - the selected code (or full document if no selection)
 *   - the script language (javascript, typescript, blockly)
 *   - optional extras (e.g. diagnostic text for `fix`, user's question for `ask`)
 *
 * The resulting string is dropped straight into the chat input so the user
 * sees exactly what is being sent and can still edit before submitting.
 */

export type AiActionType = 'explain' | 'refactor' | 'comment' | 'fix' | 'tests' | 'ask';

export interface AiActionPayload {
    action: AiActionType;
    code: string;
    language: string;
    /** When action === 'fix': the Monaco diagnostic message(s) that triggered it. */
    diagnostic?: string;
    /** When action === 'ask': the free-form question the user typed. */
    question?: string;
    /** Optional range hint used only for display ("lines 10–20"). */
    rangeLabel?: string;
}

/** Normalize a language string (anything containing "blockly" → "blockly", else JS). */
function normalizeLanguage(lang: string | undefined): string {
    const l = (lang || '').toLowerCase();
    if (l.includes('blockly') || l.includes('rules')) {
        return 'blockly';
    }
    if (l.includes('typescript')) {
        return 'typescript';
    }
    return 'javascript';
}

function fence(code: string, lang: string): string {
    const fenceLang = lang === 'blockly' ? 'xml' : lang;
    return `\`\`\`${fenceLang}\n${code}\n\`\`\``;
}

/**
 * Build the chat prompt for an AI action.
 *  Returns null when required inputs are missing (e.g. empty code for non-ask).
 */
export function buildActionPrompt(payload: AiActionPayload): string | null {
    const code = (payload.code || '').trim();
    const lang = normalizeLanguage(payload.language);
    const where = payload.rangeLabel ? ` (${payload.rangeLabel})` : '';

    switch (payload.action) {
        case 'explain': {
            if (!code) {
                return null;
            }
            return [
                `Please explain what this ioBroker ${lang} code does${where}.`,
                `Focus on: which datapoints it reads/writes, which triggers fire it, and any side-effects.`,
                '',
                fence(code, lang),
            ].join('\n');
        }

        case 'refactor': {
            if (!code) {
                return null;
            }
            return [
                `Refactor this ioBroker ${lang} code${where} to be cleaner and more idiomatic.`,
                `Preserve behavior exactly. Keep ioBroker APIs (on, setState, getState, schedule, sendTo, log).`,
                `Return the full refactored block inside a \`\`\`${lang === 'blockly' ? 'xml' : lang}\`\`\` code block so it can be smart-applied.`,
                '',
                fence(code, lang),
            ].join('\n');
        }

        case 'comment': {
            if (!code) {
                return null;
            }
            return [
                `Add clear, concise inline comments to this ioBroker ${lang} code${where}.`,
                `Only add comments where they add real value (non-obvious logic, tricky edge cases, business rules).`,
                `Do not over-comment trivial lines. Return the commented version in a code block.`,
                '',
                fence(code, lang),
            ].join('\n');
        }

        case 'fix': {
            if (!code) {
                return null;
            }
            const diag = (payload.diagnostic || '').trim();
            const diagLine = diag ? `\nReported problem: ${diag}` : '';
            return [
                `This ioBroker ${lang} code has an issue${where}. Please fix it and return the corrected code.${diagLine}`,
                `Keep the fix minimal — do not rewrite unrelated parts.`,
                '',
                fence(code, lang),
            ].join('\n');
        }

        case 'tests': {
            if (!code) {
                return null;
            }
            return [
                `Suggest how to test this ioBroker ${lang} script manually inside the ioBroker admin UI${where}.`,
                '',
                `ioBroker scripts run inside the adapter sandbox and CANNOT be unit-tested with Jest, Mocha, or any external test framework. Do NOT propose Jest/Mocha tests, do NOT propose extracting the code into a separate Node.js project, do NOT write \`describe\` / \`test\` blocks.`,
                '',
                `Instead, propose a short list of manual test cases. For each case describe:`,
                `  • Setup — which ioBroker datapoints to prepare and to which values (via the objects tree "Values" tab)`,
                `  • Action — what to trigger: set a state with setState, wait for a schedule, change a sensor value, etc.`,
                `  • Expected — what should happen afterwards: which states should change, what should appear in the adapter log (javascript.0), which side effects are visible`,
                '',
                `Keep it concise: 3-6 cases covering the happy path, typical edge cases, and any guard conditions the script has.`,
                '',
                fence(code, lang),
            ].join('\n');
        }

        case 'ask': {
            const question = (payload.question || '').trim();
            if (!question) {
                return null;
            }
            if (!code) {
                return question;
            }
            return [`Regarding this ioBroker ${lang} code${where}:`, '', fence(code, lang), '', question].join('\n');
        }

        default:
            return null;
    }
}

/**
 * Parse a slash command from the chat input (e.g. "/explain" or "/fix missing semicolon")
 * into an action + residual text.
 *
 * Returns null if the input is not a slash command.
 */
export function parseSlashCommand(input: string): { action: AiActionType; rest: string } | null {
    const trimmed = (input || '').trimStart();
    if (!trimmed.startsWith('/')) {
        return null;
    }
    const match = trimmed.match(/^\/(\w+)(?:\s+([\s\S]*))?$/);
    if (!match) {
        return null;
    }
    const cmd = match[1].toLowerCase();
    const rest = (match[2] || '').trim();

    const map: Record<string, AiActionType> = {
        explain: 'explain',
        erklaere: 'explain',
        erklaeren: 'explain',
        refactor: 'refactor',
        refaktor: 'refactor',
        refaktoriere: 'refactor',
        comment: 'comment',
        comments: 'comment',
        kommentar: 'comment',
        kommentiere: 'comment',
        fix: 'fix',
        fixme: 'fix',
        tests: 'tests',
        test: 'tests',
        ask: 'ask',
        frag: 'ask',
        frage: 'ask',
    };

    const action = map[cmd];
    if (!action) {
        return null;
    }
    return { action, rest };
}

/** The slash commands we advertise to the user (for autocomplete / help popovers). */
export const SLASH_COMMANDS: { command: string; action: AiActionType; description: string }[] = [
    { command: '/explain', action: 'explain', description: 'Explain the selected (or current) code' },
    { command: '/refactor', action: 'refactor', description: 'Refactor the selected code cleaner' },
    { command: '/comment', action: 'comment', description: 'Add inline comments' },
    { command: '/fix', action: 'fix', description: 'Fix a bug / editor diagnostic' },
    { command: '/tests', action: 'tests', description: 'Propose test steps for the code' },
    { command: '/ask', action: 'ask', description: 'Ask a free-form question about the code' },
];
