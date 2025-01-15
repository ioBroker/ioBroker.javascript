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
    | 'wizard'
    | 'on change'
    | 'on update'
    | 'control';

export interface RuleTagCard {
    title: RuleTagCardTitle;
    title2: string;
    text: string;
}

type RuleInputType =
    | 'renderTime'
    | 'renderNameText'
    | 'renderSelect'
    | 'renderModalInput'
    | 'renderObjectID'
    | 'renderDialog'
    | 'renderInstance'
    | 'renderText'
    | 'renderSlider'
    | 'renderCheckbox'
    | 'renderButton'
    | 'renderColor'
    | 'renderSwitch'
    | 'renderDate'
    | 'renderCron'
    | 'renderWizard'
    | 'renderWriteState'
    | 'renderNumber';

export interface RuleInput {
    nameRender: RuleInputType;

    frontText?: string;
    backText?: string;
}

export interface RuleInputTime extends RuleInput {
    nameRender: 'renderTime';
    attr: string;

    doNotTranslate?: boolean;
    doNotTranslateBack?: boolean;
    prefix?: string;
    defaultValue: string;
}

export interface RuleInputSelect extends RuleInput {
    nameRender: 'renderSelect';
    attr: string;

    name?: string;
    doNotTranslate2?: boolean;
    doNotTranslateBack?: boolean;
    adapter?: string;
    multiple?: boolean;
    doNotTranslate?: boolean;
    default?: string;
    defaultValue: string[] | string | number;
    options: { title: string; value: string | number; only?: boolean; titleShort?: string }[];
}

export interface RuleInputSelectInstance extends RuleInput {
    nameRender: 'renderSelect';
    attr: string;

    adapter: string;
    defaultValue: string;
}

export interface RuleInputSlider extends RuleInput {
    nameRender: 'renderSlider';
    attr: string;

    doNotTranslate?: boolean;
    doNotTranslateBack?: boolean;
    nameBlock?: string;
    unit?: string;
    defaultValue: number;
    step?: number;
    min: number;
    max: number;
}

export interface RuleInputButton extends RuleInput {
    nameRender: 'renderButton';
    attr: string;

    defaultValue: boolean;
    doNotTranslate?: boolean;
    doNotTranslateBack?: boolean;
}

export interface RuleInputColor extends RuleInput {
    nameRender: 'renderColor';
    attr: string;

    defaultValue: string;
    doNotTranslate?: boolean;
    doNotTranslateBack?: boolean;
}

export interface RuleInputNameText extends RuleInput {
    nameRender: 'renderNameText';
    attr: string;

    signature?: boolean;
    doNotTranslate?: boolean;
    defaultValue: string;
}

export interface RuleInputModalInput extends RuleInput {
    nameRender: 'renderModalInput';
    attr: string;

    noTextEdit?: boolean;
    defaultValue: string;
    nameBlock: string;
    doNotTranslate?: boolean;
    doNotTranslateBack?: boolean;
}

export interface RuleInputObjectID extends RuleInput {
    nameRender: 'renderObjectID';
    attr: string;

    openCheckbox?: boolean;
    title?: string;
    defaultValue: string;
    checkReadOnly?: boolean;
}

export interface RuleInputNumber extends RuleInput {
    nameRender: 'renderNumber';
    attr: string;

    openCheckbox?: boolean;
    doNotTranslate?: boolean;
    doNotTranslateBack?: boolean;
    defaultValue: number;
    noHelperText?: boolean;
    className?: string;
}

export interface RuleInputInstance extends RuleInput {
    nameRender: 'renderInstance';
    attr: string;

    name?: string;
    doNotTranslate?: boolean;
    doNotTranslateBack?: boolean;
    adapter: string;
    defaultValue: string;
}

export interface RuleInputText extends RuleInput {
    nameRender: 'renderText';
    attr: string;

