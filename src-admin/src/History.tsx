import React from 'react';

import { ThemeProvider } from '@mui/material/styles';
import {
    Alert,
    Button,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableFooter,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import { Delete as IconDelete, DeleteSweep as IconDeleteAll } from '@mui/icons-material';

import { I18n, Theme, DialogConfirm } from '@iobroker/gui-components';
import { ConfigGeneric, type ConfigGenericProps, type ConfigGenericState } from '@iobroker/json-config';

/** What one script's history occupies */
interface HistoryRow {
    id: string;
    /** `false` once the script itself is gone - its history is kept so it can be recovered */
    exists: boolean;
    versions: number;
    bytes: number;
}

interface HistoryUsage {
    rows: HistoryRow[];
    total: { scripts: number; versions: number; bytes: number };
}

/** What a confirmation is about, so the dialog can ask the right question */
type PendingDelete = { kind: 'script'; id: string } | { kind: 'orphans' } | { kind: 'all' };

type HistoryState = ConfigGenericState & {
    theme: string;
    usage: HistoryUsage | null;
    error: string;
    busy: boolean;
    confirm: PendingDelete | null;
};

/**
 * What the script history occupies, and the means to get rid of it.
 *
 * A custom component and not the `textSendTo` field it replaces: that one renders the answer of
 * the adapter as HTML, which cannot carry a button per row.
 */
class History extends ConfigGeneric<ConfigGenericProps, HistoryState> {
    private mounted = false;

    constructor(props: ConfigGenericProps) {
        super(props);
        Object.assign(this.state, {
            theme: Theme(this.props.themeName || 'light'),
            usage: null,
            error: '',
            busy: false,
            confirm: null,
        });
    }

    async componentDidMount(): Promise<void> {
        await super.componentDidMount();
        this.mounted = true;
        await this.readUsage();
    }

    componentWillUnmount(): void {
        this.mounted = false;
    }

    /** The instance whose history is shown */
    private get instanceId(): string {
        return `${this.props.oContext.adapterName}.${this.props.oContext.instance}`;
    }

    async readUsage(): Promise<void> {
        if (!this.props.alive) {
            return;
        }
        try {
            const result: HistoryUsage = await this.props.oContext.socket.sendTo(
                this.instanceId,
                'getHistoryUsage',
                null,
            );
            if (this.mounted) {
                this.setState({
                    usage: result || { rows: [], total: { scripts: 0, versions: 0, bytes: 0 } },
                    error: '',
                });
            }
        } catch (e) {
            if (this.mounted) {
                this.setState({
                    usage: { rows: [], total: { scripts: 0, versions: 0, bytes: 0 } },
                    error: (e as Error).message || String(e),
                });
            }
        }
    }

    /**
     * Carry out a deletion and show what is left afterwards.
     *
     * @param what which history or histories to remove
     */
    async remove(what: PendingDelete): Promise<void> {
        this.setState({ busy: true });
        try {
            const message =
                what.kind === 'script' ? { id: what.id } : what.kind === 'orphans' ? { orphans: true } : { all: true };
            const result: { error?: string } = await this.props.oContext.socket.sendTo(
                this.instanceId,
                'deleteHistory',
                message,
            );
            if (this.mounted && result?.error) {
                this.setState({ error: result.error });
            }
        } catch (e) {
            if (this.mounted) {
                this.setState({ error: (e as Error).message || String(e) });
            }
        }
        if (this.mounted) {
            this.setState({ busy: false });
            await this.readUsage();
        }
    }

    /**
     * A size a human can read at a glance.
     *
     * @param bytes the number of bytes
     */
    static formatBytes(bytes: number): string {
        if (bytes < 1024) {
            return `${bytes} B`;
        }
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }

    renderConfirmDialog(): React.JSX.Element | null {
        const pending = this.state.confirm;
        if (!pending) {
            return null;
        }
        const text =
            pending.kind === 'script'
                ? I18n.t(
                      'All saved versions of "%s" are removed. The script itself stays.',
                      pending.id.replace(/^script\.js\./, ''),
                  )
                : pending.kind === 'orphans'
                  ? I18n.t('The saved versions of scripts that no longer exist are removed.')
                  : I18n.t('The history of every script is removed. The scripts themselves stay.');

        return (
            <DialogConfirm
                title={I18n.t('Delete history')}
                text={`${text} ${I18n.t('This cannot be undone.')}`}
                ok={I18n.t('Delete')}
                cancel={I18n.t('Cancel')}
                onClose={(isOk: boolean) => {
                    this.setState({ confirm: null });
                    if (isOk) {
                        void this.remove(pending);
                    }
                }}
            />
        );
    }

    renderRows(): React.JSX.Element[] {
        return (this.state.usage?.rows || []).map(row => (
            <TableRow key={row.id}>
                <TableCell style={row.exists ? undefined : { opacity: 0.6 }}>
                    {row.id.replace(/^script\.js\./, '')}
                    {row.exists ? null : <i> ({I18n.t('script deleted')})</i>}
                </TableCell>
                <TableCell align="right">{row.versions}</TableCell>
                <TableCell align="right">{History.formatBytes(row.bytes)}</TableCell>
                <TableCell
                    align="right"
                    style={{ width: 48 }}
                >
                    <Tooltip title={I18n.t('Delete the history of this script')}>
                        <span>
                            <IconButton
                                size="small"
                                disabled={this.state.busy}
                                onClick={() => this.setState({ confirm: { kind: 'script', id: row.id } })}
                            >
                                <IconDelete fontSize="inherit" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </TableCell>
            </TableRow>
        ));
    }

    renderItem(): React.JSX.Element {
        const usage = this.state.usage;
        const hasOrphans = !!usage?.rows.some(row => !row.exists);

        return (
            <ThemeProvider theme={this.state.theme}>
                <div style={{ width: '100%' }}>
                    {this.renderConfirmDialog()}

                    {!this.props.alive ? (
                        <Alert severity="info">
                            {I18n.t('The instance is not running, so the history cannot be read.')}
                        </Alert>
                    ) : this.state.error ? (
                        <Alert severity="error">{this.state.error}</Alert>
                    ) : usage === null ? (
                        <Typography variant="body2">{I18n.t('Reading the history...')}</Typography>
                    ) : !usage.rows.length ? (
                        <Alert severity="info">{I18n.t('No script history stored')}</Alert>
                    ) : (
                        <>
                            <TableContainer component={Paper}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>{I18n.t('Script')}</TableCell>
                                            <TableCell align="right">{I18n.t('Versions')}</TableCell>
                                            <TableCell align="right">{I18n.t('Size')}</TableCell>
                                            <TableCell />
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>{this.renderRows()}</TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell>
                                                <b>{I18n.t('Total')}</b>
                                            </TableCell>
                                            <TableCell align="right">
                                                <b>{usage.total.versions}</b>
                                            </TableCell>
                                            <TableCell align="right">
                                                <b>{History.formatBytes(usage.total.bytes)}</b>
                                            </TableCell>
                                            <TableCell />
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </TableContainer>

                            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {hasOrphans ? (
                                    <Button
                                        variant="outlined"
                                        disabled={this.state.busy}
                                        startIcon={<IconDelete />}
                                        onClick={() => this.setState({ confirm: { kind: 'orphans' } })}
                                    >
                                        {I18n.t('Delete histories of deleted scripts')}
                                    </Button>
                                ) : null}
                                <Button
                                    variant="outlined"
                                    color="error"
                                    disabled={this.state.busy}
                                    startIcon={<IconDeleteAll />}
                                    onClick={() => this.setState({ confirm: { kind: 'all' } })}
                                >
                                    {I18n.t('Delete all stored versions')}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </ThemeProvider>
        );
    }
}

export default History;
