/**
 * fb-editor: the editor of function block diagrams (FBD, in the style of CFC).
 *
 * It is loaded only when a diagram is opened (see `preload.ts`) - React Flow and this editor are
 * of no use to anybody who never opens one. That is also why the styles are imported here and not
 * with the application.
 */
import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
    Background,
    BackgroundVariant,
    ConnectionLineType,
    Controls,
    MiniMap,
    Panel,
    ReactFlow,
    ReactFlowProvider,
    addEdge,
    useEdgesState,
    useNodesState,
    useReactFlow,
    useUpdateNodeInternals,
    useViewport,
    type Connection,
    type IsValidConnection,
    type OnConnectEnd,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Box, Typography } from '@mui/material';
import {
    AccountTree as IconLayout,
    Add as IconZoomIn,
    ChevronRight as IconPath,
    Gesture as IconCurved,
    GridOn as IconGrid,
    Polyline as IconOrthogonal,
    Remove as IconZoomOut,
    Schema as IconDiagram,
    Search as IconSearch,
} from '@mui/icons-material';

import { I18n, type AdminConnection, type IobTheme, type ThemeName, type ThemeType } from '@iobroker/gui-components';

import {
    FB_USER_PREFIX,
    analyzeGraph,
    containsUserBlock,
    createBlock,
    createId,
    generateSource,
    getBlockDef,
    getInputs,
    getOutputs,
    isCompatible,
    layoutGraph,
    mergeUserBlocks,
    parseGraph,
    userBlockOf,
    type FbAnalysis,
    type FbBlock,
    type FbBlockInfo,
    type FbCycle,
    type FbDebugCommand,
    type FbDebugStatus,
    type FbGraph,
    type FbIssue,
    type FbPin,
    type FbSignalType,
    type FbUserBlock,
} from '@fb-core';

import './FbEditor.css';
import './i18n';
import BlockIcon from './BlockIcon';
import BlockNode, { BLOCK_METRICS, formatValue } from './BlockNode';
import CommentNode from './CommentNode';
import LinkEdge from './LinkEdge';
import OnlinePanel from './OnlinePanel';
import Palette, { DRAG_TYPE, type PaletteVariable } from './Palette';
import Properties, { type FbLibraryEntry } from './Properties';
import SearchPanel from './SearchPanel';
import InstanceView, { InstanceProperties, instancePath, stepInto, type InstanceStep } from './InstanceView';
import { copySelection, getClipboard, pasteNodes } from './clipboard';
import { convertValue, retypeConst } from './connect';
import {
    CATEGORY_COLORS,
    COMMENT_DEFAULT_SIZE,
    flowToGraph,
    graphToFlow,
    type BlockNode as BlockNodeType,
    type FbEdge,
    type FbNode,
} from './convert';
import { SignalBus, SignalBusContext, sendDebug } from './online';
import { findNodes } from './search';
import {
    FbViewContext,
    NO_DEBUG,
    buildView,
    type BlockActions,
    type DebugView,
    type FbView,
    type LinkStyle,
} from './ViewContext';

// Outside the component: new objects at every render would mount all nodes again
const nodeTypes = { fbBlock: BlockNode, fbComment: CommentNode };
const edgeTypes = { fbLink: LinkEdge };
const defaultEdgeOptions = { type: 'fbLink' as const };
const deleteKeys = ['Delete', 'Backspace'];
const snapGrid: [number, number] = [10, 10];

/** Time without a change before the code is generated again - a drag moves the nodes at every frame */
const GENERATE_DELAY = 300;
/** Steps that can be undone */
const HISTORY_SIZE = 100;
/** How far a paste lands from what was copied, and from the paste before */
const PASTE_OFFSET = 40;

/** Whether the online view is on - remembered for the next diagram */
const ONLINE_KEY = 'FbEditor.online';

/** Time after the last change of a state ID before its object is read */
const DETECT_DELAY = 600;
/** The type a STATE_IN takes for the type of a state */
const STATE_TYPES: Partial<Record<string, FbSignalType>> = {
    boolean: 'BOOL',
    number: 'REAL',
    string: 'STRING',
    json: 'STRING',
    object: 'STRING',
    array: 'STRING',
};
/** Whether the canvas has a grid, and how links are drawn */
const GRID_KEY = 'FbEditor.grid';
const LINKS_KEY = 'FbEditor.links';

function readPreference(key: string, fallback: string): string {
    try {
        return window.localStorage.getItem(key) ?? fallback;
    } catch {
        return fallback;
    }
}

function writePreference(key: string, value: string): void {
    try {
        window.localStorage.setItem(key, value);
    } catch {
        // for this diagram only
    }
}

/** What the toolbar of the script editor can do with the diagram */
export interface FbEditorApi {
    undo: () => void;
    redo: () => void;
}

export interface FbEditorProps {
    code: string;
    onChange: (code: string) => void;
    /** ID of the script, like `script.js.common.light` */
    scriptId: string;
    /** The instance that runs it, like `javascript.0` */
    instance: string;
    /** The script is enabled and its instance runs */
    running: boolean;
    /** The script has changes that are not saved */
    changed: boolean;
    /** Name of the script */
    scriptName: string;
    /** All scripts - the diagrams among them that are blocks make the user blocks of the palette */
    scripts: Record<string, ioBroker.Object>;
    /** Changes with every change of `scripts` - the object itself is updated in place */
    scriptsHash?: number;
    /** Opens another script in the editor */
    onOpenScript?: (scriptId: string) => void;
    socket: AdminConnection;
    theme: IobTheme;
    themeName: ThemeName;
    themeType: ThemeType;
    ref?: React.Ref<FbEditorApi>;
}

/** The user blocks the scripts define, by type - the newest version when two scripts define the same type */
function findUserBlocks(scripts: Record<string, ioBroker.Object>, ownId: string): Record<string, FbLibraryEntry> {
    const library: Record<string, FbLibraryEntry> = {};
    for (const [id, obj] of Object.entries(scripts || {})) {
        const common = obj?.common as ioBroker.ScriptCommon | undefined;
        // FBD is not known to @iobroker/types yet
        if (id === ownId || obj?.type !== 'script' || (common?.engineType as string) !== 'FBD') {
            continue;
        }
        const graph = parseGraph(common?.source);
        const user = graph && userBlockOf(graph);
        if (user && (!library[user.type] || library[user.type].user.version < user.version)) {
            library[user.type] = { scriptId: id, user, userBlocks: graph.userBlocks || {} };
        }
    }
    return library;
}

/**
 * The graph of the editor. The version of a block counts the saved changes: it is one more than the
 * loaded one as soon as the diagram differs from what was loaded.
 */
