import { createElement, useState, useEffect } from 'react';
import * as Icons from '@material-ui/icons/';

const ICON_CACHE = {};

const MaterialDynamicIcon = ({ iconName, className, adapter, socket }) => {
    let [url, setUrl] = useState('');

    useEffect(() => {
        if (adapter && socket) {
            ICON_CACHE[adapter] = ICON_CACHE[adapter] || socket.getObject(`system.adapter.${adapter}`);
            ICON_CACHE[adapter].then(obj =>
                obj?.common?.icon && setUrl(`../../adapter/${adapter}/${obj.common.icon}`));
        }
    }, [adapter, socket]);

    if (adapter) {
        return <img src={url || ''} className={className} alt=""/>;
    } else {
        return createElement(Icons[iconName || 'Help'], { className });
    }
}

MaterialDynamicIcon.defaultProps = {
    className: null,
    iconName: 'Help'
};

export default MaterialDynamicIcon;