import type { BlockValue, RuleUserRules } from '@iobroker/javascript-rules-dev';

export function filterElement(
    name: string,
    userRules: RuleUserRules,
    additionalParameter: BlockValue,
    _id: number,
): RuleUserRules {
    switch (name) {
        case 'actions':
            userRules.actions[additionalParameter as 'then' | 'else'] = userRules.actions[
                additionalParameter as 'then' | 'else'
            ].filter(el => el._id !== _id);
            return userRules;

        case 'conditions':
            userRules.conditions[additionalParameter as number] = userRules.conditions[
                additionalParameter as number
            ]?.filter(el => el._id !== _id);
            return userRules;

        case 'triggers':
        default:
            userRules.triggers = userRules.triggers.filter(el => el._id !== _id);
            return userRules;
    }
}
