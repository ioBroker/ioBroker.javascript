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
} from '@mui/icons-material';

const ICON_CACHE = {};

const objIcon = {
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

function MaterialDynamicIcon({
    iconName,
    className,
    adapter,
    socket,
    onClick,
    style,
}) {
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
