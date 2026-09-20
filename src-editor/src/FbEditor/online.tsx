/**
 * The online view: the values of a running diagram, live on its pins and links.
 *
 * The values do not pass through React. A running diagram sends new values up to four times a
 * second; putting them into the nodes would draw the whole diagram again every time, links included.
 * Instead each pin label and each link subscribes to its one signal on a bus, and the subscriber
 * writes into its own element directly.
 */
import React, { createContext, useContext, useEffect, useRef } from 'react';

import type { AdminConnection } from '@iobroker/gui-components';

import { formatClock, formatTime, type FbDebugCommand, type FbDebugStatus, type FbSignalType } from '@fb-core';

type Listener = (value: unknown) => void;

/** Colors of a BOOL link while online */
export const LIVE_TRUE = '#00e676';
export const LIVE_FALSE = '#78909c';

export class SignalBus {
    private readonly values = new Map<string, unknown>();
    private readonly listeners = new Map<string, Set<Listener>>();

    /** Calls `listener` with the current value (`undefined` for none) and at every change */
    subscribe(key: string, listener: Listener): () => void {
        let listeners = this.listeners.get(key);
        if (!listeners) {
            listeners = new Set();
            this.listeners.set(key, listeners);
        }
        listeners.add(listener);
        listener(this.values.get(key));
        return () => {
            listeners.delete(listener);
            if (!listeners.size) {
                this.listeners.delete(key);
            }
        };
    }

    /** `full`: the values are all there is - what is missing is gone */
    update(values: Record<string, unknown>, full: boolean): void {
        if (full) {
            for (const key of [...this.values.keys()]) {
                if (!(key in values)) {
                    this.values.delete(key);
                    this.notify(key, undefined);
                }
            }
        }
        for (const [key, value] of Object.entries(values)) {
            this.values.set(key, value);
            this.notify(key, value);
        }
    }

    clear(): void {
        const keys = [...this.values.keys()];
        this.values.clear();
        keys.forEach(key => this.notify(key, undefined));
    }

    private notify(key: string, value: unknown): void {
        this.listeners.get(key)?.forEach(listener => listener(value));
    }
}

export const SignalBusContext = createContext<SignalBus>(new SignalBus());

/** A value as the online view shows it; `clock`: a TIME that is a time of day */
export function formatLive(value: unknown, type: FbSignalType | 'ANY', clock?: boolean): string {
    if (value === null || value === undefined) {
        return 'null';
    }
    if (type === 'BOOL' || typeof value === 'boolean') {
        return value ? 'TRUE' : 'FALSE';
    }
    if (typeof value === 'number') {
        if (type === 'TIME') {
            return clock ? formatClock(value) : formatTime(value);
        }
        return String(Math.round(value * 1000) / 1000);
    }
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return `"${text.length > 20 ? `${text.substring(0, 19)}…` : text}"`;
}

/** The value of a signal next to its pin - hidden while there is none. A forced value is framed */
export function LiveValue(props: {
    signal: string;
    type: FbSignalType | 'ANY';
    clock?: boolean;
    forced?: boolean;
    style?: React.CSSProperties;
}): React.JSX.Element {
    const { signal, type, clock } = props;
    const bus = useContext(SignalBusContext);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(
        () =>
            bus.subscribe(signal, value => {
                const element = ref.current;
                if (!element) {
                    return;
                }
                if (value === undefined) {
                    element.style.display = 'none';
                    return;
                }
                element.style.display = '';
                element.textContent = formatLive(value, type, clock);
                element.dataset.bool = typeof value === 'boolean' ? String(value) : '';
            }),
        [bus, signal, type, clock],
    );

    return (
        <div
            ref={ref}
            className="fb-live"
            data-forced={props.forced ? 'true' : undefined}
            style={{ ...props.style, display: 'none' }}
        />
    );
}

/** The current value of a signal as text, for the properties - written by the bus like `LiveValue` */
export function LiveText(props: { signal: string; type: FbSignalType | 'ANY' }): React.JSX.Element {
    const { signal, type } = props;
    const bus = useContext(SignalBusContext);
    const ref = useRef<HTMLSpanElement>(null);
    useEffect(
        () =>
            bus.subscribe(signal, value => {
                if (ref.current) {
                    ref.current.textContent = value === undefined ? '…' : formatLive(value, type);
                }
            }),
        [bus, signal, type],
    );
    return <span ref={ref} />;
}

/** A snapshot as the runtime sends it to `debug.fbd`, see `FbSnapshot` of fb-runtime */
interface Snapshot {
    script: string;
    ts: number;
    cycle: number;
    mode: 'cyclic' | 'event';
    values?: Record<string, unknown>;
    full?: boolean;
    error?: { message: string; blockId?: string } | null;
    debug?: FbDebugStatus;
}

export type OnlineStatus =
    | { kind: 'waiting' }
    | { kind: 'no-data'; seconds: number }
    | { kind: 'stalled'; cycle: number }
    /** The code was generated before the online view and does not hand its signals to the runtime */
    | { kind: 'no-values'; cycle: number }
    /** The cycles wait for the online view: a breakpoint, or paused by hand */
    | { kind: 'paused'; cycle: number }
    | { kind: 'running'; cycle: number; mode: 'cyclic' | 'event' };

