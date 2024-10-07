import React, { useState } from 'react';

import { Fab, Tooltip } from '@mui/material';

import { HelpOutlineOutlined as HelpOutlineOutlinedIcon } from '@mui/icons-material';

const styles = {
    tooltip: theme => ({
        backgroundColor: '#83469c9e',
        color: 'rgb(255 255 255 / 87%)',
        boxShadow: theme.shadows[1],
        fontSize: 11,
        border: '1px solid #920b9e'
    }),
};

const CustomHint = ({ children }) => {
    const [open, setOpen] = useState(false);
    return <Tooltip
        sx={styles.tooltip}
        arrow
        placement="right"
        title={children}
        interactive
        open={open}
        onClose={() => setOpen(false)}
        onOpen={() => setOpen(true)}>
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
}

CustomHint.defaultProps = {
    children: null
};

export default CustomHint;
