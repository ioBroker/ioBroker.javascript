import React from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import cls from './item.module.scss';

const CardMenu = ({ Icon, name, id, active }) => {
    return <div key={id} className={`${cls.switches_item} ${active ? cls.switches_item_active : null}`}>
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
    name: PropTypes.string
};

export default CardMenu;