/**
 * Sends a command to the runtime of a diagram shown online. Resolves with how the online view stands
 * then, and fails with the message of the runtime when it cannot be done.
 */
export async function sendDebug(
    socket: AdminConnection,
    instance: string,
    scriptId: string,
    command: FbDebugCommand,
): Promise<FbDebugStatus> {
    const result = await socket.sendTo<{ status?: FbDebugStatus; error?: string } | undefined>(instance, 'fbdDebug', {
        script: scriptId,
        ...command,
    });
    if (!result?.status) {
        throw new Error(result?.error || 'No answer');
    }
    return result.status;
}

/** The editor asks again this often, see `fbdWatch` in the adapter */
const WATCH_INTERVAL_MS = 10_000;
/** No snapshot for this long: the diagram does not run, or its adapter is gone */
const NO_DATA_MS = 5_000;

/**
 * Shows a diagram online while `active`: tells the adapter that somebody watches, receives the
 * snapshots and hands the values to the bus. `onStatus` and `onError` are called rarely - once a
 * second and when the error changes - so they may set React state.
 */
export function useOnline(options: {
    active: boolean;
    socket: AdminConnection;
    /** The adapter instance that runs the script, like `javascript.0` */
    instance: string;
    scriptId: string;
    /** The instance of a user block whose inside is shown, like `b3/b7`; empty for the diagram itself */
    path: string;
    bus: SignalBus;
    onStatus: (status: OnlineStatus) => void;
    onError: (error: { message: string; blockId?: string } | null) => void;
    /** Forced values, breakpoints, paused - when it changed; `null` when the online view ends */
    onDebug: (debug: FbDebugStatus | null) => void;
}): void {
    const { active, socket, instance, scriptId, bus, path } = options;
    // the callbacks may change at every render - they must not restart the subscription
    const callbacks = useRef(options);
    callbacks.current = options;

    // Another instance is shown: the adapter hears it at once, and not only with the next request.
    // Not by starting the watch again - ending it would release what is forced.
    const lastPath = useRef(path);
    useEffect(() => {
        if (active && instance && path !== lastPath.current) {
            socket.sendTo(instance, 'fbdWatch', { script: scriptId, watch: true, path }).catch(() => {});
        }
        lastPath.current = path;
    }, [active, socket, instance, scriptId, path]);

    useEffect(() => {
        if (!active || !instance) {
            return;
        }
        const stateId = `${instance}.debug.fbd`;
        const started = Date.now();
        let received = 0;
        let cycle = -1;
        let cycleSince = 0;
        let mode: 'cyclic' | 'event' = 'event';
        let noValues = false;
        let paused = false;

        const report = (): void => {
            const now = Date.now();
            let status: OnlineStatus;
            if (!received) {
                status =
                    now - started > NO_DATA_MS
                        ? { kind: 'no-data', seconds: Math.round((now - started) / 1000) }
                        : { kind: 'waiting' };
            } else if (now - received > NO_DATA_MS) {
                status = { kind: 'no-data', seconds: Math.round((now - received) / 1000) };
            } else if (paused) {
                status = { kind: 'paused', cycle };
            } else if (mode === 'cyclic' && now - cycleSince > NO_DATA_MS) {
                // the heartbeat comes, but the cycles do not
                status = { kind: 'stalled', cycle };
            } else if (noValues) {
                status = { kind: 'no-values', cycle };
            } else {
                status = { kind: 'running', cycle, mode };
            }
            callbacks.current.onStatus(status);
        };

        const onState = (_id: string, state: ioBroker.State | null | undefined): void => {
            if (typeof state?.val !== 'string') {
                return;
            }
            let snapshot: Snapshot;
            try {
                snapshot = JSON.parse(state.val) as Snapshot;
            } catch {
                return;
            }
            if (snapshot.script !== scriptId) {
                return;
            }
            received = Date.now();
            if (snapshot.cycle !== cycle) {
                cycle = snapshot.cycle;
                cycleSince = received;
            }
            mode = snapshot.mode;
            if (snapshot.values) {
                bus.update(snapshot.values, !!snapshot.full);
            }
            if (snapshot.full) {
                noValues = !Object.keys(snapshot.values || {}).length;
            }
            if ('error' in snapshot) {
                callbacks.current.onError(snapshot.error || null);
            }
            if (snapshot.debug) {
                paused = snapshot.debug.paused;
                callbacks.current.onDebug(snapshot.debug);
            }
            // not only by the timer: a browser slows the timers of a tab in the background down
            report();
        };

        const watch = (full: boolean): void => {
            socket
                .sendTo(instance, 'fbdWatch', { script: scriptId, watch: true, full, path: lastPath.current })
                .catch(() => {});
        };

        void socket.subscribeState(stateId, onState);
        watch(true);
        report();
        const keepAlive = setInterval(() => watch(false), WATCH_INTERVAL_MS);
        const statusTimer = setInterval(report, 1000);

        return () => {
            clearInterval(keepAlive);
            clearInterval(statusTimer);
            socket.unsubscribeState(stateId, onState);
            socket.sendTo(instance, 'fbdWatch', { script: scriptId, watch: false }).catch(() => {});
            bus.clear();
            callbacks.current.onError(null);
            callbacks.current.onDebug(null);
        };
    }, [active, socket, instance, scriptId, bus]);
}
