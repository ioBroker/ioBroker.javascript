/**
 * fb-editor: the editor of function block diagrams (FBD, in the style of CFC).
 *
 * It is loaded only when a diagram is opened (see `preload.ts`) - React Flow and this editor are
 * of no use to anybody who never opens one. That is also why the styles are imported here and not
 * with the application.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    type Connection,
    type IsValidConnection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Box, Typography } from '@mui/material';

import { I18n, type AdminConnection, type IobTheme, type ThemeName, type ThemeType } from '@iobroker/gui-components';

import {
    analyzeGraph,
    createBlock,
    createId,
    generateSource,
    getBlockDef,
    getInputs,
    getOutputs,
    isCompatible,
    parseGraph,
    type FbAnalysis,
    type FbBlock,
    type FbCycle,
    type FbGraph,
    type FbIssue,
} from '@fb-core';

import './FbEditor.css';
import './i18n';
import BlockNode from './BlockNode';
import CommentNode from './CommentNode';
import LinkEdge from './LinkEdge';
import Palette, { DRAG_TYPE } from './Palette';
import Properties from './Properties';
import { CATEGORY_COLORS, COMMENT_DEFAULT_SIZE, flowToGraph, graphToFlow, type FbEdge, type FbNode } from './convert';
import { FbViewContext, type FbView } from './ViewContext';

// Outside the component: new objects at every render would mount all nodes again
const nodeTypes = { fbBlock: BlockNode, fbComment: CommentNode };
const edgeTypes = { fbLink: LinkEdge };
const defaultEdgeOptions = { type: 'fbLink' as const };
const deleteKeys = ['Delete', 'Backspace'];
const snapGrid: [number, number] = [10, 10];

/** Time without a change before the code is generated again - a drag moves the nodes at every frame */
const GENERATE_DELAY = 300;

export interface FbEditorProps {
    code: string;
    onChange: (code: string) => void;
    socket: AdminConnection;
    theme: IobTheme;
    themeName: ThemeName;
    themeType: ThemeType;
}

function buildView(analysis: FbAnalysis, graph: FbGraph, dark: boolean): FbView {
    const errors = new Set<string>();
    const errorLinks = new Set<string>();
    analysis.issues
        .filter(issue => issue.severity === 'error')
        .forEach(issue => {
            if (issue.blockId) {
                errors.add(issue.blockId);
            }
            issue.blockIds?.forEach(id => errors.add(id));
            if (issue.linkId) {
                errorLinks.add(issue.linkId);
            }
        });

    const blocks = new Map(graph.blocks.map(block => [block.id, block]));
    const feedback = new Set(analysis.feedback);
    const links: FbView['links'] = {};
    for (const link of graph.links) {
        const block = blocks.get(link.from[0]);
        const pin = block && getOutputs(block).find(output => output.id === link.from[1]);
        links[link.id] = { type: pin?.type || 'ANY', feedback: feedback.has(link.id), error: errorLinks.has(link.id) };
    }

    return { order: analysis.order, errors, links, background: dark ? '#141414' : '#ffffff' };
}

function issueText(issue: FbIssue): string {
    const args = issue.args || [];
    // the argument of this one is the ID of a parameter, which has a name for people
    if (issue.message === 'Parameter "%s" is not set') {
        return I18n.t(issue.message, ...args.map(arg => I18n.t(`fbd_param_${arg}`)));
    }
    return I18n.t(issue.message, ...args);
}

