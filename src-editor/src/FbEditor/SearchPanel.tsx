import React, { useEffect, useRef } from 'react';

import { Box, IconButton, InputBase, Typography } from '@mui/material';
import {
    Close as IconClose,
    KeyboardArrowDown as IconNext,
    KeyboardArrowUp as IconPrevious,
    Search as IconSearch,
} from '@mui/icons-material';

import { I18n } from '@iobroker/gui-components';

interface SearchPanelProps {
    text: string;
    onText: (text: string) => void;
    /** How many blocks match, and which of them is shown (from 0) */
    count: number;
    index: number;
    onMove: (step: 1 | -1) => void;
    onClose: () => void;
    /** Changes whenever Ctrl+F is pressed again, to get the focus back */
    focusKey: number;
}

/** The search in the diagram: Enter goes to the next block that matches, Shift+Enter back, Esc closes */
export default function SearchPanel(props: SearchPanelProps): React.JSX.Element {
    const { text, count, index, onMove, onClose } = props;
    const input = useRef<HTMLInputElement>(null);

    useEffect(() => {
        input.current?.focus();
        input.current?.select();
    }, [props.focusKey]);

    return (
        <Box
            className="fb-search"
            sx={{ bgcolor: 'background.paper' }}
        >
            <IconSearch
                fontSize="small"
                sx={{ opacity: 0.6 }}
            />
            <InputBase
                inputRef={input}
                value={text}
                placeholder={I18n.t('fbd_find_placeholder')}
                onChange={event => props.onText(event.target.value)}
                onKeyDown={event => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        onMove(event.shiftKey ? -1 : 1);
                    } else if (event.key === 'Escape') {
                        event.preventDefault();
                        onClose();
                    }
                }}
                sx={{ fontSize: 13, width: 180 }}
            />
            <Typography
                variant="caption"
                className="fb-search-count"
                color={text.trim() && !count ? 'error' : undefined}
            >
                {text.trim() ? (count ? `${index + 1}/${count}` : I18n.t('fbd_find_none')) : ''}
            </Typography>
            <IconButton
                size="small"
                disabled={count < 2}
                title={I18n.t('fbd_find_previous')}
                onClick={() => onMove(-1)}
            >
                <IconPrevious fontSize="small" />
            </IconButton>
            <IconButton
                size="small"
                disabled={count < 2}
                title={I18n.t('fbd_find_next')}
                onClick={() => onMove(1)}
            >
                <IconNext fontSize="small" />
            </IconButton>
            <IconButton
                size="small"
                title={I18n.t('fbd_find_close')}
                onClick={onClose}
            >
                <IconClose fontSize="small" />
            </IconButton>
        </Box>
    );
}
