import React from 'react';
import * as Icons from '@material-ui/icons/';

const MaterialDynamicIcon = ({ iconName, className }) => {
    return React.createElement(Icons[iconName], { className });
}


MaterialDynamicIcon.defaultProps = {
    className: null,
    iconName: 'Help'
};

export default MaterialDynamicIcon;