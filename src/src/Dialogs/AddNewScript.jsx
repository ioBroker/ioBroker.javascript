import React from 'react';
import PropTypes from 'prop-types';
import withStyles from '@mui/styles/withStyles';
import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Dialog from '@mui/material/Dialog';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';

import ImgJS from '../assets/tileJS.png';
import ImgTS from '../assets/tileTS.png';
import ImgBlockly from '../assets/tileBlockly.png';
import ImgRules from '../assets/tileRules.png';
import IconCancel from '@mui/icons-material/Cancel';

import { I18n } from '@iobroker/adapter-react-v5';

const styles = theme => ({
    card: {
        maxWidth: 345,
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
        marginBottom: theme.spacing(1),
    },
});

class DialogAddNew extends React.Component {
    handleCancel = () => {
        this.props.onClose();
    };

    handleOk = type => {
        this.props.onClose(type);
    };

    openHtml(html) {
        const lang = I18n.getLanguage();
        if (!html.includes('javascript.md') && (lang === 'de' || lang === 'ru')) {
            html = html.replace(/\/en\//, '/' + lang + '/');
        }
        const win = window.open(html, '_blank');
        win.focus();
    }

    getJSCard() {
        return <Card className={this.props.classes.card}>
            <CardActionArea onClick={() => this.props.onClose && this.props.onClose('Javascript/js')}>
                <CardMedia
                    className={this.props.classes.media}
                    image={ImgJS}
                    title="JavaScript"
                />
                <CardContent>
                    <h2>JavaScript</h2>
                    <div className={this.props.classes.complexity}>{I18n.t('for programmers')}</div>
                    <div className={this.props.classes.text}>{I18n.t('JS description')}</div>
                </CardContent>
            </CardActionArea>
            <CardActions>
                <Button size="small" color="primary" onClick={() => this.props.onClose && this.props.onClose('Javascript/js')}>{I18n.t('Add')}</Button>
                <Button size="small" color="primary" onClick={() => this.openHtml('https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md')}>{I18n.t('Learn More')}</Button>
            </CardActions>
        </Card>;
    }

    getTSCard() {
        return <Card className={this.props.classes.card}>
            <CardActionArea onClick={() => this.props.onClose && this.props.onClose('TypeScript/ts')}>
                <CardMedia
                    className={this.props.classes.media}
                    image={ImgTS}
                    title="TypeScript"
                />
                <CardContent>
                    <h2>TypeScript</h2>
                    <div className={this.props.classes.complexity}>{I18n.t('for professionals')}</div>
                    <div className={this.props.classes.text}>{I18n.t('TS description')}</div>
                </CardContent>
            </CardActionArea>
            <CardActions>
                <Button size="small" color="primary" onClick={() => this.props.onClose && this.props.onClose('TypeScript/ts')}>{I18n.t('Add')}</Button>
                <Button size="small" color="primary" onClick={() => this.openHtml('https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md')}>{I18n.t('Learn More')}</Button>
            </CardActions>
        </Card>;
    }

    getBlocklyCard() {
        return <Card className={this.props.classes.card}>
            <CardActionArea onClick={() => this.props.onClose && this.props.onClose('Blockly')}>
                <CardMedia
                    className={this.props.classes.media}
                    image={ImgBlockly}
                    title="Blockly"
                />
                <CardContent>
                    <h2>Blockly</h2>
                    <div className={this.props.classes.complexity}>{I18n.t('normal')}</div>
                    <div className={this.props.classes.text}>{I18n.t('Blockly description')}</div>
                </CardContent>
            </CardActionArea>
            <CardActions>
                <Button size="small" color="primary" onClick={() => this.props.onClose && this.props.onClose('Blockly')}>{I18n.t('Add')}</Button>
                <Button size="small" color="primary" onClick={() => this.openHtml('https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/blockly.md')}>{I18n.t('Learn More')}</Button>
            </CardActions>
        </Card>;
    }

    getRulesCard() {
        return <Card className={this.props.classes.card}>
            <CardActionArea onClick={() => this.props.onClose && this.props.onClose('Rules')}>
                <CardMedia
                    className={this.props.classes.media}
                    image={ImgRules}
                    title="Rules"
                />
                <CardContent>
                    <h2>Rules</h2>
                    <div className={this.props.classes.complexity}>{I18n.t('easy')}</div>
                    <div className={this.props.classes.text}>{I18n.t('Rules description')}</div>
                </CardContent>
            </CardActionArea>
            <CardActions>
                <Button size="small" color="primary" onClick={() => this.props.onClose && this.props.onClose('Rules')}>{I18n.t('Add')}</Button>
                <Button size="small" color="primary" onClick={() => this.openHtml('https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md')}>{I18n.t('Learn More')}</Button>
            </CardActions>
        </Card>;
    }

    render() {
        return <Dialog
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
                <Button color="grey" onClick={this.handleCancel} startIcon={<IconCancel/>}>{I18n.t('Cancel')}</Button>
            </DialogActions>
        </Dialog>;
    }
}

DialogAddNew.propTypes = {
    onClose: PropTypes.func
};

export default withStyles(styles)(DialogAddNew);
