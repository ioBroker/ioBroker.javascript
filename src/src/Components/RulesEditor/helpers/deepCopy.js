export function deepCopy(name, userRules, additionalParameter) {
    let newItemsSwitches;
    switch (name) {
        case 'actions':
            newItemsSwitches = {
                ...userRules, [name]: {
                    ...userRules[name], [additionalParameter]:
                        [...userRules[name][additionalParameter]]
                }
            }
            return newItemsSwitches;

        default:
            newItemsSwitches = {
                ...userRules, [name]: [
                    ...userRules[name]
                ]
            }
            return newItemsSwitches;
    }
}