function assemble(
    nodes: FbNode[],
    edges: FbEdge[],
    cycle: FbCycle,
    blockInfo: FbBlockInfo | undefined,
    userBlocks: Record<string, FbUserBlock>,
    base: { content: string; version: number },
): FbGraph {
    const graph = flowToGraph(nodes, edges, cycle);
    if (Object.keys(userBlocks).length) {
        graph.userBlocks = userBlocks;
    }
    if (blockInfo) {
        const content = JSON.stringify({ ...graph, block: { ...blockInfo, version: 0 } });
        graph.block = { ...blockInfo, version: content === base.content ? base.version : base.version + 1 };
    }
    return graph;
}

/** A graph as `assemble()` compares it: the version of the block does not count */
function contentOf(graph: FbGraph): string {
    return JSON.stringify(graph.block ? { ...graph, block: { ...graph.block, version: 0 } } : graph);
}

function issueText(issue: FbIssue): string {
    const args = issue.args || [];
    // the argument of this one is the ID of a parameter, which has a name for people
    if (issue.message === 'Parameter "%s" is not set') {
        return I18n.t(issue.message, ...args.map(arg => I18n.t(`fbd_param_${arg}`)));
    }
    return I18n.t(issue.message, ...args);
}

/** Zoom out, the zoom (a click: 100 %), zoom in - on its own, as it draws again at every zoom */
function ZoomTools(): React.JSX.Element {
    const { zoom } = useViewport();
    const { zoomIn, zoomOut, zoomTo } = useReactFlow();
    return (
        <div className="fb-zoom">
            <button
                type="button"
                className="fb-tool"
                title={I18n.t('fbd_zoom_out')}
                onClick={() => void zoomOut({ duration: 150 })}
            >
                <IconZoomOut />
            </button>
            <button
                type="button"
                className="fb-zoom-value"
                title={I18n.t('fbd_zoom_reset')}
                onClick={() => void zoomTo(1, { duration: 150 })}
            >
                {Math.round(zoom * 100)}%
            </button>
            <button
                type="button"
                className="fb-tool"
                title={I18n.t('fbd_zoom_in')}
                onClick={() => void zoomIn({ duration: 150 })}
            >
                <IconZoomIn />
            </button>
        </div>
    );
}

/** Whether a key goes to a field and not to the diagram */
function isTyping(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement | null;
    return (
        !!target &&
        (target.isContentEditable ||
            ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
            !!target.closest('[role="dialog"]'))
    );
}

