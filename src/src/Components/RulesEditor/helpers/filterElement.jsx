export function filterElement(name, userRules, additionalParameter, _id) {
    switch (name) {
        case 'actions':
            userRules[name][additionalParameter] = userRules[name][additionalParameter].filter(el => el._id !== _id);
            return userRules;
        case 'conditions':
            userRules[name][additionalParameter] = userRules[name][additionalParameter].filter(el => el._id !== _id);
            return userRules;
        default:
            userRules[name] = userRules[name].filter(el => el._id !== _id);
            return userRules;
    }
}