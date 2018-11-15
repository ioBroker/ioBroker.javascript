import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles';
import './loader.css'

const styles = theme => ({

});

class Loader extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div className="logo-back logo-background">
                <div className="logo-div" style={{width: 234, height: 234}}>
                    <div className="logo-top logo-background" style={{left: '37%'}}/>
                    <div className="logo-top logo-background" style={{left: '57%'}}/>
                    <div className="logo-border logo-background logo-animate-wait" style={{borderWidth: 31}}/>
                    <div className="logo-i logo-animate-color-inside"/>
                    <div className="logo-i-top logo-animate-color-inside" style={{top: '17.5%'}}/>
                    <div className="logo-i-top logo-animate-color-inside" style={{bottom: '17.5%'}}/>
                </div>
                <div className="logo-animate-grow"/>
            </div>
        );
    }
}

Loader.propTypes = {

};

export default withStyles(styles)(Loader);