    name?: string;
    doNotTranslate?: boolean;
    doNotTranslateBack?: boolean;
    defaultValue: string;
    nameBlock?: string;
}

export interface RuleInputCheckbox extends RuleInput {
    nameRender: 'renderCheckbox';
    attr: string;

    doNotTranslate?: boolean;
    doNotTranslateBack?: boolean;
    defaultValue?: boolean;
}

export interface RuleInputSwitch extends RuleInput {
    nameRender: 'renderSwitch';
    attr: string;

    defaultValue?: boolean;
    nameBlock?: string;
    doNotTranslate?: boolean;
    doNotTranslateBack?: boolean;
}

export interface RuleInputDialog extends RuleInput {
    nameRender: 'renderDialog';
    attr: string;

    doNotTranslate?: boolean;
    doNotTranslateBack?: boolean;
    icon: string;
    onShowDialog: () => void;
}

export interface RuleInputDate extends RuleInput {
    nameRender: 'renderDate';
    attr: string;

    doNotTranslate?: boolean;
    doNotTranslateBack?: boolean;
    defaultValue: string;
}

export interface RuleInputCron extends RuleInput {
    nameRender: 'renderCron';
    attr: string;

    defaultValue: string;
}

export interface RuleInputWriteState extends RuleInput {
    nameRender: 'renderWriteState';
}

export interface RuleInputWizard extends RuleInput {
    nameRender: 'renderWizard';
    attr: string;

    defaultValue: string;
}

export type RuleInputAny =
    | RuleInputTime
    | RuleInputDate
    | RuleInputSelect
    | RuleInputNameText
    | RuleInputModalInput
    | RuleInputNumber
    | RuleInputInstance
    | RuleInputText
    | RuleInputSlider
    | RuleInputCheckbox
    | RuleInputButton
    | RuleInputSwitch
    | RuleInputColor
    | RuleInputSelectInstance
    | RuleInputDialog
    | RuleInputCron
    | RuleInputWizard
    | RuleInputWriteState
    | RuleInputObjectID;

export interface RuleInputAll {
    nameRender: RuleInputType;
    attr?: string;
    icon?: string;
    onShowDialog?: () => void;
    doNotTranslate2?: boolean;
    default?: string;
    multiple?: boolean;
    defaultValue?: string | number | boolean | string[];
    prefix?: 'at';
    adapter?: string;
    noHelperText?: boolean;
    checkReadOnly?: boolean;
    title?: string;
    noTextEdit?: boolean;
    frontText?: string;
    backText?: string;
    nameBlock?: string;
    name?: string;
    doNotTranslate?: boolean;
    doNotTranslateBack?: boolean;
    options?: { title: string; value: string | number; only?: boolean; titleShort?: string }[];
    min?: number;
    max?: number;
    unit?: string;
    step?: number;

    oidType?: string;
    oidUnit?: string;
    oidStates?: { [name: string]: string };
}

// then, else => conditions, triggers, undefined => triggers, number => conditions
export type BlockValue = 'then' | 'else' | 'triggers' | number | undefined;

export interface RuleContext {
    trigger: RuleBlockConfig;
    condition: { index: number };
    conditionsStates: { name: string; id: string }[];
    conditionsVars: string[];
    conditionsDebug: string[];
    prelines?: string[];
    justCheck?: boolean;
}

export interface RuleBlockConfig {
    id: string;
    acceptedBy: RuleBlockType;
    _id: number;
    tagCard?: RuleTagCardTitle;
}

