import React from 'react';

import {
    Button,
    Switch,
    Dialog,
    DialogActions,
    DialogContent,
    TextField,
    DialogTitle,
    Slide,
    FormControlLabel,
    Checkbox,
} from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';

import { MdCancel as IconCancel, MdCheck as IconCheck } from 'react-icons/md';

import { I18n } from '@iobroker/adapter-react-v5';

import { GenericBlock, type GenericBlockProps, type GenericBlockState } from '../GenericBlock';
import Compile from '../../helpers/Compile';
import { renderValue } from '../../helpers/utils';
import type { RuleBlockConfigTriggerState, RuleBlockDescription, RuleContext, RuleTagCardTitle } from '../../types';

const styles: Record<string, React.CSSProperties> = {
    valueAck: {
        color: '#b02323',
    },
    valueNotAck: {
        color: '#12ac15',
    },
};

interface TransitionOwnProps {
    children: React.ReactElement<unknown, any>;
}

const Transition: React.FC<TransitionProps & TransitionOwnProps> = React.forwardRef<typeof Dialog, TransitionOwnProps>(
    (props, ref): React.JSX.Element => (
        <Slide
            direction="up"
            ref={ref}
            {...props}
        />
    ),
);

Transition.displayName = 'Transition';

interface TriggerStateState extends GenericBlockState<RuleBlockConfigTriggerState> {
    openSimulate?: boolean;
    simulateValue?: string | boolean | number;
    simulateAck?: boolean;
}

class TriggerState extends GenericBlock<RuleBlockConfigTriggerState, TriggerStateState> {
    private readonly inputRef: React.RefObject<HTMLInputElement>;

    constructor(props: GenericBlockProps<RuleBlockConfigTriggerState>) {
        super(props, TriggerState.getStaticData());
        this.inputRef = React.createRef();
    }

