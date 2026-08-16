import React, { useContext, useMemo, useRef, useState } from 'react';

import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Step,
    StepLabel,
    Stepper,
} from '@mui/material';
import {
    Add as IconAdd,
    Close as IconClose,
    DeleteOutlined as IconRemove,
    NavigateBefore as IconBack,
    NavigateNext as IconNext,
} from '@mui/icons-material';

import {
    I18n,
    Utils,
    type AdminConnection,
    type IobTheme,
    type ThemeName,
    type ThemeType,
} from '@iobroker/gui-components';
import type { GenericBlockProps, RuleBlockConfig, RuleBlockType, RuleUserRules } from '@iobroker/javascript-rules-dev';

import cls from './style.module.scss';
import { ContextWrapperCreate } from '../ContextWrapper';
import MaterialDynamicIcon from '../../helpers/MaterialDynamicIcon';
import type { GenericBlock } from '../GenericBlock';

/** The three parts of a rule, in the order the wizard asks for them */
const STEPS: RuleBlockType[] = ['triggers', 'conditions', 'actions'];

const STEP_TITLE: Record<RuleBlockType, string> = {
    triggers: 'Triggers',
    conditions: 'Conditions',
    actions: 'Actions',
};

const STEP_HINT: Record<RuleBlockType, string> = {
    triggers: 'What should start the rule?',
    conditions: 'When should the rule run? This step is optional.',
    actions: 'What should happen?',
};

/** The band label the finished blocks will sit under, so the last step reads like the editor */
const STEP_BAND: Record<RuleBlockType, string> = {
    triggers: 'when',
    conditions: 'and',
    actions: 'then',
};

const BAND_CLASS: Record<RuleBlockType, string> = {
    triggers: cls.bandTriggers,
    conditions: cls.bandConditions,
    actions: cls.bandActions,
};

type Draft = Record<RuleBlockType, RuleBlockConfig[]>;

/** The props a block needs on top of `GenericBlockProps`, all of them passed through by CurrentItem */
type BlockComponent = React.FC<
    GenericBlockProps<any> & { acceptedBy: RuleBlockType; themeType: ThemeType; themeName: ThemeName }
>;

interface WizardProps {
    /** Called with the finished rule; the wizard closes itself afterwards */
    onCreate: (rules: RuleUserRules) => void;
    onClose: () => void;
    /** Whether the editor already holds a rule - it would be replaced */
    hasRule: boolean;
    socket: AdminConnection;
    theme: IobTheme;
    themeType: ThemeType;
    themeName: ThemeName;
}

const emptyDraft = (): Draft => ({ triggers: [], conditions: [], actions: [] });

