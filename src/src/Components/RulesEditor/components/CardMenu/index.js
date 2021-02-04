import React from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import cls from './style.module.scss';

const CardMenu = ({ Icon, name, id, active }) => {
    return <div key={id} className={`${cls.switchesItem} ${active ? cls.switchesItemActive : null}`}>
        <Icon />
        <span>
            {name}
        </span>
    </div>;
}

CardMenu.defaultProps = {
    Icon: null,
    name: '',
    active: false,
    id: ''
};

CardMenu.propTypes = {
    name: PropTypes.string,
    active: PropTypes.bool
};

export default CardMenu;