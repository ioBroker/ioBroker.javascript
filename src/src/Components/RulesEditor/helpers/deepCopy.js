export function deepCopy(name, itemsSwitches, additionalParameter) {
    let newItemsSwitches;
    switch (name) {
        case 'actions':
            newItemsSwitches = {
                ...itemsSwitches, [name]: {
                    ...itemsSwitches[name], [additionalParameter]:
                        [...itemsSwitches[name][additionalParameter]]
                }
            }
            return newItemsSwitches;
        default:
            newItemsSwitches = {
                ...itemsSwitches, [name]: [
                    ...itemsSwitches[name]
                ]
            }
            return newItemsSwitches;
    }
}