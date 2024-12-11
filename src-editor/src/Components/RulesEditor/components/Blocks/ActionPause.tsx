import { I18n } from '@iobroker/adapter-react-v5';
import { GenericBlock, type GenericBlockProps } from '../GenericBlock';
import type { RuleBlockConfigActionPause, RuleBlockDescription } from '../../types';

class ActionPause extends GenericBlock<RuleBlockConfigActionPause> {
    constructor(props: GenericBlockProps<RuleBlockConfigActionPause>) {
        super(props, ActionPause.getStaticData());
    }

    static compile(config: RuleBlockConfigActionPause): string {
        const ms = config.unit === 'ms' ? 1 : config.unit === 's' ? 1000 : config.unit === 'm' ? 60000 : 3600000;

        return `// pause for ${ms}ms
\t\t_sendToFrontEnd(${config._id}, {paused: true});\n
\t\tawait wait(${config.pause} * ${ms});\n
\t\t_sendToFrontEnd(${config._id}, {paused: false});`;
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(debugMessage: { data: { paused: number } }): string {
        return I18n.t('Paused: %s', debugMessage.data.paused);
    }

    _getOptions(pause?: number | string): { value: string; title: string }[] {
        pause = pause === undefined ? this.state.settings.pause : pause;
        if (pause === 1 || pause === '1') {
            return [
                { value: 'ms', title: 'millisecond' },
                { value: 's', title: 'second' },
                { value: 'm', title: 'minute' },
                { value: 'h', title: 'hour' },
            ];
        }
        return [
            { value: 'ms', title: 'milliseconds' },
            { value: 's', title: 'seconds' },
            { value: 'm', title: 'minutes' },
            { value: 'h', title: 'hours' },
        ];
    }

    _setInputs(pause?: number | string): void {
        this.setState(
            {
                inputs: [
                    {
                        nameRender: 'renderNumber',
                        attr: 'pause',
                        defaultValue: 100,
                        noHelperText: true,
                    },
                    {
                        nameRender: 'renderSelect',
                        attr: 'unit',
                        defaultValue: 'ms',
                        options: this._getOptions(pause),
                    },
                ],
            },
            () => super.onTagChange(),
        );
    }

    onValueChanged(value: any, attr: string): void {
        if (attr === 'pause') {
            this._setInputs(value);
        }
    }

    onTagChange(): void {
        this._setInputs();
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'actions',
            name: 'Pause',
            id: 'ActionPause',
            icon: 'Pause',
            title: 'Make a pause between actions',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return ActionPause.getStaticData();
    }
}

export default ActionPause;
