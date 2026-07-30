/**
 * Monaco inline-chat widget — VS-Code-style "Ctrl+I" popup.
 *
 * Lifecycle:
 *   1. User presses Ctrl+I (or invokes via context menu).
 *   2. A Monaco content-widget is rendered below the current selection:
 *        ┌──────────────────────────────────────┐
 *        │ [Refactor this so the loop exits…]   │  <- text input
 *        │ [Esc]                   [Send Ctrl↵] │
 *        └──────────────────────────────────────┘
 *   3. On Send, the caller-supplied `onSubmit(question, selectedCode)` is
 *      invoked. While the promise is pending, the widget shows a spinner.
 *   4. On resolve, the widget switches to "response mode" with the AI's text
 *      or a code-diff view:
 *        ┌──────────────────────────────────────┐
 *        │  (proposal — scrollable)              │
 *        │   ~~old line~~                        │
 *        │   +new line                           │
 *        │ [Reject Esc]  [Apply ⏎]  [Open chat]  │
 *        └──────────────────────────────────────┘
 *
 * The widget is implemented as plain DOM (no React / no ReactDOM.createPortal)
 * so it can live entirely inside the Monaco editor without portal-overlap or
 * focus-capture issues.
 */

import type * as monacoEditor from 'monaco-editor';
import { I18n } from '@iobroker/gui-components';
import { applyCodeEdit } from './applyCodeEdit';

export interface InlineChatSubmitPayload {
    question: string;
    /** Text that was selected when Ctrl+I was pressed (may be empty). */
    selectedCode: string;
    /** Selection range at submit time, for the Apply button. */
    range: monacoEditor.IRange | null;
}

export interface InlineChatHost {
    /** Called when the user presses Send. Must return the AI's answer. */
    onSubmit: (payload: InlineChatSubmitPayload) => Promise<string>;
    /** Called when the user hits "Open chat" — forwards the question to the main chat panel. */
    onEscalateToChat?: (payload: InlineChatSubmitPayload) => void;
}

const WIDGET_ID = 'iobroker.aichat.inline';

/**
 * Extract the first fenced code block (```lang\n...\n```) from the AI response.
 *  If there's no fence, returns the response as-is (treated as plain text).
 */
export function extractFirstCodeBlock(response: string): { code: string | null; text: string } {
    if (!response) {
        return { code: null, text: '' };
    }
    const match = response.match(/```[\w-]*\n([\s\S]*?)\n```/);
    if (match) {
        return { code: match[1], text: response.replace(match[0], '').trim() };
    }
    return { code: null, text: response };
}

export class InlineChatWidget {
    private editor: monacoEditor.editor.IStandaloneCodeEditor;
    private monaco: typeof monacoEditor;
    private host: InlineChatHost;

    private domNode: HTMLDivElement;
    private input: HTMLTextAreaElement;
    private status: HTMLDivElement;
    private responseBox: HTMLPreElement;
    private sendBtn: HTMLButtonElement;
    private cancelBtn: HTMLButtonElement;
    private applyBtn: HTMLButtonElement;
    private openChatBtn: HTMLButtonElement;

    private contentWidget: monacoEditor.editor.IContentWidget | null = null;
    private pendingResponse: string = '';
    private pendingCode: string | null = null;
    private initialRange: monacoEditor.IRange | null = null;
    private initialSelectedCode: string = '';

