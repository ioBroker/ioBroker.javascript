import React, { useState, useEffect } from 'react';
import {
    Shuffle,
    Apps,
    Functions,
    Language,
    AddBox,
    Pause,
    Subject,
    PlayForWork,
    Brightness3,
    HelpOutlined,
    Storage,
    AccessTime,
    PlayArrow,
    FlashOn,
    Help,
    CalendarMonth,
    Send,
    Message,
    NotificationsActive,
    SwapHoriz,
    type SvgIconComponent,
} from '@mui/icons-material';
import type { AdminConnection } from '@iobroker/gui-components';

const ICON_CACHE: Record<string, Promise<ioBroker.AdapterObject | null | undefined>> = {};

const objIcon: Record<string, SvgIconComponent> = {
    Shuffle,
    Apps,
    Functions,
    Language,
    AddBox,
    Pause,
    Subject,
    PlayForWork,
    Brightness3,
    // Key stays "HelpOutline": it is the icon name stored in saved rules
    HelpOutline: HelpOutlined,
    Storage,
    AccessTime,
    PlayArrow,
    FlashOn,
    CalendarMonth,
    Send,
    Message,
    NotificationsActive,
    SwapHoriz,
};

interface MaterialDynamicIconProps {
    iconName: string | undefined;
    className?: string;
    adapter?: string;
    socket?: AdminConnection | null;
    onClick?: (e: React.MouseEvent) => void;
    style?: React.CSSProperties;
}

function MaterialDynamicIcon({
    iconName,
    className,
    adapter,
    socket,
    onClick,
    style,
}: MaterialDynamicIconProps): React.JSX.Element {
    const [url, setUrl] = useState('');

    useEffect(() => {
        if (adapter && socket) {
            if (!(ICON_CACHE[adapter] instanceof Promise)) {
                ICON_CACHE[adapter] = socket.getObject(`system.adapter.${adapter}`);
            }
            void ICON_CACHE[adapter].then(
                obj => obj?.common?.icon && setUrl(`../../adapter/${adapter}/${obj.common.icon}`),
            );
        }
    }, [adapter, socket]);

    if (adapter) {
        return (
            <img
                onClick={e => onClick && onClick(e)}
                src={url || ''}
                className={className}
                style={style}
                alt=""
            />
        );
    }
    const Element = (iconName && objIcon[iconName]) || Help;

    return (
        <Element
            className={className}
            style={style}
            onClick={e => onClick && onClick(e)}
        />
    );
}

export default MaterialDynamicIcon;
