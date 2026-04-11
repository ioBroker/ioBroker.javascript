import React, { useMemo } from 'react';
import { Box, Avatar, Button, useTheme } from '@mui/material';
import { Person, SmartToy, AddCircleOutline, PlaylistAddCheck } from '@mui/icons-material';
import { I18n, type ThemeType } from '@iobroker/adapter-react-v5';
import type { Theme } from '@mui/material/styles';

import type { ChatMessage, AiScriptLanguage } from './AiChatTypes';
import AiChatCodeBlock from './AiChatCodeBlock';
import AiBlocklyPreview from './AiBlocklyPreview';

interface AiChatMessageProps {
    message: ChatMessage;
    themeType: ThemeType;
    currentLanguage?: AiScriptLanguage;
    onInsertCode?: (code: string) => void;
    onShowDiff?: (code: string) => void;
    onApplyCode?: (code: string) => void;
}

interface ContentPart {
    type: 'text' | 'code';
    content: string;
    language?: string;
}

function splitContent(content: string): ContentPart[] {
    const parts: ContentPart[] = [];
    const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(content)) !== null) {
        // Text before code block
        if (match.index > lastIndex) {
            const text = content.substring(lastIndex, match.index).trim();
            if (text) {
                parts.push({ type: 'text', content: text });
            }
        }
        // Code block
        parts.push({
            type: 'code',
            content: match[2].trim(),
            language: match[1] || 'javascript',
        });
        lastIndex = match.index + match[0].length;
    }

    // Remaining text
    if (lastIndex < content.length) {
        const text = content.substring(lastIndex).trim();
        if (text) {
            parts.push({ type: 'text', content: text });
        }
    }

    if (parts.length === 0) {
        parts.push({ type: 'text', content });
    }

    return parts;
}

/** Inline markdown: **bold**, *italic*, `code` */
function renderInlineMarkdown(text: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }
        if (match[2]) {
            parts.push(<strong key={key++}>{match[2]}</strong>);
        } else if (match[3]) {
            parts.push(<em key={key++}>{match[3]}</em>);
        } else if (match[4]) {
            parts.push(
                <code
                    key={key++}
                    className="ai-chat-inline-code"
                    style={{
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: '0.85em',
                        fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
                    }}
                >
                    {match[4]}
                </code>,
            );
        }
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts;
}

/** Check if lines form a markdown table */
function isTableLine(line: string): boolean {
    return line.trim().startsWith('|') && line.trim().endsWith('|');
}

function isSeparatorLine(line: string): boolean {
    return /^\|[\s:]*-+[\s:|-]*\|$/.test(line.trim());
}

