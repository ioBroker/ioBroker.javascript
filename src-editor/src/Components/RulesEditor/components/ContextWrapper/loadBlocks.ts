import { type AdminConnection, I18n } from '@iobroker/gui-components';

import { registerRemotes, loadRemote } from '@module-federation/runtime';

import ActionSayText from '../Blocks/ActionSayText';
import ActionPushover from '../Blocks/ActionPushover';
import ActionWhatsappcmb from '../Blocks/ActionWhatsappcmb';
import ActionPushsafer from '../Blocks/ActionPushsafer';
import StandardBlocks from '../StandardBlocks';
import { GenericBlock } from '../GenericBlock';

declare global {
    interface Window {
        /** The base class of the rule blocks, for the blocks that adapters bring along */
        GenericBlock: any;
    }
}

// must exist before the first block of an adapter is loaded
window.GenericBlock = GenericBlock;

const ADAPTERS: Record<string, typeof GenericBlock<any> | null> = {
    sayit: ActionSayText,
    pushover: ActionPushover,
    'whatsapp-cmb': ActionWhatsappcmb,
    pushsafer: ActionPushsafer,
};

/**
 * Collects the blocks of the Rules editor: the standard ones, those built in for some adapters and
 * those an adapter brings along itself (`common.javascriptRules`).
 *
 * This module is imported only when a rule is opened, so none of it is loaded with the editor.
 */
export default async function loadBlocks(socket: AdminConnection): Promise<(typeof GenericBlock<any>)[]> {
    const instances = await socket.getAdapterInstances();
    const adapters = Object.keys(ADAPTERS).filter(adapter => instances.find(obj => obj?.common?.name === adapter));

    const adapterDynamicBlocksArray: (typeof GenericBlock<any>)[] = [];

    // find all adapters, that have custom rule blocks
    const dynamicRules = instances.filter(obj => obj.common.javascriptRules);

    const alreadyCreated: string[] = [];
    for (const obj of dynamicRules) {
        if (alreadyCreated.includes(obj.common.name) || !obj.common.javascriptRules) {
            continue;
        }

        let url;
        if (obj.common.javascriptRules.url.startsWith('http:') || obj.common.javascriptRules.url.startsWith('https:')) {
            url = obj.common.javascriptRules.url;
        } else if (obj.common.javascriptRules.url.startsWith('./')) {
            url = `${window.location.protocol}//${window.location.host}${obj.common.javascriptRules.url.replace(/^\./, '')}`;
        } else {
            url = `${window.location.protocol}//${window.location.host}/adapter/${obj.common.name}/${obj.common.javascriptRules.url}`;
        }

        if (obj.common.javascriptRules.i18n === true) {
            // load i18n from files
            const pos: number = url.lastIndexOf('/');
            let i18nURL: string;
            if (pos !== -1) {
                i18nURL = url.substring(0, pos);
            } else {
                i18nURL = url;
            }
            const lang = I18n.getLanguage();
            const file = `${i18nURL}/i18n/${lang}.json`;

            await fetch(file)
                .then(data => data.json())
                .then(json => I18n.extendTranslations(json, lang))
                .catch(error => {
                    if (lang !== 'en') {
                        // try to load english
                        return fetch(`${i18nURL}/i18n/en.json`)
                            .then(data => data.json())
                            .then(json => I18n.extendTranslations(json, lang))
                            .catch(error => console.error(`Cannot load i18n "${file}": ${error}`));
                    }
                    console.log(`Cannot load i18n "${file}": ${error}`);
                });
        } else if (obj.common.javascriptRules.i18n && typeof obj.common.javascriptRules.i18n === 'object') {
            try {
                I18n.extendTranslations(obj.common.javascriptRules.i18n);
            } catch (error) {
                console.error(`Cannot import i18n for "${obj.common.javascriptRules.name}": ${error}`);
            }
        }

        try {
            registerRemotes(
                [
                    {
                        name: obj.common.javascriptRules.name,
                        entry: url,
                        type: obj.common.javascriptRules.type,
                    },
                ],
                // force: true // may be needed to side-load remotes after the fact.
            );
            const Component = (
                (await loadRemote(`${obj.common.javascriptRules.name}/${obj.common.javascriptRules.name}`)) as any
            ).default;

            if (Component) {
                adapterDynamicBlocksArray.push(Component);
                alreadyCreated.push(obj.common.name);
                ADAPTERS[obj.common.name] = null;
            }
        } catch (e) {
            console.error(`Cannot load component "${obj.common.javascriptRules.name}": ${e}`);
        }
    }

    const adapterBlocksArray: (typeof GenericBlock<any>)[] = adapters
        .filter(adapter => ADAPTERS[adapter])
        .map(adapter => ADAPTERS[adapter]) as (typeof GenericBlock<any>)[];

    return [...StandardBlocks, ...adapterBlocksArray, ...adapterDynamicBlocksArray];
}
