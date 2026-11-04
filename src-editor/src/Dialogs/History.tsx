import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    List,
    ListItemButton,
    ListItemText,
    Typography,
    Alert,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    Close as IconClose,
    Restore as IconRestore,
    Delete as IconDelete,
    DeleteSweep as IconDeleteAll,
    Fullscreen as IconMaximize,
    FullscreenExit as IconRestoreSize,
    History as IconHistory,
} from '@mui/icons-material';
import { I18n, type AdminConnection, type ThemeType } from '@iobroker/gui-components';

import MonacoDiff from '../Components/MonacoDiff';
import { resizeFrom } from '../Components/Motion';
import Resizer from '../Components/Resizer';

/** The dialog keeps its size (maximized or not) for the next time */
const MAXIMIZED_KEY = 'History.maximized';
/** ... and the width of the list of versions, which can be dragged */
const LIST_WIDTH_KEY = 'History.listWidth';
const LIST_WIDTH_DEFAULT = 280;
const LIST_WIDTH_MIN = 150;
/** The diff keeps at least this width, when the list grows */
const DIFF_WIDTH_MIN = 300;

function readListWidth(): number {
    const width = parseInt(window.localStorage.getItem(LIST_WIDTH_KEY) || '', 10);
    return width >= LIST_WIDTH_MIN ? width : LIST_WIDTH_DEFAULT;
}

/** One stored version, as the adapter lists it - without its source */
interface ScriptVersion {
    ts: number;
    from?: string;
    user?: string;
    size: number;
    lines: number;
    protected?: boolean;
}

interface DialogHistoryProps {
    socket: AdminConnection;
    /** The javascript instance that keeps the history, e.g. `javascript.0` */
    instanceId: string;
    /** Id of the script whose history is shown */
    scriptId: string;
    /** The script as it currently is in the editor */
    currentCode: string;
    language: 'javascript' | 'typescript';
    themeType: ThemeType;
    /** Puts the chosen version into the editor. Saving stays the user's decision. */
    onRestore: (source: string) => void;
    onClose: () => void;
}

/**
 * Lists the saved versions of a script, shows what each of them changed, and puts one back.
 *
 * Restoring writes into the editor and not into the objects database: the usual Save/Cancel state
 * follows, so a restore that turns out to be wrong is one click away from being undone.
 */
