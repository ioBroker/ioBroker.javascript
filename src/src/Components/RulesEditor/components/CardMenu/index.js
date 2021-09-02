import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import cls from './style.module.scss';
import MaterialDynamicIcon from '../../helpers/MaterialDynamicIcon';
import I18n from '@iobroker/adapter-react/i18n';

const CardMenu = ({ name, id, active, icon, adapter, socket, onDoubleClick, title, onTouchMove }) => <div
    onDoubleClick={onDoubleClick}
    onTouchMove={onTouchMove}
    key={id}
    title={I18n.t(title)}
    className={clsx(cls.switchesItem, active && cls.switchesItemActive, 'block-' + id)}
>
    <MaterialDynamicIcon iconName={icon} className={cls.iconTheme} adapter={adapter} socket={socket} />
    <span>
        {name ? I18n.t(name) : ''}
    </span>
</div>;

CardMenu.defaultProps = {
    name: '',
    active: false,
    id: '',
    onDoubleClick: () => { }
};

CardMenu.propTypes = {
    name: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    active: PropTypes.bool
};

export default CardMenu;