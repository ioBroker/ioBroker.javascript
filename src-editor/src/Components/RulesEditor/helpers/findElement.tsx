import type { BlockValue, RuleBlockConfig, RuleUserRules } from '@/Components/RulesEditor/types';

export function findElement(
    settings: RuleBlockConfig,
    userRules: RuleUserRules,
    additionalParameter: BlockValue,
): RuleUserRules {
    const { _id, acceptedBy } = settings;
    let block;

    if (!acceptedBy || !userRules[acceptedBy]) {
        console.warn(`Cannot find ${acceptedBy}`);
        return userRules;
    }

    switch (acceptedBy) {
        case 'actions':
            block = userRules.actions[additionalParameter as 'else' | 'then'].find(el => el._id === _id);
            if (!block) {
                console.warn(`Cannot find ${_id}`);
            } else {
                const pos = userRules.actions[additionalParameter as 'else' | 'then'].indexOf(block);
                userRules.actions[additionalParameter as 'else' | 'then'][pos] = settings;
            }
            return userRules;
        case 'conditions':
            block = userRules.conditions[additionalParameter as number].find(el => el._id === _id);
            if (!block) {
                console.warn(`Cannot find ${_id}`);
            } else {
                const pos = userRules.conditions[additionalParameter as number].indexOf(block);
                userRules.conditions[additionalParameter as number][pos] = settings;
            }
            return userRules;
        default:
            block = userRules.triggers.find(el => el._id === _id);
            if (!block) {
                console.warn(`Cannot find ${_id}`);
            } else {
                const pos = userRules.triggers.indexOf(block);
                userRules.triggers[pos] = settings;
            }
            return userRules;
    }
}
