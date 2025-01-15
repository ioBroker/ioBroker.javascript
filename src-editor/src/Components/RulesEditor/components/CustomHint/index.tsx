import React, { useState } from 'react';

import { Fab, Tooltip } from '@mui/material';

import { HelpOutlineOutlined as HelpOutlineOutlinedIcon } from '@mui/icons-material';
import type { IobTheme } from '@iobroker/adapter-react-v5';

const styles: Record<string, any> = {
    tooltip: (theme: IobTheme): React.CSSProperties => ({
        backgroundColor: '#83469c9e',
        color: 'rgb(255 255 255 / 87%)',
        boxShadow: theme.shadows[1],
        fontSize: 11,
        border: '1px solid #920b9e',
    }),
};

interface CustomHintProps {
    children?: React.ReactNode;
}

const CustomHint = ({ children }: CustomHintProps): React.JSX.Element => {
    const [open, setOpen] = useState(false);
    return (
        <Tooltip
            sx={styles.tooltip}
            arrow
            placement="right"
            title={children}
            open={open}
            onClose={() => setOpen(false)}
            onOpen={() => setOpen(true)}
        >
            <Fab
                style={{
                    backgroundColor: '#994e9e7d',
                    boxShadow: 'none',
                    color: 'silver',
                    marginLeft: 10,
                    width: 20,
                    height: 20,
                    minHeight: 20,
                    marginBottom: 4,
                }}
                size="small"
                aria-label="like"
                onClick={() => setOpen(!open)}
            >
                <HelpOutlineOutlinedIcon />
            </Fab>
        </Tooltip>
    );
};

export default CustomHint;
