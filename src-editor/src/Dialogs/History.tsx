import React, { useCallback, useEffect, useState } from 'react';
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
} from '@mui/icons-material';
import { I18n, type AdminConnection, type ThemeType } from '@iobroker/gui-components';

import MonacoDiff from '../Components/MonacoDiff';

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
            sx={{ '& .MuiDialog-paper': { height: 'calc(100% - 64px)' } }}
        >
            <DialogTitle>
                {I18n.t('Script history')}
                <Typography
                    component="span"
                    sx={{ ml: 1, color: 'text.secondary' }}
                >
                    {scriptId.replace(/^script\.js\./, '')}
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', p: 0, overflow: 'hidden', gap: 0 }}>
                <Box
                    sx={{
                        width: 280,
                        flexShrink: 0,
                        overflow: 'auto',
                        borderRight: '1px solid',
                        borderColor: 'divider',
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
                <Box sx={{ display: 'flex', flex: 1, minWidth: 0, flexDirection: 'column' }}>
                    {error ? <Alert severity="error">{error}</Alert> : null}
                    {current?.protected && source !== null ? (
                        <Alert severity="info">
                            {I18n.t('This script is protected, its versions are stored encrypted.')}
                        </Alert>
                    ) : null}
                    {loadingSource ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                            <CircularProgress size={20} />
                        </Box>
                    ) : null}
                    {source !== null && !loadingSource ? (
                        <Box sx={{ flex: 1, minHeight: 0 }}>
                            <MonacoDiff
                                originalCode={source}
                                modifiedCode={currentCode}
                                language={language}
                                themeType={themeType}
                                readOnly
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
                    disabled={source === null || loadingSource}
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
