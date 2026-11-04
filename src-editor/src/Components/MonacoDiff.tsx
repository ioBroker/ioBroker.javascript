import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { ArrowDownward as IconNext, ArrowUpward as IconPrevious } from '@mui/icons-material';
import { I18n, type ThemeType } from '@iobroker/gui-components';
import type * as monacoEditor from 'monaco-editor';

import { loadMonaco } from './loadMonaco';
import { resizerLook } from './Resizer';

type Monaco = typeof monacoEditor;

export interface MonacoDiffHandle {
    /** The content of the right-hand side, including edits the user made in it */
    getModifiedValue: () => string;
}

export interface MonacoDiffProps {
    /** Left-hand side, never editable */
    originalCode: string;
    /** Right-hand side */
    modifiedCode: string;
    language: 'javascript' | 'typescript';
    themeType: ThemeType;
    /** `true` makes the right-hand side read-only too, for a diff that is only there to be read */
    readOnly?: boolean;
    /** Shows above the diff how many changes there are, with buttons to jump from one change to the next */
    navigation?: boolean;
    ref?: React.Ref<MonacoDiffHandle>;
}

/**
 * Scrolls both sides to the change. A short change comes into the middle; a long one, which would not fit,
 * starts near the top.
 */
function reveal(
    monaco: Monaco,
    diffEditor: monacoEditor.editor.IStandaloneDiffEditor,
    change: monacoEditor.editor.ILineChange,
    scrollType: monacoEditor.editor.ScrollType,
): void {
    // deleted lines exist only on the left; both sides scroll together, so it does not matter which one scrolls
    const deleted = !change.modifiedEndLineNumber;
    const editor = deleted ? diffEditor.getOriginalEditor() : diffEditor.getModifiedEditor();
    const start = Math.max(1, deleted ? change.originalStartLineNumber : change.modifiedStartLineNumber);
    const end = Math.max(start, deleted ? change.originalEndLineNumber : change.modifiedEndLineNumber);
    const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
    if ((end - start + 1) * lineHeight < editor.getLayoutInfo().height * 0.7) {
        editor.revealLinesInCenter(start, end, scrollType);
    } else {
        editor.revealLineNearTop(start, scrollType);
    }
    // the line of the cursor is highlighted: it marks the change, to which the buttons jumped
    editor.setPosition({ lineNumber: start, column: 1 });
}

/**
 * The bare Monaco diff editor, optionally with a bar to jump from one change to the next.
 *
 * Shared by the AI suggestion view, which lets the user edit the right-hand side before accepting
 * it, and by the plain "what did I change" dialogs, which only read.
 *
 * The editor is created once; new code replaces only its models, so the position of the border between
 * the two sides (it can be dragged) stays. It scrolls to the first change, whenever the code changes.
 */
