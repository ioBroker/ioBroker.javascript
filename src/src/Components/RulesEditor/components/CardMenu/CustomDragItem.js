import React from 'react';
import CardMenu from '.';
import DragWrapper from '../DragWrapper';

const CustomDragItem = (props) => {
    const { allProperties } = props;
    return <DragWrapper {...props} {...allProperties}><CardMenu {...props} {...allProperties} /></DragWrapper>;
}

export default CustomDragItem;