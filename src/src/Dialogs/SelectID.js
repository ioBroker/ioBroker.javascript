import React from 'react';
import PropTypes from 'prop-types';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Dialog from '@material-ui/core/Dialog';

import I18n from '../i18n';
import SelectID from '../Components/SelectID';
import {withStyles} from "@material-ui/core/styles/index";

const styles = theme => ({
    headerID: {
        fontWeight: 'bold',
        fontStyle: 'italic'
    },
});

class DialogSelectID extends React.Component {
    constructor(props) {
        super(props);
        this.state =  {
            selected: this.props.selected || '',
            name:     ''
        };
    }

    handleCancel() {
        this.props.onClose();
    };

    handleOk() {
        this.props.onOk(this.state.selected, this.state.name);
        this.props.onClose();
    };

    render() {
        let title;
        if (this.state.name) {
            title = [(<span key="selected">{I18n.t('Selected')} </span>), (<span key="id" className={this.props.classes.headerID}>{this.state.name}</span>)];
        } else {
            title = this.props.title || I18n.t('Please select object ID...');
        }

        return (
            <Dialog
                disableBackdropClick
                disableEscapeKeyDown
                maxWidth="lg"
                fullWidth={true}
                open={true}
                aria-labelledby="selectid-dialog-title"
            >
                <DialogTitle id="selectid-dialog-title">{title}</DialogTitle>
                <DialogContent>
                    <SelectID
                        statesOnly={this.props.statesOnly}
                        style={{width: '100%', height: '100%'}}
                        connection={this.props.connection}
                        selected={this.state.selected}
                        name={this.state.name}
                        onSelect={(selected, name, isDouble) => {
                            selected !== this.state.selected && this.setState({selected, name});
                            isDouble && this.handleOk();
                        }}
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

DialogSelectID.propTypes = {
    classes: PropTypes.object,
    onClose: PropTypes.func,
    onOk: PropTypes.func.isRequire,
    title: PropTypes.string,
    selected: PropTypes.string,
    statesOnly: PropTypes.bool,
    connection: PropTypes.object.isRequire,
    cancel: PropTypes.string,
    ok: PropTypes.string

};

export default withStyles(styles)(DialogSelectID);
