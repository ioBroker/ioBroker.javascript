/**
 * The inside of an instance of a user block: the diagram of the block as the diagram carries it,
 * read only - online with the values of just this instance. An instance inside it can be opened in
 * turn; the path leads back.
 *
 * It has a React Flow of its own over the canvas of the diagram, which stays as it is underneath.
 */
import React, { useEffect, useMemo } from 'react';
import { Background, BackgroundVariant, Controls, ReactFlow, ReactFlowProvider, useNodesState } from '@xyflow/react';

import { Button, Typography } from '@mui/material';

import { I18n } from '@iobroker/gui-components';

import {
    analyzeGraph,
    getBlockDef,
    getInputs,
    getOutputs,
    type FbBlock,
    type FbDebugCommand,
    type FbDebugStatus,
    type FbUserBlock,
} from '@fb-core';

import BlockNode, { formatValue } from './BlockNode';
import CommentNode from './CommentNode';
import LinkEdge from './LinkEdge';
import Preview from './Preview';
import { ForceControls, Row, Section } from './Properties';
import { graphToFlow, type FbEdge, type FbNode } from './convert';
import { previewOf } from './timing';
import { FbViewContext, NO_DEBUG, buildView, type LinkStyle } from './ViewContext';

const nodeTypes = { fbBlock: BlockNode, fbComment: CommentNode };
const edgeTypes = { fbLink: LinkEdge };

/** One step into an instance */
export interface InstanceStep {
    /** The ID of the instance in the diagram around it */
    blockId: string;
    /** Its user block */
    type: string;
    /** Its instance name */
    name: string;
}

/** The path as the online view has it: `b3/b7` */
export function instancePath(path: InstanceStep[]): string {
    return path.map(step => step.blockId).join('/');
}

/** A new step into the instance of a node, if it is an instance of a user block */
export function stepInto(node: FbNode, userBlocks: Record<string, FbUserBlock>): InstanceStep | null {
    if (node.type !== 'fbBlock') {
        return null;
    }
    const { block } = node.data;
    return getBlockDef(block.type, userBlocks)?.user ? { blockId: block.id, type: block.type, name: block.name } : null;
}

interface InstanceViewProps {
    path: InstanceStep[];
    /** The copies of the user blocks the diagram carries - also those inside the blocks */
    userBlocks: Record<string, FbUserBlock>;
    dark: boolean;
    /** The forced signals of the running diagram, with their whole path */
    forced: Set<string>;
    grid: boolean;
    linkStyle: LinkStyle;
    onEnter: (step: InstanceStep) => void;
    onSelect: (block: FbBlock | null) => void;
}

