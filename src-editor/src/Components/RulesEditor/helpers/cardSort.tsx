import type { BlockValue, RuleBlockConfig, RuleBlockType, RuleUserRules } from '@iobroker/javascript-rules-dev';

export function throttle<F extends (...args: any[]) => void>(func: F, wait: number): F {
    let lastCall = 0;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let lastArgs: any;

    return function (this: any, ...args: any[]) {
        const now = Date.now();
        lastArgs = args;
        if (now - lastCall >= wait) {
            lastCall = now;
            func.apply(this, args);
        } else if (!timeout) {
            timeout = setTimeout(
                () => {
                    lastCall = Date.now();
                    timeout = null;
                    func.apply(this, lastArgs);
                },
                wait - (now - lastCall),
            );
        }
    } as F;
}

export function clone<T = any>(value: T): T {
    if (Array.isArray(value)) {
        return value.map(par => clone(par)) as T;
    }

    if (typeof value === 'function') {
        return value.bind(null) as T; // Return a bound function to preserve context
    }

    if (value && typeof value === 'object') {
        const newObj: T = {} as T;
        Object.keys(value).forEach(key => {
            (newObj as any)[key] = clone((value as Record<string, any>)[key]);
        });
        return newObj;
    }

    return value;
}

const funcSet = throttle((setCards, userRules) => setCards(userRules), 0);

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
        const copyCard = clone<RuleBlockConfig[]>(cards);
        copyCard.splice(index, 1);
        copyCard.splice(atIndex, 0, card);
        const newUserRules = clone<RuleUserRules>(userRules);
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
