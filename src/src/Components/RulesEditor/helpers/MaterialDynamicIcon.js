import { createElement } from 'react';
import * as Icons from '@material-ui/icons/';

const MaterialDynamicIcon = ({ iconName, className }) => createElement(Icons[iconName || 'Help'], { className });

MaterialDynamicIcon.defaultProps = {
    className: null,
    iconName: 'Help'
};

export default MaterialDynamicIcon;