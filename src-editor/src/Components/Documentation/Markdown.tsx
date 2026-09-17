import React from 'react';
import { Box, Link, Typography } from '@mui/material';

import { type Block, type Inline, resolveLink, tokens } from './markdownParser';

/** Prefix of the heading ids, so an anchor like `instance` cannot collide with an element of the page. */
export const ANCHOR_PREFIX = 'doc-';

const CODE_SX = {
    fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
    fontSize: '0.85em',
    px: 0.6,
    py: 0.15,
    borderRadius: 0.5,
    bgcolor: 'action.hover',
} as const;

const HEADING_SX: Record<number, object> = {
    1: { fontSize: '1.6rem', fontWeight: 500, mt: 0, mb: 1.5 },
    2: { fontSize: '1.4rem', fontWeight: 500, mt: 5, mb: 1, pb: 0.5, borderBottom: 1, borderColor: 'divider' },
    3: { fontSize: '1.15rem', fontWeight: 600, mt: 4, mb: 0.75 },
    4: { fontSize: '1rem', fontWeight: 600, mt: 2.5, mb: 0.5 },
    5: { fontSize: '0.95rem', fontWeight: 600, mt: 2, mb: 0.5 },
    6: { fontSize: '0.9rem', fontWeight: 600, mt: 2, mb: 0.5 },
};

interface MarkdownProps {
    blocks: Block[];
    /** Where the document lives, to resolve its relative links */
    base: string;
    /** A link to a heading of the same document was clicked */
    onAnchor: (anchor: string) => void;
}

function renderInline(list: Inline[], key: string, props: MarkdownProps): React.ReactNode[] {
    return list.map((token, n) => {
        const id = `${key}-${n}`;
        switch (token.type) {
            case 'text':
                return token.text;
            case 'code':
                return (
                    <Box
                        key={id}
                        component="code"
                        sx={CODE_SX}
                    >
                        {token.text}
                    </Box>
                );
            case 'strong':
                return <strong key={id}>{renderInline(token.children, id, props)}</strong>;
            case 'em':
                return <em key={id}>{renderInline(token.children, id, props)}</em>;
            case 'link': {
                const target = resolveLink(token.href, props.base);
                if ('anchor' in target) {
                    return (
                        <Link
                            key={id}
                            href={`#${target.anchor}`}
                            onClick={(e: React.MouseEvent) => {
                                // The dialog is not the page: the hash would move the editor, not the text.
                                e.preventDefault();
                                props.onAnchor(target.anchor);
                            }}
                        >
                            {renderInline(token.children, id, props)}
                        </Link>
                    );
                }
                return (
                    <Link
                        key={id}
                        href={target.url}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {renderInline(token.children, id, props)}
                    </Link>
                );
            }
            default:
                return null;
        }
    });
}

/**
 * Just enough Markdown for the API documentation, rendered without a dependency - the document is
 * part of this repository, so the subset it uses is known. See `markdownParser.ts` for what that is.
 */
export default function Markdown(props: MarkdownProps): React.JSX.Element {
    const inline = (text: string, key: string): React.ReactNode[] => renderInline(tokens(text), key, props);

    return (
        <>
            {props.blocks.map((block, b) => {
                const key = `b${b}`;
                switch (block.type) {
                    case 'heading':
                        return (
                            <Typography
                                key={key}
                                id={`${ANCHOR_PREFIX}${block.anchor}`}
                                data-level={block.level}
                                component={`h${block.level}` as 'h1'}
                                sx={{
                                    ...HEADING_SX[block.level],
                                    ...(b === 0 ? { mt: 0 } : undefined),
                                    // Room for the heading to clear the top edge when it is scrolled to.
                                    scrollMarginTop: 12,
                                }}
                            >
                                {inline(block.source, key)}
                            </Typography>
                        );

                    case 'paragraph':
                        return (
                            <Typography
                                key={key}
                                sx={{ my: 1.25, lineHeight: 1.65 }}
                            >
                                {inline(block.text, key)}
                            </Typography>
                        );

                    case 'code':
                        return (
                            <Box
                                key={key}
                                component="pre"
                                sx={{
                                    ...CODE_SX,
                                    px: 1.5,
                                    py: 1.25,
                                    my: 1.5,
                                    overflowX: 'auto',
                                    fontSize: 12.5,
                                    lineHeight: 1.5,
                                    border: 1,
                                    borderColor: 'divider',
                                }}
                            >
                                {block.text}
                            </Box>
                        );

                    case 'table':
                        return (
                            <Box
                                key={key}
                                sx={{ my: 1.5, overflowX: 'auto' }}
                            >
                                <Box
                                    component="table"
                                    sx={{
                                        borderCollapse: 'collapse',
                                        width: '100%',
                                        fontSize: 14,
                                        '& td, & th': {
                                            border: 1,
                                            borderColor: 'divider',
                                            px: 1,
                                            py: 0.6,
                                            textAlign: 'left',
                                            verticalAlign: 'top',
                                        },
                                        '& th': { bgcolor: 'action.hover', fontWeight: 500 },
                                    }}
                                >
                                    {/* An all-empty header row is a table used purely for layout. */}
                                    {block.header.some(cell => cell) ? (
                                        <thead>
                                            <tr>
                                                {block.header.map((cell, n) => (
                                                    <th key={n}>{inline(cell, `${key}h${n}`)}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                    ) : null}
                                    <tbody>
                                        {block.rows.map((row, r) => (
                                            <tr key={r}>
                                                {row.map((cell, c) => (
                                                    <td key={c}>{inline(cell, `${key}r${r}c${c}`)}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </Box>
                            </Box>
                        );

                    case 'list':
                        return (
                            <Box
                                key={key}
                                component={block.ordered ? 'ol' : 'ul'}
                                start={block.ordered && block.start !== 1 ? block.start : undefined}
                                sx={{ my: 1.25, pl: 3, lineHeight: 1.65, '& li': { mb: 0.5 } }}
                            >
                                {block.items.map((item, n) => (
                                    <Box
                                        component="li"
                                        key={n}
                                        sx={item.depth ? { ml: item.depth * 3 } : undefined}
                                    >
                                        {inline(item.text, `${key}i${n}`)}
                                    </Box>
                                ))}
                            </Box>
                        );

                    default:
                        return null;
                }
            })}
        </>
    );
}
