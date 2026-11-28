/**
 * Recipes: choose one from the catalog, assign the own devices, check the script and create it. The
 * same dialog updates a script made from a recipe to a newer version of it.
 */
import React, { Suspense, useEffect, useMemo, useState } from 'react';

import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    InputAdornment,
    LinearProgress,
    List,
    ListItemButton,
    ListItemText,
    Step,
    StepLabel,
    Stepper,
    TextField,
    Typography,
} from '@mui/material';
import {
    ArrowBack as IconBack,
    ArrowForward as IconNext,
    Cancel as IconCancel,
    Check as IconOk,
    ExpandMore as IconExpand,
    Refresh as IconReload,
    Search as IconSearch,
    Update as IconUpdate,
} from '@mui/icons-material';

import { type AdminConnection, I18n, type IobTheme, type ThemeType } from '@iobroker/gui-components';

import './i18n';
import AiBlocklyPreview from '../AiChat/AiBlocklyPreview';
import { generateBlockly, prepareBlockly } from './blockly';
import { loadCatalog } from './catalog';
import { findDevices, loadObjects, resolveDevice, type FoundDevice, type ObjectMap } from './devices';
import InputField from './InputField';
import {
    blocklySource,
    defaultValues,
    hasLocalChanges,
    i18nText,
    javascriptOf,
    missingInputs,
    paramsOf,
    planUpdate,
    RECIPE_FOLDER,
    recipeScriptId,
    sampleValues,
    sourceHash,
} from './logic';
import { renderTemplate } from './template';
import type { Recipe, RecipeCatalogAnswer, RecipeDevice, RecipeValue, ScriptRecipe } from './types';

const MonacoDiff = React.lazy(() => import('../Components/MonacoDiff'));

type StepName = 'choose' | 'inputs' | 'check';

export interface RecipeDialogProps {
    socket: AdminConnection;
    theme: IobTheme;
    themeType: ThemeType;
    /** The javascript instance, like system.adapter.javascript.0 */
    instanceId: string;
    /** IDs of the scripts and folders there are */
    existingIds: string[];
    /** Update this script to the newest version of its recipe */
    update?: { id: string; common: ioBroker.ScriptCommon & { recipe: ScriptRecipe } };
    /** With the ID of the script that was created or updated, and its new source */
    onClose: (scriptId?: string, source?: string) => void;
}

interface Generated {
    xml: string;
    source: string;
    error?: string;
}

/** A name that no script has yet */
function uniqueName(title: string, existingIds: string[]): string {
    let name = title;
    for (let i = 2; existingIds.includes(recipeScriptId(name)); i++) {
        name = `${title} ${i}`;
    }
    return name;
}

function matches(recipe: Recipe, search: string, tag: string, lang: ioBroker.Languages): boolean {
    if (tag && !(recipe.tags || []).includes(tag)) {
        return false;
    }
    if (!search) {
        return true;
    }
    const text = [
        i18nText(recipe.title, lang),
        i18nText(recipe.description, lang),
        i18nText(recipe.title, 'en'),
        recipe.id,
        ...(recipe.tags || []),
    ]
        .join(' ')
        .toLowerCase();
    return search
        .toLowerCase()
        .split(/\s+/)
        .every(word => text.includes(word));
}

