import React from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import cls from './style.module.scss';
import MaterialDynamicIcon from '../../helpers/MaterialDynamicIcon';
import utils from '../../helpers/utils'

const CardMenu = ({ name, id, active, icon }) => {
    return <div onDoubleClick={()=>console.log('sss')} key={id} className={`${cls.switchesItem} ${active ? cls.switchesItemActive : null}`}>
        <MaterialDynamicIcon iconName={icon} className={cls.iconThem} />
        <span>
            {utils.getName(name)}
        </span>
    </div>;
}

CardMenu.defaultProps = {
    name: '',
    active: false,
    id: ''
};

CardMenu.propTypes = {
    name: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    active: PropTypes.bool
};

export default CardMenu;