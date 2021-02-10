import React from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import cls from './style.module.scss';
import MaterialDynamicIcon from '../../helpers/MaterialDynamicIcon';

const CardMenu = ({ _name, id, active, icon }) => {
    return <div key={id} className={`${cls.switchesItem} ${active ? cls.switchesItemActive : null}`}>
        <MaterialDynamicIcon iconName={icon} className={cls.iconThem} />
        <span>
            {_name.en}
        </span>
    </div>;
}

CardMenu.defaultProps = {
    name: '',
    active: false,
    id: ''
};

CardMenu.propTypes = {
    name: PropTypes.string,
    active: PropTypes.bool
};

export default CardMenu;