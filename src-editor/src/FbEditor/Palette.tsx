import React, { useState } from 'react';

import {
    ExpandMore as IconExpanded,
    ChevronRight as IconCollapsed,
    Search as IconSearch,
    Star as IconStar,
    StarBorder as IconNoStar,
    UnfoldLess as IconCollapseAll,
    UnfoldMore as IconExpandAll,
} from '@mui/icons-material';

import { I18n } from '@iobroker/gui-components';

import { FB_CATEGORIES, FB_LIBRARY, type FbBlockInfo, type FbCategory } from '@fb-core';

import BlockIcon from './BlockIcon';
import { CATEGORY_COLORS } from './convert';

/** Type of the drag data; `comment` stands for a comment */
export const DRAG_TYPE = 'application/x-iobroker-fbd';

/** A state the diagram reads or writes */
export interface PaletteVariable {
    blockId: string;
    name: string;
    oid: string;
    direction: 'in' | 'out';
}

interface PaletteProps {
    /** Adds the block in the middle of the visible part of the canvas */
    onAdd: (type: string) => void;
    /** The diagram is a block: it gets its pins from FB_IN and FB_OUT */
    isBlock: boolean;
    /** The user blocks that can be placed */
    userBlocks: FbBlockInfo[];
    /** The states of the diagram */
    variables: PaletteVariable[];
    onShowVariable: (blockId: string) => void;
}

type Tab = 'blocks' | 'variables' | 'favorites';
type Group = FbCategory | 'structure';

/** A setting of the palette that the browser keeps for the next diagram */
function useStored<T>(key: string, initial: T): [T, (value: T) => void] {
    const [value, setValue] = useState<T>(() => {
        try {
            const stored = window.localStorage.getItem(key);
            return stored ? (JSON.parse(stored) as T) : initial;
        } catch {
            return initial;
        }
    });
    const store = (next: T): void => {
        setValue(next);
        try {
            window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
            // kept for this diagram only
        }
    };
    return [value, store];
}

interface Item {
    type: string;
    label: string;
    color: string;
    title: string;
    group: Group;
}

/**
 * The blocks to place, by category - dragged onto the canvas or added with a click - the states the
 * diagram uses, and the blocks marked with the star.
 */
