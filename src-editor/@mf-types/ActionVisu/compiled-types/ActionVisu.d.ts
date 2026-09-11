import type React from 'react';
import { type GenericBlockProps, type IGenericBlock, type RuleBlockConfig, type RuleBlockDescription, type RuleContext, type RuleTagCardTitle } from '@iobroker/javascript-rules-dev';
declare global {
    interface Window {
        GenericBlock: typeof IGenericBlock;
    }
}
declare const GenericBlock: typeof IGenericBlock;
export interface ActionVisuRuleBlockConfig extends RuleBlockConfig {
    message: string;
    instance: string;
    tagCard?: RuleTagCardTitle;
    priority: boolean;
    title: string;
    expire: string;
}
export default class ActionVisu extends GenericBlock<ActionVisuRuleBlockConfig> {
    constructor(props: GenericBlockProps<ActionVisuRuleBlockConfig>);
    static compile(config: ActionVisuRuleBlockConfig, context: RuleContext): string;
    renderDebug(debugMessage: {
        data: {
            message: string;
        };
    }): React.JSX.Element | string;
    onTagChange(tagCard: RuleTagCardTitle): void;
    static getStaticData(): RuleBlockDescription;
    getData(): RuleBlockDescription;
}
export {};
