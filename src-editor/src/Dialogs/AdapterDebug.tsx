import React from 'react';

import {
    Button,
    DialogTitle,
    DialogContent,
    DialogActions,
    Dialog,
    ListItemIcon,
    List,
    Grid2,
    ListItemText,
    Input,
    InputAdornment,
    IconButton,
    ListItemButton,
} from '@mui/material';

import { Check as IconOk, Cancel as IconCancel, Close as IconClose } from '@mui/icons-material';

import { type AdminConnection, I18n } from '@iobroker/adapter-react-v5';

const styles: Record<string, React.CSSProperties> = {
    buttonIcon: {
        marginRight: 8,
    },
    icon: {
        width: 24,
        height: 24,
    },
    filter: {
        width: '100%',
    },
    filterWithButton: {
        width: '100%',
    },
    title: {
        fontWeight: 'bold',
        marginTop: 16,
    },
};

interface DialogAdapterDebugProps {
    socket: AdminConnection;
    onDebug: (instance: string, adapterToDebug: string) => void;
    onClose: () => void;
    title?: string;
}
interface DialogAdapterDebugState {
    instances: {
        id: string;
        enabled: boolean;
        host: string;
        icon: string;
    }[];
    jsInstance: string;
    filter: string;
    showAskForStop: boolean;
    jsInstanceHost: string;
    adapterToDebug: string;
}

class DialogAdapterDebug extends React.Component<DialogAdapterDebugProps, DialogAdapterDebugState> {
    constructor(props: DialogAdapterDebugProps) {
        super(props);
        this.state = {
            instances: [],
            filter: window.localStorage.getItem('javascript.debug.filter') || '',
            showAskForStop: false,
            jsInstance: window.localStorage.getItem('javascript.debug.instance') || '',
            jsInstanceHost: '',
            adapterToDebug: window.localStorage.getItem('javascript.debug.adapter') || '',
        };
    }

    componentDidMount(): void {
        void this.props.socket.getAdapterInstances().then(oInstances => {
            const instances: {
                id: string;
                enabled: boolean;
                host: string;
                icon: string;
            }[] = oInstances
                .filter(i => i && !i.common?.onlyWWW)
                .map(item => {
                    const name = item._id.replace(/^system\.adapter\./, '');
                    const [adapter] = name.split('.');
                    return {
                        id: name,
                        enabled: item.common?.enabled,
                        host: item.common?.host,
                        icon: item.common?.icon ? `../../adapter/${adapter}/${item.common.icon}` : '',
                    };
                });
            instances.sort((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0));
            let jsInstance: string = this.state.jsInstance || '';
            const jsInstanceObj = this.state.jsInstance
                ? instances.find(item => item.id === this.state.jsInstance)
                : null;
            let jsInstanceHost: string;

            // check if selected instance is in the list
            if (!this.state.jsInstance || !jsInstanceObj) {
                const oJsInstance = instances.find(item => item.id.startsWith('javascript.')); // take the first one
                jsInstanceHost = oJsInstance?.host || '';
                jsInstance = oJsInstance?.id || '';
            } else {
                jsInstanceHost = jsInstanceObj?.host || '';
            }

            let adapterToDebug = this.state.adapterToDebug || '';
            if (adapterToDebug && !instances.find(item => item.id === adapterToDebug)) {
                adapterToDebug = '';
            }

            this.setState({ instances, jsInstance, adapterToDebug, jsInstanceHost });
        });
    }

    handleOk = (): void => {
        // TODO
        if (this.state.instances.find(item => item.id === this.state.adapterToDebug)?.enabled) {
            void this.props.socket.getObject(`system.adapter.${this.state.adapterToDebug}`).then(obj => {
                if (obj) {
                    obj.common.enabled = false;
                    void this.props.socket
                        .setObject(obj._id, obj)
                        .then(() => this.props.onDebug(this.state.jsInstance, this.state.adapterToDebug));
                }
            });
            return;
        }
        this.props.onDebug(this.state.jsInstance, this.state.adapterToDebug);
    };

