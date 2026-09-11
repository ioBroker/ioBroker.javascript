import { type GenericBlockProps, type IGenericBlock, type RuleBlockConfig, type RuleBlockDescription, type RuleContext } from '@iobroker/javascript-rules-dev';
declare global {
    interface Window {
        GenericBlock: typeof IGenericBlock;
    }
}
declare const GenericBlock: typeof IGenericBlock;
export interface RuleBlockConfigActionSendEmail extends RuleBlockConfig {
    text: string;
    instance: string;
    recipients: string;
    subject: string;
}
declare class ActionSendEmail extends GenericBlock<RuleBlockConfigActionSendEmail> {
    constructor(props: GenericBlockProps<RuleBlockConfigActionSendEmail>);
    static compile(config: RuleBlockConfigActionSendEmail, context: RuleContext): string;
    renderDebug(debugMessage: {
        data: {
            text: string;
        };
    }): string;
    onTagChange(): void;
    static getStaticData(): RuleBlockDescription;
    getData(): RuleBlockDescription;
}
export default ActionSendEmail;
