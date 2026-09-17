import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { Clear as IconClear, Close as IconClose, MenuBook as IconContents } from '@mui/icons-material';

import { I18n } from '@iobroker/gui-components';

import Markdown, { ANCHOR_PREFIX } from '../Components/Documentation/Markdown';
import {
    type Block,
    type ContentsEntry,
    contents,
    CONTENTS_DEPTH,
    filterContents,
    parse,
    sectionOf,
    withoutContents,
} from '../Components/Documentation/markdownParser';
// The same files GitHub and ioBroker.net show, so the help in the editor never lags behind the docs.
import enDoc from '../../../docs/en/javascript.md?raw';
import deDoc from '../../../docs/de/javascript.md?raw';

/** The languages the reference is written in; any other reads English rather than an empty page. */
const DOCS: Record<string, string> = { en: enDoc, de: deDoc };

/** Where the documents live, for their relative links (e.g. `blockly.md#credential`) */
const DOC_BASE = 'https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/';

/** Where the reader was, so the help reopens there rather than at the top - per language, as the texts differ in length */
const SCROLL_KEY = 'Editor.docScroll';
const CONTENTS_KEY = 'Editor.docContents';

/** How long a clicked entry stays marked while the text scrolls to it, see `updateActive` */
const SCROLL_ANIMATION_MS = 1500;

const MONOSPACE = 'ui-monospace, "Cascadia Code", Consolas, monospace';

interface ParsedDocument {
    lang: string;
    blocks: Block[];
    entries: ContentsEntry[];
}

const parsed: Record<string, ParsedDocument> = {};

/** A document does not change while the page is open, so it is parsed once. */
function getDocument(language: string): ParsedDocument {
    const lang = DOCS[language] ? language : 'en';
    if (!parsed[lang]) {
        const blocks = withoutContents(parse(DOCS[lang]));
        parsed[lang] = { lang, blocks, entries: contents(blocks) };
    }
    return parsed[lang];
}

