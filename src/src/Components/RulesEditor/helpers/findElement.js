export function findElement(settings, userRules, additionalParameter) {
    const { _id, acceptedBy } = settings;
    let block;

    if (!acceptedBy || !userRules[acceptedBy]) {
        console.warn('Cannot find ' + acceptedBy);
        return userRules;
    }

    switch (acceptedBy) {
        case 'actions':
            block = userRules[acceptedBy][additionalParameter].find(el => el._id === _id);
            if (!block) {
                console.warn('Cannot find ' + _id);
            } else {
                userRules[acceptedBy][additionalParameter][userRules[acceptedBy][additionalParameter].indexOf(block)] = settings;
            }
            return userRules;
        case 'conditions':
            block = userRules[acceptedBy][additionalParameter].find(el => el._id === _id);
            if (!block) {
                console.warn('Cannot find ' + _id);
            } else {
                userRules[acceptedBy][additionalParameter][userRules[acceptedBy][additionalParameter].indexOf(block)] = settings;
            }
            return userRules;
        default:
            block = userRules[acceptedBy].find(el => el._id === _id);
            if (!block) {
                console.warn('Cannot find ' + _id);
            } else {
                userRules[acceptedBy][userRules[acceptedBy].indexOf(block)] = settings;
            }
            return userRules;
    }
}