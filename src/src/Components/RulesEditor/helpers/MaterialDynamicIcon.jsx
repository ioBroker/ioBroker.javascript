import { useState, useEffect } from 'react';
import * as Icons from '@mui/icons-material/';

const ICON_CACHE = {};

const MaterialDynamicIcon = ({ iconName, style, adapter, socket, onClick }) => {
    let [url, setUrl] = useState('');

    useEffect(() => {
        if (adapter && socket) {
            ICON_CACHE[adapter] = ICON_CACHE[adapter] || socket.getObject(`system.adapter.${adapter}`);
            ICON_CACHE[adapter].then(obj =>
                obj?.common?.icon && setUrl(`../../adapter/${adapter}/${obj.common.icon}`));
        }
    }, [adapter, socket]);

    if (adapter) {
        return <img onClick={e => onClick && onClick(e)} src={url || ''} style={style} alt="" />;
    }

    const Element = Icons[iconName || 'Help'];
    return <Element
        style={style}
        onClick={e => onClick && onClick(e)}
    />;
}

MaterialDynamicIcon.defaultProps = {
    style: null,
    iconName: 'Help'
};

export default MaterialDynamicIcon;
