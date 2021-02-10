const moveCard = (id, atIndex, cards, setCards, itemsSwitches) => {
    // console.log('2', id, atIndex, cards)
    const { card, index } = findCard(id, cards);
    if (card && index !== atIndex) {
        console.log(2233,index,atIndex)
        const copyCard = [...cards];
        copyCard.splice(index, 1);
        copyCard.splice(atIndex, 0, card);
        setCards({ ...itemsSwitches, 'triggers': copyCard });
    }
};
const findCard = (id, cards) => {
    // console.log('1', id, cards)
    const card = cards.find((c) => c._id === id);
    return {
        card,
        index: cards.indexOf(card)
    };
};

export { moveCard, findCard };