import React, { memo, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import cls from './style.module.scss';
import { deepCopy } from '../../helpers/deepCopy';
import { filterElement } from '../../helpers/filterElement';
import GenericBlock from '../GenericBlock';
// import SayItBlocks from '../Blocks/SayItBlocks';


// @iobroker/javascript-block

const CurrentItem = memo(props => {
    const { setUserRules, userRules, _id, id, acceptedBy, blockValue, inputs, active, object, allBlocks } = props;
    const [anchorEl, setAnchorEl] = useState(null);

    const handlePopoverOpen = event =>
        event.currentTarget !== anchorEl && setAnchorEl(event.currentTarget);

    const handlePopoverClose = () =>
        setAnchorEl(null);

    const blockInput = useMemo(() => {
        let _object = object;
        if (!_object) {
            _object = allBlocks.find(item => {
                if (item.getStaticData) {
                    const staticData = item.getStaticData();
                    if (staticData.id === id) {
                        return true;
                    }
                } else {
                    return item.id === id;
                }
            });
        }

        if (_object) {
            const CustomBlock = _object;
            return <CustomBlock {...props} className={null}/>;
        } else {
            return <GenericBlock {...props} className={null}/>;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputs]);

    return <div
        onMouseMove={handlePopoverOpen}
        onMouseEnter={handlePopoverOpen}
        onMouseLeave={handlePopoverClose}
        className={`${cls.cardStyle} ${active ? cls.cardStyleActive : null}`}>
        {blockInput}
        {setUserRules && <div className={cls.controlMenu} style={Boolean(anchorEl) ? { opacity: 1 } : { opacity: 0 }}>
            <div onClick={e => {
                let newItemsSwitches = deepCopy(acceptedBy, userRules, blockValue);
                newItemsSwitches = filterElement(acceptedBy, newItemsSwitches, blockValue, _id);
                return setUserRules(newItemsSwitches);
            }} className={cls.closeBtn} />
        </div>}
    </div>;
});

CurrentItem.defaultProps = {
    active: false
};

CurrentItem.propTypes = {
    name: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
};

export default CurrentItem;