export default function RecipeDialog(props: RecipeDialogProps): React.JSX.Element {
    const lang = I18n.getLanguage();
    const updating = !!props.update;
    const steps: StepName[] = updating ? ['inputs', 'check'] : ['choose', 'inputs', 'check'];

    const [step, setStep] = useState<StepName>(steps[0]);
    const [blocklyReady, setBlocklyReady] = useState(false);
    const [catalog, setCatalog] = useState<RecipeCatalogAnswer | null>(null);
    const [reloading, setReloading] = useState(false);
    const [objects, setObjects] = useState<ObjectMap | null>(null);
    const [fatal, setFatal] = useState('');

    const [search, setSearch] = useState('');
    const [tag, setTag] = useState('');
    const [recipe, setRecipe] = useState<Recipe | null>(null);

    const [values, setValues] = useState<Record<string, RecipeValue>>({});
    /** Inputs the user has to look at again: new in this version, or their device is gone */
    const [ask, setAsk] = useState<Record<string, string>>({});
    const [name, setName] = useState('');
    const [enabled, setEnabled] = useState(true);
    const [busy, setBusy] = useState(false);
    const [saveError, setSaveError] = useState('');

    // Blockly and the catalog are needed from the start: the first step shows a preview
    useEffect(() => {
        if (!props.instanceId) {
            // the catalog comes from the adapter, and only a running one answers
            setFatal(I18n.t('recipe_no_instance'));
            return;
        }
        prepareBlockly(props.socket)
            .then(() => setBlocklyReady(true))
            .catch((error: unknown) => setFatal(`${I18n.t('Cannot load the blocks')}: ${error as Error}`));
        void loadCatalog(props.socket, props.instanceId).then(setCatalog);
    }, [props.socket, props.instanceId]);

    // the objects for the devices, as soon as one is to be chosen
    useEffect(() => {
        if (step !== 'choose' && !objects) {
            loadObjects(props.socket)
                .then(setObjects)
                .catch((error: unknown) => setFatal(String(error)));
        }
    }, [step, objects, props.socket]);

    // updating: the newest version of the recipe, with the stored params
    useEffect(() => {
        if (!props.update || !catalog || !objects || recipe) {
            return;
        }
        const info = props.update.common.recipe;
        const newest = catalog.recipes.find(item => item.id === info.id);
        if (!newest) {
            setFatal(I18n.t('recipe_not_in_catalog', info.id));
            return;
        }
        const plan = planUpdate(newest, info.params || {}, lang);
        const newValues = { ...plan.values };
        const toAsk: Record<string, string> = {};
        for (const inputName of plan.ask) {
            toAsk[inputName] =
                info.params?.[inputName] === undefined ? I18n.t('recipe_new_input') : I18n.t('recipe_param_invalid');
        }
        for (const [inputName, ids] of Object.entries(plan.devices)) {
            if (Array.isArray(ids)) {
                const devices = ids.map(id => resolveDevice(objects, newest, inputName, id, lang));
                newValues[inputName] = devices.filter(Boolean) as RecipeDevice[];
                if (devices.some(device => !device)) {
                    toAsk[inputName] = I18n.t('recipe_device_gone', ids.filter((_id, i) => !devices[i]).join(', '));
                }
            } else {
                const device = resolveDevice(objects, newest, inputName, ids, lang);
                newValues[inputName] = device || undefined;
                if (!device) {
                    toAsk[inputName] = I18n.t('recipe_device_gone', ids);
                }
            }
        }
        setRecipe(newest);
        setValues(newValues);
        setAsk(toAsk);
    }, [props.update, catalog, objects, recipe, lang]);

    const tags = useMemo(
        () => [...new Set((catalog?.recipes || []).flatMap(item => item.tags || []))].sort(),
        [catalog],
    );
    const shown = useMemo(
        () => (catalog?.recipes || []).filter(item => matches(item, search, tag, lang)),
        [catalog, search, tag, lang],
    );

    // the devices that fit each device input
    const devices = useMemo(() => {
        const result: Record<string, FoundDevice[]> = {};
        if (recipe && objects) {
            for (const [inputName, input] of Object.entries(recipe.inputs)) {
                if (input.type === 'device') {
                    result[inputName] = findDevices(objects, recipe, inputName, lang);
                }
            }
        }
        return result;
    }, [recipe, objects, lang]);

    const preview = useMemo(() => {
        if (!recipe || !blocklyReady || step !== 'choose') {
            return '';
        }
        try {
            return renderTemplate(recipe.blockly, recipe.inputs, sampleValues(recipe, lang));
        } catch (error) {
            return `<!-- ${String(error)} -->`;
        }
    }, [recipe, blocklyReady, step, lang]);

    const generated: Generated | null = useMemo(() => {
        if (!recipe || !blocklyReady || step !== 'check' || !objects) {
            return null;
        }
        try {
            const xml = renderTemplate(recipe.blockly, recipe.inputs, values);
            const result = generateBlockly(xml, objects);
            return { xml: result.xml, source: blocklySource(result.js, result.xml) };
        } catch (error) {
            return { xml: '', source: '', error: error instanceof Error ? error.message : String(error) };
        }
    }, [recipe, blocklyReady, step, values, objects]);

    const choose = (item: Recipe): void => {
        setRecipe(item);
        setValues(defaultValues(item, lang));
        setAsk({});
        setName(uniqueName(i18nText(item.title, lang), props.existingIds));
    };

    const missing = recipe ? missingInputs(recipe, values) : [];
    const scriptId = recipeScriptId(name);
    const nameError = updating
        ? ''
        : !name.trim()
          ? I18n.t('recipe_name_empty')
          : props.existingIds.includes(scriptId)
            ? I18n.t('recipe_name_exists')
            : '';

    const save = async (): Promise<void> => {
        if (!recipe || !generated || generated.error) {
            return;
        }
        setBusy(true);
        setSaveError('');
        const info: ScriptRecipe = {
            id: recipe.id,
            version: recipe.version,
            params: paramsOf(recipe, values),
            hash: sourceHash(generated.source),
        };
        try {
            if (props.update) {
                const obj = (await props.socket.getObject(props.update.id)) as ioBroker.ScriptObject;
                obj.common.source = generated.source;
                (obj.common as ioBroker.ScriptCommon & { recipe: ScriptRecipe }).recipe = info;
                await props.socket.setObject(props.update.id, obj);
                props.onClose(props.update.id, generated.source);
            } else {
                if (!(await props.socket.getObject(RECIPE_FOLDER))) {
                    await props.socket.setObject(RECIPE_FOLDER, {
                        _id: RECIPE_FOLDER,
                        type: 'channel',
                        common: { name: 'Rezepte', expert: true },
                        native: {},
                    });
                }
                const instance = props.instanceId.split('.').pop();
                await props.socket.setObject(scriptId, {
                    _id: scriptId,
                    type: 'script',
                    common: {
                        name: name.trim(),
                        expert: true,
                        engineType: 'Blockly',
                        enabled,
                        engine: `system.adapter.javascript.${instance}`,
                        source: generated.source,
                        debug: false,
                        verbose: false,
                        recipe: info,
                    } as ioBroker.ScriptCommon,
                    native: {},
                });
                props.onClose(scriptId, generated.source);
            }
        } catch (error) {
            setSaveError(String(error));
            setBusy(false);
        }
    };

    const reload = (): void => {
        setReloading(true);
        void loadCatalog(props.socket, props.instanceId, true).then(answer => {
            setCatalog(answer);
            setReloading(false);
        });
    };

    const renderCatalogState = (): React.JSX.Element | null => {
        if (!catalog) {
            return null;
        }
        if (catalog.error && !catalog.recipes.length) {
            return <Alert severity="error">{`${I18n.t('recipe_catalog_error')}: ${catalog.error}`}</Alert>;
        }
        if (catalog.fromCache) {
            return (
                <Alert severity="warning">
                    {I18n.t('recipe_catalog_offline', catalog.loaded ? new Date(catalog.loaded).toLocaleString() : '?')}
                </Alert>
            );
        }
        return null;
    };

    const renderChoose = (): React.JSX.Element => (
        <Box sx={{ display: 'flex', gap: 2, height: '100%', minHeight: 0 }}>
            <Box sx={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 1 }}>
                <TextField
                    variant="standard"
                    placeholder={I18n.t('recipe_search')}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <IconSearch fontSize="small" />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        title={I18n.t('recipe_reload')}
                                        disabled={reloading}
                                        onClick={reload}
                                    >
                                        <IconReload fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        },
                    }}
                />
                {tags.length ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {tags.map(item => (
                            <Chip
                                key={item}
                                size="small"
                                label={item}
                                color={tag === item ? 'primary' : 'default'}
                                onClick={() => setTag(tag === item ? '' : item)}
                            />
                        ))}
                    </Box>
                ) : null}
                {renderCatalogState()}
                {!catalog || reloading ? <LinearProgress /> : null}
                <List
                    dense
                    sx={{ overflow: 'auto', flex: 1 }}
                >
                    {shown.map(item => (
                        <ListItemButton
                            key={item.id}
                            selected={recipe?.id === item.id}
                            onClick={() => choose(item)}
                            onDoubleClick={() => {
                                choose(item);
                                setStep('inputs');
                            }}
                        >
                            <ListItemText
                                primary={i18nText(item.title, lang)}
                                secondary={i18nText(item.description, lang)}
                                slotProps={{
                                    secondary: {
                                        sx: {
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            // the selected entry has a strong background in some themes
                                            ...(recipe?.id === item.id ? { color: 'inherit', opacity: 0.85 } : null),
                                        },
                                    },
                                }}
                            />
                        </ListItemButton>
                    ))}
                    {catalog && !shown.length && catalog.recipes.length ? (
                        <Typography
                            variant="body2"
                            sx={{ p: 2, color: 'text.secondary' }}
                        >
                            {I18n.t('recipe_nothing_found')}
                        </Typography>
                    ) : null}
                </List>
                {catalog?.hidden ? (
                    <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary' }}
                    >
                        {I18n.t('recipe_hidden', catalog.hidden)}
                    </Typography>
                ) : null}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
                {recipe ? (
                    <>
                        <Typography variant="h6">{i18nText(recipe.title, lang)}</Typography>
                        <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary' }}
                        >
                            {`${I18n.t('recipe_version')} ${recipe.version} · ${I18n.t('recipe_author')} ${recipe.author}`}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{ my: 1 }}
                        >
                            {i18nText(recipe.description, lang)}
                        </Typography>
                        <Typography variant="subtitle2">{I18n.t('recipe_inputs')}</Typography>
                        <Box
                            component="ul"
                            sx={{ mt: 0.5, pl: 3 }}
                        >
                            {Object.entries(recipe.inputs).map(([inputName, input]) => (
                                <Typography
                                    component="li"
                                    variant="body2"
                                    key={inputName}
                                >
                                    {i18nText(input.title, lang) || inputName}
                                    {input.optional ? ` (${I18n.t('recipe_optional')})` : ''}
                                </Typography>
                            ))}
                        </Box>
                        <Typography
                            variant="subtitle2"
                            sx={{ mb: 0.5 }}
                        >
                            {I18n.t('recipe_preview')}
                        </Typography>
                        {preview ? <AiBlocklyPreview xml={preview} /> : <LinearProgress />}
                    </>
                ) : (
                    <Typography sx={{ color: 'text.secondary', p: 2 }}>{I18n.t('recipe_choose_hint')}</Typography>
                )}
            </Box>
        </Box>
    );

    const renderInputs = (): React.JSX.Element | null => {
        if (!recipe || !objects) {
            return <LinearProgress />;
        }
        return (
            <Box sx={{ maxWidth: 760, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Typography variant="h6">{i18nText(recipe.title, lang)}</Typography>
                {updating ? (
                    <Alert severity="info">
                        {I18n.t('recipe_update_info', props.update!.common.recipe.version, recipe.version)}
                    </Alert>
                ) : (
                    <TextField
                        variant="standard"
                        label={I18n.t('recipe_script_name')}
                        value={name}
                        error={!!nameError}
                        helperText={nameError || scriptId}
                        onChange={e => setName(e.target.value)}
                    />
                )}
                {Object.entries(recipe.inputs).map(([inputName, input]) => (
                    <InputField
                        key={inputName}
                        name={inputName}
                        input={input}
                        value={values[inputName]}
                        devices={devices[inputName]}
                        error={ask[inputName]}
                        socket={props.socket}
                        theme={props.theme}
                        lang={lang}
                        onChange={value => {
                            setValues({ ...values, [inputName]: value });
                            if (ask[inputName]) {
                                const rest = { ...ask };
                                delete rest[inputName];
                                setAsk(rest);
                            }
                        }}
                    />
                ))}
            </Box>
        );
    };

    const renderCheck = (): React.JSX.Element => {
        if (!generated) {
            return <LinearProgress />;
        }
        if (generated.error) {
            return <Alert severity="error">{`${I18n.t('recipe_render_error')}: ${generated.error}`}</Alert>;
        }
        const oldSource = props.update?.common.source || '';
        const localChanges = props.update ? hasLocalChanges(oldSource, props.update.common.recipe) : false;
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%', minHeight: 0 }}>
                {updating ? (
                    <>
                        {localChanges ? (
                            <Alert severity="warning">{I18n.t('recipe_local_changes')}</Alert>
                        ) : (
                            <Alert severity="info">{I18n.t('recipe_diff_info')}</Alert>
                        )}
                        <Box sx={{ display: 'flex', flex: 1, minHeight: 300 }}>
                            <Suspense fallback={<LinearProgress />}>
                                <MonacoDiff
                                    originalCode={javascriptOf(oldSource)}
                                    modifiedCode={javascriptOf(generated.source)}
                                    language="javascript"
                                    themeType={props.themeType}
                                    readOnly
                                    navigation
                                    wordWrap
                                />
                            </Suspense>
                        </Box>
                    </>
                ) : (
                    <>
                        <AiBlocklyPreview xml={generated.xml} />
                        <Accordion disableGutters>
                            <AccordionSummary expandIcon={<IconExpand />}>
                                <Typography variant="body2">{I18n.t('recipe_show_js')}</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Box
                                    component="pre"
                                    sx={{ m: 0, fontSize: 12, overflow: 'auto', maxHeight: 300 }}
                                >
                                    {javascriptOf(generated.source)}
                                </Box>
                            </AccordionDetails>
                        </Accordion>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={enabled}
                                    onChange={e => setEnabled(e.target.checked)}
                                />
                            }
                            label={I18n.t('recipe_start_now')}
                        />
                        <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary' }}
                        >
                            {I18n.t('recipe_created_as', scriptId)}
                        </Typography>
                    </>
                )}
                {saveError ? <Alert severity="error">{saveError}</Alert> : null}
            </Box>
        );
    };

    const index = steps.indexOf(step);
    const canNext =
        step === 'choose'
            ? !!recipe
            : step === 'inputs'
              ? !!recipe && !!objects && !missing.length && !nameError && !Object.keys(ask).length
              : false;

    return (
        <Dialog
            open
            onClose={() => false}
            maxWidth={false}
            fullWidth
            slotProps={{ paper: { sx: { width: 'min(1400px, calc(100vw - 64px))', height: 'calc(100vh - 64px)' } } }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flex: 1 }}>{updating ? I18n.t('recipe_update_title') : I18n.t('recipe_title')}</Box>
                <Stepper
                    activeStep={index}
                    sx={{ flex: 2 }}
                >
                    {steps.map(item => (
                        <Step key={item}>
                            <StepLabel>{I18n.t(`recipe_step_${item}`)}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {fatal ? <Alert severity="error">{fatal}</Alert> : null}
                {!fatal ? (
                    <Box sx={{ flex: 1, minHeight: 0, pt: 1 }}>
                        {step === 'choose' ? renderChoose() : step === 'inputs' ? renderInputs() : renderCheck()}
                    </Box>
                ) : null}
            </DialogContent>
            <DialogActions>
                {step === 'inputs' && missing.length ? (
                    <Typography
                        variant="caption"
                        sx={{ flex: 1, ml: 2, color: 'text.secondary' }}
                    >
                        {I18n.t(
                            'recipe_missing',
                            missing.map(item => i18nText(recipe?.inputs[item].title, lang) || item).join(', '),
                        )}
                    </Typography>
                ) : null}
                {index > 0 ? (
                    <Button
                        color="grey"
                        startIcon={<IconBack />}
                        disabled={busy}
                        onClick={() => setStep(steps[index - 1])}
                    >
                        {I18n.t('recipe_back')}
                    </Button>
                ) : null}
                {step !== 'check' ? (
                    <Button
                        variant="contained"
                        color="primary"
                        endIcon={<IconNext />}
                        disabled={!canNext || !!fatal}
                        onClick={() => setStep(steps[index + 1])}
                    >
                        {I18n.t('recipe_next')}
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={busy ? <CircularProgress size={16} /> : updating ? <IconUpdate /> : <IconOk />}
                        disabled={busy || !generated || !!generated.error}
                        onClick={() => void save()}
                    >
                        {updating ? I18n.t('recipe_do_update') : I18n.t('recipe_create')}
                    </Button>
                )}
                <Button
                    color="grey"
                    startIcon={<IconCancel />}
                    disabled={busy}
                    onClick={() => props.onClose()}
                >
                    {I18n.t('Cancel')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