function readStorage(key: string): string | null {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeStorage(key: string, value: string): void {
    try {
        window.localStorage.setItem(key, value);
    } catch {
        // a full or blocked storage must not break reading the help
    }
}

interface DialogDocumentationProps {
    onClose: () => void;
    /** The identifier under the cursor: if it is documented, the help opens at its section */
    word?: string | null;
}

export default function DialogDocumentation({ onClose, word }: DialogDocumentationProps): React.JSX.Element {
    const { lang, blocks, entries } = getDocument(I18n.getLanguage());
    const scrollKey = `${SCROLL_KEY}.${lang}`;
    const text = useRef<HTMLDivElement>(null);
    const list = useRef<HTMLDivElement>(null);
    const frame = useRef(0);
    const clicked = useRef<{ anchor: string; at: number } | null>(null);

    const [showContents, setShowContents] = useState(() => readStorage(CONTENTS_KEY) !== 'false');
    const [filter, setFilter] = useState('');
    const [active, setActive] = useState('');

    const shown = useMemo(() => filterContents(entries, filter), [entries, filter]);

    /** Marks the section at the top of the text in the contents list. */
    const updateActive = (): void => {
        const container = text.current;
        if (!container) {
            return;
        }
        const top = container.scrollTop + 24;
        let current = '';
        for (const heading of Array.from(container.querySelectorAll<HTMLElement>('[data-level]'))) {
            if (Number(heading.dataset.level) > CONTENTS_DEPTH) {
                continue;
            }
            if (heading.offsetTop > top) {
                break;
            }
            current = heading.id.substring(ANCHOR_PREFIX.length);
        }
        // The last sections are too short to reach the top of the text: a clicked one stays marked,
        // instead of the section above it that is still at the top.
        const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 4;
        if (atBottom && clicked.current && Date.now() - clicked.current.at < SCROLL_ANIMATION_MS) {
            current = clicked.current.anchor;
        }
        setActive(current);
    };

    const goTo = (anchor: string, smooth = true): void => {
        const heading = text.current?.querySelector<HTMLElement>(`#${CSS.escape(ANCHOR_PREFIX + anchor)}`);
        if (heading) {
            clicked.current = { anchor, at: Date.now() };
            setActive(anchor);
            heading.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
        }
    };

    // Open at the function under the cursor, or where the reader left off. After the text is on
    // screen: a scrollTop set before the content has a height clamps to 0.
    useEffect(() => {
        const section = sectionOf(entries, word);
        const stored = Number(readStorage(scrollKey));
        let second = 0;
        const first = requestAnimationFrame(() => {
            second = requestAnimationFrame(() => {
                if (section) {
                    goTo(section, false);
                } else if (text.current && Number.isFinite(stored) && stored > 0) {
                    text.current.scrollTop = stored;
                }
                updateActive();
            });
        });
        return () => {
            cancelAnimationFrame(first);
            cancelAnimationFrame(second);
            cancelAnimationFrame(frame.current);
        };
        // Only when the dialog opens
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep the marked entry in view while the text scrolls.
    useEffect(() => {
        if (active) {
            list.current?.querySelector(`[data-anchor="${CSS.escape(active)}"]`)?.scrollIntoView({ block: 'nearest' });
        }
    }, [active, showContents]);

    const onScroll = (): void => {
        if (!frame.current) {
            frame.current = requestAnimationFrame(() => {
                frame.current = 0;
                writeStorage(scrollKey, String(text.current?.scrollTop || 0));
                updateActive();
            });
        }
    };

    // Rendering 2000 lines of documentation is not free: it must not repeat on every scroll step.
    // goTo reads only refs, so the first one stays valid.
    const rendered = useMemo(
        () => (
            <Markdown
                blocks={blocks}
                base={`${DOC_BASE}${lang}/`}
                onAnchor={(anchor: string) => goTo(anchor)}
            />
        ),
        [blocks, lang],
    );

    return (
        <Dialog
            open
            fullWidth
            maxWidth="lg"
            onClose={onClose}
            slotProps={{ paper: { sx: { height: 'calc(100% - 64px)' } } }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
                <Tooltip
                    title={I18n.t('Contents')}
                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                >
                    <IconButton
                        size="small"
                        color={showContents ? 'primary' : 'default'}
                        onClick={() => {
                            writeStorage(CONTENTS_KEY, String(!showContents));
                            setShowContents(!showContents);
                        }}
                    >
                        <IconContents />
                    </IconButton>
                </Tooltip>
                {I18n.t('Documentation')}
            </DialogTitle>

            <DialogContent
                dividers
                sx={{ display: 'flex', p: 0, minHeight: 0 }}
            >
                {showContents ? (
                    <Box
                        sx={{
                            flex: '0 0 280px',
                            // A long heading wraps instead of widening the list.
                            minWidth: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 0,
                            borderRight: 1,
                            borderColor: 'divider',
                        }}
                    >
                        <Box sx={{ p: 1 }}>
                            <TextField
                                autoFocus
                                fullWidth
                                size="small"
                                variant="outlined"
                                placeholder={I18n.t('Filter')}
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && shown.length) {
                                        goTo(shown[0].anchor);
                                    } else if (e.key === 'Escape' && filter) {
                                        // The first Escape empties the filter, only the next one closes the dialog.
                                        e.stopPropagation();
                                        setFilter('');
                                    }
                                }}
                                slotProps={{
                                    input: {
                                        endAdornment: filter ? (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setFilter('')}
                                                >
                                                    <IconClear fontSize="small" />
                                                </IconButton>
                                            </InputAdornment>
                                        ) : null,
                                    },
                                }}
                            />
                        </Box>
                        <Box
                            ref={list}
                            sx={{ flex: 1, overflowY: 'auto', pb: 1 }}
                        >
                            {shown.map(entry => (
                                <Box
                                    key={entry.anchor}
                                    data-anchor={entry.anchor}
                                    title={entry.text}
                                    onClick={() => goTo(entry.anchor)}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'baseline',
                                        gap: 1,
                                        // Functions indented below their section, so the shape of the document is visible.
                                        pl: entry.level < CONTENTS_DEPTH ? 1.5 : 3,
                                        pr: 1,
                                        py: 0.4,
                                        mt: entry.level < CONTENTS_DEPTH && !filter ? 1 : 0,
                                        cursor: 'pointer',
                                        fontSize: entry.level < CONTENTS_DEPTH ? 14 : 13,
                                        fontWeight: entry.level < CONTENTS_DEPTH ? 500 : 400,
                                        color: entry.anchor === active ? 'primary.main' : 'text.primary',
                                        bgcolor: entry.anchor === active ? 'action.selected' : undefined,
                                        '&:hover': { bgcolor: 'action.hover' },
                                    }}
                                >
                                    <Box
                                        component="span"
                                        sx={{
                                            // A function name stays whole; the description beside it is cut instead.
                                            flexShrink: entry.code ? 0 : 1,
                                            fontFamily: entry.code ? MONOSPACE : undefined,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: entry.code ? 'nowrap' : undefined,
                                            maxWidth: '100%',
                                        }}
                                    >
                                        {entry.name}
                                    </Box>
                                    {entry.description ? (
                                        <Box
                                            component="span"
                                            sx={{
                                                minWidth: 0,
                                                fontSize: 12,
                                                color: 'text.secondary',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {entry.description}
                                        </Box>
                                    ) : null}
                                </Box>
                            ))}
                            {!shown.length ? (
                                <Typography sx={{ px: 1.5, py: 1, fontSize: 13, color: 'text.secondary' }}>
                                    {I18n.t('Nothing found')}
                                </Typography>
                            ) : null}
                        </Box>
                    </Box>
                ) : null}

                <Box
                    ref={text}
                    onScroll={onScroll}
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        overflowY: 'auto',
                        // The headings' offsetTop is measured against the text, for the marked entry.
                        position: 'relative',
                        px: 3,
                        py: 2,
                    }}
                >
                    {rendered}
                </Box>
            </DialogContent>

            <DialogActions>
                <Button
                    variant="contained"
                    color="grey"
                    startIcon={<IconClose />}
                    onClick={onClose}
                >
                    {I18n.t('Close')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
