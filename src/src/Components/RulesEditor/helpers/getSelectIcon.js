import IconSystem from '@material-ui/icons/SettingsApplications';
import IconPhoto from '@material-ui/icons/Photo';
import IconGroup from '@material-ui/icons/SupervisedUserCircle';
import IconUser from '@material-ui/icons/PersonOutlined';
import IconHost from '@material-ui/icons/Router';
import IconConnection from '@material-ui/icons/Wifi';
import IconInfo from '@material-ui/icons/Info';
import IconMeta from '@material-ui/icons/Description';
import IconAlias from '@iobroker/adapter-react/icons/IconAlias';

export function getSystemIcon(objects, id, k, imagePrefix) {
    let icon;

    // system or design have special icons
    if (id.startsWith('_design/') || (id === 'system')) {
        icon = <IconSystem className="iconOwn" />;
    } else if (id === '0_userdata' || id === '0_userdata.0') {
        icon = <IconPhoto className="iconOwn" />;
    } else if (id === 'alias' || id === 'alias.0') {
        icon = <IconAlias className="iconOwn" />;
    } else if (id === 'system.adapter') {
        icon = <IconSystem className="iconOwn" />;
    } else if (id === 'system.group') {
        icon = <IconGroup className="iconOwn" />;
    } else if (id === 'system.user') {
        icon = <IconUser className="iconOwn" />;
    } else if (id === 'system.host') {
        icon = <IconHost className="iconOwn" />;
    } else if (id.endsWith('.connection') || id.endsWith('.connected')) {
        icon = <IconConnection className="iconOwn" />;
    } else if (id.endsWith('.info')) {
        icon = <IconInfo className="iconOwn" />;
    } else if (objects[id] && objects[id].type === 'meta') {
        icon = <IconMeta className="iconOwn" />;
    } else if (k < 2) {
        // detect "cloud.0"
        if (objects['system.adapter.' + id]) {
            icon = getSelectIdIcon(objects, 'system.adapter.' + id, imagePrefix);
        }
    }

    return icon || null;
}


export function getSelectIdIcon(obj, imagePrefix) {
    imagePrefix = imagePrefix || '.';//http://localhost:8081';
    let src = '';
    const common = obj?.common;

    if (common) {
        const cIcon = common.icon;
        if (cIcon) {
            if (!cIcon.startsWith('data:image/')) {
                if (cIcon.includes('.')) {
                    let instance;
                    if (obj.type === 'instance' || obj.type === 'adapter') {
                        src = imagePrefix + '/adapter/' + common.name + '/' + cIcon;
                    } else if (obj._id && obj._id.startsWith('system.adapter.')) {
                        instance = obj._id.split('.', 3);
                        if (cIcon[0] === '/') {
                            instance[2] += cIcon;
                        } else {
                            instance[2] += '/' + cIcon;
                        }
                        src = imagePrefix + '/adapter/' + instance[2];
                    } else {
                        instance = obj._id.split('.', 2);
                        if (cIcon[0] === '/') {
                            instance[0] += cIcon;
                        } else {
                            instance[0] += '/' + cIcon;
                        }
                        src = imagePrefix + '/adapter/' + instance[0];
                    }
                } else {
                    return null;
                }
            } else {
                // base 64 image
                src = cIcon;
            }
        }
    }

    return src || null;
}