    renderJavascriptList(): React.JSX.Element | null {
        const js = this.state.instances.filter(item => item.id.startsWith('javascript.'));
        if (js.length < 2) {
            return null;
        }
        return (
            <Grid2>
                <div style={styles.title}>{I18n.t('Host')}</div>
                <List component="nav">
                    {js.map(item => (
                        <ListItemButton
                            component="div"
                            key={item.id}
                            selected={this.state.jsInstance === item.id}
                            onClick={() => this.setState({ jsInstance: item.id, jsInstanceHost: item.host })}
                        >
                            <ListItemIcon>
                                <img
                                    src={item.icon}
                                    alt={item.id}
                                    style={styles.icon}
                                />
                            </ListItemIcon>
                            <ListItemText primary={item.id} />
                        </ListItemButton>
                    ))}
                </List>
            </Grid2>
        );
    }

    renderInstances(): React.JSX.Element {
        if (!this.state.jsInstance) {
            return <Grid2 />;
        }
        const instances = this.state.instances.filter(
            item =>
                item.id !== this.state.jsInstance &&
                item.host === this.state.jsInstanceHost &&
                (!this.state.filter || item.id.includes(this.state.filter.toLowerCase())),
        );

        return (
            <Grid2>
                <div style={styles.title}>{I18n.t('Instances')}</div>
                <List component="nav">
                    {instances.map(item => (
                        <ListItemButton
                            key={item.id}
                            selected={this.state.adapterToDebug === item.id}
                            onDoubleClick={() => this.setState({ adapterToDebug: item.id }, () => this.handleOk())}
                            onClick={() => this.setState({ adapterToDebug: item.id })}
                        >
                            <ListItemIcon>
                                <img
                                    src={item.icon}
                                    alt={item.id}
                                    style={styles.icon}
                                />
                            </ListItemIcon>
                            <ListItemText primary={item.id} />
                        </ListItemButton>
                    ))}
                </List>
            </Grid2>
        );
    }

    render(): React.JSX.Element {
        return (
            <Dialog
                maxWidth="md"
                fullWidth={false}
                open={!0}
                onClose={() => false}
                aria-labelledby="confirmation-dialog-title"
            >
                <DialogTitle id="confirmation-dialog-title">{this.props.title || I18n.t('Debug instance')}</DialogTitle>
                <DialogContent>
                    <Grid2
                        container
                        direction="column"
                    >
                        <Grid2>
                            <Input
                                style={styles.filterWithButton}
                                value={this.state.filter}
                                placeholder={I18n.t('Filter')}
                                onChange={e => {
                                    this.setState({ filter: e.target.value });
                                    window.localStorage.setItem('javascript.debug.filter', e.target.value);
                                }}
                                endAdornment={
                                    <InputAdornment position="end">
                                        {this.state.filter ? (
                                            <IconButton
                                                size="small"
                                                aria-label="toggle password visibility"
                                                onClick={() => this.setState({ filter: '' })}
                                            >
                                                <IconClose />
                                            </IconButton>
                                        ) : (
                                            ''
                                        )}
                                    </InputAdornment>
                                }
                            />
                        </Grid2>
                        <Grid2>
                            <Grid2 container>
                                {this.renderJavascriptList()}
                                {this.renderInstances()}
                            </Grid2>
                        </Grid2>
                    </Grid2>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        onClick={this.handleOk}
                        disabled={!this.state.jsInstance || !this.state.adapterToDebug}
                        color="primary"
                        startIcon={<IconOk />}
                    >
                        {I18n.t('Start')}
                    </Button>
                    <Button
                        color="grey"
                        variant="contained"
                        onClick={() => this.props.onClose()}
                        startIcon={<IconCancel />}
                    >
                        {I18n.t('Close')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default DialogAdapterDebug;
