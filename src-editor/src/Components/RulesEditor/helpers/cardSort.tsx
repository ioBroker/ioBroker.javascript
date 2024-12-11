import _ from 'lodash';
import type { BlockValue, RuleBlockConfig, RuleBlockType, RuleUserRules } from '../types';

const funcSet = _.throttle((setCards, userRules) => setCards(userRules), 0);

export function findCard(id: number, cards: RuleBlockConfig[]): { card: RuleBlockConfig | undefined; index: number } {
    const card = cards.find(c => c._id === id);

    return {
        card,
        index: card ? cards.indexOf(card) : -1,
    };
}

export function moveCard(
    id: number,
    atIndex: number,
    cards: RuleBlockConfig[],
    setCards: (newRules: RuleUserRules) => void,
    userRules: RuleUserRules,
    acceptedBy: RuleBlockType,
    additionally: BlockValue,
    hoverClientY: number,
    hoverMiddleY: number,
): void {
    const { card, index } = findCard(id, cards);
    if (index < atIndex && hoverClientY < hoverMiddleY) {
        return;
    }
    if (index > atIndex && hoverClientY > hoverMiddleY) {
        return;
    }
    if (card && index !== atIndex) {
        const copyCard = _.clone(cards);
        copyCard.splice(index, 1);
        copyCard.splice(atIndex, 0, card);
        const newUserRules = _.clone(userRules);
        switch (acceptedBy) {
            case 'actions':
                newUserRules.actions[additionally as 'else' | 'then'] = copyCard;
                funcSet(setCards, newUserRules);
                return;

            case 'conditions':
                newUserRules.conditions[additionally as number] = copyCard;
                funcSet(setCards, newUserRules);
                return;

            default:
                newUserRules.triggers = copyCard;
                funcSet(setCards, newUserRules);
                return;
        }
    }
}
