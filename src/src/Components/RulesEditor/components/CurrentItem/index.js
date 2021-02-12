import React, { memo, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import cls from './style.module.scss';
import { deepCopy } from '../../helpers/deepCopy';
import { filterElement } from '../../helpers/filterElement';
import GenericBlocks from '../GenericBlocks';
// import SayItBlocks from '../Blocks/SayItBlocks';


// @iobroker/javascript-block

const CurrentItem = memo(props => {
    const { setItemsSwitches, itemsSwitches, _id, _acceptedBy, blockValue, _inputs, active } = props;
    const [anchorEl, setAnchorEl] = useState(null);

    const handlePopoverOpen = event =>
        event.currentTarget !== anchorEl && setAnchorEl(event.currentTarget);

    const handlePopoverClose = () =>
        setAnchorEl(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const blockInput = useMemo(() => <GenericBlocks {...props} className={null} />, [_inputs])

    return <div
        onMouseMove={handlePopoverOpen}
        onMouseEnter={handlePopoverOpen}
        onMouseLeave={handlePopoverClose}
        className={`${cls.cardStyle} ${active ? cls.cardStyleActive : null}`}>
        {blockInput}
        {/* <SayItBlocks/> */}
        {setItemsSwitches && <div className={cls.controlMenu} style={Boolean(anchorEl) ? { opacity: 1 } : { opacity: 0 }}>
            <div onClick={e => {
                let newItemsSwitches = deepCopy(_acceptedBy, itemsSwitches, blockValue);
                newItemsSwitches = filterElement(_acceptedBy, newItemsSwitches, blockValue, _id);
                return setItemsSwitches(newItemsSwitches);
            }} className={cls.closeBtn} />
        </div>}
    </div>;
});

CurrentItem.defaultProps = {
    active: false
};

CurrentItem.propTypes = {
    name: PropTypes.string
};

export default CurrentItem;