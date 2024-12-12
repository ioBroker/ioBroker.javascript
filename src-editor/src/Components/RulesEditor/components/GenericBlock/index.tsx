import React, { PureComponent, Fragment } from 'react';
import cls from './style.module.scss';

import { Menu, MenuItem, IconButton } from '@mui/material';
import { HelpOutline as IconHelp } from '@mui/icons-material';

import {
    getSelectIdIcon,
    I18n,
    Utils,
    SelectID as DialogSelectID,
    Error as DialogError,
    Message as DialogMessage,
    type AdminConnection,
    type IobTheme,
} from '@iobroker/adapter-react-v5';

import CustomButton from '../CustomButton';
import CustomCheckbox from '../CustomCheckbox';
import CustomInput from '../CustomInput';
import CustomInstance from '../CustomInstance';
import CustomModal from '../CustomModal';
import CustomSelect from '../CustomSelect';
import CustomSlider from '../CustomSlider';
import CustomSwitch from '../CustomSwitch';
import CustomTime from '../CustomTime';
import CustomDate from '../CustomDate';

import MaterialDynamicIcon from '../../helpers/MaterialDynamicIcon';
import { getName } from '../../helpers/utils';
import { STEPS } from '../../helpers/Tour';
import type {
    RuleBlockConfig,
    RuleBlockDescription,
    RuleContext,
    RuleInputAny,
    RuleInputButton,
    RuleInputCheckbox,
    RuleInputColor,
    RuleInputNameText,
    RuleInputNumber,
    RuleInputSlider,
    RuleInputSwitch,
    RuleInputText,
    RuleInputAll,
    RuleTagCard,
    RuleTagCardTitle,
    RuleUserRules,
    RuleInputObjectID,
    RuleInputTime,
    RuleInputSelect,
    RuleInputInstance,
    RuleInputDialog,
    RuleInputModalInput,
    RuleInputDate,
    RuleInputCron,
    RuleInputWizard,
    DebugMessage,
    RuleBlockConfigTriggerState,
} from '../../types';

export interface GenericBlockProps<Settings> {
    _id: number;
    name?: string;
    icon?: string;
    adapter?: string;
    socket: AdminConnection;
    userRules?: RuleUserRules;
    classes?: {
        valueAck: string;
        valueNotAck: string;
    };
    settings?: Settings;
    onChange: (settings: Settings) => void;
    onDebugMessage?: DebugMessage[];
    enableSimulation: boolean;
    theme: IobTheme;
    className?: string;
    style?: React.CSSProperties;
    inputs?: RuleInputAny[];
    notFound?: boolean;
    isTourOpen?: boolean;
    tourStep?: number;
    setTourStep?: (step: number) => void;
    setOnUpdate?: (value: boolean) => void;
    helpDialog?: string;
    acceptedBy?: string;
    onUpdate?: boolean;
}

export interface GenericBlockState<Settings> {
    inputs: RuleInputAny[];
    name: string;
    icon: string;
    adapter: string;
    helpDialog: string;
    tagCardArray: (RuleTagCard | RuleTagCardTitle)[];
    openTagMenu: any;
    openModal: boolean;
    iconTag: boolean;
    error: string;
    helpText: string;
    instanceSelectionOptions: any[];
    instanceSelectionDef: string;
    hideAttributes: string[];
    settings: Settings;
    debugMessage: any;
    enableSimulation: boolean;
}

export abstract class GenericBlock<
    Settings extends RuleBlockConfig = RuleBlockConfig,
    TState extends GenericBlockState<Settings> = GenericBlockState<Settings>,
