import _ from "lodash";

const funcSet = _.throttle(
    (setCards, itemsSwitches) => setCards(itemsSwitches)
    , 0);

const moveCard = (
    id,
    atIndex,
    cards,
    setCards,
    itemsSwitches,
    _acceptedBy,
    additionally,
    hoverClientY,
    hoverMiddleY) => {
    // console.log('2', id, atIndex, cards)

    const { card, index } = findCard(id, cards);
    if (index < atIndex && hoverClientY < hoverMiddleY) {
        return;
    }
    if (index > atIndex && hoverClientY > hoverMiddleY) {
        return;
    }
    if (card && index !== atIndex) {
        console.log('render set')
        const copyCard = _.clone(cards);
        copyCard.splice(index, 1);
        copyCard.splice(atIndex, 0, card);
        const newTriggers = _.clone(itemsSwitches);
        switch (_acceptedBy) {
            case 'actions':
                newTriggers[_acceptedBy][additionally] = copyCard;
                funcSet(setCards, newTriggers);
                return;
            case 'conditions':
                newTriggers[_acceptedBy][additionally] = copyCard;
                funcSet(setCards, newTriggers);
                return;
            default:
                newTriggers[_acceptedBy] = copyCard;
                funcSet(setCards, newTriggers);
                return;
        }
    }
};
const findCard = (id, cards) => {
    const card = cards.find((c) => c._id === id);
    return {
        card,
        index: cards.indexOf(card),
    };
};

export { moveCard, findCard };