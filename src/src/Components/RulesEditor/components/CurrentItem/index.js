import React, { memo, useState } from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import cls from './style.module.scss';
import CustomInput from '../CustomInput';

const CurrentItem = memo(({ Icon, name, ref, setItemsSwitches, itemsSwitches, _id }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const handlePopoverOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handlePopoverClose = () => {
        setAnchorEl(null);
    };
    return <div
        onMouseMove={handlePopoverOpen}
        onMouseEnter={handlePopoverOpen}
        onMouseLeave={handlePopoverClose} ref={ref} className={cls.card_style}>
        <Icon className={cls.icon_them_card} />
        <div className={cls.block_name}>
            <span>
                {name}
            </span>
            <CustomInput
                className={cls.input_card}
                autoComplete='off'
                label="CO2"
                variant="outlined"
                size="small"
            />
        </div>
        {setItemsSwitches && <div className={cls.control_menu} style={Boolean(anchorEl) ? { opacity: 1 } : { opacity: 0 }}>
            <div onClick={() => {
                setItemsSwitches([...itemsSwitches.filter(el => el._id !== _id)]);
            }} className={cls.close_btn} />
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