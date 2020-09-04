import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles/index';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Dialog from '@material-ui/core/Dialog';
import Radio from '@material-ui/core/Radio';

import ComplexCron from '../Components/ComplexCron';
import SimpleCron from '../Components/simple-cron/SimpleCron';
import Schedule from '../Components/Schedule';

import I18n from '@iobroker/adapter-react/i18n';

// Generate cron expression

const styles = theme => ({
    headerID: {
        fontWeight: 'bold',
        fontStyle: 'italic'
    },
    radio: {
        display: 'inline-block'
    },
    dialogPaper: {
        height: 'calc(100% - 96px)'
    }
});

class DialogCron extends React.Component {
    constructor(props) {
        super(props);
        let cron;
        if (this.props.cron && typeof this.props.cron === 'string' && this.props.cron.replace(/^["']/, '')[0] !== '{') {
            cron = this.props.cron.replace(/['"]/g, '').trim();
        } else {
            cron = this.props.cron || '{}';
            if (typeof cron === 'string') {
                cron = cron.replace(/^["']/, '').replace(/["']\n?$/, '');
            }
        }

        this.state =  {
            cron,
            mode: this.props.simple ?
                'simple' :
                (typeof cron === 'object' || cron[0] === '{' ?
                    'wizard' :
                    (SimpleCron.cron2state(this.props.cron || '* * * * *') ? 'simple' : 'complex'))
        };
    }

    handleCancel() {
        this.props.onClose();
    }

    handleOk() {
        this.props.onOk(this.state.cron);
        this.props.onClose();
    }

    setMode(mode) {
        this.setState({mode});
    }

    render() {
        return (
            <Dialog
                disableBackdropClick
                disableEscapeKeyDown
                maxWidth="md"
                fullWidth={true}
                classes={{paper: this.props.classes.dialogPaper}}
                open={true}
                aria-labelledby="cron-dialog-title"
            >
                <DialogTitle id="cron-dialog-title">{this.props.title || I18n.t('Define schedule...')}</DialogTitle>
                <DialogContent style={{height: '100%', overflow: 'hidden'}}>
                    {!this.props.simple && (<div>
                        <Radio
                            key="wizard"
                            checked={this.state.mode === 'wizard'}
                            onChange={e => this.setMode('wizard')}
                        /><label onClick={e => this.setMode('wizard')}
                                 style={this.state.mode !== 'wizard' ? {color: 'lightgrey'} : {}}>{I18n.t('sc_wizard')}</label>

                        <Radio
                            key="simple"
                            checked={this.state.mode === 'simple'}
                            onChange={e => this.setMode('simple')}
                        /><label onClick={e => this.setMode('simple')}
                                 style={this.state.mode !== 'simple' ? {color: 'lightgrey'} : {}}>{I18n.t('sc_simple')}</label>
                        <Radio
                            key="complex"
                            checked={this.state.mode === 'complex'}
                            onChange={e => this.setMode('complex')}
                        /><label onClick={e => this.setMode('complex')} style={this.state.mode !== 'complex' ? {color: 'lightgrey'} : {}}>{I18n.t('sc_cron')}</label></div>)}

                    {this.state.mode === 'simple' &&
                        (<SimpleCron
                            cronExpression={this.state.cron}
                            onChange={cron => this.setState({cron})}
                            language={I18n.getLanguage()}
                        />)}
                    {this.state.mode === 'wizard' &&
                        (<Schedule
                            schedule={this.state.cron}
                            onChange={cron => this.setState({cron})}
                            language={I18n.getLanguage()}
                        />)}
                    {this.state.mode === 'complex' &&
                        (<ComplexCron
                            cronExpression={this.state.cron}
                            onChange={cron => this.setState({cron})}
                            language={I18n.getLanguage()}
                        />)}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => this.handleOk()}     color="primary">{this.props.ok || I18n.t('Ok')}</Button>
                    <Button onClick={() => this.handleCancel()}>{this.props.cancel || I18n.t('Cancel')}</Button>
                </DialogActions>
            </Dialog>
        );
    }
}

DialogCron.propTypes = {
    classes: PropTypes.object,
    onClose: PropTypes.func,
    onOk: PropTypes.func.isRequired,
    title: PropTypes.string,
    cron: PropTypes.string,
    cancel: PropTypes.string,
    ok: PropTypes.string,
    simple: PropTypes.bool,
    language: PropTypes.string

};

export default withStyles(styles)(DialogCron);
