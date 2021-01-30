import React from 'react';
import cls from './hamburgerMenu.module.scss';

export default ({boolean})=>{
    return <div className={`${cls.hamburger_menu} ${boolean ? cls.animate : ''}`}/>
}