function FbCanvas(props: FbEditorProps & { initial: FbGraph }): React.JSX.Element {
    const { onChange, themeType } = props;
    const dark = themeType === 'dark';
    const initialFlow = useMemo(() => graphToFlow(props.initial), [props.initial]);
    const [nodes, setNodes, onNodesChange] = useNodesState<FbNode>(initialFlow.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState<FbEdge>(initialFlow.edges);
    const [cycle, setCycle] = useState<FbCycle>(props.initial.cycle);
    const [analysis, setAnalysis] = useState<FbAnalysis>(() => analyzeGraph(props.initial));
    const [view, setView] = useState<FbView>(() => buildView(analysis, props.initial, dark));
    const { screenToFlowPosition, getNode, getEdges, deleteElements, fitView } = useReactFlow<FbNode, FbEdge>();
    const updateNodeInternals = useUpdateNodeInternals();
    const wrapper = useRef<HTMLDivElement>(null);

    /** The graph as it was generated last, to tell a real change from a selection or a measurement */
    const lastGraph = useRef(JSON.stringify(flowToGraph(initialFlow.nodes, initialFlow.edges, props.initial.cycle)));

    useEffect(() => {
        const timer = setTimeout(() => {
            const graph = flowToGraph(nodes, edges, cycle);
            const json = JSON.stringify(graph);
            if (json === lastGraph.current) {
                return;
            }
            lastGraph.current = json;
            const result = generateSource(graph);
            setAnalysis(result.analysis);
            setView(buildView(result.analysis, graph, dark));
            onChange(result.source);
        }, GENERATE_DELAY);
        return () => clearTimeout(timer);
    }, [nodes, edges, cycle, onChange, dark]);

    useEffect(() => setView(current => ({ ...current, background: dark ? '#141414' : '#ffffff' })), [dark]);

    const isValidConnection: IsValidConnection<FbEdge> = useCallback(
        (connection: FbEdge | Connection): boolean => {
            const source = getNode(connection.source);
            const target = getNode(connection.target);
            if (source?.type !== 'fbBlock' || target?.type !== 'fbBlock') {
                return false;
            }
            const output = getOutputs(source.data.block).find(pin => pin.id === connection.sourceHandle);
            const input = getInputs(target.data.block).find(pin => pin.id === connection.targetHandle);
            if (!output || !input || !isCompatible(output.type, input.type)) {
                return false;
            }
            // an input takes one signal
            return !getEdges().some(
                edge => edge.target === connection.target && edge.targetHandle === connection.targetHandle,
            );
        },
        [getNode, getEdges],
    );

    const onConnect = useCallback(
        (connection: Connection) =>
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
            ),
        [setEdges],
    );

    const addItem = useCallback(
        (type: string, position: { x: number; y: number }): void => {
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
                if (!getBlockDef(type)) {
                    return current;
                }
                const graph = flowToGraph(current, [], cycle);
                const block = createBlock(type, [x, y], graph);
                return [
                    ...deselected,
                    { id: block.id, type: 'fbBlock', position: { x, y }, selected: true, data: { block } },
                ];
            });
        },
        [setNodes, cycle],
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

    const onBlockChange = useCallback(
        (block: FbBlock) => {
            setNodes(current =>
                current.map(node =>
                    node.id === block.id && node.type === 'fbBlock' ? { ...node, data: { block } } : node,
                ),
            );
            // fewer inputs: the links of the inputs that are gone go with them
            const inputs = new Set(getInputs(block).map(pin => pin.id));
            setEdges(current =>
                current.filter(edge => edge.target !== block.id || inputs.has(edge.targetHandle || '')),
            );
            // the handles may have changed
            requestAnimationFrame(() => updateNodeInternals(block.id));
        },
        [setNodes, setEdges, updateNodeInternals],
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

    const showIssue = useCallback(
        (issue: FbIssue) => {
            const ids = issue.blockIds || (issue.blockId ? [issue.blockId] : []);
            if (!ids.length) {
                return;
            }
            setNodes(current => current.map(node => ({ ...node, selected: ids.includes(node.id) })));
            void fitView({ nodes: ids.map(id => ({ id })), maxZoom: 1.5, duration: 300 });
        },
        [setNodes, fitView],
    );

    return (
        <FbViewContext.Provider value={view}>
            <div className="fb-editor">
                <Palette onAdd={onAddFromPalette} />
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
                        isValidConnection={isValidConnection}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        connectionLineType={ConnectionLineType.Step}
                        deleteKeyCode={deleteKeys}
                        snapToGrid
                        snapGrid={snapGrid}
                        colorMode={dark ? 'dark' : 'light'}
                        fitView
                        fitViewOptions={{ maxZoom: 1.2 }}
                        minZoom={0.2}
                    >
                        <Background
                            variant={BackgroundVariant.Dots}
                            gap={20}
                        />
                        <Controls />
                        <MiniMap
                            pannable
                            zoomable
                            nodeColor={(node: FbNode) =>
                                node.type === 'fbBlock'
                                    ? CATEGORY_COLORS[getBlockDef(node.data.block.type)?.category || 'logic']
                                    : '#9e9e9e'
                            }
                        />
                        {analysis.issues.length ? (
                            <Panel position="bottom-left">
                                <Box
                                    className="fb-issues"
                                    sx={{ bgcolor: 'background.paper' }}
                                >
                                    {analysis.issues.map((issue, i) => (
                                        <Typography
                                            key={i}
                                            variant="body2"
                                            color={issue.severity === 'error' ? 'error' : 'warning'}
                                            className="fb-issue"
                                            onClick={() => showIssue(issue)}
                                        >
                                            {issueText(issue)}
                                        </Typography>
                                    ))}
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
                </div>
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
                    socket={props.socket}
                    theme={props.theme}
                    themeName={props.themeName}
                    themeType={themeType}
                />
            </div>
        </FbViewContext.Provider>
    );
}

/**
 * The diagram is read from the script once. After that the editor owns it: the source it hands up
 * with `onChange` comes back as `code`, and only a source it did not write itself - a revert, or a
 * change made somewhere else - loads the diagram again.
 */
export default function FbEditor(props: FbEditorProps): React.JSX.Element {
    const { onChange } = props;
    const written = useRef<string | null>(null);
    const [loaded, setLoaded] = useState(() => ({ code: props.code, graph: parseGraph(props.code), key: 0 }));

    useEffect(() => {
        if (props.code !== loaded.code && props.code !== written.current) {
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
                initial={loaded.graph}
                onChange={onGenerated}
            />
        </ReactFlowProvider>
    );
}
