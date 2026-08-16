import { I18n } from '@iobroker/gui-components';

import { GenericBlock, type RuleBlockSummary } from '../GenericBlock';
import { STANDARD_FUNCTION_FILE, STANDARD_FUNCTION_FILE_ONCHANGE } from '../../helpers/Compile';
import type {
    RuleBlockConfig,
    RuleBlockDescription,
    RuleContext,
    RuleTagCardTitle,
    GenericBlockProps,
} from '@iobroker/javascript-rules-dev';

interface RuleBlockConfigTriggerFile extends RuleBlockConfig {
    /** The object whose files are watched, e.g. `vis.0` - not `id`, which the rule uses for the block type */
    fileId: string;
    /** File name pattern inside that object, e.g. `main/*` */
    filePattern: string;
}

/**
 * Starts the rule when a file changes - a new camera image, an edited vis project, a written export.
 *
 * Both the object and the file name may contain `*`; the sandbox turns either into a regular
 * expression. The file *content* is deliberately not requested: a rule cannot do anything with it,
 * and asking for it would read every changed file from disk for nothing.
 *
 * The file name is available to the text of every action as `%s`, the object as `%id`.
 */
export default class TriggerFile extends GenericBlock<RuleBlockConfigTriggerFile> {
    constructor(props: GenericBlockProps<RuleBlockConfigTriggerFile>) {
        super(props, TriggerFile.getStaticData());
    }

    static compile(config: RuleBlockConfigTriggerFile, context: RuleContext): string {
        if (!config.fileId) {
            return `// no object for the file subscription defined
_sendToFrontEnd(${config._id}, {fileName: 'No object defined'});`;
        }

        let func = context.justCheck ? STANDARD_FUNCTION_FILE : STANDARD_FUNCTION_FILE_ONCHANGE;
        func = func.replace(
            '"__%%DEBUG_TRIGGER%%__"',
            `_sendToFrontEnd(${config._id}, {fileName: fileName, size: size})`,
        );

        // `false`: no file content, see the class comment
        return `onFile(${JSON.stringify(config.fileId)}, ${JSON.stringify(config.filePattern || '*')}, false, ${func});`;
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(debugMessage: { data: { fileName: string; size?: number | null } }): string {
        // the sandbox reports a deleted file with size === null, which is the only way to tell it apart
        const what = debugMessage.data.size === null ? 'Deleted:' : 'File changed:';
        return `${I18n.t(what)} ${debugMessage.data.fileName}`;
    }

    getSummary(): RuleBlockSummary | null {
        const { fileId, filePattern } = this.state.settings;
        if (!fileId) {
            return null;
        }
        return { kicker: I18n.t('File'), title: `${fileId}/${filePattern || '*'}` };
    }

    onTagChange(tagCard?: RuleTagCardTitle): void {
        this.setState(
            {
                inputs: [
                    {
                        nameRender: 'renderText',
                        attr: 'fileId',
                        frontText: 'Files of:',
                        defaultValue: 'vis.0',
                    },
                    {
                        nameRender: 'renderText',
                        attr: 'filePattern',
                        frontText: 'File name:',
                        defaultValue: 'main/*',
                    },
                ],
            },
            () => super.onTagChange(tagCard),
        );
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'triggers',
            name: 'On file change',
            id: 'TriggerFile',
            icon: 'InsertDriveFile',
            title: 'Triggers the rule when a file of an object is written or deleted',
            helpDialog:
                'Both fields may contain *, e.g. the object "vis.0" and the file name "main/*". In the texts of the actions %s is the name of the changed file and %id the object it belongs to. Requires js-controller 4.1 or newer.',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return TriggerFile.getStaticData();
    }
}
