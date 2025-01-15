import { I18n } from '@iobroker/adapter-react-v5';
import { GenericBlock } from '../GenericBlock';
import type {
    RuleBlockConfigActionPrintText,
    RuleBlockDescription,
    RuleContext,
    GenericBlockProps,
} from '@iobroker/javascript-rules-dev';

class ActionPrintText extends GenericBlock<RuleBlockConfigActionPrintText> {
    constructor(props: GenericBlockProps<RuleBlockConfigActionPrintText>) {
        super(props, ActionPrintText.getStaticData());
    }

    static compile(config: RuleBlockConfigActionPrintText, context: RuleContext): string {
        return `// Log ${config.text}
\t\tconst subActionVar${config._id} = "${(config.text || '').replace(/"/g, '\\"')}"${GenericBlock.getReplacesInText(context)};
\t\t_sendToFrontEnd(${config._id}, {text: subActionVar${config._id}});
\t\tconsole.log(subActionVar${config._id});`;
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(debugMessage: { data: { text: string } }): string {
        return I18n.t('Log: %s', debugMessage.data.text);
    }

    onTagChange(): void {
        this.setState(
            {
                inputs: [
                    {
                        nameRender: 'renderModalInput',
                        attr: 'text',
                        defaultValue: 'My device triggered',
                        nameBlock: 'Log text',
                    },
                ],
            },
            () => super.onTagChange(),
        );
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'actions',
            name: 'Log text',
            id: 'ActionPrintText',
            icon: 'Subject',
            title: 'Print some text in log',
            helpDialog:
                'You can use %s in the text to display current trigger value or %id to display the triggered object ID',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return ActionPrintText.getStaticData();
    }
}

export default ActionPrintText;
