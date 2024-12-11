import type { BlockValue, RuleBlockType, RuleUserRules } from '../types';

export function deepCopy(
    name: RuleBlockType,
    userRules: RuleUserRules,
    additionalParameter?: BlockValue,
): RuleUserRules {
    let newItemsSwitches: RuleUserRules;

    switch (name) {
        case 'actions':
            if (additionalParameter === 'else') {
                newItemsSwitches = {
                    ...userRules,
                    actions: {
                        ...userRules[name],
                        else: [...userRules[name].else],
                    },
                };
                return newItemsSwitches;
            }
            if (additionalParameter === 'then') {
                newItemsSwitches = {
                    ...userRules,
                    actions: {
                        ...userRules[name],
                        then: [...userRules[name].then],
                    },
                };
                return newItemsSwitches;
            }

            console.error(`Unknown additionalParameter: ${additionalParameter}`);
            throw new Error(`Unknown additionalParameter: ${additionalParameter}`);

        case 'triggers':
            newItemsSwitches = {
                ...userRules,
                triggers: [...userRules.triggers],
            };
            return newItemsSwitches;

        case 'conditions':
            newItemsSwitches = {
                ...userRules,
                conditions: [...userRules.conditions],
            };
            return newItemsSwitches;

        default:
            throw new Error(`Unknown name: ${name}`);
    }
}