function FbCanvas(
    props: Omit<FbEditorProps, 'ref'> & { initial: FbGraph; apiRef?: React.Ref<FbEditorApi> },
): React.JSX.Element {
    const { onChange, themeType } = props;
    const dark = themeType === 'dark';
    const initialFlow = useMemo(() => graphToFlow(props.initial), [props.initial]);
    const [nodes, setNodes, onNodesChange] = useNodesState<FbNode>(initialFlow.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState<FbEdge>(initialFlow.edges);
    const [cycle, setCycle] = useState<FbCycle>(props.initial.cycle);
    const [analysis, setAnalysis] = useState<FbAnalysis>(() => analyzeGraph(props.initial));
    const [view, setView] = useState<FbView>(() => buildView(analysis, props.initial, dark));
    const [online, setOnline] = useState(() => {
        try {
            return window.localStorage.getItem(ONLINE_KEY) === 'true';
        } catch {
            return false;
        }
    });
    const [runtimeError, setRuntimeError] = useState<FbView['runtimeError']>(null);
    /** How the online view stands, as the runtime answered last; `null` while offline */
    const [debug, setDebug] = useState<FbDebugStatus | null>(null);
    const [commandError, setCommandError] = useState<string | null>(null);
    /** The search in the diagram, while it is open. `focus` counts Ctrl+F, to get the focus back */
    const [search, setSearch] = useState<{ text: string; index: number; focus: number } | null>(null);
    /** The instances of user blocks the view went into; empty: the diagram itself */
    const [inside, setInside] = useState<InstanceStep[]>([]);
    /** What is selected inside an instance */
    const [insideBlock, setInsideBlock] = useState<FbBlock | null>(null);
    // inside an instance nothing is edited - the keys and the buttons of the toolbar do nothing
    const insideRef = useRef(inside);
    insideRef.current = inside;
    const bus = useMemo(() => new SignalBus(), []);
    const { screenToFlowPosition, getNode, getNodes, getEdges, deleteElements, fitView } = useReactFlow<
        FbNode,
        FbEdge
    >();
    const updateNodeInternals = useUpdateNodeInternals();
    const wrapper = useRef<HTMLDivElement>(null);

    const [blockInfo, setBlockInfo] = useState<FbBlockInfo | undefined>(props.initial.block);
    const [userBlocks, setUserBlocksState] = useState<Record<string, FbUserBlock>>(props.initial.userBlocks || {});
    const library = useMemo(
        () => findUserBlocks(props.scripts, props.scriptId),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [props.scripts, props.scriptsHash, props.scriptId],
    );

    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const cycleRef = useRef(cycle);
    cycleRef.current = cycle;
    const blockInfoRef = useRef(blockInfo);
    blockInfoRef.current = blockInfo;
    // set at once, not only at the next render: a block is placed right after its copy was taken
    const userBlocksRef = useRef(userBlocks);
    const setUserBlocks = useCallback((next: Record<string, FbUserBlock>): void => {
        userBlocksRef.current = next;
        setUserBlocksState(next);
    }, []);

    const [loaded] = useState(() => {
        const assembleLoaded = (counting: { content: string; version: number }): FbGraph =>
            assemble(
                initialFlow.nodes,
                initialFlow.edges,
                props.initial.cycle,
                props.initial.block,
                props.initial.userBlocks || {},
                counting,
            );
        const counting = {
            content: contentOf(assembleLoaded({ content: '', version: 0 })),
            version: props.initial.block?.version || 0,
        };
        return { counting, json: JSON.stringify(assembleLoaded(counting)) };
    });
    /** What the version of a block counts from: the diagram as it was loaded */
    const base = useRef(loaded.counting);
    /** The graph of the editor as it is now */
    const shown = useCallback(
        (): FbGraph =>
            assemble(
                getNodes(),
                getEdges(),
                cycleRef.current,
                blockInfoRef.current,
                userBlocksRef.current,
                base.current,
            ),
        [getNodes, getEdges],
    );

    /** The graph as it was generated last, to tell a real change from a selection or a measurement */
    const lastGraph = useRef(loaded.json);
    /** The version of the block as it is saved next */
    const [version, setVersion] = useState(props.initial.block?.version);

    // Saved: the next change is a new version again
    useEffect(() => {
        if (!props.changed) {
            const graph = JSON.parse(lastGraph.current) as FbGraph;
            base.current = { content: contentOf(graph), version: graph.block?.version || 0 };
        }
    }, [props.changed]);
    /**
     * Earlier graphs to go back to, and those undone to go forward to again. `restoring`: the next
     * change is an undo or a redo on its way, not a step of its own.
     */
    const history = useRef({ past: [] as string[], future: [] as string[], restoring: false });
    const pasteCount = useRef(0);

    /** Takes the graph as it is now, if it changed: a step of the history, and new code */
    const record = useCallback(
        (graph: FbGraph): void => {
            const json = JSON.stringify(graph);
            if (json === lastGraph.current) {
                return;
            }
            const steps = history.current;
            if (steps.restoring) {
                steps.restoring = false;
            } else {
                steps.past.push(lastGraph.current);
                if (steps.past.length > HISTORY_SIZE) {
                    steps.past.shift();
                }
                steps.future = [];
            }
            lastGraph.current = json;
            setVersion(graph.block?.version);
            const result = generateSource(graph);
            setAnalysis(result.analysis);
            setView(buildView(result.analysis, graph, dark));
            onChangeRef.current(result.source);
        },
        [dark],
    );

    useEffect(() => {
        const timer = setTimeout(
            () => record(assemble(nodes, edges, cycle, blockInfo, userBlocks, base.current)),
            GENERATE_DELAY,
        );
        return () => clearTimeout(timer);
    }, [nodes, edges, cycle, blockInfo, userBlocks, record]);

    useEffect(() => setView(current => ({ ...current, background: dark ? '#141414' : '#ffffff' })), [dark]);

    const restore = useCallback(
        (json: string): void => {
            if (json === lastGraph.current) {
                return;
            }
            const graph = JSON.parse(json) as FbGraph;
            const flow = graphToFlow(graph);
            history.current.restoring = true;
            setNodes(flow.nodes);
            setEdges(flow.edges);
            setCycle(graph.cycle);
            setBlockInfo(graph.block);
            setUserBlocks(graph.userBlocks || {});
        },
        [setNodes, setEdges, setUserBlocks],
    );

    const undo = useCallback((): void => {
        if (insideRef.current.length) {
            return;
        }
        // a change of the last moments is a step of its own
        record(shown());
        const target = history.current.past.pop();
        if (target !== undefined) {
            history.current.future.push(lastGraph.current);
            restore(target);
        }
    }, [record, restore, shown]);

    const redo = useCallback((): void => {
        if (insideRef.current.length) {
            return;
        }
        record(shown());
        const target = history.current.future.pop();
        if (target !== undefined) {
            history.current.past.push(lastGraph.current);
            restore(target);
        }
    }, [record, restore, shown]);

    useImperativeHandle(props.apiRef, () => ({ undo, redo }), [undo, redo]);

    const copy = useCallback((): boolean => {
        pasteCount.current = 0;
        return !!copySelection(getNodes(), getEdges(), userBlocksRef.current);
    }, [getNodes, getEdges]);

    const paste = useCallback((): boolean => {
        const clip = getClipboard();
        if (!clip || (!clip.blocks.length && !clip.comments.length)) {
            return false;
        }
        if (clip.userBlocks) {
            // the blocks a copy uses come with it - never replacing a newer copy
            setUserBlocks(mergeUserBlocks(userBlocksRef.current, clip.userBlocks));
        }
        pasteCount.current++;
        const added = pasteNodes(clip, getNodes(), getEdges(), PASTE_OFFSET * pasteCount.current);
        setNodes(current => [
            ...current.map(node => (node.selected ? { ...node, selected: false } : node)),
            ...added.nodes,
        ]);
        setEdges(current => [
            ...current.map(edge => (edge.selected ? { ...edge, selected: false } : edge)),
            ...added.edges,
        ]);
        return true;
    }, [getNodes, getEdges, setNodes, setEdges, setUserBlocks]);

    // Ctrl+Z, Ctrl+Y (Ctrl+Shift+Z), Ctrl+C, Ctrl+X, Ctrl+V - unless a field or a dialog has the key
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (!(event.ctrlKey || event.metaKey) || event.altKey || isTyping(event) || insideRef.current.length) {
                return;
            }
            const key = event.key.toLowerCase();
            if (key === 'z' && !event.shiftKey) {
                undo();
            } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
                redo();
            } else if (key === 'c' || key === 'x') {
                // a text selected somewhere else on the page is copied as usual
                if (window.getSelection()?.toString() || !copy()) {
                    return;
                }
                if (key === 'x') {
                    void deleteElements({
                        nodes: getNodes().filter(node => node.selected),
                        edges: getEdges().filter(edge => edge.selected),
                    });
                }
            } else if (key === 'v') {
                if (!paste()) {
                    return;
                }
            } else {
                return;
            }
            event.preventDefault();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [undo, redo, copy, paste, deleteElements, getNodes, getEdges]);

    /** What happened to a link just made or not made, for a moment at the top of the canvas */
    const [notice, setNotice] = useState<{ text: string; warning: boolean } | null>(null);
    useEffect(() => {
        if (!notice) {
            return undefined;
        }
        const timer = setTimeout(() => setNotice(null), 4000);
        return () => clearTimeout(timer);
    }, [notice]);

    /**
     * The two pins of a link: the blocks, their pins, and the type a CONST takes for it - see
     * `retypeConst()`. `null` if one of them is no pin of a block.
     */
    const describeLink = useCallback(
        (
            sourceId: string,
            sourceHandle: string | null | undefined,
            targetId: string,
            targetHandle: string | null | undefined,
        ) => {
            const source = getNode(sourceId);
            const target = getNode(targetId);
            if (source?.type !== 'fbBlock' || target?.type !== 'fbBlock') {
                return null;
            }
            const defOf = (block: FbBlock): ReturnType<typeof getBlockDef> =>
                getBlockDef(block.type, userBlocksRef.current);
            const inputOf = (edge: FbEdge): FbPin | undefined => {
                const node = getNode(edge.target);
                return node?.type === 'fbBlock'
                    ? getInputs(node.data.block, defOf(node.data.block)).find(pin => pin.id === edge.targetHandle)
                    : undefined;
            };
            const output = getOutputs(source.data.block, defOf(source.data.block)).find(pin => pin.id === sourceHandle);
            const input = getInputs(target.data.block, defOf(target.data.block)).find(pin => pin.id === targetHandle);
            if (!output || !input) {
                return null;
            }
            // the inputs the output feeds already: they have to take a new type as well
            const others = getEdges()
                .filter(edge => edge.source === sourceId && edge.sourceHandle === sourceHandle)
                .map(edge => inputOf(edge)?.type || 'ANY');
            return {
                source: source.data.block,
                target: target.data.block,
                output,
                input,
                retype: retypeConst(source.data.block, output.type, input.type, others),
            };
        },
        [getNode, getEdges],
    );

    const isValidConnection: IsValidConnection<FbEdge> = useCallback(
        (connection: FbEdge | Connection): boolean => {
            const link = describeLink(
                connection.source,
                connection.sourceHandle,
                connection.target,
                connection.targetHandle,
            );
            if (!link || (!isCompatible(link.output.type, link.input.type) && !link.retype)) {
                return false;
            }
            // an input takes one signal
            return !getEdges().some(
                edge => edge.target === connection.target && edge.targetHandle === connection.targetHandle,
            );
        },
        [describeLink, getEdges],
    );

    const onConnect = useCallback(
        (connection: Connection) => {
            const link = describeLink(
                connection.source,
                connection.sourceHandle,
                connection.target,
                connection.targetHandle,
            );
            if (link?.retype) {
                // the CONST takes the type of the input, and its value as far as it goes
                const { source, retype } = link;
                const value = convertValue(source.params?.value, retype);
                const changed = { ...source, params: { ...source.params, type: retype, value } };
                setNodes(current =>
                    current.map(node =>
                        node.id === source.id && node.type === 'fbBlock' ? { ...node, data: { block: changed } } : node,
                    ),
                );
                setNotice({
                    text: I18n.t(
                        'fbd_link_const_retyped',
                        source.name,
                        retype,
                        formatValue({ id: 'value', type: retype }, changed),
                    ),
                    warning: false,
                });
            }
            setEdges(current =>
                addEdge<FbEdge>(
                    {
                        ...connection,
                        id: createId(
                            'l',
                            current.map(edge => edge.id),
                        ),
                        type: 'fbLink',
                    },
                    current,
                ),
            );
        },
        [describeLink, setNodes, setEdges],
    );

    /** A link let go on a pin that does not take it: says why, instead of doing nothing without a word */
    const onConnectEnd: OnConnectEnd = useCallback(
        (_event, state) => {
            if (state.isValid !== false || !state.fromHandle || !state.toHandle) {
                return;
            }
            // dragged from an output to an input, or from an input back to an output
            const [from, to] =
                state.fromHandle.type === 'source'
                    ? [state.fromHandle, state.toHandle]
                    : [state.toHandle, state.fromHandle];
            if (from.type !== 'source' || to.type !== 'target') {
                return;
            }
            const link = describeLink(from.nodeId, from.id, to.nodeId, to.id);
            if (!link) {
                return;
            }
            const { source, target, output, input } = link;
            const pin = `${target.name}.${input.id}`;
            let text: string;
            if (isCompatible(output.type, input.type) || link.retype) {
                text = I18n.t('fbd_link_refused_taken', pin);
            } else if (source.type === 'CONST' && input.type !== 'ANY') {
                // it would have taken the type, but it feeds other inputs already
                text = I18n.t('fbd_link_refused_const', source.name, input.type, pin);
            } else {
                text = I18n.t('fbd_link_refused_type', output.type, input.type, pin);
            }
            setNotice({ text, warning: true });
        },
        [describeLink],
    );

    /** A double click on an instance of a user block shows it from inside */
    const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: FbNode) => {
        const step = stepInto(node, userBlocksRef.current);
        if (step) {
            setInside([step]);
            setInsideBlock(null);
        }
    }, []);

    const addItem = useCallback(
        (type: string, position: { x: number; y: number }): void => {
            // a user block placed for the first time: the diagram takes a copy of it, and of the blocks
            // it uses
            let embedded = userBlocksRef.current;
            if (type.startsWith(FB_USER_PREFIX) && !embedded[type]) {
                const entry = library[type];
                if (!entry) {
                    return;
                }
                embedded = mergeUserBlocks(embedded, { ...entry.userBlocks, [type]: entry.user });
                setUserBlocks(embedded);
            }
            setNodes(current => {
                let x = Math.round(position.x / 10) * 10;
                let y = Math.round(position.y / 10) * 10;
                // blocks added one after another with a click would otherwise cover each other
                while (current.some(node => Math.abs(node.position.x - x) < 20 && Math.abs(node.position.y - y) < 20)) {
                    x += 30;
                    y += 30;
                }
                const deselected = current.map(node => (node.selected ? { ...node, selected: false } : node));
                if (type === 'comment') {
                    const id = createId(
                        'c',
                        current.map(node => node.id),
                    );
                    return [
                        {
                            id,
                            type: 'fbComment',
                            position: { x, y },
                            width: COMMENT_DEFAULT_SIZE[0],
                            height: COMMENT_DEFAULT_SIZE[1],
                            zIndex: -1,
                            selected: true,
                            data: { text: I18n.t('fbd_comment') },
                        },
                        ...deselected,
                    ];
                }
                if (!getBlockDef(type, embedded)) {
                    return current;
                }
                const graph = { ...flowToGraph(current, [], cycleRef.current), userBlocks: embedded };
                const block = createBlock(type, [x, y], graph);
                return [
                    ...deselected,
                    { id: block.id, type: 'fbBlock', position: { x, y }, selected: true, data: { block } },
                ];
            });
        },
        [setNodes, setUserBlocks, library],
    );

    /**
     * Takes the newest version of a user block. The links of pins the new version does not have any
     * more go away - every instance of the type uses the same copy.
     */
    const updateUserBlock = useCallback(
        (type: string): void => {
            const entry = library[type];
            if (!entry) {
                return;
            }
            const embedded = mergeUserBlocks(userBlocksRef.current, { ...entry.userBlocks, [type]: entry.user }, [
                type,
            ]);
            setUserBlocks(embedded);
            const def = getBlockDef(type, embedded)!;
            const inputs = new Set(def.inputs.map(pin => pin.id));
            const outputs = new Set(def.outputs.map(pin => pin.id));
            const instances = new Set(
                getNodes()
                    .filter(node => node.type === 'fbBlock' && node.data.block.type === type)
                    .map(node => node.id),
            );
            setEdges(current =>
                current.filter(
                    edge =>
                        !(instances.has(edge.target) && !inputs.has(edge.targetHandle || '')) &&
                        !(instances.has(edge.source) && !outputs.has(edge.sourceHandle || '')),
                ),
            );
            requestAnimationFrame(() => instances.forEach(id => updateNodeInternals(id)));
        },
        [library, setUserBlocks, getNodes, setEdges, updateNodeInternals],
    );

    /** The user blocks of the diagram of which a newer version exists */
    const outdated = useMemo(
        () =>
            Object.values(userBlocks).filter(
                user =>
                    library[user.type] &&
                    library[user.type].user.version > user.version &&
                    nodes.some(node => node.type === 'fbBlock' && node.data.block.type === user.type),
            ),
        [userBlocks, library, nodes],
    );

    /** What the palette offers: never the block itself, nor a block that contains it */
    const placeable = useMemo(
        () =>
            Object.values(library)
                .filter(
                    entry =>
                        !blockInfo ||
                        (entry.user.type !== blockInfo.type &&
                            !containsUserBlock(entry.user.type, blockInfo.type, {
                                ...entry.userBlocks,
                                [entry.user.type]: entry.user,
                            })),
                )
                .map(entry => entry.user)
                .sort((a, b) => a.name.localeCompare(b.name)),
        [library, blockInfo],
    );

    const onAddFromPalette = useCallback(
        (type: string) => {
            const rect = wrapper.current?.getBoundingClientRect();
            const position = rect
                ? screenToFlowPosition({ x: rect.left + rect.width / 2 - 60, y: rect.top + rect.height / 3 })
                : { x: 0, y: 0 };
            addItem(type, position);
        },
        [addItem, screenToFlowPosition],
    );

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            const type = event.dataTransfer.getData(DRAG_TYPE);
            if (type) {
                event.preventDefault();
                addItem(type, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
            }
        },
        [addItem, screenToFlowPosition],
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        if (event.dataTransfer.types.includes(DRAG_TYPE)) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
        }
    }, []);

    /**
     * A moment after the state ID of a block changed - picked in the dialog or typed - its object tells
     * the type (for STATE_IN) and, while the block has the name it got when it was placed, the name.
     * Only then: a type set by hand afterwards stays.
     */
    const detectTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
    useEffect(() => {
        const timers = detectTimers.current;
        return () => timers.forEach(timer => clearTimeout(timer));
    }, []);
    const detectState = useCallback(
        (blockId: string, oid: string) => {
            clearTimeout(detectTimers.current.get(blockId));
            detectTimers.current.set(
                blockId,
                setTimeout(() => {
                    detectTimers.current.delete(blockId);
                    void props.socket
                        .getObject(oid)
                        .then(obj => {
                            const node = getNode(blockId);
                            // meanwhile typed on, or gone - or a part of an ID typed, like the folder `0_userdata.0`
                            if (
                                obj?.type !== 'state' ||
                                node?.type !== 'fbBlock' ||
                                node.data.block.params?.oid !== oid
                            ) {
                                return;
                            }
                            const block = node.data.block;
                            const common = obj.common as ioBroker.StateCommon | undefined;
                            const changed: FbBlock = { ...block, params: { ...block.params } };
                            const type = common?.type ? STATE_TYPES[common.type] : undefined;
                            if (block.type === 'STATE_IN' && type && block.params?.type !== type) {
                                changed.params!.type = type;
                            }
                            if (new RegExp(`^${block.type}_\\d+$`).test(block.name)) {
                                changed.name = oid.split('.').pop() || block.name;
                            }
                            if (changed.params!.type === block.params?.type && changed.name === block.name) {
                                return;
                            }
                            setNodes(current =>
                                current.map(item =>
                                    item.id === blockId && item.type === 'fbBlock'
                                        ? { ...item, data: { block: changed } }
                                        : item,
                                ),
                            );
                            requestAnimationFrame(() => updateNodeInternals(blockId));
                            if (changed.params!.type !== block.params?.type) {
                                setNotice({
                                    text: I18n.t('fbd_state_type_taken', changed.name, String(changed.params!.type)),
                                    warning: false,
                                });
                            }
                        })
                        // an ID that is no object (yet): nothing to take
                        .catch(() => {});
                }, DETECT_DELAY),
            );
        },
        [props.socket, getNode, setNodes, updateNodeInternals],
    );

    const onBlockChange = useCallback(
        (block: FbBlock) => {
            const previous = getNode(block.id);
            const oid = block.params?.oid;
            if (
                typeof oid === 'string' &&
                oid &&
                previous?.type === 'fbBlock' &&
                previous.data.block.params?.oid !== oid
            ) {
                detectState(block.id, oid);
            }
            setNodes(current =>
                current.map(node =>
                    node.id === block.id && node.type === 'fbBlock' ? { ...node, data: { block } } : node,
                ),
            );
            // fewer inputs: the links of the inputs that are gone go with them
            const inputs = new Set(getInputs(block, getBlockDef(block.type, userBlocksRef.current)).map(pin => pin.id));
            setEdges(current =>
                current.filter(edge => edge.target !== block.id || inputs.has(edge.targetHandle || '')),
            );
            // the handles may have changed
            requestAnimationFrame(() => updateNodeInternals(block.id));
        },
        [getNode, detectState, setNodes, setEdges, updateNodeInternals],
    );

    const onCommentChange = useCallback(
        (id: string, text: string) =>
            setNodes(current =>
                current.map(node => (node.id === id && node.type === 'fbComment' ? { ...node, data: { text } } : node)),
            ),
        [setNodes],
    );

    const selectedNodes = nodes.filter(node => node.selected);
    const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
    const selectedEdge = !selectedNodes.length ? edges.find(edge => edge.selected) || null : null;
    const connectedInputs = useMemo(
        () =>
            new Set(
                selectedNode
                    ? edges.filter(edge => edge.target === selectedNode.id).map(edge => edge.targetHandle || '')
                    : [],
            ),
        [edges, selectedNode],
    );

    const onDelete = useCallback(() => {
        void deleteElements({
            nodes: nodes.filter(node => node.selected),
            edges: edges.filter(edge => edge.selected),
        });
    }, [deleteElements, nodes, edges]);

    const showBlocks = useCallback(
        (ids: string[]) => {
            if (!ids.length) {
                return;
            }
            setNodes(current => current.map(node => ({ ...node, selected: ids.includes(node.id) })));
            void fitView({ nodes: ids.map(id => ({ id })), maxZoom: 1.5, duration: 300 });
        },
        [setNodes, fitView],
    );

    const toggleOnline = useCallback(() => {
        setOnline(current => {
            try {
                window.localStorage.setItem(ONLINE_KEY, String(!current));
            } catch {
                // only remembered for this diagram then
            }
            return !current;
        });
    }, []);

    // how the canvas looks - a matter of taste, kept by the browser and not in the diagram
    const [grid, setGrid] = useState(() => readPreference(GRID_KEY, 'true') === 'true');
    const [linkStyle, setLinkStyle] = useState<LinkStyle>(() =>
        readPreference(LINKS_KEY, 'curved') === 'orthogonal' ? 'orthogonal' : 'curved',
    );
    const toggleGrid = useCallback(() => {
        setGrid(current => {
            writePreference(GRID_KEY, String(!current));
            return !current;
        });
    }, []);
    const toggleLinkStyle = useCallback(() => {
        setLinkStyle(current => {
            const next = current === 'curved' ? 'orthogonal' : 'curved';
            writePreference(LINKS_KEY, next);
            return next;
        });
    }, []);

    /** Changes when the gear of a block is clicked: the properties show */
    const [showProperties, setShowProperties] = useState(0);

    // ---- the online view: commands to the running diagram

    const runDebug = useCallback(
        (command: FbDebugCommand): void => {
            sendDebug(props.socket, props.instance, props.scriptId, command)
                .then(status => {
                    setDebug(status);
                    setCommandError(null);
                })
                // the messages of the runtime are keys of the translations, where there is one
                .catch((error: unknown) => setCommandError(I18n.t((error as Error).message)));
        },
        [props.socket, props.instance, props.scriptId],
    );

    // the message of a command that failed goes after a while
    useEffect(() => {
        if (!commandError) {
            return undefined;
        }
        const timer = setTimeout(() => setCommandError(null), 5000);
        return () => clearTimeout(timer);
    }, [commandError]);

    // the diagram of a block does not run on its own
    const steerable = online && !blockInfo && props.running && !!debug;
    const debugRef = useRef({ debug, steerable });
    debugRef.current = { debug, steerable };

    const toggleBreakpoint = useCallback(
        (blockId: string) =>
            runDebug({
                command: 'breakpoint',
                block: blockId,
                on: !debugRef.current.debug?.breakpoints.includes(blockId),
            }),
        [runDebug],
    );

    const debugView = useMemo(
        (): DebugView =>
            steerable && debug
                ? {
                      enabled: debug.breaks,
                      breakpoints: new Set(debug.breakpoints),
                      at: debug.paused ? debug.at || null : null,
                      forced: new Set(Object.keys(debug.forced)),
                      toggleBreakpoint,
                  }
                : NO_DEBUG,
        [steerable, debug, toggleBreakpoint],
    );

    const nameOf = useCallback(
        (blockId: string): string => {
            const node = getNode(blockId);
            return node?.type === 'fbBlock' ? node.data.block.name : blockId;
        },
        [getNode],
    );

    // ---- arranging and finding

    /** Set by the layout: the view follows when the nodes moved */
    const fitAfterMove = useRef(false);

    /** Arranges the blocks along the data flow - one step to undo */
    const arrange = useCallback((): void => {
        const sizes: Record<string, { width: number; height: number }> = {};
        for (const node of getNodes()) {
            if (node.type === 'fbBlock' && node.measured?.width && node.measured.height) {
                sizes[node.id] = { width: node.measured.width, height: node.measured.height };
            }
        }
        const positions = layoutGraph(shown(), { sizes, metrics: BLOCK_METRICS });
        fitAfterMove.current = true;
        setNodes(current =>
            current.map(node => {
                const position = positions[node.id];
                return position ? { ...node, position: { x: position[0], y: position[1] } } : node;
            }),
        );
    }, [getNodes, shown, setNodes]);

    // the whole diagram in view once the nodes are where the layout put them
    useEffect(() => {
        if (fitAfterMove.current) {
            fitAfterMove.current = false;
            void fitView({ maxZoom: 1.2, duration: 300 });
        }
    }, [nodes, fitView]);

    const openSearch = useCallback(
        () =>
            setSearch(current => ({
                text: current?.text || '',
                index: current?.index || 0,
                focus: (current?.focus || 0) + 1,
            })),
        [],
    );

    /** Selects and shows the match `index` of a search; gives back the index it took */
    const showMatch = useCallback(
        (text: string, index: number): number => {
            const found = findNodes(getNodes(), getEdges(), text, userBlocksRef.current);
            if (!found.length) {
                return 0;
            }
            const taken = ((index % found.length) + found.length) % found.length;
            showBlocks([found[taken]]);
            return taken;
        },
        [getNodes, getEdges, showBlocks],
    );

    const onSearchText = useCallback(
        (text: string) => {
            const index = showMatch(text, 0);
            setSearch(current => current && { ...current, text, index });
        },
        [showMatch],
    );

    const onSearchMove = useCallback(
        (step: 1 | -1) => {
            if (search) {
                setSearch({ ...search, index: showMatch(search.text, search.index + step) });
            }
        },
        [search, showMatch],
    );

    const matchCount = useMemo(
        () => (search ? findNodes(nodes, edges, search.text, userBlocks).length : 0),
        [search, nodes, edges, userBlocks],
    );

    // ---- the inside of the instances of user blocks

    /** Shows an instance of the diagram from inside */
    const openInstance = useCallback((block: FbBlock) => {
        setInside([{ blockId: block.id, type: block.type, name: block.name }]);
        setInsideBlock(null);
    }, []);

    /** One more step inside, from an instance shown already */
    const enterInstance = useCallback((step: InstanceStep) => {
        setInside(current => [...current, step]);
        setInsideBlock(null);
    }, []);

    /** Back to a step of the path; 0 is the diagram itself */
    const leaveInstance = useCallback((depth: number) => {
        setInside(current => current.slice(0, depth));
        setInsideBlock(null);
    }, []);

    // an instance, or its block, that is gone ends the view of it - after an undo, for example
    useEffect(() => {
        if (
            inside.length &&
            !nodes.some(
                node =>
                    node.id === inside[0].blockId && node.type === 'fbBlock' && node.data.block.type === inside[0].type,
            )
        ) {
            leaveInstance(0);
        } else if (inside.some(step => !userBlocks[step.type])) {
            leaveInstance(0);
        }
    }, [inside, nodes, userBlocks, leaveInstance]);

    // F8 (pause, run on), F9 (breakpoint of the selected block), F10 (one block) as in the debuggers of
    // the browsers - online only. Ctrl+F: the search in the diagram. Esc: out of an instance.
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape' && insideRef.current.length && !isTyping(event)) {
                leaveInstance(insideRef.current.length - 1);
                return;
            }
            if (event.ctrlKey || event.metaKey || event.altKey || !/^F(8|9|10)$/.test(event.key)) {
                if (
                    (event.ctrlKey || event.metaKey) &&
                    !event.altKey &&
                    event.key.toLowerCase() === 'f' &&
                    !insideRef.current.length
                ) {
                    if (!(event.target as HTMLElement | null)?.closest?.('[role="dialog"]')) {
                        event.preventDefault();
                        openSearch();
                    }
                }
                return;
            }
            if (!debugRef.current.steerable || isTyping(event)) {
                return;
            }
            event.preventDefault();
            if (event.key === 'F8') {
                runDebug({ command: debugRef.current.debug?.paused ? 'resume' : 'pause' });
            } else if (event.key === 'F10') {
                runDebug({ command: 'step' });
            } else if (!insideRef.current.length) {
                // breakpoints only in the diagram itself
                getNodes()
                    .filter(node => node.selected && node.type === 'fbBlock')
                    .forEach(node => toggleBreakpoint(node.id));
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [openSearch, runDebug, toggleBreakpoint, getNodes, leaveInstance]);

    // ---- links

    const onEdgeChange = useCallback(
        (edge: FbEdge) =>
            setEdges(current => current.map(item => (item.id === edge.id ? { ...item, data: edge.data } : item))),
        [setEdges],
    );

    /** A double click on a connection mark jumps to the other end */
    const onEdgeDoubleClick = useCallback(
        (event: React.MouseEvent, edge: FbEdge) => {
            if (!edge.data?.mark) {
                return;
            }
            const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
            const source = getNode(edge.source);
            const target = getNode(edge.target);
            if (!source || !target) {
                return;
            }
            const distance = (node: FbNode): number =>
                Math.hypot(
                    node.position.x + (node.measured?.width || 0) / 2 - point.x,
                    node.position.y + (node.measured?.height || 0) / 2 - point.y,
                );
            showBlocks([distance(source) < distance(target) ? target.id : source.id]);
        },
        [screenToFlowPosition, getNode, showBlocks],
    );

    const edgeView = useMemo(() => {
        if (!selectedEdge) {
            return null;
        }
        const pinName = (id: string, pin: string | null | undefined): string => {
            const node = nodes.find(item => item.id === id);
            return `${node?.type === 'fbBlock' ? node.data.block.name : id}.${pin || ''}`;
        };
        const info = view.links[selectedEdge.id];
        return {
            type: info?.type || 'ANY',
            name: info?.name || '',
            from: pinName(selectedEdge.source, selectedEdge.sourceHandle),
            to: pinName(selectedEdge.target, selectedEdge.targetHandle),
        };
    }, [selectedEdge, nodes, view.links]);

    // ---- what a block offers in its head

    /** Selects a block alone and shows its properties */
    const selectBlock = useCallback(
        (blockId: string) => {
            setNodes(current =>
                current.map(node =>
                    !!node.selected !== (node.id === blockId) ? { ...node, selected: node.id === blockId } : node,
                ),
            );
            setEdges(current => current.map(edge => (edge.selected ? { ...edge, selected: false } : edge)));
            setShowProperties(count => count + 1);
        },
        [setNodes, setEdges],
    );

    /** A copy of a block beside it - with a new ID and, where the name is taken, a new name */
    const duplicateBlock = useCallback(
        (blockId: string) => {
            const node = getNode(blockId);
            if (node?.type !== 'fbBlock') {
                return;
            }
            const block = { ...node.data.block, pos: [node.position.x, node.position.y] as [number, number] };
            const added = pasteNodes({ blocks: [block], links: [], comments: [] }, getNodes(), getEdges(), 30);
            setNodes(current => [
                ...current.map(item => (item.selected ? { ...item, selected: false } : item)),
                ...added.nodes,
            ]);
        },
        [getNode, getNodes, getEdges, setNodes],
    );

    const actions = useMemo(
        (): BlockActions => ({
            change: onBlockChange,
            select: selectBlock,
            duplicate: duplicateBlock,
            remove: blockId => void deleteElements({ nodes: [{ id: blockId }] }),
            openInstance: blockId => {
                const node = getNode(blockId);
                if (node?.type === 'fbBlock') {
                    openInstance(node.data.block);
                }
            },
        }),
        [onBlockChange, selectBlock, duplicateBlock, deleteElements, getNode, openInstance],
    );

    /** The states of the diagram, for the palette */
    const variables = useMemo(
        (): PaletteVariable[] =>
            nodes
                .filter(
                    node =>
                        node.type === 'fbBlock' &&
                        (node.data.block.type === 'STATE_IN' || node.data.block.type === 'STATE_OUT'),
                )
                .map(node => {
                    const block = (node as BlockNodeType).data.block;
                    return {
                        blockId: block.id,
                        name: block.name,
                        oid: String(block.params?.oid || ''),
                        direction: block.type === 'STATE_IN' ? ('in' as const) : ('out' as const),
                    };
                })
                .sort((a, b) => a.name.localeCompare(b.name)),
        [nodes],
    );

    // the copies of the user blocks straight from the state: a block placed just now needs its pins at once
    const shownView = useMemo(
        () => ({ ...view, runtimeError, userBlocks, debug: debugView, actions, linkStyle }),
        [view, runtimeError, userBlocks, debugView, actions, linkStyle],
    );

    return (
        <SignalBusContext.Provider value={bus}>
            <FbViewContext.Provider value={shownView}>
                <div className={`fb-editor fb-theme-${dark ? 'dark' : 'light'}`}>
                    <Palette
                        onAdd={onAddFromPalette}
                        isBlock={!!blockInfo}
                        userBlocks={placeable}
                        variables={variables}
                        onShowVariable={blockId => showBlocks([blockId])}
                    />
                    <div className="fb-main">
                        <div className="fb-toolbar">
                            <div className="fb-toolbar-path">
                                <button
                                    type="button"
                                    className={`fb-toolbar-step${inside.length ? '' : ' fb-toolbar-step-active'}`}
                                    onClick={() => leaveInstance(0)}
                                >
                                    <IconDiagram />
                                    {props.scriptName}
                                </button>
                                {inside.map((step, i) => (
                                    <React.Fragment key={step.blockId}>
                                        <IconPath className="fb-toolbar-separator" />
                                        <button
                                            type="button"
                                            className={`fb-toolbar-step${i === inside.length - 1 ? ' fb-toolbar-step-active' : ''}`}
                                            onClick={() => leaveInstance(i + 1)}
                                            title={userBlocks[step.type]?.name}
                                        >
                                            <BlockIcon type={step.type} />
                                            {step.name}
                                        </button>
                                    </React.Fragment>
                                ))}
                            </div>
                            <div className="fb-toolbar-tools">
                                {!inside.length ? <ZoomTools /> : null}
                                <span className="fb-toolbar-gap" />
                                <button
                                    type="button"
                                    className="fb-tool"
                                    title={I18n.t('fbd_layout')}
                                    disabled={!nodes.length || !!inside.length}
                                    onClick={arrange}
                                >
                                    <IconLayout />
                                </button>
                                <button
                                    type="button"
                                    className="fb-tool"
                                    title={I18n.t('fbd_find')}
                                    disabled={!!inside.length}
                                    onClick={openSearch}
                                >
                                    <IconSearch />
                                </button>
                                <button
                                    type="button"
                                    className={`fb-tool${grid ? ' fb-tool-active' : ''}`}
                                    title={I18n.t('fbd_grid')}
                                    onClick={toggleGrid}
                                >
                                    <IconGrid />
                                </button>
                                <button
                                    type="button"
                                    className="fb-tool"
                                    title={I18n.t(linkStyle === 'curved' ? 'fbd_links_orthogonal' : 'fbd_links_curved')}
                                    onClick={toggleLinkStyle}
                                >
                                    {linkStyle === 'curved' ? <IconCurved /> : <IconOrthogonal />}
                                </button>
                                {/* for the inside of an instance too; the diagram of a block does not run on its own */}
                                {!blockInfo ? (
                                    <>
                                        <span className="fb-toolbar-gap" />
                                        <OnlinePanel
                                            active={online}
                                            onToggle={toggleOnline}
                                            socket={props.socket}
                                            instance={props.instance}
                                            scriptId={props.scriptId}
                                            path={instancePath(inside)}
                                            running={props.running}
                                            changed={props.changed}
                                            onError={setRuntimeError}
                                            debug={debug}
                                            onDebug={setDebug}
                                            onCommand={runDebug}
                                            commandError={commandError}
                                            nameOf={nameOf}
                                        />
                                    </>
                                ) : null}
                            </div>
                        </div>
                        <div
                            className="fb-canvas"
                            ref={wrapper}
                        >
                            <ReactFlow<FbNode, FbEdge>
                                nodes={nodes}
                                edges={edges}
                                nodeTypes={nodeTypes}
                                edgeTypes={edgeTypes}
                                defaultEdgeOptions={defaultEdgeOptions}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                onConnectEnd={onConnectEnd}
                                onEdgeDoubleClick={onEdgeDoubleClick}
                                onNodeDoubleClick={onNodeDoubleClick}
                                isValidConnection={isValidConnection}
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                                connectionLineType={
                                    linkStyle === 'curved' ? ConnectionLineType.Bezier : ConnectionLineType.Step
                                }
                                deleteKeyCode={deleteKeys}
                                snapToGrid={grid}
                                snapGrid={snapGrid}
                                colorMode={dark ? 'dark' : 'light'}
                                fitView
                                fitViewOptions={{ maxZoom: 1.2 }}
                                minZoom={0.2}
                            >
                                {grid ? (
                                    <Background
                                        variant={BackgroundVariant.Lines}
                                        gap={20}
                                        color="var(--fb-grid)"
                                    />
                                ) : null}
                                <Controls showInteractive={false} />
                                {search ? (
                                    <Panel position="top-center">
                                        <SearchPanel
                                            text={search.text}
                                            onText={onSearchText}
                                            count={matchCount}
                                            index={Math.min(search.index, Math.max(matchCount - 1, 0))}
                                            onMove={onSearchMove}
                                            onClose={() => setSearch(null)}
                                            focusKey={search.focus}
                                        />
                                    </Panel>
                                ) : null}
                                <MiniMap
                                    position="bottom-right"
                                    style={{ width: 150, height: 90 }}
                                    pannable
                                    zoomable
                                    bgColor="var(--fb-panel)"
                                    maskColor="var(--fb-mask)"
                                    nodeColor={(node: FbNode) =>
                                        node.type === 'fbBlock'
                                            ? CATEGORY_COLORS[
                                                  getBlockDef(node.data.block.type, userBlocksRef.current)?.category ||
                                                      'logic'
                                              ]
                                            : '#9e9e9e'
                                    }
                                />
                                {analysis.issues.length || runtimeError || outdated.length ? (
                                    <Panel position="bottom-center">
                                        <Box className="fb-issues">
                                            {runtimeError ? (
                                                <Typography
                                                    variant="body2"
                                                    color="error"
                                                    className="fb-issue"
                                                    onClick={() =>
                                                        showBlocks(runtimeError.blockId ? [runtimeError.blockId] : [])
                                                    }
                                                >
                                                    {I18n.t('fbd_runtime_error', runtimeError.message)}
                                                </Typography>
                                            ) : null}
                                            {analysis.issues.map((issue, i) => (
                                                <Typography
                                                    key={i}
                                                    variant="body2"
                                                    color={issue.severity === 'error' ? 'error' : 'warning'}
                                                    className="fb-issue"
                                                    onClick={() =>
                                                        showBlocks(
                                                            issue.blockIds || (issue.blockId ? [issue.blockId] : []),
                                                        )
                                                    }
                                                >
                                                    {issueText(issue)}
                                                </Typography>
                                            ))}
                                            {outdated.map(user => (
                                                <Typography
                                                    key={user.type}
                                                    variant="body2"
                                                    color="warning"
                                                    className="fb-issue"
                                                    onClick={() =>
                                                        showBlocks(
                                                            nodes
                                                                .filter(
                                                                    node =>
                                                                        node.type === 'fbBlock' &&
                                                                        node.data.block.type === user.type,
                                                                )
                                                                .map(node => node.id),
                                                        )
                                                    }
                                                >
                                                    {I18n.t(
                                                        'fbd_block_outdated',
                                                        user.name,
                                                        library[user.type].user.version,
                                                        user.version,
                                                    )}
                                                </Typography>
                                            ))}
                                        </Box>
                                    </Panel>
                                ) : null}
                                {notice ? (
                                    <Panel position="top-center">
                                        <Box className="fb-refused">
                                            <Typography
                                                variant="body2"
                                                color={notice.warning ? 'warning' : 'info'}
                                            >
                                                {notice.text}
                                            </Typography>
                                        </Box>
                                    </Panel>
                                ) : null}
                                {!nodes.length ? (
                                    <Panel position="top-center">
                                        <Typography
                                            variant="body2"
                                            className="fb-hint"
                                        >
                                            {I18n.t('fbd_empty_hint')}
                                        </Typography>
                                    </Panel>
                                ) : null}
                            </ReactFlow>
                            <InstanceView
                                path={inside}
                                userBlocks={userBlocks}
                                dark={dark}
                                forced={debugView.forced}
                                grid={grid}
                                linkStyle={linkStyle}
                                onEnter={enterInstance}
                                onSelect={setInsideBlock}
                            />
                        </div>
                    </div>
                    {inside.length ? (
                        <InstanceProperties
                            path={inside}
                            userBlocks={userBlocks}
                            block={insideBlock}
                            online={steerable}
                            debug={debug}
                            onCommand={runDebug}
                            onEnter={enterInstance}
                            onNavigate={leaveInstance}
                        />
                    ) : (
                        <Properties
                            node={selectedNode}
                            edge={selectedEdge}
                            connectedInputs={connectedInputs}
                            cycle={cycle}
                            mode={analysis.mode}
                            onCycleChange={setCycle}
                            onBlockChange={onBlockChange}
                            onCommentChange={onCommentChange}
                            onDelete={onDelete}
                            blockInfo={blockInfo && { ...blockInfo, version: version ?? blockInfo.version }}
                            onBlockInfoChange={setBlockInfo}
                            scriptName={props.scriptName}
                            userBlocks={userBlocks}
                            library={library}
                            onUpdateUserBlock={updateUserBlock}
                            onOpenScript={props.onOpenScript}
                            onOpenInstance={openInstance}
                            showProperties={showProperties}
                            edgeView={edgeView}
                            onEdgeChange={onEdgeChange}
                            online={steerable}
                            debug={debug}
                            onCommand={runDebug}
                            socket={props.socket}
                            theme={props.theme}
                            themeName={props.themeName}
                            themeType={themeType}
                        />
                    )}
                </div>
            </FbViewContext.Provider>
        </SignalBusContext.Provider>
    );
}

