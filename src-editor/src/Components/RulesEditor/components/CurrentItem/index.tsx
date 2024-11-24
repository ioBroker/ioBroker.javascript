import React, { memo, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { AdminConnection, IobTheme, ThemeName, ThemeType } from '@iobroker/adapter-react-v5';
import cls from './style.module.scss';
import { deepCopy } from '../../helpers/deepCopy';
import { filterElement } from '../../helpers/filterElement';
import { ContextWrapperCreate } from '../ContextWrapper';
import { findElement } from '../../helpers/findElement';
import { GenericBlock, type GenericBlockProps } from '../GenericBlock';
import type { BlockValue, RuleBlockConfig, RuleBlockType, RuleUserRules } from '../../types';

interface CurrentItemProps {
    setUserRules: (newRules: RuleUserRules) => void;
    userRules: RuleUserRules;
    _id: number;
    id: string;
    blockValue: BlockValue;
    active?: boolean;
    acceptedBy: RuleBlockType;
    isTourOpen?: boolean;
    setTourStep?: (step: number) => void;
    tourStep?: number;
    theme: IobTheme;
    themeType: ThemeType;
    themeName: ThemeName;
    settings?: RuleBlockConfig;
}

// @iobroker/javascript-block
// eslint-disable-next-line react/display-name
const CurrentItem = memo((props: CurrentItemProps) => {
    const { setUserRules, userRules, _id, id, blockValue, active, acceptedBy, isTourOpen, setTourStep, tourStep } =
        props;

    const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
    const { blocks, socket, onUpdate, setOnUpdate, onDebugMessage, enableSimulation } =
        useContext(ContextWrapperCreate);

    useEffect(() => {
        console.log(`New message !! ${JSON.stringify(onDebugMessage)}`);
    }, [onDebugMessage]);

    const findElementBlocks = useCallback(
        (id: string) =>
            blocks?.find(el => {
                const staticData = el.getStaticData();
                return staticData.id === id;
            }),
        [blocks],
    );

    const onChange = useCallback(
        (settings: RuleBlockConfig): void => {
            const newUserRules = findElement(settings, userRules, blockValue);
            newUserRules && setUserRules(newUserRules);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [userRules],
    );

    const handlePopoverOpen = (event: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
        if (event.currentTarget !== anchorEl) {
            setAnchorEl(event.currentTarget);
        }
    };

    const handlePopoverClose = (): void => setAnchorEl(null);

    const blockInput = useMemo(() => {
        const CustomBlock: React.FC<GenericBlockProps<any>> = (findElementBlocks(id) ||
            GenericBlock) as unknown as React.FC<GenericBlockProps<any>>;

        return (
            <CustomBlock
                {...props}
                notFound={!findElementBlocks(id)}
                isTourOpen={isTourOpen}
                setTourStep={setTourStep}
                tourStep={tourStep}
                onUpdate={onUpdate}
                setOnUpdate={setOnUpdate}
                enableSimulation={enableSimulation}
                onDebugMessage={onDebugMessage}
                onChange={onChange}
                className={undefined}
                socket={socket as AdminConnection}
            />
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userRules, onUpdate, onDebugMessage, enableSimulation]);

    const [isDelete, setIsDelete] = useState(false);

    return (
        <div
            onMouseMove={handlePopoverOpen}
            onMouseEnter={handlePopoverOpen}
            onMouseLeave={handlePopoverClose}
            onMouseDown={el => {
                if (el.ctrlKey) {
                    let newItem: RuleBlockConfig | undefined;
                    const newUserRules = deepCopy(acceptedBy, userRules, blockValue);
                    if (acceptedBy === 'conditions') {
                        newItem = newUserRules.conditions[blockValue as number].find(el => el._id === _id);
                        if (newItem) {
                            newUserRules.conditions[blockValue as number].splice(
                                newUserRules.conditions[blockValue as number].indexOf(newItem),
                                0,
                                { ...newItem, _id: Date.now() },
                            );
                        }
                    } else if (acceptedBy === 'actions') {
                        newItem = newUserRules.actions[blockValue as 'then' | 'else'].find(el => el._id === _id);
                        if (newItem) {
                            newUserRules.actions[blockValue as 'then' | 'else'].splice(
                                newUserRules.actions[blockValue as 'then' | 'else'].indexOf(newItem),
                                0,
                                { ...newItem, _id: Date.now() },
                            );
                        }
                    } else {
                        newItem = newUserRules.triggers.find(el => el._id === _id);
                        if (newItem) {
                            newUserRules.triggers.splice(newUserRules[acceptedBy].indexOf(newItem), 0, {
                                ...newItem,
                                _id: Date.now(),
                            });
                        }
                    }

                    setUserRules(newUserRules);
                }
            }}
            id="height"
            style={active ? { width: (document.getElementById('width')?.clientWidth || 0) - 70 } : undefined}
            className={`${cls.cardStyle} ${active ? cls.cardStyleActive : null} ${isDelete ? cls.isDelete : null}`}
        >
            <div className={cls.drag_mobile} />
            {blockInput}
            {setUserRules && (
                <div
                    className={cls.controlMenu}
                    style={anchorEl ? { opacity: 1 } : { opacity: 0 }}
                >
                    <div
                        onClick={() => {
                            let newItemsSwitches = deepCopy(acceptedBy, userRules, blockValue);
                            newItemsSwitches = filterElement(acceptedBy, newItemsSwitches, blockValue, _id);
                            setIsDelete(true);
                            setTimeout(() => {
                                if (acceptedBy === 'triggers') {
                                    setOnUpdate(true);
                                }
                                setUserRules(newItemsSwitches);
                            }, 300);
                        }}
                        className={cls.closeBtn}
                    />
                </div>
            )}
        </div>
    );
});

export default CurrentItem;
