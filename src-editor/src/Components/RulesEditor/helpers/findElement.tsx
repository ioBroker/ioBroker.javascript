import type { RuleBlockType, RuleUserRules } from '@/Components/RulesEditor/types';

export function findElement(
    settings: {
        acceptedBy: RuleBlockType;
        _id: string;
    },
    userRules: RuleUserRules,
    additionalParameter: string,
): RuleUserRules {
    const { _id, acceptedBy } = settings;
    let block;

    if (!acceptedBy || !userRules[acceptedBy]) {
        console.warn(`Cannot find ${acceptedBy}`);
        return userRules;
    }

    switch (acceptedBy) {
        case 'actions':
            block = userRules[acceptedBy][additionalParameter].find(el => el._id === _id);
            if (!block) {
                console.warn(`Cannot find ${_id}`);
            } else {
                const pos = userRules[acceptedBy][additionalParameter].indexOf(block);
                userRules[acceptedBy][additionalParameter][pos] = settings;
            }
            return userRules;
        case 'conditions':
            block = userRules[acceptedBy][additionalParameter].find(el => el._id === _id);
            if (!block) {
                console.warn(`Cannot find ${_id}`);
            } else {
                const pos = userRules[acceptedBy][additionalParameter].indexOf(block);
                userRules[acceptedBy][additionalParameter][pos] = settings;
            }
            return userRules;
        default:
            block = userRules[acceptedBy].find(el => el._id === _id);
            if (!block) {
                console.warn(`Cannot find ${_id}`);
            } else {
                const pos = userRules[acceptedBy].indexOf(block);
                userRules[acceptedBy][pos] = settings;
            }
            return userRules;
    }
}
