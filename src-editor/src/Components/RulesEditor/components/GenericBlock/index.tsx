import React, { Component, Fragment } from 'react';
import cls from './style.module.scss';

import { Menu, MenuItem, IconButton } from '@mui/material';
import { HelpOutlined as IconHelp } from '@mui/icons-material';

import { getSelectIdIcon, I18n, Utils, DialogSelectID, DialogError, DialogMessage } from '@iobroker/gui-components';

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
    GenericBlockState,
    GenericBlockProps,
} from '@iobroker/javascript-rules-dev';

/**
 * A short description of what *one particular* block does - "Flur · Bewegung" instead of "Zustand".
 *
 * A block returns this from `getSummary()`. It is what the card shows instead of its generic name,
 * and it is what makes a collapsed block readable.
 */
export interface RuleBlockSummary {
    /** Small line above the title, usually the selected variant: "bei Änderung", "Steuerung" */
    kicker?: string;
    /** The one line that tells this block apart from every other block of the same type */
    title: string;
    /** Muted second line for the detail behind the title, e.g. the object ID behind its name */
    subtitle?: string;
}

export abstract class GenericBlock<
    Settings extends RuleBlockConfig = RuleBlockConfig,
    TState extends GenericBlockState<Settings> = GenericBlockState<Settings>,