const MonacoDiff: React.FC<MonacoDiffProps> = ({
    originalCode,
    modifiedCode,
    language,
    themeType,
    readOnly,
    navigation,
    ref,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [monaco, setMonaco] = useState<Monaco | null>(null);
    const diffEditorRef = useRef<monacoEditor.editor.IStandaloneDiffEditor | null>(null);
    const modifiedModelRef = useRef<monacoEditor.editor.ITextModel | null>(null);
    /** The changes as Monaco found them; null while it still compares */
    const [changes, setChanges] = useState<monacoEditor.editor.ILineChange[] | null>(null);
    /** The change to which the navigation jumped last */
    const [current, setCurrent] = useState(0);

    useImperativeHandle(ref, () => ({
        getModifiedValue: () => modifiedModelRef.current?.getValue() ?? modifiedCode,
    }));

    useEffect(() => {
        let diffEditor: monacoEditor.editor.IStandaloneDiffEditor | null = null;
        let cancelled = false;

        loadMonaco()
            .then(loaded => {
                if (cancelled || !containerRef.current) {
                    return;
                }
                diffEditor = loaded.editor.createDiffEditor(containerRef.current, {
                    readOnly: !!readOnly,
                    originalEditable: false,
                    renderSideBySide: true,
                    // the border between the two sides can be dragged
                    enableSplitViewResizing: true,
                    automaticLayout: true,
                    theme: themeType === 'dark' ? 'vs-dark' : 'vs',
                    scrollBeyondLastLine: false,
                    minimap: { enabled: false },
                    // a changed indentation is a change too: otherwise "No differences" for scripts that differ
                    ignoreTrimWhitespace: false,
                });
                diffEditorRef.current = diffEditor;
                setMonaco(loaded);
            })
            .catch((error: unknown) => console.error(`Cannot load the code editor: ${error as Error}`));

        return () => {
            cancelled = true;
            diffEditorRef.current = null;
            diffEditor?.dispose();
        };
        // created once; theme and read-only are updated below
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // the theme is the same for all Monaco editors of the page
        monaco?.editor.setTheme(themeType === 'dark' ? 'vs-dark' : 'vs');
    }, [monaco, themeType]);

    useEffect(() => {
        diffEditorRef.current?.updateOptions({ readOnly: !!readOnly });
    }, [monaco, readOnly]);

    useEffect(() => {
        const diffEditor = diffEditorRef.current;
        if (!monaco || !diffEditor) {
            return;
        }
        const originalModel = monaco.editor.createModel(originalCode, language);
        const modifiedModel = monaco.editor.createModel(modifiedCode, language);
        modifiedModelRef.current = modifiedModel;
        setChanges(null);
        setCurrent(0);

        let first = true;
        // Monaco compares in a worker; it tells when it is done, and again after each edit of the right side
        const listener = diffEditor.onDidUpdateDiff(() => {
            const list = diffEditor.getLineChanges() || [];
            setChanges(list);
            setCurrent(index => Math.min(index, Math.max(0, list.length - 1)));
            if (first) {
                first = false;
                if (list.length) {
                    reveal(monaco, diffEditor, list[0], monaco.editor.ScrollType.Immediate);
                }
            }
        });
        diffEditor.setModel({ original: originalModel, modified: modifiedModel });

        return () => {
            listener.dispose();
            // the models go, the editor (if it is still there) must not show them any longer
            diffEditorRef.current?.setModel(null);
            originalModel.dispose();
            modifiedModel.dispose();
            if (modifiedModelRef.current === modifiedModel) {
                modifiedModelRef.current = null;
            }
        };
    }, [monaco, originalCode, modifiedCode, language]);

    /** Jumps to a change; after the last one comes the first again */
    const go = (index: number): void => {
        const diffEditor = diffEditorRef.current;
        if (!monaco || !diffEditor || !changes?.length) {
            return;
        }
        const next = (index + changes.length) % changes.length;
        setCurrent(next);
        reveal(monaco, diffEditor, changes[next], monaco.editor.ScrollType.Smooth);
    };

    let info = '';
    if (changes) {
        info = changes.length ? I18n.t('Change %s of %s', current + 1, changes.length) : I18n.t('No differences');
    }

    const editor = (
        <Box
            ref={containerRef}
            sx={theme => ({
                flex: 1,
                overflow: 'hidden',
                minHeight: 0,
                height: '100%',
                width: '100%',
                // Monaco has the border between the two sides, but it is invisible: show it like the other resizers
                '& .monaco-diff-editor > .monaco-sash.vertical': resizerLook(theme, '&:hover, &.hover, &.active'),
            })}
        />
    );

    if (!navigation) {
        return editor;
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', width: '100%' }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1,
                    minHeight: 36,
                    flexShrink: 0,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Typography
                    variant="body2"
                    sx={{ flex: 1, color: 'text.secondary' }}
                >
                    {info}
                </Typography>
                <Tooltip title={I18n.t('Previous change')}>
                    <span>
                        <IconButton
                            size="small"
                            disabled={!changes?.length}
                            onClick={() => go(current - 1)}
                        >
                            <IconPrevious fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip title={I18n.t('Next change')}>
                    <span>
                        <IconButton
                            size="small"
                            disabled={!changes?.length}
                            onClick={() => go(current + 1)}
                        >
                            <IconNext fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>
            {editor}
        </Box>
    );
};

export default MonacoDiff;
