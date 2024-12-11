import { GenericBlock, type GenericBlockProps } from '../GenericBlock';
import type {
    RuleBlockConfigActionHTTPCall,
    RuleBlockDescription,
    RuleContext,
    RuleTagCardTitle,
} from '@/Components/RulesEditor/types';

class ActionHTTPCall extends GenericBlock<RuleBlockConfigActionHTTPCall> {
    constructor(props: GenericBlockProps<RuleBlockConfigActionHTTPCall>) {
        super(props, ActionHTTPCall.getStaticData());
    }

    static compile(config: RuleBlockConfigActionHTTPCall, context: RuleContext): string {
        return `// HTTP request ${config.url}
\t\tconst subActionVar${config._id} = "${(config.url || '').replace(/"/g, '\\"')}"${GenericBlock.getReplacesInText(context)};
\t\t_sendToFrontEnd(${config._id}, {url: subActionVar${config._id}});
\t\trequest(subActionVar${config._id});`;
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(debugMessage: { data: RuleBlockConfigActionHTTPCall }): string {
        return `URL: ${debugMessage.data.url}`;
    }

    onTagChange(tagCard: RuleTagCardTitle): void {
        this.setState(
            {
                inputs: [
                    {
                        nameRender: 'renderModalInput',
                        attr: 'url',
                        defaultValue: 'http://mydevice.com?...',
                        nameBlock: 'URL',
                    },
                ],
            },
            () => super.onTagChange(tagCard),
        );
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'actions',
            name: 'HTTP Call',
            id: 'ActionHTTPCall',
            icon: 'Language',
            title: 'Make a HTTP get request',
            helpDialog: 'You can use %s in the URL to use current trigger value or %id to use the triggered object ID',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return ActionHTTPCall.getStaticData();
    }
}

export default ActionHTTPCall;
