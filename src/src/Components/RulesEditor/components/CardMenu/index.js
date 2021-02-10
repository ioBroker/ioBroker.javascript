import React, { useMemo } from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import cls from './style.module.scss';

const CardMenu = ({ _name, id, active, icon }) => {
    // let IconTest = require(`@material-ui/icons/${icon}`).default;
    const Icon = useMemo(() => require(`@material-ui/icons/${icon}`).default, [icon]);
    return <div key={id} className={`${cls.switchesItem} ${active ? cls.switchesItemActive : null}`}>
        <Icon className={cls.iconThem} />
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