/**
 * The diagram is read from the script once. After that the editor owns it: the source it hands up
 * with `onChange` comes back as `code`, and only a source it did not write itself - a revert, or a
 * change made somewhere else - loads the diagram again.
 */
export default function FbEditor({ ref, ...props }: FbEditorProps): React.JSX.Element {
    const { onChange } = props;
    const written = useRef<string | null>(null);
    const [loaded, setLoaded] = useState(() => ({ code: props.code, graph: parseGraph(props.code), key: 0 }));

    useEffect(() => {
        // compared with what the diagram shows: a revert brings back the code it was loaded from
        if (props.code !== (written.current ?? loaded.code)) {
            written.current = null;
            setLoaded(current => ({ code: props.code, graph: parseGraph(props.code), key: current.key + 1 }));
        }
    }, [props.code, loaded.code]);

    const onGenerated = useCallback(
        (source: string) => {
            written.current = source;
            onChange(source);
        },
        [onChange],
    );

    if (!loaded.graph) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography color="error">{I18n.t('fbd_no_diagram')}</Typography>
            </Box>
        );
    }

    return (
        <ReactFlowProvider key={loaded.key}>
            <FbCanvas
                {...props}
                apiRef={ref}
                initial={loaded.graph}
                onChange={onGenerated}
            />
        </ReactFlowProvider>
    );
}