function InstanceCanvas(props: InstanceViewProps): React.JSX.Element | null {
    const { path, userBlocks, dark, onEnter, onSelect } = props;
    const step = path[path.length - 1];
    const user = userBlocks[step.type];
    const flow = useMemo(() => graphToFlow(user.graph), [user]);
    const [nodes, , onNodesChange] = useNodesState<FbNode>(flow.nodes);

    const view = useMemo(() => {
        const analysis = analyzeGraph(user.graph, { userBlocks, isBlock: true });
        return {
            ...buildView(analysis, user.graph, dark, userBlocks),
            debug: { ...NO_DEBUG, forced: props.forced },
            prefix: `${instancePath(path)}/`,
            linkStyle: props.linkStyle,
        };
    }, [user, userBlocks, dark, props.forced, path, props.linkStyle]);

    const selected = nodes.filter(node => node.selected);
    const selectedBlock = selected.length === 1 && selected[0].type === 'fbBlock' ? selected[0].data.block : null;
    useEffect(() => onSelect(selectedBlock), [selectedBlock, onSelect]);

    return (
        <FbViewContext.Provider value={view}>
            <ReactFlow<FbNode, FbEdge>
                nodes={nodes}
                edges={flow.edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                onNodeDoubleClick={(_event, node) => {
                    const next = stepInto(node, userBlocks);
                    if (next) {
                        onEnter(next);
                    }
                }}
                nodesDraggable={false}
                nodesConnectable={false}
                edgesReconnectable={false}
                deleteKeyCode={null}
                colorMode={dark ? 'dark' : 'light'}
                fitView
                fitViewOptions={{ maxZoom: 1.2 }}
                minZoom={0.2}
            >
                {props.grid ? (
                    <Background
                        variant={BackgroundVariant.Lines}
                        gap={20}
                        color="var(--fb-grid)"
                    />
                ) : null}
                <Controls showInteractive={false} />
            </ReactFlow>
        </FbViewContext.Provider>
    );
}

/** Over the canvas of the diagram; a new React Flow for every instance */
export default function InstanceView(props: InstanceViewProps): React.JSX.Element | null {
    if (!props.path.length || !props.userBlocks[props.path[props.path.length - 1].type]) {
        return null;
    }
    return (
        <div className="fb-instance">
            <ReactFlowProvider key={instancePath(props.path)}>
                <InstanceCanvas {...props} />
            </ReactFlowProvider>
        </div>
    );
}

/** The right side while an instance is shown: what is selected in it, to look at and to force */
export function InstanceProperties(props: {
    path: InstanceStep[];
    userBlocks: Record<string, FbUserBlock>;
    block: FbBlock | null;
    /** Online, and the runtime answers */
    online: boolean;
    debug: FbDebugStatus | null;
    onCommand: (command: FbDebugCommand) => void;
    onEnter: (step: InstanceStep) => void;
    onNavigate: (depth: number) => void;
}): React.JSX.Element | null {
    const { path, userBlocks, block, debug } = props;
    const step = path[path.length - 1];
    const user = userBlocks[step?.type];
    if (!user) {
        return null;
    }
    const prefix = `${instancePath(path)}/`;
    const inside = props.online && !!debug?.inside;

    let content: React.JSX.Element;
    if (block) {
        const def = getBlockDef(block.type, userBlocks);
        const connected = new Set(user.graph.links.filter(link => link.to[0] === block.id).map(link => link.to[1]));
        const next = def?.user ? { blockId: block.id, type: block.type, name: block.name } : null;
        content = (
            <>
                <Section
                    id="general"
                    title={I18n.t('fbd_section_general')}
                >
                    <Row label={I18n.t('fbd_name')}>
                        <Typography variant="body2">{block.name}</Typography>
                    </Row>
                    <Row label={I18n.t('fbd_type')}>
                        <Typography variant="body2">
                            {def?.user
                                ? `${def.user.name} (v${def.user.version})`
                                : `${block.type} - ${I18n.t(`fbd_desc_${block.type}`)}`}
                        </Typography>
                    </Row>
                    {block.comment ? (
                        <Row label={I18n.t('fbd_comment_field')}>
                            <Typography variant="body2">{block.comment}</Typography>
                        </Row>
                    ) : null}
                    {/* what can be read: the parameters and the values of the open inputs */}
                    {(def?.params || []).map(param => (
                        <Row
                            key={param.id}
                            label={I18n.t(`fbd_param_${param.id}`)}
                        >
                            <Typography
                                variant="body2"
                                className="fb-mono"
                            >
                                {String(block.params?.[param.id] ?? param.default ?? '')}
                            </Typography>
                        </Row>
                    ))}
                    {getInputs(block, def)
                        .filter(pin => !connected.has(pin.id))
                        .map(pin => (
                            <Row
                                key={pin.id}
                                label={`${pin.id} (${pin.type})`}
                            >
                                <Typography
                                    variant="body2"
                                    className="fb-mono"
                                >
                                    {formatValue(pin, block)}
                                </Typography>
                            </Row>
                        ))}
                    {next ? (
                        <Button
                            size="small"
                            onClick={() => props.onEnter(next)}
                            title={I18n.t('fbd_instance_open_hint')}
                        >
                            {I18n.t('fbd_instance_open')}
                        </Button>
                    ) : null}
                </Section>
                {inside && debug && def ? (
                    <Section
                        id="online"
                        title={I18n.t('fbd_online')}
                    >
                        {getOutputs(block, def).map(pin => (
                            <ForceControls
                                key={pin.id}
                                label={pin.id}
                                signal={`${prefix}${block.id}.${pin.id}`}
                                type={pin.type}
                                debug={debug}
                                onCommand={props.onCommand}
                            />
                        ))}
                    </Section>
                ) : null}
                {def && previewOf(block, def) ? (
                    <Section
                        id="preview"
                        title={I18n.t('fbd_section_preview')}
                    >
                        <Preview
                            block={block}
                            def={def}
                        />
                    </Section>
                ) : null}
            </>
        );
    } else {
        content = (
            <Section
                id="instance"
                title={I18n.t('fbd_instance')}
            >
                <Typography variant="body2">
                    {I18n.t('fbd_instance_title', step.name, user.name, user.version)}
                </Typography>
            </Section>
        );
    }

    return (
        <div className="fb-properties">
            <div className="fb-properties-content">
                {content}
                <div className="fb-row-hint">{I18n.t('fbd_instance_readonly')}</div>
                {props.online && debug && !debug.inside ? (
                    <Typography
                        variant="caption"
                        component="div"
                        color="warning"
                        sx={{ mt: 1 }}
                    >
                        {I18n.t('fbd_instance_save_once')}
                    </Typography>
                ) : null}
                <Button
                    size="small"
                    onClick={() => props.onNavigate(path.length - 1)}
                    sx={{ mt: 1 }}
                >
                    {I18n.t('fbd_instance_back')}
                </Button>
            </div>
        </div>
    );
}