    constructor(editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor, host: InlineChatHost) {
        this.editor = editor;
        this.monaco = monaco;
        this.host = host;

        const root = document.createElement('div');
        root.className = 'iob-inline-chat';
        root.style.cssText = [
            'background: var(--vscode-editor-background, #1e1e1e)',
            'border: 1px solid rgba(128, 128, 128, 0.4)',
            'border-radius: 6px',
            'padding: 8px',
            'min-width: 420px',
            'max-width: 720px',
            'box-shadow: 0 4px 12px rgba(0,0,0,0.3)',
            'font-family: var(--vscode-font-family, system-ui)',
            'font-size: 12px',
            'color: var(--vscode-editor-foreground, #eee)',
            'z-index: 100',
        ].join('; ');

        const title = document.createElement('div');
        title.textContent = `🤖 ${I18n.t('AI inline chat')}`;
        title.style.cssText = 'font-weight: 600; margin-bottom: 6px; opacity: 0.8;';
        root.appendChild(title);

        this.input = document.createElement('textarea');
        this.input.rows = 2;
        this.input.placeholder = I18n.t('Ask anything, or request a change (e.g. "what does this do?")');
        this.input.style.cssText = [
            'width: 100%',
            'box-sizing: border-box',
            'background: rgba(0,0,0,0.2)',
            'color: inherit',
            'border: 1px solid rgba(128, 128, 128, 0.3)',
            'border-radius: 4px',
            'padding: 6px 8px',
            'font-family: inherit',
            'font-size: 12px',
            'resize: vertical',
        ].join('; ');
        root.appendChild(this.input);

        this.status = document.createElement('div');
        this.status.style.cssText = 'min-height: 16px; margin-top: 6px; opacity: 0.7; font-size: 11px;';
        root.appendChild(this.status);

        this.responseBox = document.createElement('pre');
        this.responseBox.style.cssText = [
            'margin: 6px 0 0 0',
            'padding: 6px',
            'background: rgba(0,0,0,0.25)',
            'border-radius: 4px',
            'max-height: 240px',
            'overflow: auto',
            'white-space: pre-wrap',
            'word-wrap: break-word',
            'font-family: var(--vscode-editor-font-family, monospace)',
            'font-size: 12px',
            'display: none',
        ].join('; ');
        root.appendChild(this.responseBox);

        const buttonRow = document.createElement('div');
        buttonRow.style.cssText = 'display: flex; gap: 6px; justify-content: flex-end; margin-top: 8px;';

        this.cancelBtn = InlineChatWidget.makeButton(I18n.t('Cancel'), 'Esc', false);
        this.openChatBtn = InlineChatWidget.makeButton(I18n.t('Open in chat'), '', false);
        this.openChatBtn.style.display = 'none';
        this.applyBtn = InlineChatWidget.makeButton(I18n.t('Apply'), 'Enter', true);
        this.applyBtn.style.display = 'none';
        this.sendBtn = InlineChatWidget.makeButton(I18n.t('Send'), 'Ctrl+Enter', true);

        buttonRow.appendChild(this.cancelBtn);
        buttonRow.appendChild(this.openChatBtn);
        buttonRow.appendChild(this.applyBtn);
        buttonRow.appendChild(this.sendBtn);
        root.appendChild(buttonRow);

        this.domNode = root;

        this.input.addEventListener('keydown', ev => this.onInputKeyDown(ev));
        this.sendBtn.addEventListener('click', () => this.submit());
        this.cancelBtn.addEventListener('click', () => this.hide());
        this.applyBtn.addEventListener('click', () => this.applyProposal());
        this.openChatBtn.addEventListener('click', () => this.escalateToChat());

        // Prevent Monaco from eating our typing.
        root.addEventListener('mousedown', ev => ev.stopPropagation());
        root.addEventListener('keydown', ev => ev.stopPropagation());
    }

