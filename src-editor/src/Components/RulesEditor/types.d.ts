export type RuleBlockType = 'actions' | 'triggers' | 'conditions';

export type RuleTagCardTitle =
    | '='
    | '>='
    | '>'
    | '<'
    | '<='
    | '.'
    | 'update'
    | '<>'
    | '()'
    | 'includes'
    | 'interval'
    | 'cron'
    | 'at'
    | 'astro'
    | 'wizard';

export interface RuleTagCard {
    title: RuleTagCardTitle;
    title2: string;
    text: string;
}

export interface RuleBlockDescription {
    acceptedBy: RuleBlockType;
    name: string;
    id: string;
    icon: string;
    title?: string;
    helpDialog?: string;
    tagCardArray?: RuleTagCard[];
    inputs?: RuleInput[];
    adapter?: string;
}

export interface RuleSettings {
    tagCard: string;
}

export interface RuleInput {
    attr: string;
    defaultValue: string;
    nameRender: string;

    noTextEdit?: boolean;
    frontText?: string;
    backText?: string;
    nameBlock?: string;
    name?: string;
    doNotTranslate?: boolean;
    doNotTranslateBack?: boolean;
}

export interface RuleUserRules {
    actions: {
        [key: string]: RuleBlockItem[];
    };
    conditions: {
        [key: string]: RuleBlockItem[];
    };
    triggers: RuleBlockItem[];
    justCheck: boolean;
}

export interface RuleContext {
    trigger: {
        oidType: 'string';
    };
    conditionsStates: { name: string }[];
}

export interface RuleBlockConfig {
    id: string;
    acceptedBy: RuleBlockType;
    _id: number;
}

export interface RuleBlockConfigActionExec extends RuleBlockConfig {
    exec: string;
}
export interface RuleBlockConfigActionFunction extends RuleBlockConfig {
    func: string;
}
export interface RuleBlockConfigActionHTTPCall extends RuleBlockConfig {
    url: string;
}
