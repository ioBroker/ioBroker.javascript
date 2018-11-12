import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles/index';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Dialog from '@material-ui/core/Dialog';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';

import CronBuilder from '../Components/react-cron-builder/src/index';
import '../Components/react-cron-builder/dist/bundle.css'
import SimpleCron from '../Components/simple-cron/SimpleCron';

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
        this.state =  {
            cron: (this.props.cron || '* * * * *').replace(/['"]/g, '').trim(),
            simple: this.props.simple || !!SimpleCron.cron2state(this.props.cron || '* * * * *')
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
                            key="simple"
                            checked={this.state.simple}
                            onChange={e => this.setState({simple: true})}
                            value={this.state.simple}
                        /><label onClick={e => this.setState({simple: true})}
                                 style={!this.state.simple ? {color: 'lightgrey'} : {}}>{I18n.t('sc_simple')}</label>
                        <Radio
                            key="complex"
                            checked={!this.state.simple}
                            onChange={e => this.setState({simple: false})}
                            value={!this.state.simple}
                        /><label onClick={e => this.setState({simple: false})} style={this.state.simple ? {color: 'lightgrey'} : {}}>{I18n.t('sc_cron')}</label></div>)}
                    {this.state.simple ?
                        (<SimpleCron
                            cronExpression={this.state.cron}
                            onChange={cron => this.setState({cron})}
                            language={I18n.getLanguage()}
                        />) :
                        (<CronBuilder
                        cronExpression={this.state.cron}
                        onChange={cron => this.setState({cron})}
                        showResult={true}
                    />)
                    }
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => this.handleCancel()} color="primary">{this.props.cancel || I18n.t('Cancel')}</Button>
                    <Button onClick={() => this.handleOk()} color="primary">{this.props.ok || I18n.t('Ok')}</Button>
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
