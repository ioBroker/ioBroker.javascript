import React, { memo, useCallback, useContext, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import cls from './style.module.scss';
import { deepCopy } from '../../helpers/deepCopy';
import { filterElement } from '../../helpers/filterElement';
import { ContextWrapperCreate } from '../ContextWrapper';
import { findElement } from '../../helpers/findElement';

// @iobroker/javascript-block

const CurrentItem = memo(props => {
    const { setUserRules, userRules, _id, id, blockValue, active, acceptedBy } = props;
    const [anchorEl, setAnchorEl] = useState(null);
    const { state: { blocks }, socket } = useContext(ContextWrapperCreate);
    const findElementBlocks = useCallback(id => blocks.find(el => {
        const staticData = el.getStaticData();
        return staticData.id === id;
    }), [blocks]);
    const onChange = useCallback(settings => {
        let newUserRules = findElement(settings, userRules, blockValue);
        setUserRules(newUserRules);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[userRules])
    const handlePopoverOpen = event =>
        event.currentTarget !== anchorEl && setAnchorEl(event.currentTarget);
    const handlePopoverClose = () =>
        setAnchorEl(null);
    const blockInput = useMemo(() => {
        const CustomBlock = findElementBlocks(id);
        return <CustomBlock {...props} onChange={onChange} className={null} socket={socket} />;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userRules]);
    const [isDelete, setIsDelete] = useState(false);
    return <div
        onMouseMove={handlePopoverOpen}
        onMouseEnter={handlePopoverOpen}
        onMouseLeave={handlePopoverClose}
        id="height"
        style={active ? { width: document.getElementById('width').clientWidth - 70 } : null}
        className={`${cls.cardStyle} ${active ? cls.cardStyleActive : null} ${isDelete ? cls.isDelete : null}`}>
        {blockInput}
        {setUserRules && <div className={cls.controlMenu} style={Boolean(anchorEl) ? { opacity: 1 } : { opacity: 0 }}>
            <div onClick={e => {
                let newItemsSwitches = deepCopy(acceptedBy, userRules, blockValue);
                newItemsSwitches = filterElement(acceptedBy, newItemsSwitches, blockValue, _id);
                setIsDelete(true);
                setTimeout(() => setUserRules(newItemsSwitches), 300);
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