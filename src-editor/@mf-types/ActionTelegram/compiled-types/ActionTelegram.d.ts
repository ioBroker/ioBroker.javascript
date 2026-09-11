import type React from 'react';
import { type GenericBlockProps, type IGenericBlock, type RuleBlockConfig, type RuleBlockDescription, type RuleContext, type RuleTagCardTitle } from '@iobroker/javascript-rules-dev';
declare global {
    interface Window {
        GenericBlock: typeof IGenericBlock;
    }
}
declare const GenericBlock: typeof IGenericBlock;
export interface TelegramRuleBlockConfig extends RuleBlockConfig {
    text: string;
    instance: string;
    user: string;
    tagCard?: RuleTagCardTitle;
}
declare class ActionTelegram extends GenericBlock<TelegramRuleBlockConfig> {
    cachePromises: Record<string, Promise<ioBroker.State | null | undefined>>;
    constructor(props: GenericBlockProps<TelegramRuleBlockConfig>);
    static compile(config: TelegramRuleBlockConfig, context: RuleContext): string;
    renderDebug(debugMessage: {
        data: {
            text: string;
        };
    }): React.JSX.Element | string;
    onValueChanged(value: any, attr: string): void;
    _setUsers(instance?: string): void;
    onTagChange(_tagCard: RuleTagCardTitle): void;
    static getStaticData(): RuleBlockDescription;
    getData(): RuleBlockDescription;
}
export default ActionTelegram;