/** Render a markdown table */
function renderTable(lines: string[], theme: Theme, startKey: number): React.ReactNode {
    const isDark = theme.palette.mode === 'dark';
    const parseRow = (line: string): string[] =>
        line
            .trim()
            .replace(/^\||\|$/g, '')
            .split('|')
            .map(cell => cell.trim());

    const headerCells = parseRow(lines[0]);
    const dataRows = lines.slice(2).map(parseRow); // skip separator line

    return (
        <Box
            key={startKey}
            sx={{ overflowX: 'auto', my: 1 }}
        >
            <table
                style={{
                    borderCollapse: 'collapse',
                    width: '100%',
                    fontSize: '0.8rem',
                    color: theme.palette.text.primary,
                }}
            >
                <thead>
                    <tr>
                        {headerCells.map((cell, i) => (
                            <th
                                key={i}
                                style={{
                                    border: `1px solid ${theme.palette.divider}`,
                                    padding: '6px 10px',
                                    backgroundColor: isDark ? theme.palette.grey[800] : theme.palette.grey[100],
                                    color: theme.palette.text.primary,
                                    fontWeight: 600,
                                    textAlign: 'left',
                                }}
                            >
                                {renderInlineMarkdown(cell)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {dataRows.map((row, rowIdx) => (
                        <tr
                            key={rowIdx}
                            style={{
                                backgroundColor:
                                    rowIdx % 2 === 1
                                        ? isDark
                                            ? theme.palette.grey[900]
                                            : theme.palette.grey[50]
                                        : undefined,
                            }}
                        >
                            {row.map((cell, cellIdx) => (
                                <td
                                    key={cellIdx}
                                    style={{
                                        border: `1px solid ${theme.palette.divider}`,
                                        padding: '6px 10px',
                                        color: theme.palette.text.primary,
                                    }}
                                >
                                    {renderInlineMarkdown(cell)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </Box>
    );
}

/** Render block-level markdown (headings, lists, tables, paragraphs) */
function renderMarkdownBlock(text: string, theme: Theme): React.ReactNode[] {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let key = 0;
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // Empty line
        if (trimmed === '') {
            i++;
            continue;
        }

        // Horizontal rule
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
            elements.push(
                <hr
                    key={key++}
                    style={{
                        border: 'none',
                        borderTop: `1px solid ${theme.palette.divider}`,
                        margin: '8px 0',
                    }}
                />,
            );
            i++;
            continue;
        }

        // Headings
        const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const sizes = ['1.2em', '1.1em', '1em', '0.95em'];
            elements.push(
                <div
                    key={key++}
                    style={{ fontWeight: 600, fontSize: sizes[level - 1], margin: '8px 0 4px' }}
                >
                    {renderInlineMarkdown(headingMatch[2])}
                </div>,
            );
            i++;
            continue;
        }

        // Table detection
        if (
            isTableLine(trimmed) &&
            i + 1 < lines.length &&
            isSeparatorLine(lines[i + 1].trim()) &&
            i + 2 < lines.length
        ) {
            const tableLines: string[] = [lines[i], lines[i + 1]];
            let j = i + 2;
            while (j < lines.length && isTableLine(lines[j])) {
                tableLines.push(lines[j]);
                j++;
            }
            elements.push(renderTable(tableLines, theme, key++));
            i = j;
            continue;
        }

        // Unordered list
        if (/^[-*+]\s/.test(trimmed)) {
            const listItems: string[] = [];
            while (i < lines.length && /^\s*[-*+]\s/.test(lines[i])) {
                listItems.push(lines[i].replace(/^\s*[-*+]\s/, '').trim());
                i++;
            }
            elements.push(
                <ul
                    key={key++}
                    style={{ margin: '4px 0', paddingLeft: 20 }}
                >
                    {listItems.map((item, idx) => (
                        <li key={idx}>{renderInlineMarkdown(item)}</li>
                    ))}
                </ul>,
            );
            continue;
        }

        // Ordered list
        if (/^\d+[.)]\s/.test(trimmed)) {
            const listItems: string[] = [];
            while (i < lines.length && /^\s*\d+[.)]\s/.test(lines[i])) {
                listItems.push(lines[i].replace(/^\s*\d+[.)]\s/, '').trim());
                i++;
            }
            elements.push(
                <ol
                    key={key++}
                    style={{ margin: '4px 0', paddingLeft: 20 }}
                >
                    {listItems.map((item, idx) => (
                        <li key={idx}>{renderInlineMarkdown(item)}</li>
                    ))}
                </ol>,
            );
            continue;
        }

        // Regular paragraph line
        elements.push(<div key={key++}>{renderInlineMarkdown(trimmed)}</div>);
        i++;
    }

    return elements;
}

const AiChatMessage: React.FC<AiChatMessageProps> = ({
    message,
    themeType,
    currentLanguage,
    onInsertCode,
    onShowDiff,
    onApplyCode,
}) => {
    const isUser = message.role === 'user';
    const theme = useTheme();

    const contentParts = useMemo(() => splitContent(message.content), [message.content]);

    /** Check if a code block contains Blockly XML */
    const isBlocklyXml = (language?: string, code?: string): boolean => {
        if (language === 'xml' || language === 'blockly') {
            return true;
        }
        if (currentLanguage === 'blockly' && code && /<block\s+type=/.test(code)) {
            return true;
        }
        return false;
    };

    return (
        <Box
            sx={{
                display: 'flex',
                gap: 1,
                px: 1.5,
                py: 1,
                '&:hover': {
                    bgcolor: 'action.hover',
                },
            }}
        >
            <Avatar
                sx={{
                    width: 28,
                    height: 28,
                    bgcolor: isUser
                        ? themeType === 'dark'
                            ? 'primary.dark'
                            : 'primary.main'
                        : themeType === 'dark'
                          ? 'secondary.dark'
                          : 'secondary.main',
                    flexShrink: 0,
                    mt: 0.5,
                }}
            >
                {isUser ? <Person sx={{ fontSize: 18 }} /> : <SmartToy sx={{ fontSize: 18 }} />}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0, fontSize: '0.875rem', lineHeight: 1.6 }}>
                {contentParts.map((part, index) => {
                    if (part.type === 'code') {
                        // Render Blockly XML as visual preview
                        if (isBlocklyXml(part.language, part.content)) {
                            return (
                                <Box
                                    key={index}
                                    sx={{ my: 1 }}
                                >
                                    <AiBlocklyPreview
                                        xml={part.content}
                                        themeType={themeType}
                                    />
                                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                        {onApplyCode && (
                                            <Button
                                                size="small"
                                                variant="contained"
                                                color="primary"
                                                startIcon={<PlaylistAddCheck sx={{ fontSize: 14 }} />}
                                                onClick={() => onApplyCode(part.content)}
                                                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                            >
                                                {I18n.t('Apply blocks')}
                                            </Button>
                                        )}
                                        {onInsertCode && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<AddCircleOutline sx={{ fontSize: 14 }} />}
                                                onClick={() => onInsertCode(part.content)}
                                                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                            >
                                                {I18n.t('Insert blocks')}
                                            </Button>
                                        )}
                                    </Box>
                                </Box>
                            );
                        }
                        return (
                            <AiChatCodeBlock
                                key={index}
                                code={part.content}
                                language={part.language || 'javascript'}
                                themeType={themeType}
                                onInsertCode={onInsertCode}
                                onShowDiff={onShowDiff}
                            />
                        );
                    }
                    return (
                        <Box
                            key={index}
                            sx={{
                                wordBreak: 'break-word',
                                color: theme.palette.text.primary,
                            }}
                        >
                            {renderMarkdownBlock(part.content, theme)}
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};

export default AiChatMessage;
