import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { IobTheme } from '@iobroker/gui-components';

import { getBlocklyTheme } from '../Components/blocklyTheme';

interface AiBlocklyPreviewProps {
    xml: string;
}

const AiBlocklyPreview: React.FC<AiBlocklyPreviewProps> = ({ xml }) => {
    // The preview paints its workspace in the colours of the admin, so it needs the whole palette
    // and not just the theme type the chat panel used to pass down - the `ThemeProvider` of
    // `App.tsx` has it.
    const theme = useTheme<IobTheme>();
    const containerRef = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<any>(null);
    const [dynamicHeight, setDynamicHeight] = useState(60);
    const resizePending = useRef(false);

    useEffect(() => {
        if (resizePending.current) {
            resizePending.current = false;
            requestAnimationFrame(() => {
                const Blockly = (window as any).Blockly;
                const ws = workspaceRef.current;
                if (Blockly && ws) {
                    Blockly.svgResize(ws);
                    ws.scrollCenter();
                }
            });
        }
    }, [dynamicHeight]);

    useEffect(() => {
        const Blockly = (window as any).Blockly;
        if (!Blockly || !containerRef.current) {
            return;
        }

        if (workspaceRef.current) {
            workspaceRef.current.dispose();
            workspaceRef.current = null;
        }

        try {
            const workspace = Blockly.inject(containerRef.current, {
                readOnly: true,
                toolbox: null as any,
                trashcan: false,
                zoom: { controls: false, wheel: false, startScale: 1.0 },
                move: { scrollbars: false, drag: false, wheel: false },
                sounds: false,
                renderer: 'thrasos',
                theme: getBlocklyTheme(theme),
                media: 'google-blockly/media/',
            });

            workspaceRef.current = workspace;

            let fullXml = xml.trim();
            if (!fullXml.startsWith('<xml')) {
                fullXml = `<xml xmlns="https://developers.google.com/blockly/xml">${fullXml}</xml>`;
            }

            const dom = Blockly.utils.xml.textToDom(fullXml);

            // Auto-arrange top-level blocks vertically so they don't overlap
            // AI-generated blocks often all have x="0" y="0"
            let yOffset = 10;
            const topBlocks: Element[] = Array.from(dom.querySelectorAll(':scope > block'));
            for (const block of topBlocks) {
                block.setAttribute('x', '10');
                block.setAttribute('y', String(yOffset));
                yOffset += 200; // rough estimate, will be refined after render
            }

            Blockly.Xml.domToWorkspace(dom, workspace);

            // Refine layout: stack blocks with actual measured heights
            const allTopBlocks = workspace.getTopBlocks(false);
            if (allTopBlocks.length > 1) {
                let currentY = 10;
                for (const block of allTopBlocks) {
                    const pos = block.getRelativeToSurfaceXY();
                    block.moveBy(10 - pos.x, currentY - pos.y);
                    currentY += block.getHeightWidth().height + 20;
                }
            }

            // Measure content bounding box
            const metrics = workspace.getBlocksBoundingBox();
            if (metrics) {
                const contentHeight = metrics.bottom - metrics.top + 20;
                const newHeight = Math.max(60, Math.ceil(contentHeight));
                resizePending.current = true;
                setDynamicHeight(newHeight);
            }
        } catch {
            // Rendering failed — ignore, preview is non-critical
        }

        return () => {
            if (workspaceRef.current) {
                workspaceRef.current.dispose();
                workspaceRef.current = null;
            }
        };
    }, [xml, theme]);

    return (
        <Box
            ref={containerRef}
            sx={{
                width: '100%',
                height: dynamicHeight,
                minHeight: 60,
                borderRadius: 1,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
            }}
        />
    );
};

export default AiBlocklyPreview;
