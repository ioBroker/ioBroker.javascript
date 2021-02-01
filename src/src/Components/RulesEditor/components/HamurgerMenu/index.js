import React from 'react';
import cls from './hamburgerMenu.module.scss';

const HamburgerMenu = ({boolean}) => {
    return <div className={`${cls.hamburger_menu} ${boolean ? cls.animate : ''}`}/>
}

export default HamburgerMenu;