import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import cls from './style.module.scss';

import { CustomDragLayer } from './components/CustomDragLayer';
import ContentBlockItems from './components/ContentBlockItems';
import { ContextWrapperCreate } from './components/ContextWrapper';
import Compile from './helpers/Compile';
import PropTypes from 'prop-types';
import Menu from './components/Menu';
import I18n from '@iobroker/adapter-react/i18n';
import './helpers/stylesVariables.scss';

import DialogExport from '../../Dialogs/Export';
import DialogImport from '../../Dialogs/Import';
import clsx from 'clsx';

const RulesEditor = ({ code, onChange, themeName, setTourStep, tourStep, isTourOpen, command }) => {
    // eslint-disable-next-line no-unused-vars
    const { blocks, socket, setOnUpdate } = useContext(ContextWrapperCreate);
    const [allBlocks, setAllBlocks] = useState([]);
    const [userRules, setUserRules] = useState(Compile.code2json(code));
    const [importExport, setImportExport] = useState('');
    const [modal, setModal] = useState(false);

    useEffect(() => {
        if (!!command) {
            setImportExport(command);
            if (!modal) {
                setModal(true);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [command]);

    useEffect(() => {
        const newUserRules = Compile.code2json(code);
        if (JSON.stringify(newUserRules) !== JSON.stringify(userRules)) {
            setUserRules(newUserRules);
            setOnUpdate(true);
        }
        // eslint-disable-next-line
    }, [code]);

    useEffect(() => {
        document.getElementsByTagName('HTML')[0].className = themeName || 'blue';
    }, [themeName]);

    const onChangeBlocks = useCallback(json => {
        setUserRules(json);
        onChange(Compile.json2code(json, blocks));
    }, [blocks, onChange]);

    const ref = useRef({ clientWidth: 0 });
    const [addClass, setAddClass] = useState({ 835: false, 1035: false });
    useEffect(() => {
        if (ref.current) {
            if (ref.current.clientWidth <= 1035) {
                setAddClass({ 835: false, 1035: true });
            }
            if (ref.current.clientWidth <= 835) {
                setAddClass({ 1035: true, 835: true });
            }
            if (ref.current.clientWidth > 1035) {
                setAddClass({ 835: false, 1035: false });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ref.current.clientWidth])

    if (!blocks) {
        return null;
    }
    return <div className={cls.wrapperRules} ref={ref}>
        <CustomDragLayer allBlocks={allBlocks} socket={socket} />
        {importExport === "export" ?
            <DialogExport
                key="dialogExport"
                onClose={() => setModal(false)}
                open={modal}
                text={JSON.stringify(userRules, null, 2)} /> :
            <DialogImport
                open={modal}
                key="dialogImport"
                onClose={text => {
                    setModal(false);
                    if (text) {
                        onChangeBlocks(JSON.parse(text));
                    }
                }} />}
        <div className={clsx(cls.rootWrapper, addClass[835] && cls.addClass)}>
            <Menu
                setAllBlocks={setAllBlocks}
                allBlocks={allBlocks}
                userRules={userRules}
                onChangeBlocks={onChangeBlocks}
                setTourStep={setTourStep}
                tourStep={tourStep}
                addClass={addClass}
                isTourOpen={isTourOpen}
            />
            <ContentBlockItems
                setUserRules={onChangeBlocks}
                userRules={userRules}
                isTourOpen={isTourOpen}
                setTourStep={setTourStep}
                tourStep={tourStep}
                name={`${I18n.t('when')}...`}
                typeBlock="triggers"
                iconName="FlashOn"
                size={addClass[835]}
            />
            <ContentBlockItems
                setUserRules={onChangeBlocks}
                isTourOpen={isTourOpen}
                setTourStep={setTourStep}
                tourStep={tourStep}
                userRules={userRules}
                name={`...${I18n.t('and')}...`}
                typeBlock="conditions"
                iconName="Help"
                nameAdditionally={I18n.t('or')}
                additionally
                border
                size={addClass[835]}
            />
            <ContentBlockItems
                setUserRules={onChangeBlocks}
                isTourOpen={isTourOpen}
                setTourStep={setTourStep}
                tourStep={tourStep}
                userRules={userRules}
                name={`...${I18n.t('then')}`}
                typeBlock="actions"
                iconName="PlayForWork"
                nameAdditionally={I18n.t('else')}
                additionally
                size={addClass[835]}
            />
        </div>
    </div>;
}

RulesEditor.propTypes = {
    onChange: PropTypes.func,
    code: PropTypes.string
};

export default RulesEditor;
