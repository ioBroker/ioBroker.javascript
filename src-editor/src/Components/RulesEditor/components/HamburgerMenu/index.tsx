import React from 'react';
import PropTypes from 'prop-types';

import cls from './hamburgerMenu.module.scss';

const HamburgerMenu = ({ boolean }) => {
    return <div className={`${cls.hamburgerMenu} ${boolean ? cls.animate : ''}`}/>
}

HamburgerMenu.defaultProps = {
    boolean: false
};

HamburgerMenu.propTypes = {
    boolean: PropTypes.bool
};

export default HamburgerMenu;
