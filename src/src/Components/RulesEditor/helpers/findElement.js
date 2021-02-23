export function findElement(settings, userRules, additionalParameter) {
    const { _id, acceptedBy } = settings;
    let block;
    switch (acceptedBy) {
        case 'actions':
            block = userRules[acceptedBy][additionalParameter].find(el => el._id === _id);
            userRules[acceptedBy][additionalParameter][userRules[acceptedBy][additionalParameter].indexOf(block)] = settings;
            return userRules;
        case 'conditions':
            block = userRules[acceptedBy][additionalParameter].find(el => el._id === _id);
            userRules[acceptedBy][additionalParameter][userRules[acceptedBy][additionalParameter].indexOf(block)] = settings;
            return userRules;
        default:
            block = userRules[acceptedBy].find(el => el._id === _id);
            userRules[acceptedBy][userRules[acceptedBy].indexOf(block)] = settings;
            return userRules;
    }
}