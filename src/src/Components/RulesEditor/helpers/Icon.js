import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

const Icon = ({ src, style, className }) => {
    if (src) {
        if (typeof src === 'string') {
            if (src.length < 3) {
                return <span style={style || {}} className={ clsx(className, 'iconOwn') }>{src}</span>; // utf-8 char
            } else {
                return <img style={style || {}} className={ clsx(className, 'iconOwn') } src={ src } alt="" />;
            }
        } else {
            return src;
        }
    } else {
        return null;
    }
}

Icon.propTypes = {
    key: PropTypes.string,
    color: PropTypes.string,
    src: PropTypes.string,
    className: PropTypes.string,
    imagePrefix: PropTypes.string,
};

export default Icon;