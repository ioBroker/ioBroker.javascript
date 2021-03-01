export const getSelectIcon = (objects, imagePrefix='../..') => {
    imagePrefix = imagePrefix || '.';//http://localhost:8081';
    let src = '';
    const aIcon = objects && objects.common && objects.common.icon;
    if (aIcon) {
        // if not BASE64
        if (!aIcon.startsWith('data:image/')) {
            if (aIcon.includes('.')) {
                src = imagePrefix + '/adapter/' + objects.common.name + '/' + aIcon;
            } else if (aIcon && aIcon.length < 3) {
                return aIcon; // utf-8
            } else {
                return null; //'<i class="material-icons iob-list-icon">' + objects[_id_].common.icon + '</i>';
            }
        } else {
            src = aIcon;
        }
    } else {
        const common = objects && objects.common;

        if (common) {
            const cIcon = common.icon;
            if (cIcon) {
                if (!cIcon.startsWith('data:image/')) {
                    if (cIcon.includes('.')) {
                        if (objects.type === 'instance' || objects.type === 'adapter') {
                            src = imagePrefix + '/adapter/' + common.name + '/' + cIcon;
                        }
                    } else if (aIcon && aIcon.length < 3) {
                        return aIcon; // utf-8
                    } else {
                        return null;
                    }
                } else {
                    // base 64 image
                    src = cIcon;
                }
            }
        }
    }

    return src || null;
}