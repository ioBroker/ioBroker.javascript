import React, { useCallback, useContext, useState } from 'react';

import { Button, Typography } from '@mui/material';
import {
    Pause as IconPause,
    PlayArrow as IconResume,
    SkipNext as IconCycle,
    Redo as IconStep,
    Visibility as IconOnline,
    VisibilityOff as IconOffline,
} from '@mui/icons-material';

import { I18n, type AdminConnection } from '@iobroker/gui-components';

import type { FbDebugCommand, FbDebugStatus } from '@fb-core';

import { SignalBusContext, useOnline, type OnlineStatus } from './online';

interface OnlinePanelProps {
    active: boolean;
    onToggle: () => void;
    socket: AdminConnection;
    instance: string;
    scriptId: string;
    /** The instance of a user block whose inside is shown, like `b3/b7` */
    path: string;
    /** The script is enabled and its instance runs */
    running: boolean;
    /** The diagram has changes that are not saved - the values belong to the saved one */
    changed: boolean;
    onError: (error: { message: string; blockId?: string } | null) => void;
    /** How the online view stands, as the runtime reported it last */
    debug: FbDebugStatus | null;
    onDebug: (debug: FbDebugStatus | null) => void;
    onCommand: (command: FbDebugCommand) => void;
    /** What a command could not do, for a moment */
    commandError: string | null;
    /** The name of a block, for "paused in front of ..." */
    nameOf: (blockId: string) => string;
}

function statusText(
    status: OnlineStatus,
    debug: FbDebugStatus | null,
    nameOf: (blockId: string) => string,
): { text: string; color?: 'error' | 'warning' } {
    switch (status.kind) {
        case 'waiting':
            return { text: I18n.t('fbd_online_waiting') };
        case 'no-data':
            return { text: I18n.t('fbd_online_no_data', status.seconds), color: 'warning' };
        case 'stalled':
            return { text: I18n.t('fbd_online_stalled', status.cycle), color: 'error' };
        case 'no-values':
            return { text: I18n.t('fbd_online_no_values', status.cycle), color: 'warning' };
        case 'paused':
            return {
                text: debug?.at
                    ? I18n.t('fbd_online_paused_at', nameOf(debug.at), status.cycle)
                    : I18n.t('fbd_online_paused', status.cycle),
                color: 'warning',
            };
        default:
            return {
                text:
                    status.mode === 'event'
                        ? `${I18n.t('fbd_online_cycle', status.cycle)} · ${I18n.t('fbd_online_event')}`
                        : I18n.t('fbd_online_cycle', status.cycle),
            };
    }
}

/**
 * Switches the online view, tells how it goes, and steers the running diagram: pause, single cycle,
 * single step, and what is forced or has a breakpoint. It keeps its status to itself: the status
 * changes every second, and nothing else has to be drawn again for it.
 */
export default function OnlinePanel(props: OnlinePanelProps): React.JSX.Element {
    const { active, running, changed, debug, onCommand } = props;
    const bus = useContext(SignalBusContext);
    const [status, setStatus] = useState<OnlineStatus>({ kind: 'waiting' });

    const onStatus = useCallback(
        (next: OnlineStatus) =>
            setStatus(current => (JSON.stringify(current) === JSON.stringify(next) ? current : next)),
        [],
    );

    useOnline({
        active,
        socket: props.socket,
        instance: props.instance,
        scriptId: props.scriptId,
        path: props.path,
        bus,
        onStatus,
        onError: props.onError,
        onDebug: props.onDebug,
    });

    const { text, color } = statusText(status, debug, props.nameOf);
    const forced = debug ? Object.keys(debug.forced).length : 0;
    const breakpoints = debug?.breakpoints.length || 0;
    // the runtime answered: the diagram runs and can be steered
    const steerable = active && running && !!debug;

    // what there is to say besides the status: under the toolbar, only while there is something
    const notices = [
        steerable && forced ? (
            <Typography
                key="forced"
                variant="caption"
                color="warning"
                component="div"
            >
                {I18n.t('fbd_debug_forced_count', forced)}{' '}
                <Button
                    size="small"
                    color="warning"
                    className="fb-online-link"
                    onClick={() => onCommand({ command: 'release' })}
                >
                    {I18n.t('fbd_debug_release_all')}
                </Button>
            </Typography>
        ) : null,
        steerable && breakpoints ? (
            <Typography
                key="breakpoints"
                variant="caption"
                component="div"
            >
                {I18n.t('fbd_debug_breakpoint_count', breakpoints)}{' '}
                <Button
                    size="small"
                    className="fb-online-link"
                    onClick={() => onCommand({ command: 'breakpoint', on: false })}
                >
                    {I18n.t('fbd_debug_remove_all')}
                </Button>
            </Typography>
        ) : null,
        props.commandError ? (
            <Typography
                key="error"
                variant="caption"
                color="error"
                component="div"
            >
                {props.commandError}
            </Typography>
        ) : null,
    ].filter(notice => notice);

    return (
        <div className="fb-online">
            {steerable ? (
                <div className="fb-online-steer">
                    {debug.paused ? (
                        <button
                            type="button"
                            className="fb-tool fb-tool-go"
                            title={I18n.t('fbd_debug_resume')}
                            onClick={() => onCommand({ command: 'resume' })}
                        >
                            <IconResume />
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="fb-tool"
                            title={I18n.t('fbd_debug_pause')}
                            onClick={() => onCommand({ command: 'pause' })}
                        >
                            <IconPause />
                        </button>
                    )}
                    <button
                        type="button"
                        className="fb-tool"
                        title={I18n.t('fbd_debug_cycle')}
                        onClick={() => onCommand({ command: 'cycle' })}
                    >
                        <IconCycle />
                    </button>
                    <button
                        type="button"
                        className="fb-tool"
                        disabled={!debug.breaks}
                        title={I18n.t(debug.breaks ? 'fbd_debug_step' : 'fbd_debug_save_once')}
                        onClick={() => onCommand({ command: 'step' })}
                    >
                        <IconStep />
                    </button>
                </div>
            ) : null}
            {/* in one line, so nothing covers the diagram; the long text is the tooltip */}
            {!running ? (
                <Typography
                    variant="caption"
                    color="warning"
                    className="fb-online-status"
                    title={I18n.t('fbd_online_not_running')}
                >
                    {I18n.t('fbd_online_not_running')}
                </Typography>
            ) : active ? (
                <Typography
                    variant="caption"
                    color={color}
                    className="fb-online-status"
                    title={changed ? `${text}\n${I18n.t('fbd_online_changed')}` : text}
                >
                    {text}
                    {changed ? (
                        <Typography
                            component="span"
                            variant="caption"
                            color="warning"
                        >
                            {' '}
                            · {I18n.t('fbd_online_changed_short')}
                        </Typography>
                    ) : null}
                </Typography>
            ) : null}
            <button
                type="button"
                className={`fb-online-toggle${active ? ' fb-online-on' : ''}`}
                onClick={props.onToggle}
                title={I18n.t('fbd_online_tooltip')}
            >
                {active ? <IconOnline /> : <IconOffline />}
                {I18n.t('fbd_online')}
            </button>
            {notices.length ? <div className="fb-online-notices">{notices}</div> : null}
        </div>
    );
}