    static compile(config: RuleBlockConfigTriggerState, context: RuleContext): string {
        let func = context.justCheck ? Compile.STANDARD_FUNCTION_STATE : Compile.STANDARD_FUNCTION_STATE_ONCHANGE;
        func = func.replace(
            '"__%%DEBUG_TRIGGER%%__"',
            `_sendToFrontEnd(${config._id}, {val: obj.state.val, ack: obj.state.ack, valOld: obj.oldState && obj.oldState.val, ackOld: obj.oldState && obj.oldState.ack})`,
        );
        return `on({id: "${config.oid || ''}", change: "${config.tagCard === 'on update' ? 'any' : 'ne'}"}, ${func});`;
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(debugMessage: { data: { val: any; ack: boolean; valOld?: any; ackOld?: boolean } }): React.JSX.Element {
        if (debugMessage.data.valOld !== undefined) {
            return (
                <span>
                    {I18n.t('Triggered')}{' '}
                    <span style={debugMessage.data.ackOld ? styles.valueAck : styles.valueNotAck}>
                        {renderValue(debugMessage.data.valOld)}
                    </span>{' '}
                    →{' '}
                    <span style={debugMessage.data.ack ? styles.valueAck : styles.valueNotAck}>
                        {renderValue(debugMessage.data.val)}
                    </span>
                </span>
            );
        }
        return (
            <span>
                {I18n.t('Triggered')}{' '}
                <span style={debugMessage.data.ack ? styles.valueAck : styles.valueNotAck}>
                    {renderValue(debugMessage.data.val)}
                </span>
            </span>
        );
    }

    onWriteValue(): void {
        this.setState({ openSimulate: false });
        let simulateValue = this.state.simulateValue;
        window.localStorage.setItem(
            `javascript.app.${this.state.settings.oid}_ack`,
            this.state.simulateAck ? 'true' : 'false',
        );

        if (this.state.settings.oidType === 'boolean') {
            simulateValue = simulateValue === true || simulateValue === 'true' || simulateValue === '1';
            window.localStorage.setItem(`javascript.app.${this.state.settings.oid}`, simulateValue ? 'true' : 'false');
        } else if (this.state.settings.oidType === 'number') {
            simulateValue = parseFloat(simulateValue as unknown as string) || 0;
            window.localStorage.setItem(`javascript.app.${this.state.settings.oid}`, simulateValue.toString());
        } else {
            window.localStorage.setItem(`javascript.app.${this.state.settings.oid}`, simulateValue?.toString() || '');
        }

        void this.props.socket.setState(this.state.settings.oid, { val: simulateValue, ack: !!this.state.simulateAck });
    }

    renderWriteState(): React.JSX.Element {
        return (
            <>
                <Button
                    disabled={!this.state.settings.oid || !this.state.enableSimulation}
                    variant="contained"
                    color="primary"
                    onClick={() => {
                        this.setState({
                            openSimulate: true,
                            simulateValue:
                                this.state.settings.oidType === 'boolean'
                                    ? window.localStorage.getItem(`javascript.app.${this.state.settings.oid}`) ===
                                      'true'
                                    : window.localStorage.getItem(`javascript.app.${this.state.settings.oid}`) || '',
                            simulateAck:
                                window.localStorage.getItem(`javascript.app.${this.state.settings.oid}_ack`) === 'true',
                        });
                        setTimeout(() => this.inputRef.current?.focus(), 200);
                    }}
                >
                    {I18n.t('Simulate')}
                </Button>
                <Dialog
                    open={!!this.state.openSimulate}
                    TransitionComponent={Transition}
                    keepMounted
                    onClose={() => this.setState({ openSimulate: false })}
                    aria-labelledby="simulate-dialog-slide-title"
                    aria-describedby="simulate-dialog-slide-description"
                >
                    <DialogTitle id="simulate-dialog-slide-title">{I18n.t('Trigger with value')}</DialogTitle>
                    <DialogContent>
                        {this.state.settings.oidType === 'boolean' ? (
                            <FormControlLabel
                                control={
                                    <Switch
                                        inputRef={this.inputRef}
                                        onKeyUp={e => e.keyCode === 13 && this.onWriteValue()}
                                        value={!!this.state.simulateValue}
                                        onChange={e => this.setState({ simulateValue: e.target.checked })}
                                    />
                                }
                                label={I18n.t('Value')}
                            />
                        ) : (
                            <TextField
                                variant="standard"
                                inputRef={this.inputRef}
                                label={I18n.t('Value')}
                                fullWidth
                                onKeyUp={e => e.keyCode === 13 && this.onWriteValue()}
                                value={this.state.simulateValue}
                                onChange={e => this.setState({ simulateValue: e.target.value })}
                            />
                        )}
                        <br />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={!!this.state.simulateAck}
                                    onChange={e => this.setState({ simulateAck: e.target.checked })}
                                    color="primary"
                                />
                            }
                            label={I18n.t('Ack')}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button
                            variant="contained"
                            onClick={() => this.onWriteValue()}
                            color="primary"
                        >
                            <IconCheck />
                            {I18n.t('Write')}
                        </Button>
                        <Button
                            color="grey"
                            variant="contained"
                            onClick={() => this.setState({ openSimulate: false })}
                        >
                            <IconCancel />
                            {I18n.t('Close')}
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    }

    onTagChange(_tagCard: RuleTagCardTitle): void {
        this.setState(
            {
                inputs: [
                    {
                        nameRender: 'renderObjectID',
                        attr: 'oid',
                        defaultValue: '',
                    },
                    {
                        nameRender: 'renderWriteState',
                    },
                ],
            },
            () => {
                super.onTagChange();
            },
        );
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'triggers',
            name: 'State',
            id: 'TriggerState',
            icon: 'FlashOn',
            tagCardArray: ['on change', 'on update'],
            title: 'Triggers the rule on update or change of some state', // translate
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return TriggerState.getStaticData();
    }
}

export default TriggerState;