> extends Component<GenericBlockProps<Settings>, TState> {
    private debugHideTimeout: ReturnType<typeof setTimeout> | null = null;

    /** Whether the block was already configured when it first rendered - see `isCollapsed` */
    private initiallyCollapsed = false;
    private collapseDecided = false;

    private lastObjectIdChange: number = 0;
    private enableSimulationProcessing = false;

    /** Protected, because a block that fills its inputs asynchronously has to check it too */
    protected mounted = false;

    private tagCardTimeout: ReturnType<typeof setTimeout> | null = null;

    private enableSimulationTimeout: ReturnType<typeof setTimeout> | null = null;
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
        item ||= {} as RuleBlockDescription;

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

    componentWillUnmount(): void {
        this.mounted = false;
        if (this.debugMessageTimeout) {
            clearTimeout(this.debugMessageTimeout);
            this.debugMessageTimeout = null;
        }
        if (this.debugHideTimeout) {
            clearTimeout(this.debugHideTimeout);
            this.debugHideTimeout = null;
        }
        if (this.tagCardTimeout) {
            clearTimeout(this.tagCardTimeout);
            this.tagCardTimeout = null;
        }
        if (this.enableSimulationTimeout) {
            clearTimeout(this.enableSimulationTimeout);
            this.enableSimulationTimeout = null;
        }
    }

    // called every time, the tagCard changes or at the start
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

            if (attr && defaultValue !== undefined && (settings as Record<string, any>)[attr] === undefined) {
                changed = true;
                (settings as Record<string, any>)[attr] = defaultValue;
            }
        });
        if (changed) {
            this.setState({ settings }, () => cb?.());
            this.props.onChange(settings);
        } else if (cb) {
            cb();
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

    /**
     * Describes *this* block instance in one line, so a finished rule can be read without opening
     * every card. Blocks overwrite it; the ones that do not simply keep showing their generic name.
     *
     * Return `null` while the block is not configured enough to be described - such a block is
     * never collapsed, so an unfinished block always shows its form.
     */
    // eslint-disable-next-line class-methods-use-this
    getSummary(): RuleBlockSummary | null {
        return null;
    }

    /**
     * Name of an object as the user knows it, for use in `getSummary`.
     *
     * `renderObjectID` caches objects in the state under their own ID. A collapsed block never
     * renders that field, so the object is fetched here as well - the summary shows the raw ID
     * until it arrives.
     *
     * @param oid the object ID to look up
     */
    // eslint-disable-next-line react/no-unused-class-component-methods -- called by the blocks that implement getSummary()
    protected objectName(oid: string | undefined): string | undefined {
        if (!oid) {
            return undefined;
        }
        const cached: ioBroker.Object | null | false | undefined = (
            this.state as Record<string, ioBroker.Object | null | false | undefined>
        )[oid];

        if (cached === undefined) {
            // `false` marks "asked for, does not exist", so this runs at most once per ID
            setTimeout(async (): Promise<void> => {
                const obj = await this.props.socket.getObject(oid);
                if (this.mounted) {
                    this.setState({ [oid]: obj || false } as unknown as TState);
                }
            }, 0);
            return undefined;
        }

        return cached ? Utils.getObjectNameFromObj(cached, I18n.getLanguage()) || undefined : undefined;
    }

    /**
     * The label a select shows for a stored value, for use in `getSummary`.
     *
     * The settings keep the raw value - a Telegram chat ID, a Pushover priority number - while the
     * option list that turns it into something readable lives on the input.
     *
     * @param attr the attribute whose select is looked up
     * @param value the stored value
     * @param field `title2` for the untranslated extra a select shows in brackets, e.g. the clock
     * time of an astronomical event
     */
    // eslint-disable-next-line react/no-unused-class-component-methods -- called by the blocks that implement getSummary()
    protected optionTitle(
        attr: string,
        value: string | number | boolean | null | undefined,
        field: 'title' | 'title2' = 'title',
    ): string | undefined {
        if (value === undefined || value === null || value === '') {
            return undefined;
        }
        const input = this.state.inputs?.find(item => (item as { attr?: string }).attr === attr) as
            | {
                  options?: { value: string | number | boolean; title: string; title2?: string }[];
                  doNotTranslate?: boolean;
              }
            | undefined;
        // a select may store what a number input wrote, so compare as text
        const option = input?.options?.find(item => String(item.value) === String(value));
        if (!option) {
            return undefined;
        }
        if (field === 'title2') {
            return option.title2;
        }
        return input?.doNotTranslate ? option.title : I18n.t(option.title);
    }

    /**
     * Whether the card currently shows only its summary.
     *
     * A block that was already configured when the rule was opened starts collapsed. Finishing a
     * block while working on it must *not* fold it away under the cursor, so the decision is taken
     * once, on the first render, and after that only the user changes it.
     */
    private isCollapsed(hasSummary: boolean): boolean {
        if (!this.collapseDecided) {
            this.collapseDecided = true;
            this.initiallyCollapsed = hasSummary;
        }
        const userCollapsed = (this.state as TState & { userCollapsed?: boolean }).userCollapsed;
        return hasSummary && (userCollapsed === undefined ? this.initiallyCollapsed : userCollapsed);
    }

    private toggleCollapsed(collapsed: boolean): void {
        this.setState({ userCollapsed: collapsed } as unknown as TState);
    }

    renderText(input: RuleInputText, value: string, onChange: (value: string) => void): React.JSX.Element {
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
    }

    renderSwitch(input: RuleInputSwitch, value: boolean, onChange: (value: boolean) => void): React.JSX.Element {
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
    }

    // eslint-disable-next-line class-methods-use-this
    renderNameText(
        { attr, signature, doNotTranslate, defaultValue }: RuleInputNameText,
        value: string,
    ): React.JSX.Element {
        return (
            <div
                className={Utils.clsx(signature ? cls.displayItalic : cls.displayFlex, cls.blockMarginTop)}
                key={attr}
            >
                {value
                    ? doNotTranslate
                        ? value
                        : I18n.t(value)
                    : doNotTranslate
                      ? defaultValue
                      : I18n.t(defaultValue)}
            </div>
        );
    }

    renderNumber(
        input: RuleInputNumber,
        value: number,
        onChange: (value: number | string) => void,
    ): React.JSX.Element | null {
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
    }

    renderColor(input: RuleInputColor, value: string, onChange: (value: string) => void): React.JSX.Element {
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
    }

    renderCheckbox(input: RuleInputCheckbox, value: boolean, onChange: (value: boolean) => void): React.JSX.Element {
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
    }

    renderSlider(input: RuleInputSlider, value: number, onChange: (value: number) => void): React.JSX.Element {
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
    }

    renderButton(input: RuleInputButton, value: boolean, onChange: (bValue: boolean) => void): React.JSX.Element {
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
    }

    async findIcon(obj: ioBroker.Object | null | undefined): Promise<string | null> {
        if (!obj) {
            return null;
        }

        if (obj.common?.icon) {
            return getSelectIdIcon(obj, '../..');
        }

        if (obj.type === 'state' || obj.type === 'channel') {
            // get parent
            const parts = obj._id.split('.');
            parts.pop();
            const newId = parts.join('.');

            try {
                const o = await this.props.socket.getObject(newId);
                return await this.findIcon(o);
            } catch {
                return null;
            }
        }
        return null;
    }

    renderObjectID(
        input: RuleInputObjectID,
        value: string,
        onChange: (value: Record<string, any>, cb: () => void) => void,
    ): React.JSX.Element | null {
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
                    if (!this.mounted) {
                        return;
                    }
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
                        themeType={Utils.getThemeType()}
                        socket={socket}
                        selected={value}
                        onClose={() => {
                            const settings: Partial<TState> = {};
                            (settings as Record<string, any>)[`showSelectId${attr}`] = false;
                            this.setState(settings as TState);
                        }}
                        onOk={(selected: string | string[] | undefined, _name: string | null): void => {
                            const settings: Partial<TState> = {};
                            (settings as Record<string, any>)[`showSelectId${attr}`] = false;
                            const oid = Array.isArray(selected) ? selected[0] : selected;

                            this.setState(settings as TState, async () => {
                                // read a type of object
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
    }

    renderIconTag(): React.JSX.Element {
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
    }

    // eslint-disable-next-line class-methods-use-this
    renderTime(input: RuleInputTime, value: string, onChange: (value: string) => void): React.JSX.Element {
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
    }

    renderSelect(input: RuleInputSelect, value: any, onChange: (value: any, attr: string) => void): React.JSX.Element {
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
    }

    renderInstance(
        input: RuleInputInstance,
        value: string,
        onChange: (value: string) => void,
    ): React.JSX.Element | null {
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
    }

    // eslint-disable-next-line class-methods-use-this
    renderDialog(input: RuleInputDialog): React.JSX.Element {
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
    }

    renderModalInput(
        input: RuleInputModalInput,
        value: string | number,
        onChange: (value: string | number) => void,
    ): React.JSX.Element {
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
    }

    // eslint-disable-next-line class-methods-use-this
    renderDate(input: RuleInputDate, value: string, onChange: (value: string) => void): React.JSX.Element {
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
    }

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
                                    onClick={e => {
                                        e.stopPropagation();

                                        if (
                                            this.props.isTourOpen &&
                                            (this.props.tourStep === STEPS.openTagsMenu ||
                                                this.props.tourStep === STEPS.selectIntervalTag) &&
                                            tag === 'interval'
                                        ) {
                                            setTimeout(() => this.props.setTourStep?.(STEPS.selectActions), 500);
                                        }

                                        const settings: Settings = JSON.parse(JSON.stringify(this.state.settings));
                                        settings.tagCard = tag;

                                        this.setState({ openTagMenu: null, settings }, () => {
                                            this.props.onChange(this.state.settings);
                                            this.onTagChange(this.state.settings.tagCard);
                                        });
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
    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return {
            acceptedBy: 'triggers',
            name: '',
            id: '',
        };
    }

    onChangeTag(): void {
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
    }

    componentDidMount(): void {
        this.mounted = true;
        this.onTagChange();
        // detect changes
    }

    componentDidUpdate(): void {
        if (this.props.acceptedBy !== 'triggers' && this.props.onUpdate) {
            setTimeout(() => this.onUpdate(), 0);
        }
    }

    onChangeInput(attribute: string): (value: any, attr?: string | (() => void), cb?: () => void) => void {
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
                cb?.();
            });
        };
    }

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
                return this.renderNameText(input as RuleInputNameText, defaultValue as string);

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
                    // @ts-expect-error ignore error as it is a special case
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

        // Detect empty tag (guard against re-scheduling on every render and setState after unmount)
        if (
            this.state.settings &&
            !this.state.settings.tagCard &&
            this.state.tagCardArray?.length &&
            !this.tagCardTimeout
        ) {
            this.tagCardTimeout = setTimeout(() => {
                this.tagCardTimeout = null;
                if (!this.mounted) {
                    return;
                }
                const settings: Settings = JSON.parse(JSON.stringify(this.state.settings));
                settings.tagCard =
                    typeof this.state.tagCardArray[0] !== 'string'
                        ? this.state.tagCardArray[0].title
                        : this.state.tagCardArray[0];
                this.setState({ settings });
            }, 50);
        }

        // Detect changing of simulation
        if (this.state.enableSimulation !== this.props.enableSimulation && !this.enableSimulationProcessing) {
            this.enableSimulationProcessing = true;
            this.enableSimulationTimeout = setTimeout(() => {
                this.enableSimulationTimeout = null;
                if (!this.mounted) {
                    this.enableSimulationProcessing = false;
                    return;
                }
                this.setState({ enableSimulation: this.props.enableSimulation }, () => {
                    this.enableSimulationProcessing = false;
                });
            }, 50);
        }

        // Try to find the latest message for this block
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

        const summary: RuleBlockSummary | null = this.getSummary();
        const collapsed: boolean = this.isCollapsed(!!summary);

        return (
            <Fragment>
                {iconTag ? (
                    this.renderIconTag()
                ) : (
                    <MaterialDynamicIcon
                        iconName={icon}
                        className={Utils.clsx(
                            cls.iconThemCard,
                            collapsed && cls.iconThemCardCollapsed,
                            tagCard && this.state.tagCardArray.length && cls.iconThemCardSelectable,
                        )}
                        adapter={adapter}
                        socket={socket}
                        onClick={e => {
                            if (tagCard) {
                                e.stopPropagation();
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
                    <div
                        className={Utils.clsx(cls.headerRow, summary && cls.headerRowClickable)}
                        onClick={summary ? () => this.toggleCollapsed(!collapsed) : undefined}
                    >
                        {/* Leading disclosure arrow. It deliberately sits on the left: on the right
                            it was a few pixels away from the delete button of the card, so aiming
                            for "collapse" risked deleting the block. Blocks that cannot collapse
                            still reserve the space, so all titles in a band line up. */}
                        <span
                            className={Utils.clsx(
                                cls.chevron,
                                collapsed && cls.chevronCollapsed,
                                !summary && cls.chevronPlaceholder,
                            )}
                        >
                            ▾
                        </span>
                        <div className={cls.headerText}>
                            {summary?.kicker ? <div className={cls.kicker}>{summary.kicker}</div> : null}
                            <span className={Utils.clsx(cls.nameCard, summary && cls.nameCardSummary)}>
                                {summary ? summary.title : I18n.t(name)}
                                {notFound ? I18n.t(`%s not found`, settings.id) : ''}
                            </span>
                            {collapsed && summary?.subtitle ? (
                                <div
                                    className={cls.summarySub}
                                    title={summary.subtitle}
                                >
                                    {summary.subtitle}
                                </div>
                            ) : null}
                        </div>
                        {/* The variant of the block ("bei Änderung", "Steuerung"). Used to sit as a tab
                            above the card, which read like a browser tab rather than a setting. */}
                        {tagCard ? (
                            <div
                                onClick={e => {
                                    e.stopPropagation();
                                    this.onChangeTag();
                                }}
                                className={Utils.clsx(cls.tagCard, 'tag-card')}
                            >
                                {this.renderTags()}
                            </div>
                        ) : null}
                        {helpDialog ? (
                            <IconButton
                                className={cls.iconHelp}
                                size="small"
                                onClick={e => {
                                    e.stopPropagation();
                                    this.setState({ helpText: I18n.t(helpDialog) });
                                }}
                            >
                                <IconHelp />
                            </IconButton>
                        ) : null}
                    </div>
                    {collapsed ? null : inputs.map((input, index) => this.renderInputElement(input, index))}
                </div>
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
