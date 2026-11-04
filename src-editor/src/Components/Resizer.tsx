import React, { useRef, useState } from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';
import type { CSSObject } from '@mui/material/styles';

/** How far one press of an arrow key moves the border */
const KEY_STEP = 16;

interface ResizerProps {
    /** The drag starts: the panel should remember its size now */
    onResizeStart: () => void;
    /** The pointer (or the arrow keys) moved by `delta` px to the right since the drag started */
    onResize: (delta: number) => void;
    /** The drag ended: a good moment to store the size */
    onResizeEnd: () => void;
    /** Double click: back to the default size */
    onReset?: () => void;
    /** Tooltip, e.g. "Drag to resize, double click to reset" */
    title?: string;
}

/** The look of the border, also for the border between the two sides of the Monaco diff editor */
export function resizerLook(theme: Theme, active: string): CSSObject {
    return {
        // the line
        '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 'calc(50% - 0.5px)',
            width: '1px',
            height: '100%',
            backgroundColor: theme.palette.divider,
            transition: 'background-color 0.15s ease, width 0.15s ease, left 0.15s ease',
            pointerEvents: 'none',
        },
        // the grip in the middle: shows that the border can be moved
        '&::after': {
            content: '""',
            position: 'absolute',
            top: 'calc(50% - 16px)',
            left: 'calc(50% - 2px)',
            width: '4px',
            height: '32px',
            borderRadius: '2px',
            backgroundColor: theme.palette.text.disabled,
            transition: 'background-color 0.15s ease',
            pointerEvents: 'none',
        },
        [active]: {
            '&::before': {
                left: 'calc(50% - 1.5px)',
                width: '3px',
                backgroundColor: theme.palette.primary.main,
            },
            '&::after': {
                backgroundColor: theme.palette.primary.main,
            },
        },
    };
}

const styles: SxProps<Theme> = theme => ({
    position: 'relative',
    width: 7,
    flexShrink: 0,
    cursor: 'col-resize',
    touchAction: 'none',
    outline: 'none',
    ...resizerLook(theme, '&:hover, &.active, &:focus-visible'),
});

/**
 * A vertical border between two panels that can be dragged to the left or to the right (or moved with the
 * arrow keys, when it has the focus). It shows a line and a grip, which light up while the pointer is over it.
 */
export default function Resizer(props: ResizerProps): React.JSX.Element {
    const startX = useRef<number | null>(null);
    const [active, setActive] = useState(false);

    const end = (): void => {
        if (startX.current !== null) {
            startX.current = null;
            setActive(false);
            props.onResizeEnd();
        }
    };

    return (
        <Box
            role="separator"
            aria-orientation="vertical"
            tabIndex={0}
            title={props.title}
            className={active ? 'active' : undefined}
            onPointerDown={e => {
                if (e.button !== 0) {
                    return;
                }
                // no text selection while dragging
                e.preventDefault();
                // the pointer may leave the thin border (e.g. over the code editor), the moves still come here
                e.currentTarget.setPointerCapture(e.pointerId);
                startX.current = e.clientX;
                setActive(true);
                props.onResizeStart();
            }}
            onPointerMove={e => {
                if (startX.current !== null) {
                    if (!e.buttons) {
                        // the button was released, but the end of the drag got lost (e.g. outside the window)
                        end();
                    } else {
                        props.onResize(e.clientX - startX.current);
                    }
                }
            }}
            onPointerUp={end}
            onPointerCancel={end}
            onLostPointerCapture={end}
            onDoubleClick={props.onReset}
            onKeyDown={e => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    props.onResizeStart();
                    props.onResize(e.key === 'ArrowLeft' ? -KEY_STEP : KEY_STEP);
                    props.onResizeEnd();
                }
            }}
            sx={styles}
        />
    );
}