> extends PureComponent<GenericBlockProps<Settings>, TState> {
    private debugHideTimeout: ReturnType<typeof setTimeout> | null = null;

    private lastObjectIdChange: number = 0;
    private enableSimulationProcessing = false;
    private lastDebugMessage = 0;
    private debugMessageTimeout: ReturnType<typeof setTimeout> | null = null;

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'actions',
            name: 'Not found',
            id: 'ActionEmpty',
            icon: 'Shuffle',
        };
    }

    static compile(_config: RuleBlockConfig, _context: RuleContext): string {
        return '';
    }

    protected constructor(props: GenericBlockProps<Settings>, item: RuleBlockDescription) {
        super(props);
        item = item || {} as any;
        const settings: Settings =
            props.settings ||
            ({
                tagCard: item.tagCardArray
                    ? typeof item.tagCardArray[0] !== 'string'
                        ? item.tagCardArray[0].title
                        : item.tagCardArray[0]
                    : '',
            } as Settings);

        if (!settings.tagCard && item.tagCardArray) {
            settings.tagCard =
                typeof item.tagCardArray[0] !== 'string' ? item.tagCardArray[0].title : item.tagCardArray[0];
        }

        // @ts-expect-error fix later
        this.state = {
            inputs: item.inputs || props.inputs || [],
            name: item.name || props.name || '',
            icon: item.icon || props.icon || '',
            adapter: item.adapter || props.adapter || '',
            helpDialog: item.helpDialog || props.helpDialog || '',

            tagCardArray: item.tagCardArray || [],

            openTagMenu: false,
            openModal: false,
            iconTag: false,
            error: '',
            helpText: '',

            instanceSelectionOptions: [],
            instanceSelectionDef: '',

            hideAttributes: [], // e.g. instance

            settings,
            debugMessage: null,
            enableSimulation: this.props.enableSimulation,
        } satisfies GenericBlockState<Settings>;
    }

    static getDerivedStateFromProps(
        nextProps: GenericBlockProps<any>,
        state: GenericBlockState<any>,
    ): Partial<GenericBlockState<any>> | null {
        if (!nextProps || !nextProps.settings) {
            console.log(JSON.stringify(nextProps));
            return null;
        }

        const settings: any = JSON.parse(JSON.stringify(nextProps.settings));
        if (!settings.tagCard && state.tagCardArray && state.tagCardArray.length) {
            settings.tagCard =
                typeof state.tagCardArray[0] !== 'string' ? state.tagCardArray[0].title : state.tagCardArray[0];
        }

        if (JSON.stringify(settings) !== JSON.stringify(state.settings)) {
            return { settings };
        }

        return null;
    }

    componentWillUnmount(): void {
        if (this.debugMessageTimeout) {
            clearTimeout(this.debugMessageTimeout);
            this.debugMessageTimeout = null;
        }
        if (this.debugHideTimeout) {
            clearTimeout(this.debugHideTimeout);
            this.debugHideTimeout = null;
        }
    }

    // called every time, the tagCard changes or at start
    onTagChange(
        _tagCard?: RuleTagCardTitle | null,
        cb?: () => void,
        _value?: any,
        _toggle?: boolean,
        _useTrigger?: boolean,
    ): void {
        // analyse inputs and fill the attributes with default values
        let changed = false;
        const settings: Settings = JSON.parse(JSON.stringify(this.state.settings));
        this.state.inputs.forEach(input => {
            const attr: string | undefined = (input as RuleInputAll).attr;
            const defaultValue: any = (input as RuleInputAll).defaultValue;

            if (attr && defaultValue !== undefined) {
                if (attr && (settings as Record<string, any>)[attr] === undefined) {
                    changed = true;
                    (settings as Record<string, any>)[attr] = defaultValue;
                }
            }
        });
        if (changed) {
            this.setState({ settings }, () => cb && cb());
            this.props.onChange(settings);
        } else {
            cb && cb();
        }
    }

    // called if trigger added or removed
    // eslint-disable-next-line class-methods-use-this
    onUpdate(): void {
        // do nothing, but blocks can overwrite it
    }

    // called every time if some attribute changes
    // eslint-disable-next-line class-methods-use-this
    onValueChanged(_value: any, _attr: string): void {
        // do nothing, but blocks can overwrite it
    }

    // eslint-disable-next-line react/no-unused-class-component-methods
    renderText = (input: RuleInputText, value: string, onChange: (value: string) => void): React.JSX.Element => {
        const { className } = this.props;
        const { attr, frontText, backText, nameBlock, name, doNotTranslate, doNotTranslateBack } = input;
        return (
            <Fragment key={attr}>
                <div className={Utils.clsx(cls.displayFlex, cls.blockMarginTop)}>
                    {frontText && <div className={cls.frontText}>{doNotTranslate ? frontText : I18n.t(frontText)}</div>}
                    <CustomInput
                        className={className}
                        autoComplete="off"
                        label={getName(name)}
                        variant="outlined"
                        size="small"
                        fullWidth
                        value={value}
                        onChange={onChange as (value: string | number) => void}
                        customValue
                    />
                    {backText && <div className={cls.backText}>{doNotTranslateBack ? backText : I18n.t(backText)}</div>}
                </div>
                {nameBlock && <div className={cls.nameBlock}>{I18n.t(nameBlock)}</div>}
            </Fragment>
        );
    };

    // eslint-disable-next-line react/no-unused-class-component-methods
    renderSwitch = (input: RuleInputSwitch, value: boolean, onChange: (value: boolean) => void): React.JSX.Element => {
        const { className } = this.props;
        const { attr, frontText, backText, nameBlock, doNotTranslate, doNotTranslateBack } = input;
        return (
            <div key={attr}>
                <div className={Utils.clsx(cls.displayFlex, cls.blockMarginTop)}>
                    {frontText && <div className={cls.frontText}>{doNotTranslate ? frontText : I18n.t(frontText)}</div>}
                    <CustomSwitch
                        className={className}
                        label=""
                        customValue
                        value={value}
                        onChange={onChange}
                    />
                    {backText && <div className={cls.backText}>{doNotTranslateBack ? backText : I18n.t(backText)}</div>}
                </div>
                {nameBlock && <div className={cls.nameBlock}>{I18n.t(nameBlock)}</div>}
            </div>
        );
    };

    // eslint-disable-next-line react/no-unused-class-component-methods,class-methods-use-this
    renderNameText = (
        { attr, signature, doNotTranslate, defaultValue }: RuleInputNameText,
        value: string,
    ): React.JSX.Element => (
        <div
            className={Utils.clsx(signature ? cls.displayItalic : cls.displayFlex, cls.blockMarginTop)}
            key={attr}
        >
            {value ? (doNotTranslate ? value : I18n.t(value)) : doNotTranslate ? defaultValue : I18n.t(defaultValue)}
        </div>
    );

    // eslint-disable-next-line react/no-unused-class-component-methods
    renderNumber = (
        input: RuleInputNumber,
        value: number,
        onChange: (value: number | string) => void,
    ): React.JSX.Element | null => {
        const { className } = this.props;
        const { settings } = this.state;
        const { attr, backText, frontText, openCheckbox, doNotTranslate, doNotTranslateBack } = input;
        let visibility = true;
        if (openCheckbox) {
            visibility =
                typeof (settings as Record<string, any>).offset === 'boolean'
                    ? (settings as Record<string, any>).offset
                    : true;
        }
        return visibility ? (
            <div
                key={attr}
                className={Utils.clsx(cls.displayFlex, cls.blockMarginTop)}
            >
                {frontText && <div className={cls.frontText}>{doNotTranslate ? frontText : I18n.t(frontText)}</div>}
                <CustomInput
                    className={Utils.clsx(className, input.className)}
                    fullWidth
                    autoComplete="off"
                    label={input.noHelperText ? '' : 'number'}
                    variant="outlined"
                    size="small"
                    type="number"
                    value={value}
                    onChange={onChange}
                    customValue
                />
                {backText && <div className={cls.backText}>{doNotTranslateBack ? backText : I18n.t(backText)}</div>}
            </div>
        ) : null;
    };

    // eslint-disable-next-line react/no-unused-class-component-methods
    renderColor = (input: RuleInputColor, value: string, onChange: (value: string) => void): React.JSX.Element => {
        const { className } = this.props;
        const { attr, backText, frontText, doNotTranslate, doNotTranslateBack } = input;
        return (
            <div
                key={attr}
                className={Utils.clsx(cls.displayFlex, cls.blockMarginTop)}
            >
                {frontText && <div className={cls.frontText}>{doNotTranslate ? frontText : I18n.t(frontText)}</div>}
                <CustomInput
                    className={className}
                    autoComplete="off"
                    fullWidth
                    variant="outlined"
                    size="small"
                    type="color"
                    value={value}
                    onChange={onChange as (value: string | number) => void}
                />
                {backText && <div className={cls.backText}>{doNotTranslateBack ? backText : I18n.t(backText)}</div>}
            </div>
        );
    };

    // eslint-disable-next-line react/no-unused-class-component-methods
    renderCheckbox = (
        input: RuleInputCheckbox,
        value: boolean,
        onChange: (value: boolean) => void,
    ): React.JSX.Element => {
        const { className } = this.props;
        const { settings } = this.state;
        const { attr, backText, frontText, defaultValue, doNotTranslate, doNotTranslateBack } = input;
        return (
            <div
                key={attr}
                className={cls.displayFlex}
            >
                {frontText && <div className={cls.frontText}>{doNotTranslate ? frontText : I18n.t(frontText)}</div>}
                <CustomCheckbox
                    className={className}
                    size="small"
                    value={
                        typeof (settings as Record<string, any>)[attr] === 'boolean'
                            ? !!(settings as Record<string, any>)[attr]
                            : !!defaultValue
                    }
                    customValue
                    onChange={onChange}
                />
                {backText && (
                    <div
                        onClick={() =>
                            onChange(
                                typeof (settings as Record<string, any>)[attr] === 'boolean'
                                    ? !(settings as Record<string, any>)[attr]
                                    : !defaultValue,
                            )
                        }
                        className={cls.backText}
                    >
                        {doNotTranslateBack ? backText : I18n.t(backText)}
                    </div>
                )}
            </div>
        );
    };

    // eslint-disable-next-line react/no-unused-class-component-methods
    renderSlider = (input: RuleInputSlider, value: number, onChange: (value: number) => void): React.JSX.Element => {
        const { className } = this.props;
        const { attr, frontText, backText, nameBlock, min, max, step, unit, doNotTranslate, doNotTranslateBack } =
            input;
        return (
            <div key={attr}>
                <div
                    className={cls.displayFlex}
                    style={{ marginRight: 20 }}
                >
                    {frontText && <div className={cls.frontText}>{doNotTranslate ? frontText : I18n.t(frontText)}</div>}
                    <CustomSlider
                        customValue
                        min={min}
                        max={max}
                        step={step}
                        unit={unit}
                        className={className}
                        autoComplete="off"
                        label="number"
                        variant="outlined"
                        size="small"
                        value={value}
                        onChange={val => {
                            console.log(val);
                            onChange(val);
                        }}
                    />
                    {backText && (
                        <div
                            style={{ marginLeft: 20 }}
                            className={cls.backText}
                        >
                            {doNotTranslateBack ? backText : I18n.t(backText)}
                        </div>
                    )}
                </div>
                {nameBlock && <div className={cls.nameBlock}>{I18n.t(nameBlock)}</div>}
            </div>
        );
    };

    // eslint-disable-next-line react/no-unused-class-component-methods
    renderButton = (input: RuleInputButton, value: boolean, onChange: (bValue: boolean) => void): React.JSX.Element => {
        const { className } = this.props;
        const { attr, frontText, backText, doNotTranslate, doNotTranslateBack } = input;
        return (
            <div
                key={attr}
                className={Utils.clsx(cls.displayFlex, cls.blockMarginTop)}
            >
                {frontText && <div className={cls.frontText}>{doNotTranslate ? frontText : I18n.t(frontText)}</div>}
                <CustomButton
                    fullWidth
                    value={value.toString()}
                    className={className}
                    onClick={() => onChange(value)}
                />
                {backText && <div className={cls.backText}>{doNotTranslateBack ? backText : I18n.t(backText)}</div>}
            </div>
        );
    };

    findIcon(obj: ioBroker.Object | null | undefined): Promise<string | null> {
        if (!obj) {
            return Promise.resolve(null);
        }

        if (obj.common?.icon) {
            return Promise.resolve(getSelectIdIcon(obj, '../..'));
        }

        if (obj.type === 'state' || obj.type === 'channel') {
            const parts = obj._id.split('.');
            parts.pop();
            const newId = parts.join('.');

            return this.props.socket
                .getObject(newId)
                .then(o => this.findIcon(o))
                .catch((): any => null);
        }
        return Promise.resolve(null);
    }

    // eslint-disable-next-line react/no-unused-class-component-methods
    renderObjectID = (
        input: RuleInputObjectID,
        value: string,
        onChange: (value: Record<string, any>, cb: () => void) => void,
    ): React.JSX.Element | null => {
        const { attr, openCheckbox, checkReadOnly } = input;
        const { settings } = this.state;
        const showSelectId = (this.state as Record<string, any>)[`showSelectId${attr}`];
        const { className, socket, style } = this.props;
        let visibility = true;
        if (openCheckbox) {
            visibility =
                typeof (settings as Record<string, any>).offset === 'boolean'
                    ? (settings as Record<string, any>).offset
                    : true;
        }

        const oid: string | undefined = (settings as Record<string, any>)[attr];
        const iobObj: ioBroker.Object | null | undefined | false = oid
            ? (this.state as Record<string, ioBroker.Object | null | undefined | false>)[oid]
            : undefined;

        if (oid && !iobObj && iobObj !== false) {
            setTimeout(
                async (_attrStr: string): Promise<void> => {
                    const obj = await socket.getObject(value);
                    const icon = await this.findIcon(obj);
                    const newState: Partial<TState> = {
                        [_attrStr]: obj || false,
                        [`${_attrStr}___icon`]: icon,
                        error:
                            checkReadOnly &&
                            this.lastObjectIdChange &&
                            Date.now() - this.lastObjectIdChange < 1000 &&
                            obj?.common?.write === false
                                ? I18n.t('Read only ID selected: %s', (settings as Record<string, any>)[_attrStr])
                                : '',
                    } as Partial<TState>;

                    this.setState(newState as TState);
                },
                0,
                oid,
            );
        }

        // return null
        return visibility ? (
            <div
                className={cls.blockMarginTop}
                key={attr}
            >
                <div className={cls.displayFlex}>
                    {input.title ? <div>{I18n.t(input.title)}</div> : null}
                    <CustomInput
                        className={className}
                        style={style}
                        autoComplete="off"
                        fullWidth
                        disabled
                        variant="outlined"
                        size="small"
                        value={value}
                        customValue
                    />
                    <CustomButton
                        icon={(this.state as Record<string, any>)[`${oid}___icon`]}
                        square
                        style={{ ...(style || undefined), marginLeft: 7 }}
                        value="..."
                        className={className}
                        onClick={() => {
                            const settings: Partial<TState> = {};
                            (settings as Record<string, any>)[`showSelectId${attr}`] = true;
                            this.setState(settings as TState);
                        }}
                    />
                </div>
                {iobObj ? (
                    <div className={Utils.clsx(cls.nameBlock, cls.displayItalic)}>
                        {Utils.getObjectNameFromObj(iobObj, I18n.getLanguage())}
                    </div>
                ) : null}
                {showSelectId ? (
                    <DialogSelectID
                        theme={this.props.theme}
                        imagePrefix="../.."
                        dialogName="javascript"
                        themeType={Utils.getThemeName()}
                        socket={socket}
                        selected={value}
                        onClose={() => {
                            const settings: Partial<TState> = {};
                            (settings as Record<string, any>)[`showSelectId${attr}`] = false;
                            this.setState(settings as TState);
                        }}
                        onOk={(selected: string | string[] | undefined, _name: string): void => {
                            const settings: Partial<TState> = {};
                            (settings as Record<string, any>)[`showSelectId${attr}`] = false;
                            const oid = Array.isArray(selected) ? selected[0] : selected;

                            this.setState(settings as TState, async () => {
                                // read type of object
                                const obj = oid ? await socket.getObject(oid) : undefined;
                                this.lastObjectIdChange = Date.now();
                                onChange(
                                    {
                                        [attr]: selected,
                                        [`${attr}Role`]: obj?.common?.role,
                                        [`${attr}Type`]: obj?.common?.type,
                                        [`${attr}Unit`]: obj?.common?.unit,
                                        [`${attr}States`]: obj?.common?.states,
                                        [`${attr}Min`]: obj?.common?.min,
                                        [`${attr}Max`]: obj?.common?.max,
                                        [`${attr}Step`]: obj?.common?.step,
                                        [`${attr}Def`]: obj?.common?.def,
                                        [`${attr}Write`]: obj?.common?.write,
                                        [`${attr}Read`]: obj?.common?.read,
                                    },
                                    () => this.props.setOnUpdate && this.props.setOnUpdate(true),
                                );
                            });
                        }}
                    />
                ) : null}
            </div>
        ) : null;
    };

    renderIconTag = (): React.JSX.Element => {
        return (
            <div
                className={cls.iconTag}
                onClick={e => {
                    if (this.state.settings.tagCard) {
                        if (this.state.tagCardArray.length < 3) {
                            this.onChangeTag();
                        } else {
                            this.setState({ openTagMenu: e.currentTarget });
                        }
                    }
                }}
            >
                {this.state.settings.tagCard}
            </div>
        );
    };

    // eslint-disable-next-line react/no-unused-class-component-methods,class-methods-use-this
    renderTime = (input: RuleInputTime, value: string, onChange: (value: string) => void): React.JSX.Element => {
        const { attr, backText, frontText, doNotTranslate, doNotTranslateBack } = input;
        return (
            <div
                key={attr}
                className={cls.displayFlex}
                style={{ whiteSpace: 'nowrap' }}
            >
                {frontText && <div className={cls.frontText}>{doNotTranslate ? frontText : I18n.t(frontText)}</div>}
                <CustomTime
                    value={value}
                    onChange={onChange}
                />
                {backText && <div className={cls.backText}>{doNotTranslateBack ? backText : I18n.t(backText)}</div>}
            </div>
        );
    };

    // eslint-disable-next-line react/no-unused-class-component-methods,class-methods-use-this
    renderSelect = (
        input: RuleInputSelect,
        value: any,
        onChange: (value: any, attr: string) => void,
    ): React.JSX.Element => {
        const { className, style } = this.props;
        const {
            name,
            options,
            frontText,
            backText,
            attr,
            multiple,
            doNotTranslate,
            doNotTranslate2,
            doNotTranslateBack,
        } = input;
        return (
            <div
                key={attr}
                className={Utils.clsx(cls.displayFlex, cls.blockMarginTop)}
                style={{ whiteSpace: 'nowrap' }}
            >
                {frontText && <div className={cls.frontText}>{I18n.t(frontText)}</div>}
                <CustomSelect
                    attr={attr}
                    doNotTranslate={doNotTranslate}
                    doNotTranslate2={doNotTranslate2}
                    title={name}
                    className={className}
                    style={style}
                    options={options}
                    value={value}
                    onChange={onChange}
                    multiple={multiple}
                    customValue
                />
                {backText && <div className={cls.backText}>{doNotTranslateBack ? backText : I18n.t(backText)}</div>}
            </div>
        );
    };

    // eslint-disable-next-line react/no-unused-class-component-methods
    renderInstance = (
        input: RuleInputInstance,
        value: string,
        onChange: (value: string) => void,
    ): React.JSX.Element | null => {
        const { socket } = this.props;
        const { name, frontText, backText, attr, adapter, doNotTranslate, doNotTranslateBack } = input;
        if (this.state.hideAttributes.includes(attr)) {
            return null;
        }
        return (
            <div
                key={attr}
                className={Utils.clsx(cls.displayFlex, cls.blockMarginTop)}
                style={{ whiteSpace: 'nowrap' }}
            >
                {frontText && <div className={cls.frontText}>{doNotTranslate ? frontText : I18n.t(frontText)}</div>}
                <CustomInstance
                    attr={attr}
                    socket={socket}
                    adapter={adapter}
                    title={name}
                    value={value}
                    onChange={(value: string | string[]): void => {
                        onChange(Array.isArray(value) ? value[0] : value);
                    }}
                    customValue
                    onInstanceHide={value =>
                        this.setState({ hideAttributes: [...this.state.hideAttributes, attr] }, () => onChange(value))
                    } // hide instance if only exactly one exists
                />
                {backText && <div className={cls.backText}>{doNotTranslateBack ? backText : I18n.t(backText)}</div>}
            </div>
        );
    };

    // eslint-disable-next-line react/no-unused-class-component-methods,class-methods-use-this
    renderDialog = (input: RuleInputDialog): React.JSX.Element => {
        const { onShowDialog, frontText, backText, attr, icon, doNotTranslate, doNotTranslateBack } = input;
        return (
            <div
                key={attr}
                className={Utils.clsx(cls.displayFlex, cls.blockMarginTop)}
                style={{ whiteSpace: 'nowrap' }}
            >
                {frontText && <div className={cls.frontText}>{doNotTranslate ? frontText : I18n.t(frontText)}</div>}
                <MaterialDynamicIcon
                    iconName={icon}
                    className={Utils.clsx(cls.iconDialog)}
                    onClick={() => onShowDialog && onShowDialog()}
                />
                {backText && <div className={cls.backText}>{doNotTranslateBack ? backText : I18n.t(backText)}</div>}
            </div>
        );
    };

    // eslint-disable-next-line react/no-unused-class-component-methods,class-methods-use-this
    renderModalInput = (
        input: RuleInputModalInput,
        value: string | number,
        onChange: (value: string | number) => void,
    ): React.JSX.Element => {
        const { openModal } = this.state;
        const { className } = this.props;
        const { attr, nameBlock, frontText, backText, noTextEdit, doNotTranslate, doNotTranslateBack } = input;
        return (
            <div key={attr}>
                <div className={Utils.clsx(cls.displayFlex, cls.blockMarginTop)}>
                    {frontText && <div className={cls.frontText}>{doNotTranslate ? frontText : I18n.t(frontText)}</div>}
                    <CustomInput
                        disabled={!!noTextEdit}
                        className={className}
                        autoComplete="off"
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={value}
                        onChange={onChange}
                        customValue
                    />
                    <CustomButton
                        square
                        // fullWidth
                        style={{ marginLeft: 5 }}
                        value="..."
                        className={className}
                        onClick={() => this.setState({ openModal: true })}
                    />
                    {backText && <div className={cls.backText}>{doNotTranslateBack ? backText : I18n.t(backText)}</div>}
                </div>
                {openModal ? (
                    <CustomModal
                        onApply={val =>
                            this.setState(
                                { openModal: false },
                                () => val !== null && val !== undefined && onChange(val),
                            )
                        }
                        onClose={() => this.setState({ openModal: false })}
                        defaultValue={value}
                        textInput
                    />
                ) : null}
                {nameBlock && <div className={cls.nameBlock}>{I18n.t(nameBlock)}</div>}
            </div>
        );
    };

    // eslint-disable-next-line react/no-unused-class-component-methods,class-methods-use-this
    renderDate = (input: RuleInputDate, value: string, onChange: (value: string) => void): React.JSX.Element => {
        const { attr, backText, frontText, doNotTranslate, doNotTranslateBack } = input;
        return (
            <div
                key={attr}
                className={cls.displayFlex}
                style={{ whiteSpace: 'nowrap' }}
            >
                {frontText && <div className={cls.frontText}>{doNotTranslate ? frontText : I18n.t(frontText)}</div>}
                <CustomDate
                    value={value}
                    onChange={onChange}
                />
                {backText && <div className={cls.backText}>{doNotTranslateBack ? backText : I18n.t(backText)}</div>}
            </div>
        );
    };

    static getReplacesInText(context: RuleContext): string {
        let value = '';
        if ((context.trigger as RuleBlockConfigTriggerState)?.oidType) {
            value =
                '.replace(/%s/g, obj.state.val).replace(/%id/g, obj.id).replace(/%name/g, obj.common && obj.common.name).replace(/%old/g, obj.oldState.val)';
        } else if (context.conditionsStates.length) {
            value = `.replace(/%s/g, ${context.conditionsStates[0].name}).replace(/%id/g, "${context.conditionsStates[0].id}")`;
        }
        return value;
    }

    /////////////////////////////
    renderTags(): React.JSX.Element | string | undefined {
        const { tagCardArray, openTagMenu } = this.state;
        const { tagCard } = this.state.settings;
        let result: React.JSX.Element | string | undefined =
            tagCard !== '=' &&
            tagCard !== '<>' &&
            tagCard !== '>=' &&
            tagCard !== '()' &&
            tagCard !== '.' &&
            tagCard !== '<=' &&
            tagCard !== '<' &&
            tagCard !== '>' &&
            tagCard
                ? I18n.t(tagCard)
                : tagCard;

        if (tagCardArray.length >= 3) {
            result = (
                <div>
                    <div
                        aria-controls="simple-menu"
                        aria-haspopup="true"
                        onClick={e => {
                            this.setState({ openTagMenu: e.currentTarget }, () => {
                                this.props.isTourOpen &&
                                    this.props.tourStep === STEPS.openTagsMenu &&
                                    setTimeout(
                                        () => this.props.setTourStep && this.props.setTourStep(STEPS.selectIntervalTag),
                                        300,
                                    );
                            });
                        }}
                    >
                        {result}
                    </div>
                    <Menu
                        id="simple-menu"
                        anchorEl={openTagMenu}
                        keepMounted
                        open={Boolean(openTagMenu)}
                        onClose={() => this.setState({ openTagMenu: null })}
                    >
                        {tagCardArray.map((el, i) => {
                            let tag: RuleTagCardTitle;
                            if (typeof el !== 'string') {
                                tag = el.title;
                            } else {
                                tag = el;
                            }
                            return (
                                <MenuItem
                                    key={`${tag}_${i}`}
                                    selected={tag === tagCard}
                                    className={`tag-card-${tag}`}
                                    style={{ placeContent: 'space-between' }}
                                    onClick={() => {
                                        const settings = { ...this.state.settings, tagCard: tag };
                                        this.setState({ openTagMenu: null, settings }, () => {
                                            this.props.onChange(settings);
                                            this.onTagChange(tag);
                                        });
                                        this.props.isTourOpen &&
                                            (this.props.tourStep === STEPS.openTagsMenu ||
                                                this.props.tourStep === STEPS.selectIntervalTag) &&
                                            tag === 'interval' &&
                                            setTimeout(
                                                () =>
                                                    this.props.setTourStep &&
                                                    this.props.setTourStep(STEPS.selectActions),
                                                500,
                                            );
                                    }}
                                >
                                    {tag.search(/>|<|<>|<=|>=|=/) !== -1 ? tag : I18n.t(tag)}
                                    {typeof el !== 'string' && el.title2 && (
                                        <div style={{ marginLeft: 4 }}>{I18n.t(el.title2)}</div>
                                    )}
                                </MenuItem>
                            );
                        })}
                    </Menu>
                </div>
            );
        }

        return result;
    }

    // will be overwritten
    // eslint-disable-next-line react/no-unused-class-component-methods,class-methods-use-this
    getData(): RuleBlockDescription {
        return {
            acceptedBy: 'triggers',
            name: '',
            id: '',
        };
    }

    onChangeTag = (): void => {
        const {
            tagCardArray,
            settings,
            settings: { tagCard },
        } = this.state;
        let newTagCardArray: RuleTagCardTitle[];
        if (typeof tagCardArray[0] !== 'string') {
            newTagCardArray = (tagCardArray as RuleTagCard[]).map(el => el.title);
        } else {
            newTagCardArray = [...(tagCardArray as RuleTagCardTitle[])];
        }

        if (tagCard && newTagCardArray.length < 3) {
            const newSettings = { ...settings };
            const newTagCard = newTagCardArray[(newTagCardArray.indexOf(tagCard) + 1) % newTagCardArray.length];
            newSettings.tagCard = newTagCard;
            this.setState({ settings: newSettings }, () => {
                this.props.onChange(newSettings);
                this.onTagChange(newTagCard);
            });
        }
    };

    componentDidMount = (): void => {
        this.onTagChange();
        // detect changes
    };

    componentDidUpdate(): void {
        if (this.props.acceptedBy !== 'triggers' && this.props.onUpdate) {
            setTimeout(() => this.onUpdate(), 0);
        }
    }

    onChangeInput = (attribute: string): ((value: any, attr?: string | (() => void), cb?: () => void) => void) => {
        return (value: any, attr?: string | (() => void), cb?: () => void): void => {
            const settings = JSON.parse(JSON.stringify(this.state.settings));

            if (typeof value === 'object' && (!attr || typeof attr === 'function')) {
                Object.keys(value).forEach(_attr => (settings[_attr] = value[_attr]));
                if (typeof attr === 'function') {
                    cb = attr;
                    attr = undefined;
                }
            } else {
                settings[(attr as string) || attribute] = value;
            }

            settings.id = this.getData().id;
            settings._id = this.props._id;

            this.setState({ settings }, () => {
                this.onValueChanged(value, (attr as string) || attribute);
                this.props.onChange(settings);
                cb && cb();
            });
        };
    };

    // eslint-disable-next-line class-methods-use-this
    renderSpecific(): React.JSX.Element | null {
        return null; // it can be overloaded
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(_message?: any): React.JSX.Element | string {
        return '';
    }

    renderDebugInfo(): React.JSX.Element | null {
        if (this.state.debugMessage) {
            return (
                <div
                    className={cls.debugInfo}
                    key={this.state.debugMessage.ts}
                    style={{ opacity: 1, height: 22, bottom: -22 }}
                >
                    {this.renderDebug ? this.renderDebug(this.state.debugMessage) : I18n.t('executed')}
                </div>
            );
        }
        return null;
    }

    // eslint-disable-next-line class-methods-use-this
    renderCron(
        _input: RuleInputCron,
        _value: string,
        _onChange: (value: string, attr?: string, cb?: () => void) => void,
    ): React.JSX.Element | null {
        return null;
    }

    // eslint-disable-next-line class-methods-use-this
    renderWizard(
        _input: RuleInputWizard,
        _value: string,
        _onChange: (newData: Record<string, any> | string) => void,
    ): React.JSX.Element | null {
        return null;
    }

    // eslint-disable-next-line class-methods-use-this
    renderWriteState(): React.JSX.Element[] | null {
        return null;
    }

    renderInputElement(input: RuleInputAny, index: number): React.JSX.Element | React.JSX.Element[] | null {
        const { nameRender, defaultValue, attr } = input as RuleInputAll;
        const { settings } = this.state;
        let value: any = attr ? (settings as Record<string, any>)[attr] : undefined;
        if (value === undefined) {
            value = defaultValue;
        }

        switch (nameRender) {
            case 'renderTime':
                if (attr) {
                    return this.renderTime(input as RuleInputTime, value as string, this.onChangeInput(attr));
                }
                return <div key={`invalid_${index}`}>{I18n.t('Invalid renderTime')}</div>;

            case 'renderNameText':
                return this.renderNameText(input as RuleInputNameText, value);

            case 'renderSelect':
                if (attr) {
                    return this.renderSelect(input as RuleInputSelect, value, this.onChangeInput(attr));
                }
                return <div key={`invalid_${index}`}>{I18n.t('Invalid renderSelect')}</div>;
            case 'renderModalInput':
                if (attr) {
                    return this.renderModalInput(input as RuleInputModalInput, value, this.onChangeInput(attr));
                }
                return <div key={`invalid_${index}`}>{I18n.t('Invalid renderModalInput')}</div>;
            case 'renderObjectID':
                if (attr) {
                    return this.renderObjectID(input as RuleInputObjectID, value, this.onChangeInput(attr));
                }
                return <div key={`invalid_${index}`}>{I18n.t('Invalid renderObjectID')}</div>;
            case 'renderDialog':
                if (attr) {
                    return this.renderDialog(input as RuleInputDialog);
                }
                return <div key={`invalid_${index}`}>{I18n.t('Invalid renderDialog')}</div>;
            case 'renderInstance':
                if (attr) {
                    return this.renderInstance(input as RuleInputInstance, value, this.onChangeInput(attr));
                }
                return <div key={`invalid_${index}`}>{I18n.t('Invalid renderInstance')}</div>;
            case 'renderText':
                if (attr) {
                    return this.renderText(input as RuleInputText, value, this.onChangeInput(attr));
                }
                return <div key={`invalid_${index}`}>{I18n.t('Invalid renderText')}</div>;
            case 'renderSlider':
                if (attr) {
                    return this.renderSlider(input as RuleInputSlider, value, this.onChangeInput(attr));
                }
                return <div key={`invalid_${index}`}>{I18n.t('Invalid renderSlider')}</div>;
            case 'renderCheckbox':
                if (attr) {
                    return this.renderCheckbox(input as RuleInputCheckbox, value, this.onChangeInput(attr));
                }
                return <div key={`invalid_${index}`}>{I18n.t('Invalid renderCheckbox')}</div>;
            case 'renderButton':
                if (attr) {
                    return this.renderButton(input as RuleInputButton, value, this.onChangeInput(attr));
                }
                return <div key={`invalid_${index}`}>{I18n.t('Invalid renderButton')}</div>;
            case 'renderColor':
                if (attr) {
                    return this.renderColor(input as RuleInputColor, value, this.onChangeInput(attr));
                }
                return <div key={`invalid_${index}`}>{I18n.t('Invalid renderColor')}</div>;
            case 'renderSwitch':
                if (attr) {
                    return this.renderSwitch(input as RuleInputSwitch, value, this.onChangeInput(attr));
                }
                return <div key={`invalid_${index}`}>{I18n.t('Invalid renderSwitch')}</div>;
            case 'renderDate':
                if (attr) {
                    return this.renderDate(input as RuleInputDate, value, this.onChangeInput(attr));
                }
                return <div key={`invalid_${index}`}>{I18n.t('Invalid renderDate')}</div>;
            case 'renderCron':
                if (attr) {
                    return this.renderCron(input as RuleInputCron, value, this.onChangeInput(attr));
                }
                return <div key={`invalid_${index}`}>{I18n.t('Invalid renderCron')}</div>;
            case 'renderWizard':
                if (attr) {
                    return this.renderWizard(input as RuleInputWizard, value, this.onChangeInput(attr));
                }
                return <div key={`invalid_${index}`}>{I18n.t('Invalid renderWizard')}</div>;
            case 'renderWriteState':
                return this.renderWriteState();
            case 'renderNumber':
                if (attr) {
                    return this.renderNumber(input as RuleInputNumber, value, this.onChangeInput(attr));
                }
                return <div key={`invalid_${index}`}>{I18n.t('Invalid renderNumber')}</div>;
            default:
                if (this[nameRender]) {
                    // @ts-expect-error ignore error as it is special case
                    return this[nameRender](input, value, attr ? this.onChangeInput(attr) : null);
                }
                return <div key={`invalid_${index}`}>{I18n.t('Invalid input type: %s', nameRender)}</div>;
        }
    }

    render(): React.JSX.Element {
        const {
            inputs,
            name,
            icon,
            iconTag,
            settings,
            adapter,
            settings: { tagCard },
            helpDialog,
        } = this.state;
        const { socket, notFound } = this.props;

        // Detect changing of simulation
        if (this.state.enableSimulation !== this.props.enableSimulation && !this.enableSimulationProcessing) {
            this.enableSimulationProcessing = true;
            setTimeout(() => {
                this.setState({ enableSimulation: this.props.enableSimulation }, () => {
                    this.enableSimulationProcessing = false;
                });
            }, 50);
        }

        // Try to find latest message for this block
        let debugMsg;
        if (this.props.onDebugMessage) {
            for (let d = this.props.onDebugMessage.length - 1; d >= 0; d--) {
                const msg = this.props.onDebugMessage[d];
                if (msg.blockId === this.props._id && msg.ts > this.lastDebugMessage && msg.ts > Date.now() - 1000) {
                    debugMsg = msg;
                    break;
                }
            }
        }

        if (debugMsg) {
            // Get the last message
            this.lastDebugMessage = debugMsg.ts;
            if (this.debugMessageTimeout) {
                clearTimeout(this.debugMessageTimeout);
            }
            if (this.debugHideTimeout) {
                clearTimeout(this.debugHideTimeout);
                this.debugHideTimeout = null;
            }
            this.debugMessageTimeout = setTimeout(
                (debugMessageStr: string): void => {
                    const debugMessage: DebugMessage = JSON.parse(debugMessageStr);
                    const hideTimeout: number = debugMessage.hideTimeout || 5000;
                    this.debugMessageTimeout = null;
                    this.setState({ debugMessage }, () => {
                        if (this.debugHideTimeout) {
                            clearTimeout(this.debugHideTimeout);
                        }
                        this.debugHideTimeout = setTimeout(() => {
                            this.debugHideTimeout = null;
                            this.setState({ debugMessage: null });
                        }, hideTimeout);
                    });
                },
                50,
                JSON.stringify(debugMsg),
            );
        }

        return (
            <Fragment>
                {iconTag ? (
                    this.renderIconTag()
                ) : (
                    <MaterialDynamicIcon
                        iconName={icon}
                        className={Utils.clsx(
                            cls.iconThemCard,
                            tagCard && this.state.tagCardArray.length && cls.iconThemCardSelectable,
                        )}
                        adapter={adapter}
                        socket={socket}
                        onClick={e => {
                            if (tagCard) {
                                if (this.state.tagCardArray.length < 3) {
                                    this.onChangeTag();
                                } else {
                                    this.setState({ openTagMenu: e.currentTarget });
                                }
                            }
                        }}
                    />
                )}
                <div className={cls.blockName}>
                    <span className={cls.nameCard}>
                        {I18n.t(name)}
                        {notFound ? I18n.t(`%s not found`, settings.id) : ''}
                        {helpDialog ? (
                            <IconButton
                                className={cls.iconHelp}
                                size="small"
                                onClick={() => this.setState({ helpText: I18n.t(helpDialog) })}
                            >
                                <IconHelp />
                            </IconButton>
                        ) : null}
                    </span>
                    {inputs.map((input, index) => this.renderInputElement(input, index))}
                </div>
                {tagCard && (
                    <div
                        className={cls.controlMenuTop}
                        style={{ opacity: 1, height: 22, top: -22 }}
                    >
                        <div
                            onClick={() => this.onChangeTag()}
                            className={Utils.clsx(cls.tagCard, 'tag-card')}
                        >
                            {this.renderTags()}
                        </div>
                    </div>
                )}
                {this.renderDebugInfo()}
                {this.state.error ? (
                    <DialogError
                        title={I18n.t('Warning')}
                        text={this.state.error}
                        onClose={() => this.setState({ error: '' })}
                    />
                ) : null}
                {this.state.helpText ? (
                    <DialogMessage
                        title={I18n.t('Instructions')}
                        text={this.state.helpText}
                        onClose={() => this.setState({ helpText: '' })}
                    />
                ) : null}
                {this.renderSpecific()}
            </Fragment>
        );
    }
}