export default function Palette(props: PaletteProps): React.JSX.Element {
    const { onAdd, isBlock, userBlocks } = props;
    const [filter, setFilter] = useState('');
    const [tab, setTab] = useStored<Tab>('FbEditor.palette.tab', 'blocks');
    const [collapsed, setCollapsed] = useStored<Group[]>('FbEditor.palette.collapsed', []);
    const [favorites, setFavorites] = useStored<string[]>('FbEditor.favorites', []);
    const text = filter.trim().toLowerCase();
    const matches = (...texts: (string | undefined)[]): boolean =>
        !text || texts.some(value => value?.toLowerCase().includes(text));

    const groups: Group[] = [...(isBlock ? ['interface' as const] : []), ...FB_CATEGORIES, 'user', 'structure'];
    const items: Item[] = [
        ...FB_LIBRARY.filter(def => def.category !== 'interface' || isBlock).map(def => ({
            type: def.type,
            label: def.type,
            color: CATEGORY_COLORS[def.category],
            title: I18n.t(`fbd_desc_${def.type}`),
            group: def.category,
        })),
        ...userBlocks.map(user => ({
            type: user.type,
            label: user.name,
            color: CATEGORY_COLORS.user,
            title: `${user.description ? `${user.description}\n` : ''}${user.type}, v${user.version}`,
            group: 'user' as const,
        })),
        {
            type: 'comment',
            label: I18n.t('fbd_comment'),
            color: '#94a3b8',
            title: I18n.t('fbd_comment_desc'),
            group: 'structure',
        },
    ];
    const shown = items.filter(item => matches(item.label, item.title));

    const toggleFavorite = (type: string): void =>
        setFavorites(favorites.includes(type) ? favorites.filter(item => item !== type) : [...favorites, type]);

    const renderItem = (item: Item): React.JSX.Element => {
        const favorite = favorites.includes(item.type);
        return (
            <div
                key={item.type}
                className="fb-palette-item"
                style={{ '--fb-cat': item.color } as React.CSSProperties}
                draggable
                title={item.title}
                onDragStart={event => {
                    event.dataTransfer.setData(DRAG_TYPE, item.type);
                    event.dataTransfer.effectAllowed = 'move';
                }}
                onClick={() => onAdd(item.type)}
            >
                <BlockIcon
                    type={item.type}
                    color={item.color}
                />
                <span className="fb-palette-label">{item.label}</span>
                <button
                    type="button"
                    className={`fb-palette-star${favorite ? ' fb-on' : ''}`}
                    title={I18n.t(favorite ? 'fbd_favorite_remove' : 'fbd_favorite_add')}
                    onClick={event => {
                        event.stopPropagation();
                        toggleFavorite(item.type);
                    }}
                >
                    {favorite ? <IconStar /> : <IconNoStar />}
                </button>
            </div>
        );
    };

    const renderGroup = (group: Group): React.JSX.Element | null => {
        const members = shown.filter(item => item.group === group);
        const hint =
            group === 'user' && !text && !userBlocks.length ? (
                <div className="fb-palette-hint">{I18n.t('fbd_no_user_blocks')}</div>
            ) : null;
        if (!members.length && !hint) {
            return null;
        }
        // a search shows everything it finds
        const open = !!text || !collapsed.includes(group);
        return (
            <div key={group}>
                <div
                    className="fb-palette-category"
                    onClick={() =>
                        setCollapsed(open ? [...collapsed, group] : collapsed.filter(item => item !== group))
                    }
                >
                    {open ? <IconExpanded /> : <IconCollapsed />}
                    <span>{I18n.t(`fbd_category_${group}`)}</span>
                    <span className="fb-palette-count">{members.length || ''}</span>
                </div>
                {open ? (
                    <>
                        {members.map(renderItem)}
                        {hint}
                    </>
                ) : null}
            </div>
        );
    };

    let content: React.JSX.Element;
    if (tab === 'variables') {
        const variables = props.variables.filter(variable => matches(variable.name, variable.oid));
        content = variables.length ? (
            <>
                {variables.map(variable => (
                    <div
                        key={variable.blockId}
                        className="fb-palette-variable"
                        onClick={() => props.onShowVariable(variable.blockId)}
                        title={variable.oid}
                    >
                        <BlockIcon
                            type={variable.direction === 'in' ? 'STATE_IN' : 'STATE_OUT'}
                            color={CATEGORY_COLORS.iobroker}
                        />
                        <div className="fb-palette-variable-text">
                            <div>{variable.name}</div>
                            <div className="fb-palette-variable-oid">{variable.oid || I18n.t('fbd_no_state')}</div>
                        </div>
                    </div>
                ))}
            </>
        ) : (
            <div className="fb-palette-hint">{I18n.t('fbd_no_variables')}</div>
        );
    } else if (tab === 'favorites') {
        const marked = shown.filter(item => favorites.includes(item.type));
        content = marked.length ? (
            <>{marked.map(renderItem)}</>
        ) : (
            <div className="fb-palette-hint">{I18n.t('fbd_no_favorites')}</div>
        );
    } else {
        content = <>{groups.map(renderGroup)}</>;
    }

    const allCollapsed = groups.every(group => collapsed.includes(group));

    return (
        <div className="fb-palette">
            <div className="fb-palette-search">
                <IconSearch />
                <input
                    value={filter}
                    placeholder={I18n.t('fbd_search')}
                    onChange={event => setFilter(event.target.value)}
                />
                {tab === 'blocks' ? (
                    <button
                        type="button"
                        className="fb-palette-fold"
                        title={I18n.t(allCollapsed ? 'fbd_expand_all' : 'fbd_collapse_all')}
                        onClick={() => setCollapsed(allCollapsed ? [] : groups)}
                    >
                        {allCollapsed ? <IconExpandAll /> : <IconCollapseAll />}
                    </button>
                ) : null}
            </div>
            <div className="fb-tabs">
                {(['blocks', 'variables', 'favorites'] as const).map(item => (
                    <button
                        key={item}
                        type="button"
                        className={`fb-tab${tab === item ? ' fb-tab-active' : ''}`}
                        onClick={() => setTab(item)}
                    >
                        {I18n.t(`fbd_tab_${item}`)}
                    </button>
                ))}
            </div>
            <div className="fb-palette-list">{content}</div>
        </div>
    );
}
