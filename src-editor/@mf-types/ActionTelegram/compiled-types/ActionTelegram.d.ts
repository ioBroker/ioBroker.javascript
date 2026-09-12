import { type GenericBlockProps, type IGenericBlock, type RuleBlockConfig, type RuleBlockDescription, type RuleContext, type RuleTagCardTitle, type RuleBlockSummary } from '@iobroker/javascript-rules-dev';
declare global {
    interface Window {
        GenericBlock: typeof IGenericBlock;
    }
}
declare const GenericBlock: typeof IGenericBlock;
export interface RuleBlockConfigActionTelegram extends RuleBlockConfig {
    text: string;
    instance: string;
    user: string;
    tagCard?: RuleTagCardTitle;
}
export default class ActionTelegram extends GenericBlock<RuleBlockConfigActionTelegram> {
    private readonly cachePromises;
    constructor(props: GenericBlockProps<RuleBlockConfigActionTelegram>);
    static compile(config: RuleBlockConfigActionTelegram, context: RuleContext): string;
    renderDebug(debugMessage: {
        data: {
            text: string;
        };
    }): string;
    getSummary(): RuleBlockSummary | null;
    onValueChanged(value: any, attr: string): void;
    _setUsers(instance?: string): void;
    onTagChange(): void;
    static getStaticData(): RuleBlockDescription;
    getData(): RuleBlockDescription;
}
export {};
