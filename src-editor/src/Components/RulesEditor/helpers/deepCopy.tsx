import type { RuleUserRules } from '../types';

export function deepCopy(
    name: 'conditions' | 'actions' | 'triggers',
    userRules: RuleUserRules,
    additionalParameter: string,
): RuleUserRules {
    let newItemsSwitches: RuleUserRules;
    switch (name) {
        case 'actions':
            newItemsSwitches = {
                ...userRules,
                [name]: {
                    ...userRules[name],
                    [additionalParameter]: [...userRules[name][additionalParameter]],
                },
            };
            return newItemsSwitches;

        default:
            newItemsSwitches = {
                ...userRules,
                [name]: [...(userRules as Record<string, any>)[name]],
            };
            return newItemsSwitches;
    }
}
