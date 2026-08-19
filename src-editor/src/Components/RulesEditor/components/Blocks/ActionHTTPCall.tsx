import { I18n } from '@iobroker/gui-components';

import { GenericBlock, type RuleBlockSummary } from '../GenericBlock';
import type {
    RuleBlockConfigActionHTTPCall,
    RuleBlockDescription,
    RuleContext,
    RuleTagCardTitle,
    GenericBlockProps,
} from '@iobroker/javascript-rules-dev';

class ActionHTTPCall extends GenericBlock<RuleBlockConfigActionHTTPCall> {
    constructor(props: GenericBlockProps<RuleBlockConfigActionHTTPCall>) {
        super(props, ActionHTTPCall.getStaticData());
    }

    static compile(config: RuleBlockConfigActionHTTPCall, context: RuleContext): string {
        // a line break in the URL would end the comment and turn the next line into code
        const label = (config.url || '').replace(/[\r\n]+/g, ' ');

        // `httpGet` and not `request`: the latter was a global back when the adapter bundled the
        // package of that name. It is gone, so every rule using this block ran into a
        // ReferenceError. Called back instead of awaited, so the rule carries on while the request
        // is still running - which is what this block did while it still worked.
        return `// HTTP request ${label}
\t\tconst subActionVar${config._id} = ${JSON.stringify(config.url || '')}${GenericBlock.getReplacesInText(context)};
\t\t_sendToFrontEnd(${config._id}, {url: subActionVar${config._id}});
\t\thttpGet(subActionVar${config._id}, (error, response) =>
\t\t\t_sendToFrontEnd(${config._id}, {url: subActionVar${config._id}, statusCode: response.statusCode, error: error ? error.message : undefined}));`;
    }

    /**
     * Two messages arrive per call: the URL when the request goes out, the outcome when it comes
     * back. A failed request is logged by the sandbox itself, so this only has to show it.
     */
    // eslint-disable-next-line class-methods-use-this
    renderDebug(debugMessage: { data: { url: string; statusCode?: number | null; error?: string } }): string {
        const { url, statusCode, error } = debugMessage.data;
        if (error) {
            return `${I18n.t('HTTP error:')} ${error}`;
        }
        return statusCode === undefined ? `URL: ${url}` : `URL: ${url} → ${statusCode}`;
    }

    getSummary(): RuleBlockSummary | null {
        const { url } = this.state.settings;
        return url ? { title: String(url) } : null;
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
