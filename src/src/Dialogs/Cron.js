import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles/index';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Dialog from '@material-ui/core/Dialog';
import CronBuilder from '../Components/react-cron-builder/src/index';
import 'react-cron-builder/dist/bundle.css'

import I18n from '../i18n';
import SelectID from '../Components/SelectID';

// Generate cron expression

const styles = theme => ({
    headerID: {
        fontWeight: 'bold',
        fontStyle: 'italic'
    },
});

class DialogCron extends React.Component {
    constructor(props) {
        super(props);
        this.state =  {
            cron: this.props.cron || '* * * * *',
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
                maxWidth="lg"
                open={true}
                aria-labelledby="cron-dialog-title"
            >
                <DialogTitle id="cron-dialog-title">{this.props.title || I18n.t('Define cron...')}</DialogTitle>
                <DialogContent>
                    <CronBuilder
                        cronExpression={this.state.cron}
                        onChange={cron => this.setState({cron})}
                        showResult={true}
                    />
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
    ok: PropTypes.string

};

export default withStyles(styles)(DialogCron);
