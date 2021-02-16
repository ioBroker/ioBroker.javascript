import React, { memo, useContext, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import cls from './style.module.scss';
import { deepCopy } from '../../helpers/deepCopy';
import { filterElement } from '../../helpers/filterElement';
import { ContextWrapperCreate } from '../ContextWrapper';

// @iobroker/javascript-block

const CurrentItem = memo(props => {
    const { setUserRules, userRules, _id, id, acceptedBy, blockValue, active, object } = props;
    const [anchorEl, setAnchorEl] = useState(null);
    const { state: { blocks }, socket } = useContext(ContextWrapperCreate);
    let _acceptedBy = acceptedBy;
    const handlePopoverOpen = event =>
        event.currentTarget !== anchorEl && setAnchorEl(event.currentTarget);
    const handlePopoverClose = () =>
        setAnchorEl(null);
    let _object = object;
    if (!_object) {
        _object = blocks.find(item => item.getStaticData().id === id);
    }
    if (_object) {
        _acceptedBy = _object.getStaticData().acceptedBy;
    }
    const blockInput = useMemo(() => {
        if (!_object) {
            return null;
        }
        const CustomBlock = _object;
        return <CustomBlock {...props} className={null} socket={socket} />;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [_object]);
    return <div
        onMouseMove={handlePopoverOpen}
        onMouseEnter={handlePopoverOpen}
        onMouseLeave={handlePopoverClose}
        className={`${cls.cardStyle} ${active ? cls.cardStyleActive : null}`}>
        {blockInput}
        {setUserRules && <div className={cls.controlMenu} style={Boolean(anchorEl) ? { opacity: 1 } : { opacity: 0 }}>
            <div onClick={e => {
                let newItemsSwitches = deepCopy(_acceptedBy, userRules, blockValue);
                newItemsSwitches = filterElement(_acceptedBy, newItemsSwitches, blockValue, _id);
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