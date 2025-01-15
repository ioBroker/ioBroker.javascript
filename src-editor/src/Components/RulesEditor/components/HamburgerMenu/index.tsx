import React from 'react';

import cls from './hamburgerMenu.module.scss';

interface HamburgerMenuProps {
    bool: boolean;
}

function HamburgerMenu({ bool }: HamburgerMenuProps): React.JSX.Element {
    return <div className={`${cls.hamburgerMenu} ${bool ? cls.animate : ''}`} />;
}

export default HamburgerMenu;
