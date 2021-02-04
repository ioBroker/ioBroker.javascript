import React, { memo, useState } from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import cls from './style.module.scss';
import CustomInput from '../CustomInput';
import { deepCopy } from '../../helpers/ deepCopy';
import { filterElement } from '../../helpers/filterElement';


// class GenericBlock extends React.Component {
//     constructor(props) {
//         super(props);
//         console.log(props.inputs);

//         this.state = {
//             inputs: props.inputs;
//         }
//     }

//     renderNumber() {

//     }
//     renderOid() {

//     }
//     renderText(){

//     }

//     render() {
//         return <div
//         onMouseMove={handlePopoverOpen}
//         onMouseEnter={handlePopoverOpen}
//         onMouseLeave={handlePopoverClose} ref={ref} className={cls.card_style}>
//         <Icon className={cls.icon_them_card} />
//         <div className={cls.block_name}>
//             <span>
//                 {name}
//             </span>
//             <CustomInput
//                 className={cls.input_card}
//                 autoComplete='off'
//                 label="CO2"
//                 variant="outlined"
//                 size="small"
//             />
//         </div>
//         {setItemsSwitches && <div className={cls.control_menu} style={Boolean(anchorEl) ? { opacity: 1 } : { opacity: 0 }}>
//             <div onClick={() => {
//                 setItemsSwitches([...itemsSwitches.filter(el => el._id !== _id)]);
//             }} className={cls.close_btn} />
//         </div>}
//     </div>
//     }
// };

// class TimeTrigger extends GenericBlock {
//     constructor(props) {
//         this.type = 'TimeTrigger';
//         this.acceptedBy = 'tigger';
//         const _props = JSON.parse(JSON.stringify(props));
//         _props.inputs = [
//             {type: 'cron', attr: 'myCron', name: {en: 'CRON'}, render: 'renderCron'}
//         ];
//         super(props);
//     }

//     renderCron() {
//         return null;
//     }    
// }

const CurrentItem = memo(props => {
    const { Icon, name, ref, setItemsSwitches, itemsSwitches, _id, _acceptedBy, blockValue } = props;
    const [anchorEl, setAnchorEl] = useState(null);
    const handlePopoverOpen = event =>
        setAnchorEl(event.currentTarget);
    const handlePopoverClose = () =>
        setAnchorEl(null);
    return <div
        onMouseMove={handlePopoverOpen}
        onMouseEnter={handlePopoverOpen}
        onMouseLeave={handlePopoverClose} ref={ref} className={cls.cardStyle}>
        <Icon className={cls.iconThemCard} />
        <div className={cls.blockName}>
            <span>
                {name}
            </span>
            <CustomInput
                className={cls.inputCard}
                autoComplete="off"
                label="CO2"
                variant="outlined"
                size="small"
            />
        </div>
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
    name: ''
};

CurrentItem.propTypes = {
    name: PropTypes.string
};

export default CurrentItem;