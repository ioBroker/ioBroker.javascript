import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { Box } from '@mui/material';
import type { ThemeType } from '@iobroker/gui-components';
import type * as monacoEditor from 'monaco-editor';

import { loadMonaco } from './loadMonaco';

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
    ref?: React.Ref<MonacoDiffHandle>;
}

/**
 * The bare Monaco diff editor, without any toolbar.
 *
 * Shared by the AI suggestion view, which lets the user edit the right-hand side before accepting
 * it, and by the plain "what did I change" dialog, which only reads.
 */
const MonacoDiff: React.FC<MonacoDiffProps> = ({ originalCode, modifiedCode, language, themeType, readOnly, ref }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const modifiedModelRef = useRef<monacoEditor.editor.ITextModel | null>(null);

    useImperativeHandle(ref, () => ({
        getModifiedValue: () => modifiedModelRef.current?.getValue() ?? modifiedCode,
    }));

    useEffect(() => {
        let dispose: (() => void) | null = null;
        let cancelled = false;

        loadMonaco()
            .then(monaco => {
                if (cancelled || !containerRef.current) {
                    return;
                }

                const diffEditor = monaco.editor.createDiffEditor(containerRef.current, {
                    readOnly: !!readOnly,
                    originalEditable: false,
                    renderSideBySide: true,
                    automaticLayout: true,
                    theme: themeType === 'dark' ? 'vs-dark' : 'vs',
                    scrollBeyondLastLine: false,
                    minimap: { enabled: false },
                });

                const originalModel = monaco.editor.createModel(originalCode, language);
                const modifiedModel = monaco.editor.createModel(modifiedCode, language);
                modifiedModelRef.current = modifiedModel;

                diffEditor.setModel({ original: originalModel, modified: modifiedModel });

                dispose = () => {
                    diffEditor.dispose();
                    originalModel.dispose();
                    modifiedModel.dispose();
                    modifiedModelRef.current = null;
                };
            })
            .catch((error: unknown) => console.error(`Cannot load the code editor: ${error as Error}`));

        return () => {
            cancelled = true;
            dispose?.();
        };
    }, [originalCode, modifiedCode, language, themeType, readOnly]);

    return (
        <Box
            ref={containerRef}
            sx={{ flex: 1, overflow: 'hidden', height: '100%', width: '100%' }}
        />
    );
};

export default MonacoDiff;
