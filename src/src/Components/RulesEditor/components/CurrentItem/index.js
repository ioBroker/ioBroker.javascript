import React, { memo, useEffect, useRef, useState } from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import cls from './style.module.scss';
// import CustomInput from '../CustomInput';
import { deepCopy } from '../../helpers/ deepCopy';
import { filterElement } from '../../helpers/filterElement';
import GenericInputBlock from '../GenericInputBlock';


const CurrentItem = memo(props => {
    const { Icon, ref, setItemsSwitches, itemsSwitches, _id, _acceptedBy, blockValue, _inputs, _name } = props;
    const [anchorEl, setAnchorEl] = useState(null);
    const handlePopoverOpen = event =>
        setAnchorEl(event.currentTarget);
    const handlePopoverClose = () =>
        setAnchorEl(null);
    const generic = useRef(null);
    const [tag, setTag] = useState('');
    useEffect(() => {
        if (generic) {
            setTag(generic.current.tagGenerate());
        }
    }, [generic]);
    return <div
        onMouseMove={handlePopoverOpen}
        onMouseEnter={handlePopoverOpen}
        onMouseLeave={handlePopoverClose}
        ref={ref}
        className={cls.cardStyle}>
        <Icon className={cls.iconThemCard} />
        <div className={cls.blockName}>
            <span className={cls.nameCard}>
                {_name.en}
            </span>
            <GenericInputBlock ref={generic} className={null} inputs={_inputs || []} />
        </div>
        {setItemsSwitches && <div className={cls.controlMenu} style={Boolean(anchorEl) ? { opacity: 1 } : { opacity: 0 }}>
            <div onClick={e => {
                let newItemsSwitches = deepCopy(_acceptedBy, itemsSwitches, blockValue);
                newItemsSwitches = filterElement(_acceptedBy, newItemsSwitches, blockValue, _id);
                return setItemsSwitches(newItemsSwitches);
            }} className={cls.closeBtn} />
        </div>}
        {setItemsSwitches && tag && <div className={cls.controlMenuTop} style={Boolean(anchorEl) ? { opacity: 1, height: 20, top: -20 } : { opacity: 0, height: 0, top: 0 }}>
            <div onClick={async e => {
                await generic.current.tagGenerateNew();
                await setTag(generic.current.tagGenerate());
            }} className={cls.tagCard} >{tag}</div>
        </div>}
    </div>;
});

CurrentItem.defaultProps = {
    name: ''
};

CurrentItem.propTypes = {
    name: PropTypes.string
};

export default CurrentItem;