const DialogHistory: React.FC<DialogHistoryProps> = ({
    socket,
    instanceId,
    scriptId,
    currentCode,
    language,
    themeType,
    onRestore,
    onClose,
}) => {
    const [versions, setVersions] = useState<ScriptVersion[] | null>(null);
    const [selected, setSelected] = useState<number | null>(null);
    const [source, setSource] = useState<string | null>(null);
    const [error, setError] = useState<string>('');
    const [loadingSource, setLoadingSource] = useState(false);
    const [maximized, setMaximized] = useState(() => window.localStorage.getItem(MAXIMIZED_KEY) === 'true');
    const [listWidth, setListWidth] = useState(readListWidth);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    /** The width of the list, when the drag of its border started */
    const widthBefore = useRef(LIST_WIDTH_DEFAULT);
    const widthNow = useRef(listWidth);

    const resizeList = (width: number): void => {
        const max = (contentRef.current?.clientWidth || 0) - DIFF_WIDTH_MIN;
        const value = Math.round(Math.max(LIST_WIDTH_MIN, Math.min(width, max)));
        widthNow.current = value;
        setListWidth(value);
    };
    /** The size of the dialog before it was maximized or restored: it grows or shrinks from there */
    const sizeBefore = useRef<DOMRect | null>(null);

    const toggleMaximized = (): void => {
        sizeBefore.current =
            titleRef.current?.closest<HTMLElement>('.MuiDialog-paper')?.getBoundingClientRect() || null;
        const value = !maximized;
        window.localStorage.setItem(MAXIMIZED_KEY, value ? 'true' : 'false');
        setMaximized(value);
    };

    useLayoutEffect(() => {
        const from = sizeBefore.current;
        sizeBefore.current = null;
        resizeFrom(titleRef.current?.closest<HTMLElement>('.MuiDialog-paper'), from);
    }, [maximized]);

    /** (Re-)read the list, keeping the selection if that version is still there */
    const reload = useCallback(
        (keepSelected?: number | null): Promise<void> =>
            socket
                .sendTo(instanceId, 'getScriptVersions', { id: scriptId })
                .then((result: { versions?: ScriptVersion[]; error?: string }) => {
                    if (result?.error) {
                        setError(result.error);
                        setVersions([]);
                        return;
                    }
                    const list = result?.versions || [];
                    setVersions(list);
                    setSelected(
                        list.some(v => v.ts === keepSelected) ? (keepSelected as number) : (list[0]?.ts ?? null),
                    );
                })
                .catch((e: unknown) => setError(String(e))),
        [socket, instanceId, scriptId],
    );

    useEffect(() => {
        void reload();
    }, [reload]);

    /**
     * Remove one version, or the whole history of this script.
     *
     * @param ts the version to remove; without it everything goes
     */
    const remove = useCallback(
        async (ts?: number): Promise<void> => {
            const result: { error?: string } = await socket.sendTo(instanceId, 'deleteHistory', {
                id: scriptId,
                ...(ts ? { ts } : {}),
            });
            if (result?.error) {
                setError(result.error);
                return;
            }
            await reload(ts ? selected : null);
        },
        [socket, instanceId, scriptId, reload, selected],
    );

    useEffect(() => {
        if (selected === null) {
            setSource(null);
            return;
        }
        let cancelled = false;
        setLoadingSource(true);
        void socket
            .sendTo(instanceId, 'getScriptVersion', { id: scriptId, ts: selected })
            .then((result: { source?: string; error?: string }) => {
                if (cancelled) {
                    return;
                }
                setLoadingSource(false);
                if (result?.error) {
                    setError(result.error);
                    setSource(null);
                } else {
                    setError('');
                    setSource(result?.source ?? '');
                }
            })
            .catch((e: unknown) => {
                if (!cancelled) {
                    setLoadingSource(false);
                    setError(String(e));
                }
            });
        return () => {
            cancelled = true;
        };
    }, [socket, instanceId, scriptId, selected]);

    /** Who saved it, without the noise of the full ioBroker ids */
    const author = useCallback((version: ScriptVersion): string => {
        const user = (version.user || '').replace(/^system\.user\./, '');
        const from = (version.from || '').replace(/^system\.adapter\./, '');
        return [user, from].filter(Boolean).join(' · ');
    }, []);

    const current = versions?.find(v => v.ts === selected);

    return (
        <Dialog
            open={!0}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            // maximized, the diff gets the whole window
            fullScreen={maximized}
            sx={maximized ? undefined : { '& .MuiDialog-paper': { height: 'calc(100% - 64px)' } }}
        >
            <DialogTitle
                ref={titleRef}
                sx={{ display: 'flex', alignItems: 'center', pr: 1 }}
                // like a window: a double click on the title bar maximizes the dialog or restores its size
                onDoubleClick={toggleMaximized}
            >
                {/* the same symbol as the button, which opens the dialog; it turns back once */}
                <IconHistory
                    className="iob-js-rewind"
                    sx={{ mr: 1, color: 'primary.main' }}
                />
                {I18n.t('Script history')}
                <Typography
                    component="span"
                    sx={{ ml: 1, flex: 1, color: 'text.secondary' }}
                >
                    {scriptId.replace(/^script\.js\./, '')}
                </Typography>
                <Tooltip title={maximized ? I18n.t('Restore size') : I18n.t('Maximize')}>
                    <IconButton
                        onClick={toggleMaximized}
                        onDoubleClick={e => e.stopPropagation()}
                    >
                        {maximized ? <IconRestoreSize /> : <IconMaximize />}
                    </IconButton>
                </Tooltip>
            </DialogTitle>
            <DialogContent
                ref={contentRef}
                sx={{ display: 'flex', p: 0, overflow: 'hidden', gap: 0 }}
            >
                <Box
                    ref={listRef}
                    sx={{
                        width: listWidth,
                        // in a small window the diff keeps its place, the list gives way
                        maxWidth: `calc(100% - ${DIFF_WIDTH_MIN}px)`,
                        minWidth: LIST_WIDTH_MIN,
                        flexShrink: 0,
                        overflow: 'auto',
                    }}
                >
                    {versions === null ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                            <CircularProgress size={20} />
                        </Box>
                    ) : null}
                    {versions?.length === 0 ? (
                        <Typography
                            variant="body2"
                            sx={{ p: 2, color: 'text.secondary' }}
                        >
                            {I18n.t('No versions stored yet. They are written from the next save on.')}
                        </Typography>
                    ) : null}
                    <List dense>
                        {(versions || []).map((version, i) => {
                            const previous = versions?.[i + 1];
                            const delta = previous ? version.lines - previous.lines : 0;
                            return (
                                <ListItemButton
                                    key={version.ts}
                                    selected={version.ts === selected}
                                    onClick={() => setSelected(version.ts)}
                                >
                                    <ListItemText
                                        primary={new Date(version.ts).toLocaleString()}
                                        secondary={`${version.lines} ${I18n.t('lines')}${
                                            delta ? ` (${delta > 0 ? '+' : ''}${delta})` : ''
                                        }${author(version) ? ` · ${author(version)}` : ''}`}
                                    />
                                    <Tooltip title={I18n.t('Delete this version')}>
                                        <IconButton
                                            size="small"
                                            onClick={e => {
                                                // The row below would take the click as a selection
                                                e.stopPropagation();
                                                void remove(version.ts);
                                            }}
                                        >
                                            <IconDelete fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </ListItemButton>
                            );
                        })}
                    </List>
                </Box>
                <Resizer
                    title={I18n.t('Drag to change the width, double click for the default width')}
                    onResizeStart={() => {
                        widthBefore.current = listRef.current?.getBoundingClientRect().width || listWidth;
                    }}
                    onResize={delta => resizeList(widthBefore.current + delta)}
                    onResizeEnd={() => window.localStorage.setItem(LIST_WIDTH_KEY, String(widthNow.current))}
                    onReset={() => {
                        window.localStorage.removeItem(LIST_WIDTH_KEY);
                        widthNow.current = LIST_WIDTH_DEFAULT;
                        setListWidth(LIST_WIDTH_DEFAULT);
                    }}
                />
                <Box sx={{ display: 'flex', flex: 1, minWidth: 0, flexDirection: 'column', position: 'relative' }}>
                    {error ? <Alert severity="error">{error}</Alert> : null}
                    {current?.protected && source !== null ? (
                        <Alert severity="info">
                            {I18n.t('This script is protected, its versions are stored encrypted.')}
                        </Alert>
                    ) : null}
                    {loadingSource ? (
                        // over the diff of the version before: the diff stays, so does its divider
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                display: 'flex',
                                justifyContent: 'center',
                                p: 2,
                                zIndex: 1,
                                pointerEvents: 'none',
                            }}
                        >
                            <CircularProgress size={20} />
                        </Box>
                    ) : null}
                    {source !== null ? (
                        <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
                            <MonacoDiff
                                originalCode={source}
                                modifiedCode={currentCode}
                                language={language}
                                themeType={themeType}
                                readOnly
                                navigation
                            />
                        </Box>
                    ) : null}
                </Box>
            </DialogContent>
            <DialogActions>
                <Typography
                    variant="caption"
                    sx={{ flex: 1, ml: 2, color: 'text.secondary' }}
                >
                    {I18n.t('Left: the selected version. Right: the editor.')}
                </Typography>
                <Button
                    color="error"
                    disabled={!versions?.length}
                    onClick={() => void remove()}
                    startIcon={<IconDeleteAll />}
                >
                    {I18n.t('Delete the whole history')}
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    // the same as in the editor: nothing to take over
                    disabled={source === null || loadingSource || source === currentCode}
                    onClick={() => {
                        if (source !== null) {
                            onRestore(source);
                            onClose();
                        }
                    }}
                    startIcon={<IconRestore />}
                >
                    {I18n.t('Take over into the editor')}
                </Button>
                <Button
                    variant="contained"
                    color="grey"
                    onClick={onClose}
                    startIcon={<IconClose />}
                >
                    {I18n.t('Close')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DialogHistory;
