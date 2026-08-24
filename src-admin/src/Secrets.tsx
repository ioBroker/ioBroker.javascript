import React from 'react';

import { ThemeProvider } from '@mui/material/styles';
import {
    Alert,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import { ContentCopy as IconCopy } from '@mui/icons-material';

import { I18n, Theme, Utils } from '@iobroker/gui-components';
import { ConfigGeneric, type ConfigGenericProps, type ConfigGenericState } from '@iobroker/json-config';

/** One credential of the central store: its name and the fields it has - never a value */
interface SecretStructure {
    name: string;
    fields: string[];
}

type SecretsState = ConfigGenericState & {
    theme: string;
    secrets: SecretStructure[] | null;
    error: string;
};

/**
 * Shows which credentials the central store holds and how a script addresses them.
 *
 * The adapter only reports the names and the field names - the decrypted values never leave the
 * backend, so this table can be shown to everyone who may open the instance settings.
 */
class Secrets extends ConfigGeneric<ConfigGenericProps, SecretsState> {
    private mounted = false;

    constructor(props: ConfigGenericProps) {
        super(props);
        Object.assign(this.state, {
            theme: Theme(this.props.themeName || 'light'),
            secrets: null,
            error: '',
        });
    }

    async componentDidMount(): Promise<void> {
        await super.componentDidMount();
        this.mounted = true;
        await this.readSecrets();
    }

    componentWillUnmount(): void {
        this.mounted = false;
    }

    async readSecrets(): Promise<void> {
        if (!this.props.alive) {
            return;
        }
        try {
            const result: { secrets?: SecretStructure[] } = await this.props.oContext.socket.sendTo(
                `${this.props.oContext.adapterName}.${this.props.oContext.instance}`,
                'getSecrets',
                null,
            );
            if (this.mounted) {
                this.setState({ secrets: result?.secrets || [], error: '' });
            }
        } catch (e) {
            if (this.mounted) {
                this.setState({ secrets: [], error: (e as Error).message || String(e) });
            }
        }
    }

    /**
     * The expression a script uses for one field, e.g. `SECRETS.CameraPassword.key`
     *
     * @param name Name of the credential
     * @param field Name of the field, e.g. `key`
     */
    static expression(name: string, field: string): string {
        // Only a name that is a valid identifier can be written with a dot
        return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)
            ? `SECRETS.${name}.${field}`
            : `SECRETS['${name.replace(/'/g, "\\'")}'].${field}`;
    }

    renderRows(): React.JSX.Element[] {
        const rows: React.JSX.Element[] = [];

        for (const secret of this.state.secrets || []) {
            for (let f = 0; f < secret.fields.length; f++) {
                const field = secret.fields[f];
                const code = Secrets.expression(secret.name, field);

                rows.push(
                    <TableRow key={`${secret.name}.${field}`}>
                        {/* The name spans all the fields of the credential */}
                        {f === 0 ? <TableCell rowSpan={secret.fields.length}>{secret.name}</TableCell> : null}
                        <TableCell>{field}</TableCell>
                        <TableCell>
                            <code>{code}</code>
                            <Tooltip title={I18n.t('Copy to clipboard')}>
                                <IconButton
                                    size="small"
                                    style={{ marginLeft: 8 }}
                                    onClick={() => Utils.copyToClipboard(code)}
                                >
                                    <IconCopy fontSize="inherit" />
                                </IconButton>
                            </Tooltip>
                        </TableCell>
                    </TableRow>,
                );
            }
        }

        return rows;
    }

    renderItem(): React.JSX.Element {
        const disabled = ConfigGeneric.getValue(this.props.data, 'enableSecrets') === false;

        return (
            <ThemeProvider theme={this.state.theme}>
                <div style={{ width: '100%' }}>
                    <Typography
                        variant="body2"
                        style={{ marginBottom: 8 }}
                    >
                        {I18n.t(
                            'The credentials are managed in the admin under "Basic settings" -> "Credentials". A script reads them like this:',
                        )}
                    </Typography>

                    {disabled ? (
                        <Alert
                            severity="warning"
                            style={{ marginBottom: 8 }}
                        >
                            {I18n.t('The access to the credentials is switched off, so SECRETS is empty.')}
                        </Alert>
                    ) : null}

                    {!this.props.alive ? (
                        <Alert severity="info">
                            {I18n.t('The instance is not running, so the credentials cannot be read.')}
                        </Alert>
                    ) : this.state.error ? (
                        <Alert severity="error">{this.state.error}</Alert>
                    ) : this.state.secrets === null ? (
                        <Typography variant="body2">{I18n.t('Reading credentials...')}</Typography>
                    ) : !this.state.secrets.length ? (
                        <Alert severity="info">{I18n.t('No credentials defined yet.')}</Alert>
                    ) : (
                        <TableContainer component={Paper}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{I18n.t('Credential')}</TableCell>
                                        <TableCell>{I18n.t('Field')}</TableCell>
                                        <TableCell>{I18n.t('Usage in a script')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>{this.renderRows()}</TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </div>
            </ThemeProvider>
        );
    }
}

export default Secrets;
