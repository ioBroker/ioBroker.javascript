import React, { useEffect, useState } from 'react';
import cls from './rules.module.scss';
import MusicNoteIcon from '@material-ui/icons/MusicNote';
import ShuffleIcon from '@material-ui/icons/Shuffle';
import PlaylistPlayIcon from '@material-ui/icons/PlaylistPlay';
import CustomInput from './components/CustomInput';
import { CustomDragLayer } from './components/CustomDragLayer';
import CustomDragItem from './components/CardMenu/CustomDragItem';
import ContentBlockItems from './components/ContentBlockItems';
import HamurgerMenu from './components/HamurgerMenu';
import { useStateLocal } from './hooks/useStateLocal';
// import PropTypes from 'prop-types';

// import I18n from '@iobroker/adapter-react/i18n';
// import DialogMessage from '@iobroker/adapter-react/Dialogs/Message';
const allSwitches = [
    {
        name: 'Audio',
        icon: (props) => <MusicNoteIcon {...props} className={cls.icon_them} />,
        typeBlock: "when"
    },
    {
        name: 'Shuffle',
        icon: (props) => <ShuffleIcon {...props} className={cls.icon_them} />,
        typeBlock: "and"
    },
    {
        name: 'Playlist Play',
        icon: (props) => <PlaylistPlayIcon {...props} className={cls.icon_them} />,
        typeBlock: "then"
    }
]

const RulesEditor = () => {
    // eslint-disable-next-line no-unused-vars
    const [switches, setSwitches] = useState([]);
    useEffect(() => {
        setSwitches(allSwitches);
    }, []);
    const [hamburgerOnOff, setHumburgerOnOff] = useStateLocal(false, 'hamburgerOnOff');
    const [itemsSwitches, setItemsSwitches] = useStateLocal([], 'switchesItems');
    const [inputText, setInputText] = useState('');
    return (
        <div className={cls.wrapper_rules}>
            <CustomDragLayer />
            <div className={`${cls.hamburger_wrapper} ${hamburgerOnOff ? cls.hamburger_off : null}`} onClick={() => setHumburgerOnOff(!hamburgerOnOff)}><HamurgerMenu boolean={!hamburgerOnOff} /></div>
            <div className={`${cls.menu_rules} ${hamburgerOnOff ? cls.menu_off : null}`}>
                <CustomInput
                    className={cls.input_width}
                    fullWidth
                    customValue
                    value={inputText}
                    autoComplete='off'
                    label="search"
                    variant="outlined"
                    onChange={(value) => {
                        setInputText(value)
                        setSwitches([...allSwitches.filter(({ name }) => name.toLowerCase().indexOf(value.toLowerCase()) + 1)])
                    }}
                />
                <div className={cls.menu_title}>
                    Switches
            </div>
                <div>
                    {switches.map(({ name, icon, typeBlock }) => {
                        return (<CustomDragItem itemsSwitches={itemsSwitches} setItemsSwitches={setItemsSwitches} isActive={false} name={name} Icon={icon} id={name} typeBlock={typeBlock} />)
                    })}
                    {switches.length === 0 && <div className={cls.nothing_found}>
                        Nothing found...
                        <div className={cls.reset_search} onClick={() => {
                            setInputText('');
                            setSwitches(allSwitches);
                        }}>reset search</div>
                    </div>}
                </div>
            </div>
            <ContentBlockItems setItemsSwitches={setItemsSwitches} itemsSwitches={itemsSwitches} name='when...' />
            <ContentBlockItems setItemsSwitches={setItemsSwitches} itemsSwitches={itemsSwitches} name='...and...' nameDop='or' dopLength={2} dop border />
            <ContentBlockItems setItemsSwitches={setItemsSwitches} itemsSwitches={itemsSwitches} name='...then' nameDop='else' dop />
        </div>
    )
}

// RulesEditor.propTypes = {

// };

export default RulesEditor;
