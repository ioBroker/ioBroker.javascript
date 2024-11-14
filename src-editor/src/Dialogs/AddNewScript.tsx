import React from 'react';

import {
    Button,
    DialogTitle,
    DialogContent,
    DialogActions,
    Dialog,
    Card,
    CardActionArea,
    CardActions,
    CardContent,
    CardMedia,
} from '@mui/material';

import { Cancel as IconCancel } from '@mui/icons-material';

import { I18n } from '@iobroker/adapter-react-v5';

import ImgJS from '../assets/tileJS.png';
import ImgTS from '../assets/tileTS.png';
import ImgBlockly from '../assets/tileBlockly.png';
import ImgRules from '../assets/tileRules.png';

const styles: Record<string, React.CSSProperties> = {
    card: {
        maxWidth: 345,
        minWidth: 250,
        display: 'inline-block',
        margin: '0 10px 0 10px',
    },
    media: {
        height: 122,
    },
    text: {
        maxWidth: 218,
        minHeight: 30,
    },
    complexity: {
        fontWeight: 'bold',
        fontStyle: 'italic',
        marginBottom: 8,
    },
};

interface DialogAddNewProps {
    onClose: (type?: 'TypeScript/ts' | 'Javascript/js' | 'Blockly' | 'Rules') => void;
}

class DialogAddNew extends React.Component<DialogAddNewProps> {
    handleCancel = (): void => {
        this.props.onClose();
    };

    static openHtml(html: string): void {
        const lang = I18n.getLanguage();
        if (!html.includes('javascript.md') && (lang === 'de' || lang === 'ru')) {
            html = html.replace(/\/en\//, `/${lang}/`);
        }
        const win: Window | null = window.open(html, '_blank');
        win?.focus();
    }

    getJSCard(): React.JSX.Element {
        return (
            <Card style={styles.card}>
                <CardActionArea onClick={() => this.props.onClose && this.props.onClose('Javascript/js')}>
                    <CardMedia
                        style={styles.media}
                        image={ImgJS}
                        title="JavaScript"
                    />
                    <CardContent>
                        <h2>JavaScript</h2>
                        <div style={styles.complexity}>{I18n.t('for programmers')}</div>
                        <div style={styles.text}>{I18n.t('JS description')}</div>
                    </CardContent>
                </CardActionArea>
                <CardActions>
                    <Button
                        size="small"
                        color="primary"
                        variant="contained"
                        onClick={() => this.props.onClose && this.props.onClose('Javascript/js')}
                    >
                        {I18n.t('Add')}
                    </Button>
                    <Button
                        size="small"
                        color="secondary"
                        onClick={() =>
                            DialogAddNew.openHtml(
                                'https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md',
                            )
                        }
                    >
                        {I18n.t('Learn More')}
                    </Button>
                </CardActions>
            </Card>
        );
    }

    getTSCard(): React.JSX.Element {
        return (
            <Card style={styles.card}>
                <CardActionArea onClick={() => this.props.onClose && this.props.onClose('TypeScript/ts')}>
                    <CardMedia
                        style={styles.media}
                        image={ImgTS}
                        title="TypeScript"
                    />
                    <CardContent>
                        <h2>TypeScript</h2>
                        <div style={styles.complexity}>{I18n.t('for professionals')}</div>
                        <div style={styles.text}>{I18n.t('TS description')}</div>
                    </CardContent>
                </CardActionArea>
                <CardActions>
                    <Button
                        size="small"
                        color="primary"
                        variant="contained"
                        onClick={() => this.props.onClose && this.props.onClose('TypeScript/ts')}
                    >
                        {I18n.t('Add')}
                    </Button>
                    <Button
                        size="small"
                        color="secondary"
                        onClick={() =>
                            DialogAddNew.openHtml(
                                'https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md',
                            )
                        }
                    >
                        {I18n.t('Learn More')}
                    </Button>
                </CardActions>
            </Card>
        );
    }

    getBlocklyCard(): React.JSX.Element {
        return (
            <Card style={styles.card}>
                <CardActionArea onClick={() => this.props.onClose && this.props.onClose('Blockly')}>
                    <CardMedia
                        style={styles.media}
                        image={ImgBlockly}
                        title="Blockly"
                    />
                    <CardContent>
                        <h2>Blockly</h2>
                        <div style={styles.complexity}>{I18n.t('normal')}</div>
                        <div style={styles.text}>{I18n.t('Blockly description')}</div>
                    </CardContent>
                </CardActionArea>
                <CardActions>
                    <Button
                        size="small"
                        color="primary"
                        variant="contained"
                        onClick={() => this.props.onClose && this.props.onClose('Blockly')}
                    >
                        {I18n.t('Add')}
                    </Button>
                    <Button
                        size="small"
                        color="secondary"
                        onClick={() =>
                            DialogAddNew.openHtml(
                                'https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/blockly.md',
                            )
                        }
                    >
                        {I18n.t('Learn More')}
                    </Button>
                </CardActions>
            </Card>
        );
    }

    getRulesCard(): React.JSX.Element {
        return (
            <Card style={styles.card}>
                <CardActionArea onClick={() => this.props.onClose && this.props.onClose('Rules')}>
                    <CardMedia
                        style={styles.media}
                        image={ImgRules}
                        title="Rules"
                    />
                    <CardContent>
                        <h2>Rules</h2>
                        <div style={styles.complexity}>{I18n.t('easy')}</div>
                        <div style={styles.text}>{I18n.t('Rules description')}</div>
                    </CardContent>
                </CardActionArea>
                <CardActions>
                    <Button
                        size="small"
                        color="primary"
                        variant="contained"
                        onClick={() => this.props.onClose && this.props.onClose('Rules')}
                    >
                        {I18n.t('Add')}
                    </Button>
                    <Button
                        size="small"
                        color="secondary"
                        onClick={() =>
                            DialogAddNew.openHtml(
                                'https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md',
                            )
                        }
                    >
                        {I18n.t('Learn More')}
                    </Button>
                </CardActions>
            </Card>
        );
    }

    render(): React.JSX.Element {
        return (
            <Dialog
                onClose={() => false}
                maxWidth="lg"
                fullWidth
                open={!0}
                aria-labelledby="confirmation-dialog-title"
            >
                <DialogTitle id="confirmation-dialog-title">{I18n.t('Add new script')}</DialogTitle>
                <DialogContent style={{ textAlign: 'center' }}>
                    {this.getRulesCard()}
                    {this.getBlocklyCard()}
                    {this.getJSCard()}
                    {this.getTSCard()}
                </DialogContent>
                <DialogActions>
                    <Button
                        color="grey"
                        onClick={this.handleCancel}
                        startIcon={<IconCancel />}
                    >
                        {I18n.t('Cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default DialogAddNew;
