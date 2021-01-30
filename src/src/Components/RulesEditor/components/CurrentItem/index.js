import React, { memo } from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import cls from './style.module.scss';
import CustomInput from '../CustomInput';

const CurrentItem = memo(({ Icon, name, ref }) => {
    return <div ref={ref} className={cls.card_style}>
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
    </div>;
});

CurrentItem.defaultProps = {
    name: ''
};

CurrentItem.propTypes = {
    name: PropTypes.string
};

export default CurrentItem;