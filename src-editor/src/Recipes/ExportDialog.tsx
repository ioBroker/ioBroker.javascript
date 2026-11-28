/**
 * "Export as recipe": choose which IDs of a Blockly script become inputs and download the recipe.
 */
import React, { useEffect, useMemo, useState } from 'react';

import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    LinearProgress,
    Link,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { Cancel as IconCancel, Download as IconDownload } from '@mui/icons-material';

import { type AdminConnection, I18n } from '@iobroker/gui-components';

import './i18n';
import { loadCatalog } from './catalog';
import { loadObjects } from './devices';
import { buildRecipe, checkItems, hasBraces, recipeId, suggestItems, type ExportItem } from './exportRecipe';

interface ExportDialogProps {
    socket: AdminConnection;
    instanceId: string;
    /** The Blockly XML of the script */
    xml: string;
    scriptName: string;
    onClose: () => void;
}

export default function ExportDialog(props: ExportDialogProps): React.JSX.Element {
    const lang = I18n.getLanguage();
    const [items, setItems] = useState<ExportItem[] | null>(null);
    const [error, setError] = useState('');
    const [version, setVersion] = useState('8.0.0');
    const [titleEn, setTitleEn] = useState(props.scriptName);
    const [titleDe, setTitleDe] = useState(props.scriptName);
    const [id, setId] = useState('');
    const [descriptionEn, setDescriptionEn] = useState('');
    const [descriptionDe, setDescriptionDe] = useState('');
    const [author, setAuthor] = useState('');

    useEffect(() => {
        loadObjects(props.socket)
            .then(objects => setItems(suggestItems(props.xml, objects, lang)))
            .catch((e: unknown) => setError(String(e)));
        void loadCatalog(props.socket, props.instanceId).then(answer => answer.version && setVersion(answer.version));
    }, [props.socket, props.instanceId, props.xml, lang]);

    const recipeIdValue = id || recipeId(titleEn);
    const problems = useMemo(() => {
        const list = items ? checkItems(items) : [];
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(recipeIdValue)) {
            list.push(I18n.t('recipe_export_bad_id'));
        }
        if (!titleEn.trim() || !titleDe.trim() || !descriptionEn.trim() || !descriptionDe.trim()) {
            list.push(I18n.t('recipe_export_texts'));
        }
        if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(author)) {
            list.push(I18n.t('recipe_export_author'));
        }
        return list;
    }, [items, recipeIdValue, titleEn, titleDe, descriptionEn, descriptionDe, author]);

    const change = (index: number, patch: Partial<ExportItem>): void =>
        setItems(items!.map((item, i) => (i === index ? { ...item, ...patch } : item)));

    const download = (): void => {
        const recipe = buildRecipe(props.xml, items || [], {
            id: recipeIdValue,
            title: { en: titleEn.trim(), de: titleDe.trim() },
            description: { en: descriptionEn.trim(), de: descriptionDe.trim() },
            author,
            minJavascript: version.replace(/-.*$/, ''),
        });
        const blob = new Blob([`${JSON.stringify(recipe, null, 4)}\n`], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${recipeIdValue}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    return (
        <Dialog
            open
            onClose={() => false}
            maxWidth="lg"
            fullWidth
        >
            <DialogTitle>{I18n.t('recipe_export_title')}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="body2">
                    {I18n.t('recipe_export_info')}{' '}
                    <Link
                        href="https://github.com/ioBroker/ioBroker.recipes/blob/main/CONTRIBUTING.md"
                        target="_blank"
                        rel="noreferrer"
                    >
                        CONTRIBUTING.md
                    </Link>
                </Typography>
                {hasBraces(props.xml) ? <Alert severity="error">{I18n.t('recipe_export_braces')}</Alert> : null}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField
                        variant="standard"
                        label={I18n.t('recipe_export_title_en')}
                        value={titleEn}
                        onChange={e => setTitleEn(e.target.value)}
                    />
                    <TextField
                        variant="standard"
                        label={I18n.t('recipe_export_title_de')}
                        value={titleDe}
                        onChange={e => setTitleDe(e.target.value)}
                    />
                    <TextField
                        variant="standard"
                        label={I18n.t('recipe_export_description_en')}
                        multiline
                        value={descriptionEn}
                        onChange={e => setDescriptionEn(e.target.value)}
                    />
                    <TextField
                        variant="standard"
                        label={I18n.t('recipe_export_description_de')}
                        multiline
                        value={descriptionDe}
                        onChange={e => setDescriptionDe(e.target.value)}
                    />
                    <TextField
                        variant="standard"
                        label={I18n.t('recipe_export_id')}
                        value={recipeIdValue}
                        onChange={e => setId(e.target.value)}
                        helperText={`recipes/${recipeIdValue}.json`}
                    />
                    <TextField
                        variant="standard"
                        label={I18n.t('recipe_export_author_label')}
                        value={author}
                        onChange={e => setAuthor(e.target.value.trim())}
                    />
                </Box>
                <Typography variant="subtitle2">{I18n.t('recipe_export_ids')}</Typography>
                {error ? <Alert severity="error">{error}</Alert> : null}
                {!items && !error ? <LinearProgress /> : null}
                {items && !items.length ? (
                    <Typography sx={{ color: 'text.secondary' }}>{I18n.t('recipe_export_no_ids')}</Typography>
                ) : null}
                {items?.length ? (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox">{I18n.t('recipe_export_input')}</TableCell>
                                <TableCell>{I18n.t('recipe_export_state')}</TableCell>
                                <TableCell>{I18n.t('recipe_export_becomes')}</TableCell>
                                <TableCell>{I18n.t('recipe_export_input_name')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {items.map((item, index) => (
                                <TableRow key={item.id}>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={item.use}
                                            onChange={e => change(index, { use: e.target.checked })}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div>{item.name}</div>
                                        <Typography
                                            variant="caption"
                                            sx={{ color: 'text.secondary' }}
                                        >
                                            {item.id}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        {item.device ? (
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    gap: 0.5,
                                                    alignItems: 'center',
                                                    flexWrap: 'wrap',
                                                }}
                                            >
                                                <Chip
                                                    size="small"
                                                    color={item.kind === 'device' ? 'primary' : 'default'}
                                                    label={`${I18n.t('recipe_export_device')} ${item.device.type}.${item.device.state}`}
                                                    onClick={() => change(index, { kind: 'device' })}
                                                />
                                                <Chip
                                                    size="small"
                                                    color={item.kind === 'state' ? 'primary' : 'default'}
                                                    label={I18n.t('recipe_export_as_state')}
                                                    onClick={() => change(index, { kind: 'state' })}
                                                />
                                            </Box>
                                        ) : (
                                            <Chip
                                                size="small"
                                                label={`${I18n.t('recipe_export_as_state')}${item.role ? ` (${item.role})` : ''}`}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            variant="standard"
                                            value={item.input}
                                            disabled={!item.use}
                                            onChange={e => change(index, { input: e.target.value.trim() })}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : null}
                {problems.length ? (
                    <Alert severity="warning">
                        {problems.map(problem => (
                            <div key={problem}>{problem}</div>
                        ))}
                    </Alert>
                ) : null}
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<IconDownload />}
                    disabled={!items || !!problems.length || hasBraces(props.xml)}
                    onClick={download}
                >
                    {I18n.t('recipe_export_download')}
                </Button>
                <Button
                    color="grey"
                    startIcon={<IconCancel />}
                    onClick={props.onClose}
                >
                    {I18n.t('Cancel')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
