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
    HelpOutline,
    Storage,
    AccessTime,
    PlayArrow,
    FlashOn,
    Help,
    type SvgIconComponent,
} from '@mui/icons-material';
import type { AdminConnection } from '@iobroker/adapter-react-v5';

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
    HelpOutline,
    Storage,
    AccessTime,
    PlayArrow,
    FlashOn,
};

interface MaterialDynamicIconProps {
    iconName: string;
    className?: string;
    adapter?: string;
    socket?: AdminConnection;
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
    const Element = objIcon[iconName] || Help;

    return (
        <Element
            className={className}
            style={style}
            onClick={e => onClick && onClick(e)}
        />
    );
}

export default MaterialDynamicIcon;
