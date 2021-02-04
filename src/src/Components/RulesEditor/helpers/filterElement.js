export function filterElement(name, itemsSwitches, additionalParameter, _id) {
    switch (name) {
        case 'actions':
            itemsSwitches[name][additionalParameter] = itemsSwitches[name][additionalParameter].filter(el => el._id !== _id);
            return itemsSwitches;
        case 'conditions':
            itemsSwitches[name][additionalParameter] = itemsSwitches[name][additionalParameter].filter(el => el._id !== _id);
            return itemsSwitches;
        default:
            itemsSwitches[name] = itemsSwitches[name].filter(el => el._id !== _id);
            return itemsSwitches;
    }
}