const Wizard = ({
    onCreate,
    onClose,
    hasRule,
    socket,
    theme,
    themeType,
    themeName,
}: WizardProps): React.JSX.Element => {
    const { blocks } = useContext(ContextWrapperCreate);
    const [step, setStep] = useState(0);
    const [draft, setDraft] = useState<Draft>(emptyDraft);
    /** The step whose block chooser is open; a step without blocks always shows it */
    const [choosing, setChoosing] = useState<RuleBlockType | null>(null);
    /**
     * `_id` only has to be unique inside one rule, and the wizard builds a rule from nothing, so a
     * counter is enough. The palette stamps its blocks with `Date.now()`, which cannot collide with
     * these small numbers if the user adds more blocks afterwards.
     */
    const nextId = useRef(0);

    const byType: Record<RuleBlockType, (typeof GenericBlock<any>)[]> = useMemo(() => {
        const result: Record<RuleBlockType, (typeof GenericBlock<any>)[]> = {
            triggers: [],
            conditions: [],
            actions: [],
        };
        blocks?.forEach(block => {
            const { acceptedBy } = block.getStaticData();
            result[acceptedBy]?.push(block);
        });
        return result;
    }, [blocks]);

    /** What the rule would look like right now - blocks such as "Operate two states" read it */
    const draftAsRules: RuleUserRules = useMemo(
        () => ({
            triggers: draft.triggers,
            conditions: draft.conditions.length ? [draft.conditions] : [[]],
            justCheck: false,
            actions: { then: draft.actions, else: [] },
        }),
        [draft],
    );

    const addBlock = (type: RuleBlockType, id: string): void => {
        nextId.current += 1;
        setDraft(old => ({ ...old, [type]: [...old[type], { id, _id: nextId.current, acceptedBy: type }] }));
        setChoosing(null);
    };

    const removeBlock = (type: RuleBlockType, _id: number): void =>
        setDraft(old => ({ ...old, [type]: old[type].filter(item => item._id !== _id) }));

    /**
     * A block reports its whole settings object, identity included. The identity is taken from the
     * draft rather than from what came back, so a block that drops or rewrites those fields cannot
     * detach itself from the entry it belongs to.
     */
    const updateBlock = (type: RuleBlockType, _id: number, settings: RuleBlockConfig): void =>
        setDraft(old => ({
            ...old,
            [type]: old[type].map(item =>
                item._id === _id ? { ...settings, _id, id: item.id, acceptedBy: type } : item,
            ),
        }));

    /**
     * Renders a block with its own form, exactly as the editor would.
     *
     * @param item the block's entry in the draft
     * @param type the step the block belongs to
     * @param preview the last step mounts every block a second time to show its own one-line
     * summary. That copy must not write anything back - a block reports its settings as soon as it
     * mounts, which would overwrite the configured ones with what a fresh block starts from.
     */
    const renderBlock = (item: RuleBlockConfig, type: RuleBlockType, preview?: boolean): React.JSX.Element => {
        const found = blocks?.find(block => block.getStaticData().id === item.id);
        if (!found) {
            return <div className={cls.notFound}>{I18n.t('Block not found')}</div>;
        }
        const Block = found as unknown as BlockComponent;
        return (
            <Block
                _id={item._id}
                settings={item}
                acceptedBy={type}
                onChange={preview ? () => {} : settings => updateBlock(type, item._id, settings)}
                socket={socket}
                theme={theme}
                themeType={themeType}
                themeName={themeName}
                enableSimulation={false}
                userRules={draftAsRules}
                onUpdate={false}
                setOnUpdate={() => {}}
            />
        );
    };

    const renderChooser = (type: RuleBlockType): React.JSX.Element => (
        <div className={cls.chooser}>
            {byType[type].map(block => {
                const { id, name, icon, adapter, title } = block.getStaticData();
                return (
                    <button
                        key={id}
                        type="button"
                        className={cls.choice}
                        title={title ? I18n.t(title) : undefined}
                        onClick={() => addBlock(type, id)}
                    >
                        <MaterialDynamicIcon
                            iconName={icon}
                            adapter={adapter}
                            socket={socket}
                            className={cls.choiceIcon}
                        />
                        <span className={cls.choiceName}>{I18n.t(name)}</span>
                    </button>
                );
            })}
        </div>
    );

    /**
     * One configuration step. All three stay mounted while the wizard is open: a block decides on
     * its first render whether to show its summary instead of its form, so remounting it on every
     * "Back" would fold away the form the user came back to edit.
     */
    const renderStep = (type: RuleBlockType, index: number): React.JSX.Element => (
        <div
            key={type}
            className={cls.step}
            hidden={step !== index}
        >
            <div className={cls.hint}>{I18n.t(STEP_HINT[type])}</div>
            {draft[type].map(item => (
                <div
                    key={item._id}
                    className={Utils.clsx(cls.blockCard, BAND_CLASS[type])}
                >
                    <div className={cls.blockBody}>{renderBlock(item, type)}</div>
                    <IconButton
                        className={cls.remove}
                        size="small"
                        title={I18n.t('Delete')}
                        onClick={() => removeBlock(type, item._id)}
                    >
                        <IconRemove fontSize="small" />
                    </IconButton>
                </div>
            ))}
            {choosing === type || !draft[type].length ? (
                renderChooser(type)
            ) : (
                <Button
                    className={cls.addMore}
                    startIcon={<IconAdd />}
                    onClick={() => setChoosing(type)}
                >
                    {I18n.t('Add another')}
                </Button>
            )}
        </div>
    );

    /**
     * The finished rule, read top to bottom. The blocks are mounted fresh here, so each shows the
     * one-line summary it writes for itself; the step is a preview, so nothing in it reacts.
     */
    const renderSummary = (): React.JSX.Element => (
        <div className={cls.step}>
            {STEPS.map(type =>
                draft[type].length ? (
                    <div
                        key={type}
                        className={cls.summaryBand}
                    >
                        <div className={Utils.clsx(cls.summaryLabel, BAND_CLASS[type])}>{I18n.t(STEP_BAND[type])}</div>
                        {draft[type].map(item => (
                            <div
                                key={item._id}
                                className={Utils.clsx(cls.blockCard, cls.preview, BAND_CLASS[type])}
                            >
                                <div className={cls.blockBody}>{renderBlock(item, type, true)}</div>
                            </div>
                        ))}
                    </div>
                ) : null,
            )}
            {draft.conditions.length ? null : (
                <div className={cls.hint}>{I18n.t('Without a condition the rule always runs')}</div>
            )}
            {hasRule ? <div className={cls.warning}>{I18n.t('The current rule will be replaced')}</div> : null}
        </div>
    );

    const isSummary = step === STEPS.length;
    // a rule without a trigger or without an action does nothing
    const canGoOn = isSummary || step === 1 || !!draft[STEPS[step]].length;

    return (
        <Dialog
            open
            fullWidth
            maxWidth="md"
            onClose={onClose}
            classes={{ paper: cls.paper }}
        >
            <DialogTitle className={cls.title}>
                {I18n.t('Create a rule step by step')}
                <IconButton
                    className={cls.close}
                    size="small"
                    title={I18n.t('Close')}
                    onClick={onClose}
                >
                    <IconClose />
                </IconButton>
            </DialogTitle>
            <DialogContent className={cls.content}>
                <Stepper
                    className={cls.stepper}
                    activeStep={step}
                >
                    {STEPS.map(type => (
                        <Step key={type}>
                            <StepLabel>{I18n.t(STEP_TITLE[type])}</StepLabel>
                        </Step>
                    ))}
                    <Step>
                        <StepLabel>{I18n.t('Summary')}</StepLabel>
                    </Step>
                </Stepper>
                {STEPS.map(renderStep)}
                {isSummary ? renderSummary() : null}
            </DialogContent>
            <DialogActions className={cls.actions}>
                <Button
                    disabled={!step}
                    startIcon={<IconBack />}
                    onClick={() => setStep(step - 1)}
                >
                    {I18n.t('Back')}
                </Button>
                <div className={cls.spacer} />
                <Button onClick={onClose}>{I18n.t('Cancel')}</Button>
                {isSummary ? (
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                            onCreate(draftAsRules);
                            onClose();
                        }}
                    >
                        {I18n.t(hasRule ? 'Replace rule' : 'Create rule')}
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        color="primary"
                        disabled={!canGoOn}
                        endIcon={<IconNext />}
                        onClick={() => setStep(step + 1)}
                    >
                        {I18n.t(step === 1 && !draft.conditions.length ? 'Skip' : 'Next')}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default Wizard;
