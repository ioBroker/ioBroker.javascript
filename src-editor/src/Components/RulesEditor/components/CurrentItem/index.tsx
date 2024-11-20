import React, { memo, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import cls from './style.module.scss';
import { deepCopy } from '../../helpers/deepCopy';
import { filterElement } from '../../helpers/filterElement';
import { ContextWrapperCreate } from '../ContextWrapper';
import { findElement } from '../../helpers/findElement';
import { GenericBlock, type GenericBlockProps } from '../GenericBlock';

interface CurrentItemProps {
    setUserRules: any;
    userRules: any;
    _id: string;
    id: string;
    blockValue: string;
    active: boolean;
    acceptedBy: string;
    isTourOpen: boolean;
    setTourStep: any;
    tourStep: number;
}

// @iobroker/javascript-block
const CurrentItem = memo((props: CurrentItemProps): React.JSX.Element => {
    const { setUserRules, userRules, _id, id, blockValue, active, acceptedBy, isTourOpen, setTourStep, tourStep } =
        props;
    const [anchorEl, setAnchorEl] = useState(null);
    const { blocks, socket, onUpdate, setOnUpdate, onDebugMessage, enableSimulation } =
        useContext(ContextWrapperCreate);

    useEffect(() => {
        console.log(`New message !! ${JSON.stringify(onDebugMessage)}`);
    }, [onDebugMessage]);

    const findElementBlocks = useCallback(
        (id: string) =>
            blocks.find(el => {
                const staticData = el.getStaticData();
                return staticData.id === id;
            }),
        [blocks],
    );

    const onChange = useCallback(
        settings => {
            const newUserRules = findElement(settings, userRules, blockValue);
            newUserRules && setUserRules(newUserRules);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [userRules],
    );

    const handlePopoverOpen = event => event.currentTarget !== anchorEl && setAnchorEl(event.currentTarget);

    const handlePopoverClose = () => setAnchorEl(null);

    const blockInput = useMemo(() => {
        const CustomBlock = findElementBlocks(id) || GenericBlock;
        return (
            <CustomBlock
                isTourOpen={isTourOpen}
                setTourStep={setTourStep}
                tourStep={tourStep}
                notFound={!findElementBlocks(id)}
                {...props}
                onUpdate={onUpdate}
                setOnUpdate={setOnUpdate}
                enableSimulation={enableSimulation}
                onDebugMessage={onDebugMessage}
                onChange={onChange}
                className={null}
                socket={socket}
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
                    let newItem;
                    const newUserRules = deepCopy(acceptedBy, userRules, blockValue);
                    if (blockValue !== 'triggers') {
                        newItem = newUserRules[acceptedBy][blockValue].find(el => el._id === _id);
                    } else {
                        newItem = newUserRules[acceptedBy].find(el => el._id === _id);
                    }
                    if (blockValue !== 'triggers') {
                        newUserRules[acceptedBy][blockValue].splice(
                            newUserRules[acceptedBy][blockValue].indexOf(newItem),
                            0,
                            { ...newItem, _id: Date.now() },
                        );
                    } else {
                        newUserRules[acceptedBy].splice(newUserRules[acceptedBy].indexOf(newItem), 0, {
                            ...newItem,
                            _id: Date.now(),
                        });
                    }
                    setUserRules(newUserRules);
                }
            }}
            id="height"
            style={active ? { width: document.getElementById('width')?.clientWidth - 70 } : null}
            className={`${cls.cardStyle} ${active ? cls.cardStyleActive : null} ${isDelete ? cls.isDelete : null}`}
        >
            <div className={cls.drag_mobile} />
            {blockInput}
            {setUserRules && (
                <div
                    className={cls.controlMenu}
                    style={Boolean(anchorEl) ? { opacity: 1 } : { opacity: 0 }}
                >
                    <div
                        onClick={e => {
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
