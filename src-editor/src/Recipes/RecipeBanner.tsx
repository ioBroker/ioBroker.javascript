/**
 * The line over the Blockly editor of a script made from a recipe: which recipe, whether there is a
 * newer version of it, and the actions update and detach.
 */
import React, { useEffect, useState } from 'react';

import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { Cancel as IconCancel, LinkOff as IconDetach, Update as IconUpdate } from '@mui/icons-material';

import { type AdminConnection, I18n } from '@iobroker/gui-components';

import './i18n';
import { loadCatalog } from './catalog';
import { i18nText, newerRecipe } from './logic';
import type { RecipeCatalogAnswer, ScriptRecipe } from './types';

interface RecipeBannerProps {
    socket: AdminConnection;
    instanceId: string;
    scriptId: string;
    info: ScriptRecipe;
    /** The script has changes that are not saved: an update would write over them */
    changed: boolean;
    onUpdate: () => void;
}

export default function RecipeBanner(props: RecipeBannerProps): React.JSX.Element {
    const lang = I18n.getLanguage();
    const [catalog, setCatalog] = useState<RecipeCatalogAnswer | null>(null);
    const [detaching, setDetaching] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        void loadCatalog(props.socket, props.instanceId).then(setCatalog);
    }, [props.socket, props.instanceId]);

    const newer = catalog ? newerRecipe(props.info, catalog.recipes) : null;
    const known = catalog?.recipes.find(item => item.id === props.info.id);
    const title = known ? i18nText(known.title, lang) : props.info.id;

    const detach = async (): Promise<void> => {
        try {
            const obj = (await props.socket.getObject(props.scriptId)) as ioBroker.ScriptObject;
            delete (obj.common as ioBroker.ScriptCommon & { recipe?: ScriptRecipe }).recipe;
            await props.socket.setObject(props.scriptId, obj);
            setDetaching(false);
        } catch (e) {
            setError(String(e));
        }
    };

    return (
        <>
            <Alert
                severity={newer ? 'info' : 'success'}
                variant="outlined"
                sx={{ py: 0, mx: 1, mb: 0.5, alignItems: 'center' }}
                action={
                    <>
                        {newer ? (
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<IconUpdate />}
                                disabled={props.changed}
                                title={props.changed ? I18n.t('recipe_save_first') : ''}
                                onClick={props.onUpdate}
                            >
                                {I18n.t('recipe_update_button')}
                            </Button>
                        ) : null}
                        <Button
                            size="small"
                            color="inherit"
                            startIcon={<IconDetach />}
                            onClick={() => setDetaching(true)}
                            sx={{ ml: 1 }}
                        >
                            {I18n.t('recipe_detach')}
                        </Button>
                    </>
                }
            >
                {newer
                    ? I18n.t('recipe_update_available', title, props.info.version, newer.version)
                    : I18n.t('recipe_made_from', title, props.info.version)}
            </Alert>
            {detaching ? (
                <Dialog
                    open
                    onClose={() => setDetaching(false)}
                >
                    <DialogTitle>{I18n.t('recipe_detach_title')}</DialogTitle>
                    <DialogContent>
                        {I18n.t('recipe_detach_text', title)}
                        {error ? <Alert severity="error">{error}</Alert> : null}
                    </DialogContent>
                    <DialogActions>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<IconDetach />}
                            onClick={() => void detach()}
                        >
                            {I18n.t('recipe_detach')}
                        </Button>
                        <Button
                            color="grey"
                            startIcon={<IconCancel />}
                            onClick={() => setDetaching(false)}
                        >
                            {I18n.t('Cancel')}
                        </Button>
                    </DialogActions>
                </Dialog>
            ) : null}
        </>
    );
}
