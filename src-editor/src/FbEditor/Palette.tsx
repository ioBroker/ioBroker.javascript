import React, { useState } from 'react';

import { Box, TextField, Typography } from '@mui/material';

import { I18n } from '@iobroker/gui-components';

import { FB_CATEGORIES, FB_LIBRARY } from '@fb-core';

import { CATEGORY_COLORS } from './convert';

/** Type of the drag data; `comment` stands for a comment */
export const DRAG_TYPE = 'application/x-iobroker-fbd';

interface PaletteProps {
    /** Adds the block in the middle of the visible part of the canvas */
    onAdd: (type: string) => void;
}

/** The block library, by category. A block is dragged onto the canvas, or added with a click */
export default function Palette({ onAdd }: PaletteProps): React.JSX.Element {
    const [filter, setFilter] = useState('');
    const text = filter.trim().toLowerCase();

    const item = (type: string, label: string, color: string, title: string): React.JSX.Element => (
        <div
            key={type}
            className="fb-palette-item"
            style={{ borderLeftColor: color }}
            draggable
            title={title}
            onDragStart={event => {
                event.dataTransfer.setData(DRAG_TYPE, type);
                event.dataTransfer.effectAllowed = 'move';
            }}
            onClick={() => onAdd(type)}
        >
            {label}
        </div>
    );

    return (
        <Box className="fb-palette">
            <TextField
                variant="standard"
                size="small"
                fullWidth
                placeholder={I18n.t('fbd_search')}
                value={filter}
                onChange={event => setFilter(event.target.value)}
                sx={{ mb: 1 }}
            />
            {FB_CATEGORIES.map(category => {
                const blocks = FB_LIBRARY.filter(
                    def =>
                        def.category === category &&
                        (!text ||
                            def.type.toLowerCase().includes(text) ||
                            I18n.t(`fbd_desc_${def.type}`).toLowerCase().includes(text)),
                );
                if (!blocks.length) {
                    return null;
                }
                return (
                    <div key={category}>
                        <Typography
                            variant="caption"
                            component="div"
                            className="fb-palette-category"
                        >
                            {I18n.t(`fbd_category_${category}`)}
                        </Typography>
                        {blocks.map(def =>
                            item(def.type, def.type, CATEGORY_COLORS[category], I18n.t(`fbd_desc_${def.type}`)),
                        )}
                    </div>
                );
            })}
            {!text || I18n.t('fbd_comment').toLowerCase().includes(text) ? (
                <div>
                    <Typography
                        variant="caption"
                        component="div"
                        className="fb-palette-category"
                    >
                        {I18n.t('fbd_category_structure')}
                    </Typography>
                    {item('comment', I18n.t('fbd_comment'), '#9e9e9e', I18n.t('fbd_comment_desc'))}
                </div>
            ) : null}
        </Box>
    );
}
