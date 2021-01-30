import React, { useState } from 'react';
import cls from './rules.module.scss';
import MusicNoteIcon from '@material-ui/icons/MusicNote';
import ShuffleIcon from '@material-ui/icons/Shuffle';
import PlaylistPlayIcon from '@material-ui/icons/PlaylistPlay';
// import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import CustomInput from './components/CustomInput';
import CurrentItem from './components/CurrentItem';
import { CustomDragLayer } from './components/CustomDragLayer';
import CustomDragItem from './components/CardMenu/CustomDragItem';
import ContentBlockItems from './components/ContentBlockItems';
import HamurgerMenu from './components/HamurgerMenu';
// import PropTypes from 'prop-types';

// import I18n from '@iobroker/adapter-react/i18n';
// import DialogMessage from '@iobroker/adapter-react/Dialogs/Message';

const RulesEditor = () => {
    // eslint-disable-next-line no-unused-vars
    const [switches, setSwitches] = useState([
        {
            name: 'Audio',
            icon: (props) => <MusicNoteIcon {...props} className={cls.icon_them} />,
            type: "when"
        },
        {
            name: 'Shuffle',
            icon: (props) => <ShuffleIcon {...props} className={cls.icon_them} />,
            type: "and"
        },
        {
            name: 'Playlist Play',
            icon: (props) => <PlaylistPlayIcon {...props} className={cls.icon_them} />,
            type: "then"
        }
    ]);
    const [hamburgerOnOff, setHumburgerOnOff] = useState(false);
    return (
        <div className={cls.wrapper_rules}>
            <div className={`${cls.hamburger_wrapper} ${hamburgerOnOff ? cls.hamburger_off : null}`} onClick={() => setHumburgerOnOff(!hamburgerOnOff)}><HamurgerMenu boolean={!hamburgerOnOff} /></div>
            <div className={`${cls.menu_rules} ${hamburgerOnOff ? cls.menu_off : null}`}>
                <CustomInput
                    className={cls.input_width}
                    fullWidth
                    autoComplete='off'
                    label="search"
                    variant="outlined" />
                <div className={cls.menu_title}>
                    Switches
            </div>
                <div>
                    {switches.map(({ name, icon }) => {
                        return (<CustomDragItem isActive={false} name={name} Icon={icon} id={name} />)
                    })}
                </div>
            </div>
            <CustomDragLayer />
            <ContentBlockItems name='when...'>
                <CurrentItem name='Audio' Icon={(props) => <MusicNoteIcon {...props} />} />
            </ContentBlockItems>
            <ContentBlockItems name='...and...' nameDop='or' dopLength={2} dop border>
                <CurrentItem name='Shuffle' Icon={(props) => <ShuffleIcon {...props} />} />
                <CurrentItem name='Shuffle' Icon={(props) => <ShuffleIcon {...props} />} />
            </ContentBlockItems>
            <ContentBlockItems name='...then' nameDop='else' dop border>
            </ContentBlockItems>
        </div>
    )
}

// RulesEditor.propTypes = {

// };

export default RulesEditor;
