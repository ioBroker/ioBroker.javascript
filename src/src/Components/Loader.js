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
            <div className={'logo-back logo-background-' + this.props.theme}>
                <div className="logo-div" style={{width: this.size, height: this.size}}>
                    <div className={'logo-top logo-background-' + this.props.theme} style={{left: '37%'}}/>
                    <div className={'logo-top logo-background-' + this.props.theme} style={{left: '57%'}}/>
                    <div
                        className={'logo-border logo-background-' + this.props.theme + ' logo-animate-wait'}
                        style={{borderWidth: this.size * 0.132}}
                    />
                    <div className={'logo-i logo-animate-color-inside-' + this.props.theme}/>
                    <div className={'logo-i-top logo-animate-color-inside-' + this.props.theme} style={{top: '18%'}}/>
                    <div className={'logo-i-top logo-animate-color-inside-' + this.props.theme} style={{bottom: '18%'}}/>
                </div>
                <div className={'logo-animate-grow logo-animate-grow-' + this.props.theme}
                     style={{width: this.size + 11, height: this.size + 11}}
                />
            </div>
        );
    }
}

Loader.propTypes = {
    size: PropTypes.number,
    theme: PropTypes.string
};

export default withStyles(styles)(Loader);

