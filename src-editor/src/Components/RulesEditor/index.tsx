import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';

import { I18n, type IobTheme, type ThemeName, type ThemeType, Utils } from '@iobroker/adapter-react-v5';

import cls from './style.module.scss';

import { CustomDragLayer } from './components/CustomDragLayer';
import ContentBlockItems from './components/ContentBlockItems';
import { ContextWrapperCreate } from './components/ContextWrapper';
import { code2json, json2code } from './helpers/Compile';
import Menu from './components/Menu';
import './helpers/stylesVariables.scss';

import DialogExport from '../../Dialogs/Export';
import DialogImport from '../../Dialogs/Import';
import type { DebugMessage, RuleUserRules } from '@iobroker/javascript-rules-dev';
import type { GenericBlock } from '@/Components/RulesEditor/components/GenericBlock';

interface RulesEditorProps {
    onChange: (code: string) => void;
    code: string;
    scriptId: string;
    setTourStep: (step: number) => void;
    tourStep: number;
    command: string;
    themeType: ThemeType;
    themeName: ThemeName;
    theme: IobTheme;
    searchText: string;
    resizing: boolean;
    isTourOpen: boolean;
    changed: boolean;
    running: boolean;
}

let gDebugMessages: DebugMessage[] = [];

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
}: RulesEditorProps): React.JSX.Element | null => {
    const { blocks, socket, setOnUpdate, setOnDebugMessage, setEnableSimulation } = useContext(ContextWrapperCreate);
    const [allBlocks, setAllBlocks] = useState<(typeof GenericBlock<any>)[]>([]);
    const [userRules, setUserRules] = useState(code2json(code));
    const [importExport, setImportExport] = useState('');
    const [modal, setModal] = useState(false);

    useEffect(() => {
        let _jsInstance: string | undefined;
        let _jsAlive: boolean;
        const aliveHandler = (id: string, state: ioBroker.State | null | undefined): void => {
            if (id === `${_jsInstance}.alive`) {
                if (_jsAlive !== state?.val) {
                    _jsAlive = !!state?.val;
                    //setJsAlive(_jsAlive);
                    _jsAlive &&
                        _jsInstance &&
                        void socket?.sendTo(_jsInstance.replace(/^system\.adapter\./, ''), 'rulesOn', scriptId);
                }
            }
        };

        const handler = (_id: string, obj: ioBroker.Object | null | undefined): void => {
            if (!socket) {
                return;
            }
            if (_jsInstance !== (obj as ioBroker.ScriptObject)?.common?.engine) {
                if (_jsInstance) {
                    socket.unsubscribeState(`${_jsInstance}.alive`, aliveHandler);
                    if (_jsAlive) {
                        void socket.sendTo(_jsInstance.replace(/^system\.adapter\./, ''), 'rulesOn', scriptId);
                    }
                }
                _jsInstance = obj?.common?.engine;
                if (_jsInstance) {
                    _jsInstance && void socket.subscribeState(`${_jsInstance}.alive`, aliveHandler);
                }
            }
        };

        const handlerStatus = (_id: string, state: ioBroker.State | null | undefined): void => {
            if (state) {
                try {
                    const msg: DebugMessage = JSON.parse(state.val as string);
                    const now = Date.now();
                    // if not from previous session
                    if (msg.ruleId === scriptId && now - msg.ts < 1000) {
                        const messages = [...gDebugMessages, { blockId: msg.blockId, data: msg.data, ts: msg.ts }];
                        // Delete all messages older than 5 seconds and if the length is bigger than 200
                        if (messages.length > 200) {
                            messages.splice(0, 200 - messages.length);
                        }
                        for (let m = messages.length - 1; m >= 0; m--) {
                            if (messages[m].ts < now - 5000) {
                                messages.splice(0, m);
                                break;
                            }
                        }
                        console.log(`Debug1: ${JSON.stringify(gDebugMessages)}`);
                        console.log(`Debug2: ${JSON.stringify(messages)}`);

                        gDebugMessages = messages;
                        setOnDebugMessage(messages);
                    }
                } catch {
                    console.error(`Cannot parse: ${state.val}`);
                }
            }
        };

        void socket?.getObject(scriptId).then(obj => {
            _jsInstance = obj?.common?.engine;
            void socket.subscribeObject(scriptId, handler);
            if (_jsInstance) {
                // setJsInstance(_jsInstance);
                void socket.subscribeState(`${_jsInstance}.alive`, aliveHandler);
                void socket.subscribeState(
                    `${_jsInstance.replace(/^system\.adapter\./, '')}.debug.rules`,
                    handlerStatus,
                );
            }
        });

        return function cleanup() {
            socket?.unsubscribeState(scriptId, aliveHandler);
            if (_jsInstance) {
                void socket?.unsubscribeObject(`${_jsInstance}.alive`, handler);
                if (_jsAlive) {
                    void socket?.sendTo(_jsInstance.replace(/^system\.adapter\./, ''), 'rulesOff', scriptId);
                }
                socket?.unsubscribeState(`${_jsInstance.replace(/^system\.adapter\./, '')}.debug.rules`, handlerStatus);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setEnableSimulation(!changed && running);
    }, [changed, running, setEnableSimulation]);

    useEffect(() => {
        if (command) {
            setImportExport(command);
            if (!modal) {
                setModal(true);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [command]);

    useEffect(() => {
        const newUserRules = code2json(code);
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
        (json: RuleUserRules): void => {
            setUserRules(json);
            if (blocks) {
                onChange(json2code(json, blocks));
            }
        },
        [blocks, onChange],
    );

    const ref = useRef<HTMLDivElement>(null);
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
    }, [ref.current?.clientWidth || 0]);

    if (!blocks || !socket) {
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
            {modal ? (
                importExport === 'export' ? (
                    <DialogExport
                        scriptId={scriptId}
                        themeType={themeType}
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
                )
            ) : null}
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
                        socket={socket}
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
                        socket={socket}
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
                        socket={socket}
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

export default RulesEditor;
