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

import I18n from '../i18n';

// Generate cron expression

const styles = theme => ({
    headerID: {
        fontWeight: 'bold',
        fontStyle: 'italic'
    },
    radio: {
        display: 'inline-block'
    }
});

class DialogCron extends React.Component {
    constructor(props) {
        super(props);
        let cron;
        if (this.props.cron && typeof this.props.cron === 'string' && this.props.cron[1] !== '{') {
            cron = this.props.cron.replace(/['"]/g, '').trim()
        } else {
            cron = this.props.cron || '{}';
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
    };

    handleOk() {
        this.props.onOk(this.state.cron);
        this.props.onClose();
    };

    render() {
        return (
            <Dialog
                disableBackdropClick
                disableEscapeKeyDown
                maxWidth="md"
                fullWidth={true}
                open={true}
                aria-labelledby="cron-dialog-title"
            >
                <DialogTitle id="cron-dialog-title">{this.props.title || I18n.t('Define cron...')}</DialogTitle>
                <DialogContent>

                    {!this.props.simple && (<div>
                        <Radio
                            key="wizard"
                            checked={this.state.mode === 'wizard'}
                            onChange={e => this.setState({mode: 'wizard'})}
                        /><label onClick={e => this.setState({mode: 'wizard'})}
                                 style={this.state.mode !== 'wizard' ? {color: 'lightgrey'} : {}}>{I18n.t('sc_wizard')}</label>

                        <Radio
                            key="simple"
                            checked={this.state.mode === 'simple'}
                            onChange={e => this.setState({mode: 'simple'})}
                        /><label onClick={e => this.setState({mode: 'simple'})}
                                 style={this.state.mode !== 'simple' ? {color: 'lightgrey'} : {}}>{I18n.t('sc_simple')}</label>
                        <Radio
                            key="complex"
                            checked={this.state.mode === 'complex'}
                            onChange={e => this.setState({mode: 'complex'})}
                        /><label onClick={e => this.setState({mode: 'complex'})} style={this.state.mode !== 'complex' ? {color: 'lightgrey'} : {}}>{I18n.t('sc_cron')}</label></div>)}

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
                    <Button onClick={() => this.handleCancel()} color="primary">{this.props.cancel || I18n.t('Cancel')}</Button>
                    <Button onClick={() => this.handleOk()}     color="primary">{this.props.ok || I18n.t('Ok')}</Button>
                </DialogActions>
            </Dialog>
        );
    }
}

DialogCron.propTypes = {
    classes: PropTypes.object,
    onClose: PropTypes.func,
    onOk: PropTypes.func.isRequire,
    title: PropTypes.string,
    cron: PropTypes.string,
    cancel: PropTypes.string,
    ok: PropTypes.string,
    simple: PropTypes.bool,
    language: PropTypes.string

};

export default withStyles(styles)(DialogCron);
