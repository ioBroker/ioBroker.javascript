import React from 'react';

import { type AdminConnection, I18n, Utils } from '@iobroker/adapter-react-v5';

import cls from './style.module.scss';
import MaterialDynamicIcon from '../../helpers/MaterialDynamicIcon';

interface CardMenuProps {
    name: string;
    id: string;
    active: boolean;
    icon: string;
    adapter: string;
    socket: AdminConnection;
    onDoubleClick: () => void;
    title: string;
    onTouchMove: (e: React.TouchEvent) => void;
    style: React.CSSProperties;
}

const CardMenu = ({
    name,
    id,
    active,
    icon,
    adapter,
    socket,
    onDoubleClick,
    title,
    onTouchMove,
    style,
}: CardMenuProps): React.JSX.Element => (
    <div
        onDoubleClick={onDoubleClick}
        onTouchMove={onTouchMove}
        key={id}
        title={I18n.t(title)}
        className={Utils.clsx(cls.switchesItem, active && cls.switchesItemActive, `block-${id}`)}
    >
        <MaterialDynamicIcon
            iconName={icon}
            className={cls.iconTheme}
            adapter={adapter}
            socket={socket}
            style={style}
        />
        <span>{name ? I18n.t(name) : ''}</span>
    </div>
);

export default CardMenu;
