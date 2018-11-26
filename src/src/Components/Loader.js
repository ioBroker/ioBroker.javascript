import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles';
import './loader.css'

const styles = theme => ({

});

class Loader extends React.Component {
    constructor(props) {
        super(props);
        this.size = this.props.size || 234;
    }

    render() {
        return (
            <div className="logo-back logo-background">
                <div className="logo-div" style={{width: this.size, height: this.size}}>
                    <div className="logo-top logo-background" style={{left: '37%'}}/>
                    <div className="logo-top logo-background" style={{left: '57%'}}/>
                    <div
                        className="logo-border logo-background logo-animate-wait"
                        style={{borderWidth: this.size * 0.132}}
                    />
                    <div className="logo-i logo-animate-color-inside"/>
                    <div className="logo-i-top logo-animate-color-inside" style={{top: '18%'}}/>
                    <div className="logo-i-top logo-animate-color-inside" style={{bottom: '18%'}}/>
                </div>
                <div className="logo-animate-grow"
                     style={{width: this.size + 11, height: this.size + 11}}
                />
            </div>
        );
    }
}

Loader.propTypes = {
    size: PropTypes.number
};

export default withStyles(styles)(Loader);