    private static makeButton(label: string, hint: string, primary: boolean): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.textContent = hint ? `${label} · ${hint}` : label;
        btn.style.cssText = [
            `background: ${primary ? 'var(--vscode-button-background, #0e639c)' : 'transparent'}`,
            `color: ${primary ? 'var(--vscode-button-foreground, #fff)' : 'inherit'}`,
            `border: 1px solid ${primary ? 'transparent' : 'rgba(128, 128, 128, 0.4)'}`,
            'border-radius: 4px',
            'padding: 4px 10px',
            'cursor: pointer',
            'font-family: inherit',
            'font-size: 11px',
        ].join('; ');
        return btn;
    }

    private onInputKeyDown(ev: KeyboardEvent): void {
        if (ev.key === 'Escape') {
            ev.preventDefault();
            this.hide();
        } else if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
            ev.preventDefault();
            void this.submit();
        }
    }

    show(): void {
        const sel = this.editor.getSelection();
        const model = this.editor.getModel();
        if (!model) {
            return;
        }
        this.initialRange = sel && !sel.isEmpty() ? sel : null;
        this.initialSelectedCode = this.initialRange ? model.getValueInRange(this.initialRange) : '';
        this.input.value = '';
        const lineCount = this.initialSelectedCode.split('\n').length;
        this.status.textContent = this.initialSelectedCode
            ? I18n.t('Selection: %s line(s)', lineCount)
            : I18n.t('No selection — the question will use context from the whole script.');
        this.responseBox.style.display = 'none';
        this.responseBox.textContent = '';
        this.applyBtn.style.display = 'none';
        this.openChatBtn.style.display = 'none';
        this.sendBtn.style.display = '';
        this.pendingResponse = '';
        this.pendingCode = null;

        const widget = this.buildContentWidget();
        this.editor.addContentWidget(widget);
        this.contentWidget = widget;

        setTimeout(() => this.input.focus(), 50);
    }

    hide(): void {
        if (this.contentWidget) {
            this.editor.removeContentWidget(this.contentWidget);
            this.contentWidget = null;
        }
        this.editor.focus();
    }

    private buildContentWidget(): monacoEditor.editor.IContentWidget {
        const sel = this.editor.getSelection();
        const line = sel?.endLineNumber ?? this.editor.getPosition()?.lineNumber ?? 1;
        const col = sel?.endColumn ?? 1;
        const domNode = this.domNode;
        const monaco = this.monaco;
        return {
            getId(): string {
                return WIDGET_ID;
            },
            getDomNode(): HTMLElement {
                return domNode;
            },
            getPosition() {
                return {
                    position: { lineNumber: line, column: col },
                    preference: [
                        monaco.editor.ContentWidgetPositionPreference.BELOW,
                        monaco.editor.ContentWidgetPositionPreference.ABOVE,
                    ],
                };
            },
        };
    }

    private async submit(): Promise<void> {
        const question = this.input.value.trim();
        if (!question) {
            this.status.textContent = I18n.t('Please enter a question.');
            return;
        }
        this.setLoading(true);
        try {
            const answer = await this.host.onSubmit({
                question,
                selectedCode: this.initialSelectedCode,
                range: this.initialRange,
            });
            this.showResponse(answer);
        } catch (e) {
            this.status.textContent = `${I18n.t('Error')}: ${(e as Error).message || String(e)}`;
        } finally {
            this.setLoading(false);
        }
    }

    private setLoading(loading: boolean): void {
        this.sendBtn.disabled = loading;
        this.input.disabled = loading;
        this.status.textContent = loading ? I18n.t('Thinking…') : '';
    }

    private showResponse(answer: string): void {
        const parsed = extractFirstCodeBlock(answer);
        this.pendingResponse = answer;
        this.pendingCode = parsed.code;
        this.responseBox.textContent = parsed.code ? parsed.code : parsed.text;
        this.responseBox.style.display = '';
        this.status.textContent = parsed.code
            ? I18n.t('Code proposal — press Apply to replace your selection.')
            : I18n.t('Plain text answer.');
        this.sendBtn.style.display = 'none';
        this.applyBtn.style.display = parsed.code ? '' : 'none';
        this.openChatBtn.style.display = '';
    }

    private applyProposal(): void {
        if (!this.pendingCode) {
            this.hide();
            return;
        }
        const range = this.initialRange
            ? {
                  startLine: this.initialRange.startLineNumber,
                  startColumn: this.initialRange.startColumn,
                  endLine: this.initialRange.endLineNumber,
                  endColumn: this.initialRange.endColumn,
              }
            : null;
        applyCodeEdit(this.editor, this.monaco, range, this.pendingCode, { source: 'inline-chat' });
        this.hide();
    }

    private escalateToChat(): void {
        if (this.host.onEscalateToChat) {
            this.host.onEscalateToChat({
                question: this.input.value.trim() || I18n.t('Show more details'),
                selectedCode: this.initialSelectedCode,
                range: this.initialRange,
            });
        }
        this.hide();
    }

    dispose(): void {
        this.hide();
    }
}
