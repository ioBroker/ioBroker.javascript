import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Dialog from '@material-ui/core/Dialog';
import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CardMedia from '@material-ui/core/CardMedia';

import ImgJS from '../assets/tileJS.png';
import ImgTS from '../assets/tileTS.png';
import ImgBlockly from '../assets/tileBlockly.png';

import I18n from '@iobroker/adapter-react/i18n';

const styles = {
    card: {
        maxWidth: 345,
        display: 'inline-block',
        margin: '0 10px 0 10px'
    },
    media: {
        height: 100,
    },
    text: {
        maxWidth: 200,
    }
};
class DialogAddNew extends React.Component {
    handleCancel = () => {
        this.props.onClose();
    };

    handleOk = type => {
        this.props.onClose(type);
    };

    openHtml(html) {
        const lang = I18n.getLanguage();
        if (lang === 'de' || lang === 'ru') {
            html = html.replace(/\/en\//, '/' + lang '/');
        }
        const win = window.open(html, '_blank');
        win.focus();
    }

    getJSCard() {
        return (<Card className={this.props.classes.card}>
            <CardActionArea
                onClick={() => this.props.onClose && this.props.onClose('Javascript/js')}>
                <CardMedia
                    className={this.props.classes.media}
                    image={ImgJS}
                    title="Javascript"
                />
                <CardContent>
                    <h2>Javascript</h2>
                    <div className={this.props.classes.text}>{I18n.t('JS description')}</div>
                </CardContent>
            </CardActionArea>
            <CardActions>
                <Button size="small" color="primary" onClick={() => this.props.onClose && this.props.onClose('Javascript/js')}>{I18n.t('Add')}</Button>
                <Button size="small" color="primary" onClick={() => this.openHtml('https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md')}>{I18n.t('Learn More')}</Button>
            </CardActions>
        </Card>);
    }
    getTSCard() {
        return (<Card className={this.props.classes.card}>
            <CardActionArea
                onClick={() => this.props.onClose && this.props.onClose('TypeScript/ts')}>
                <CardMedia
                    className={this.props.classes.media}
                    image={ImgTS}
                    title="Typescript"
                />
                <CardContent>
                    <h2>Typescript</h2>
                    <div className={this.props.classes.text}>{I18n.t('TS description')}</div>
                </CardContent>
            </CardActionArea>
            <CardActions>
                <Button size="small" color="primary" onClick={() => this.props.onClose && this.props.onClose('TypeScript/ts')}>{I18n.t('Add')}</Button>
                <Button size="small" color="primary" onClick={() => this.openHtml('https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md#global-functions')}>{I18n.t('Learn More')}</Button>
            </CardActions>
        </Card>);
    }
    getBlocklyCard() {
        return (<Card className={this.props.classes.card}>
            <CardActionArea onClick={() => this.props.onClose && this.props.onClose('Blockly')}>
                <CardMedia
                    className={this.props.classes.media}
                    image={ImgBlockly}
                    title="Blockly"
                />
                <CardContent>
                    <h2>Blockly</h2>
                    <div className={this.props.classes.text}>{I18n.t('Blockly description')}</div>
                </CardContent>
            </CardActionArea>
            <CardActions>
                <Button size="small" color="primary" onClick={() => this.props.onClose && this.props.onClose('Blockly')}>{I18n.t('Add')}</Button>
                <Button size="small" color="primary" onClick={() => this.openHtml('https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/blockly.md')}>{I18n.t('Learn More')}</Button>
            </CardActions>
        </Card>);
    }
    render() {
        return (
            <Dialog
                disableBackdropClick
                disableEscapeKeyDown
                maxWidth="md"
                fullWidth={true}
                open={true}
                aria-labelledby="confirmation-dialog-title"
            >
                <DialogTitle id="confirmation-dialog-title">{I18n.t('Add new script')}</DialogTitle>
                <DialogContent style={{textAlign: 'center'}}>
                    {this.getJSCard()}
                    {this.getBlocklyCard()}
                    {this.getTSCard()}
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.handleCancel} color="primary">{I18n.t('Cancel')}</Button>
                </DialogActions>
            </Dialog>
        );
    }
}

DialogAddNew.propTypes = {
    onClose: PropTypes.func
};

export default withStyles(styles)(DialogAddNew);
