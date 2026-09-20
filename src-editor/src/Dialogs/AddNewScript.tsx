import React from 'react';

import {
    Box,
    Button,
    Card,
    CardActionArea,
    CardActions,
    CardContent,
    CardMedia,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material';

import { Cancel as IconCancel, OpenInNew as IconDoc } from '@mui/icons-material';

import { I18n } from '@iobroker/gui-components';

import type { ScriptType } from '@/types';
import ImgJS from '../assets/tileJS.png';
import ImgTS from '../assets/tileTS.png';
import ImgBlockly from '../assets/tileBlockly.png';
import ImgRules from '../assets/tileRules.png';
import ImgFbd from '../assets/tileFbd.svg';
import { preloadFbEditor } from '../FbEditor/preload';

/** One kind of script to choose from */
interface ScriptKind {
    type: ScriptType;
    title: string;
    /** How much one has to know for it */
    complexity: string;
    description: string;
    image: string;
    /** The file under `docs/<language>/`, and the languages it exists in */
    doc: string;
    docLanguages: string[];
    /** The editor of that kind is loaded while the mouse is on the tile */
    onHover?: () => void;
}

/** All tiles are the same picture size, so the tiles line up whatever their text is */
const IMAGE_RATIO = '500 / 244';

/** Under this the tiles wrap into more rows - five of them need about 1120 px */
const TILE_MIN_WIDTH = 200;

interface DialogAddNewProps {
    onClose: (type?: ScriptType) => void;
}

export default function DialogAddNew(props: DialogAddNewProps): React.JSX.Element {
    const language = I18n.getLanguage();

    const openDoc = (kind: ScriptKind): void => {
        const lang = kind.docLanguages.includes(language) ? language : 'en';
        window
            .open(`https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/${lang}/${kind.doc}`, '_blank')
            ?.focus();
    };

    const kinds: ScriptKind[] = [
        {
            type: 'Rules',
            title: 'Rules',
            complexity: I18n.t('easy'),
            description: I18n.t('Rules description'),
            image: ImgRules,
            doc: 'javascript.md',
            docLanguages: ['en', 'de'],
        },
        {
            type: 'Blockly',
            title: 'Blockly',
            complexity: I18n.t('normal'),
            description: I18n.t('Blockly description'),
            image: ImgBlockly,
            doc: 'blockly.md',
            docLanguages: ['en', 'de', 'ru'],
        },
        {
            type: 'FBD',
            title: I18n.t('fbd_title'),
            complexity: I18n.t('normal'),
            description: I18n.t('fbd_description'),
            image: ImgFbd,
            doc: 'fbd.md',
            docLanguages: ['en', 'de'],
            // whoever looks at it is likely to open the editor next
            onHover: preloadFbEditor,
        },
        {
            type: 'Javascript/js',
            title: 'JavaScript',
            complexity: I18n.t('for programmers'),
            description: I18n.t('JS description'),
            image: ImgJS,
            doc: 'javascript.md',
            docLanguages: ['en', 'de'],
        },
        {
            type: 'TypeScript/ts',
            title: 'TypeScript',
            complexity: I18n.t('for professionals'),
            description: I18n.t('TS description'),
            image: ImgTS,
            doc: 'javascript.md',
            docLanguages: ['en', 'de'],
        },
    ];

    return (
        <Dialog
            open
            onClose={() => false}
            maxWidth={false}
            fullWidth
            aria-labelledby="add-new-script-title"
            slotProps={{ paper: { sx: { width: `min(1500px, calc(100vw - 64px))` } } }}
        >
            <DialogTitle id="add-new-script-title">{I18n.t('Add new script')}</DialogTitle>
            <DialogContent>
                <Box
                    sx={{
                        display: 'grid',
                        // as many tiles in a row as fit - all five as long as there is room
                        gridTemplateColumns: `repeat(auto-fit, minmax(${TILE_MIN_WIDTH}px, 1fr))`,
                        gap: 2,
                        pt: 1,
                    }}
                >
                    {kinds.map(kind => (
                        <Card
                            key={kind.type}
                            onMouseEnter={kind.onHover}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                                '&:hover': { transform: 'translateY(-3px)', boxShadow: 6 },
                            }}
                        >
                            <CardActionArea
                                onClick={() => props.onClose(kind.type)}
                                sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                            >
                                <CardMedia
                                    image={kind.image}
                                    title={kind.title}
                                    sx={{ aspectRatio: IMAGE_RATIO, backgroundSize: 'cover' }}
                                />
                                <CardContent sx={{ flexGrow: 1, width: '100%', p: 1.5 }}>
                                    <Typography
                                        variant="h6"
                                        component="div"
                                        sx={{ lineHeight: 1.2 }}
                                    >
                                        {kind.title}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        component="div"
                                        color="primary"
                                        sx={{ fontWeight: 'bold', fontStyle: 'italic', mb: 0.5 }}
                                    >
                                        {kind.complexity}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        {kind.description}
                                    </Typography>
                                </CardContent>
                            </CardActionArea>
                            <CardActions sx={{ p: 1, pt: 0, gap: 1 }}>
                                <Button
                                    size="small"
                                    color="primary"
                                    variant="contained"
                                    onClick={() => props.onClose(kind.type)}
                                >
                                    {I18n.t('Add')}
                                </Button>
                                <Button
                                    size="small"
                                    color="grey"
                                    startIcon={<IconDoc />}
                                    title={I18n.t('Learn More')}
                                    onClick={() => openDoc(kind)}
                                    sx={{ minWidth: 0, textTransform: 'none' }}
                                >
                                    {I18n.t('Learn More')}
                                </Button>
                            </CardActions>
                        </Card>
                    ))}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button
                    color="grey"
                    onClick={() => props.onClose()}
                    startIcon={<IconCancel />}
                >
                    {I18n.t('Cancel')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