export interface RuleBlockConfigActionEmpty extends RuleBlockConfig {
    textTime: string;
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

export interface RuleBlockConfigActionOperationState extends RuleBlockConfig {
    oid1: string;
    tagCard: RuleTagCardTitle;
    operation: string;
    oid2: string;
    textEqual: string;
    oidResult: string;
}

export interface RuleBlockConfigActionPause extends RuleBlockConfig {
    unit: 'ms' | 's' | 'm';
    pause: number;
}

export interface RuleBlockConfigActionPrintText extends RuleBlockConfig {
    text: string;
}

export interface RuleBlockConfigActionPushover extends RuleBlockConfig {
    instance: string;
    text: string;
    title: string;
    sound: string;
    priority: number;
}

export interface RuleBlockConfigActionPushsafer extends RuleBlockConfig {
    instance: string;
    text: string;
    title: string;
    sound: string;
    priority: number;
    vibration: number | '_';
}

export interface RuleBlockConfigActionSayText extends RuleBlockConfig {
    text: string;
    language: string;
    instance: string;
    volume: string;
}

export interface RuleBlockConfigActionSendEmail extends RuleBlockConfig {
    text: string;
    instance: string;
    recipients: string;
    subject: string;
}

export interface RuleBlockConfigActionSetState extends RuleBlockConfig {
    oid: string;
    value: string | number | boolean;
    useTrigger: boolean;
    toggle: boolean;
    subject: string;
    oidType: string;
    oidUnit: string;
    oidStates: { [name: string]: string };
    oidMax: number;
    oidMin: number;
    oidRole: string;
    oidWrite: boolean;
    oidStep: number;
}

export interface RuleBlockConfigActionSetStateDelayed extends RuleBlockConfigActionSetState {
    delay: number | string;
    clearRunning: boolean;
}

export interface RuleBlockConfigActionTelegram extends RuleBlockConfig {
    text: string;
    instance: string;
    user: string;
}

export interface RuleBlockConfigActionWhatsappcmb extends RuleBlockConfig {
    text: string;
    instance: string;
    phone: string;
}

export interface RuleBlockConfigConditionAstronomical extends RuleBlockConfig {
    text: string;
    astro: string;
    offset: boolean;
    offsetValue: number;
}

export interface RuleBlockConfigActionActionState extends RuleBlockConfig {
    oid: string;
    hist: string;
    oidType: string;
    oidUnit: string;
    value: string | boolean | number;
    useTrigger: boolean;
    tagCard: RuleTagCardTitle;
    oidStates: { [name: string]: string };
    histComp: string;
}

export interface RuleBlockConfigConditionTime extends RuleBlockConfig {
    withDate: boolean;
    date: string;
    time: string;
}

export interface RuleBlockConfigTriggerSchedule extends RuleBlockConfig {
    justCheck: boolean;
    interval: number;
    unit: 's' | 'm';
    cron: string;
    at: string;
    dow: string[];
    astro: string;
    offset: boolean;
    offsetValue: number;
    wizard: string;
    wizardText: string;
    addText?: string;
}

export interface RuleBlockConfigTriggerScriptSave extends RuleBlockConfig {
    script: string;
}

export interface RuleBlockConfigTriggerState extends RuleBlockConfig {
    oid: string;
    oidType: 'boolean' | 'number' | 'string';
    oidUnit: string;
    oidStates: { [name: string]: string };
    tagCard: 'on update' | 'on change';
}

export interface RuleBlockDescription {
    acceptedBy: RuleBlockType;
    name: string;
    id: string;
    icon?: string;
    title?: string;
    helpDialog?: string;
    tagCardArray?: (RuleTagCard | RuleTagCardTitle)[];
    inputs?: RuleInputAny[];
    adapter?: string;
}

export interface RuleUserActionsSaved {
    else: RuleBlockConfig[];
    then: RuleBlockConfig[];
}
export type RuleUserConditionsSaved = RuleBlockConfig[][];
export type RuleUserTriggersSaved = RuleBlockConfig[];

export interface RuleUserRules {
    actions: RuleUserActionsSaved;
    conditions: RuleUserConditionsSaved;
    triggers: RuleUserTriggersSaved;
    justCheck: boolean;
}

export type DebugMessage = {
    ruleId?: string;
    blockId: number;
    hideTimeout?: number;
    data: any;
    ts: number;
};
