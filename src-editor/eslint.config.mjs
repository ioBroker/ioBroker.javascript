import config, { reactConfig } from '@iobroker/eslint-config';

export default [
    ...config,
    ...reactConfig,
    {
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: ['*.js', '*.mjs'],
                },
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        // specify files to exclude from linting here
        ignores: [
            'build/',
            'node_modules/',
            '.__mf__temp/',
            'vite.config.*',
            'vitest.config.*',
            'vite-env.d.ts',
            'public/',
            'src/Components/blockly-plugins/**/*',
            'src/Components/BlocklyEditorTS.tsx',
        ],
    },
    {
        // disable temporary the rule 'jsdoc/require-param' and enable 'jsdoc/require-jsdoc'
        rules: {
            'jsdoc/require-jsdoc': 'off',
            'jsdoc/require-param': 'off',

            // TODO: new rules of eslint-plugin-react-hooks v6 (React 19). They report 11 places
            // that existed before the upgrade and still have to be reviewed for React 19:
            //   set-state-in-effect: AiChat/AiChatInput.tsx, AiChat/useAiChat.ts,
            //       RulesEditor/components/ContentBlockItems, RulesEditor/components/ContextWrapper,
            //       RulesEditor/index.tsx
            //   refs: RulesEditor/components/DragWrapper, RulesEditor/index.tsx
            'react-hooks/set-state-in-effect': 'off',
            'react-hooks/refs': 'off',
        },
    },
];
