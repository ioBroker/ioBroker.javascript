import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import { I18n, Utils } from '@iobroker/adapter-react-v5';

import cls from './style.module.scss';

import { CustomDragLayer } from './components/CustomDragLayer';
import ContentBlockItems from './components/ContentBlockItems';
import { ContextWrapperCreate } from './components/ContextWrapper';
import Compile from './helpers/Compile';
import Menu from './components/Menu';
import './helpers/stylesVariables.scss';

import DialogExport from '../../Dialogs/Export';
import DialogImport from '../../Dialogs/Import';

const RulesEditor = ({
    code,
    onChange,
    themeName,
    themeType,
    theme,
    setTourStep,
    tourStep,
    isTourOpen,
    command,
    scriptId,
    changed,
    running,
}) => {
    // eslint-disable-next-line no-unused-vars
    const { blocks, socket, setOnUpdate, setOnDebugMessage, setEnableSimulation } = useContext(ContextWrapperCreate);
    const [allBlocks, setAllBlocks] = useState([]);
    const [userRules, setUserRules] = useState(Compile.code2json(code));
    const [importExport, setImportExport] = useState('');
    const [modal, setModal] = useState(false);
    //const [jsAlive, setJsAlive] = useState(false);
    //const [jsInstance, setJsInstance] = useState(false);

    useEffect(() => {
        let _jsInstance;
        let _jsAlive;
        const handler = (id, obj) => {
            if (id === _jsInstance + '.alive') {
                if (_jsAlive !== obj?.val) {
                    _jsAlive = obj?.val;
                    //setJsAlive(_jsAlive);
                    _jsAlive && socket.sendTo(_jsInstance.replace(/^system\.adapter\./, ''), 'rulesOn', scriptId);
                }
            } else {
                if (_jsInstance !== obj?.common?.engine) {
                    _jsInstance && socket.unsubscribeState(`${_jsInstance}.alive`, handler);
                    _jsAlive && socket.sendTo(_jsInstance.replace(/^system\.adapter\./, ''), 'rulesOn', scriptId);
                    _jsInstance = obj?.common?.engine;
                    //setJsInstance(_jsInstance);
                    _jsInstance && socket.subscribeState(`${_jsInstance}.alive`, handler);
                }
            }
        };

        const handlerStatus = (id, state) => {
            if (state) {
                try {
                    let msg = JSON.parse(state.val);
                    // if not from previous session
                    if (msg.ruleId === scriptId && Date.now() - msg.ts < 1000) {
                        setOnDebugMessage({ blockId: msg.blockId, data: msg.data, ts: msg.ts });
                    }
                } catch (e) {
                    console.error('Cannot parse: ' + state.val);
                }
            }
        };

        socket.getObject(scriptId).then(obj => {
            _jsInstance = obj?.common?.engine;
            //setJsInstance(_jsInstance);
            socket.subscribeObject(scriptId, handler);
            _jsInstance && socket.subscribeState(`${_jsInstance}.alive`, handler);
            _jsInstance &&
                socket.subscribeState(_jsInstance.replace(/^system\.adapter\./, '') + '.debug.rules', handlerStatus);
        });

        return function cleanup() {
            _jsInstance && socket.unsubscribeObject(`${_jsInstance}.alive`, handler);
            socket.unsubscribeState(scriptId, handler);
            _jsAlive &&
                _jsInstance &&
                socket.sendTo(_jsInstance.replace(/^system\.adapter\./, ''), 'rulesOff', scriptId);
            _jsInstance &&
                socket.unsubscribeState(_jsInstance.replace(/^system\.adapter\./, '') + '.debug.rules', handlerStatus);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setEnableSimulation(!changed && running);
    }, [changed, running, setEnableSimulation]);

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

    const onChangeBlocks = useCallback(
        json => {
            setUserRules(json);
            onChange(Compile.json2code(json, blocks));
        },
        [blocks, onChange],
    );

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
    }, [ref.current.clientWidth]);

    if (!blocks) {
        return null;
    }

    return (
        <div
            key="rulesEditor"
            className={cls.wrapperRules}
            ref={ref}
        >
            <CustomDragLayer
                allBlocks={allBlocks}
                socket={socket}
            />
            {modal ? (importExport === 'export' ? (
                <DialogExport
                    onClose={() => setModal(false)}
                    text={JSON.stringify(userRules, null, 2)}
                />
            ) : (
                <DialogImport
                    onClose={text => {
                        setModal(false);
                        if (text) {
                            onChangeBlocks(JSON.parse(text));
                        }
                    }}
                />
            )) : null}
            {
                <div className={Utils.clsx(cls.rootWrapper, addClass[835] && cls.addClass)}>
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
                        themeType={themeType}
                        themeName={themeName}
                        theme={theme}
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
                        themeType={themeType}
                        themeName={themeName}
                        theme={theme}
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
                        themeType={themeType}
                        themeName={themeName}
                        theme={theme}
                    />
                </div>
            }
        </div>
    );
};

RulesEditor.propTypes = {
    onChange: PropTypes.func,
    code: PropTypes.string,
    scriptId: PropTypes.string,
    setTourStep: PropTypes.func,
    tourStep: PropTypes.number,
    command: PropTypes.string,
    themeType: PropTypes.string,
    themeName: PropTypes.string,
    theme: PropTypes.object,
    searchText: PropTypes.string,
    resizing: PropTypes.bool,
};

export default RulesEditor;
