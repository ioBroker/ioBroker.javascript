import { GenericBlock, type GenericBlockProps } from '../GenericBlock';
import type { RuleBlockConfigActionPushsafer, RuleBlockDescription, RuleContext } from '@/Components/RulesEditor/types';

class ActionPushsafer extends GenericBlock<RuleBlockConfigActionPushsafer> {
    constructor(props: GenericBlockProps<RuleBlockConfigActionPushsafer>) {
        super(props, ActionPushsafer.getStaticData());
    }

    static compile(config: RuleBlockConfigActionPushsafer, context: RuleContext): string {
        const text = (config.text || '').replace(/"/g, '\\"');
        if (!text) {
            return `// no text defined
_sendToFrontEnd(${config._id}, {text: 'No text defined'});`;
        }
        return `// Pushsafer ${config.text || ''}
\t\tconst subActionVar${config._id} = "${text}"${GenericBlock.getReplacesInText(context)};
\t\t_sendToFrontEnd(${config._id}, {text: subActionVar${config._id}});            
\t\tsendTo("${config.instance}", "send", {
\t\t    message: subActionVar${config._id},
\t\t    title: "${(config.title || '').replace(/"/g, '\\"')}"${GenericBlock.getReplacesInText(context)},
\t\t    ${config.sound && config.sound !== '_' ? `sound: "${config.sound}",` : ''}
\t\t    priority: ${config.priority},
\t\t    ${config.vibration && config.vibration !== '_' ? `vibration: ${config.vibration},` : ''}
\t\t});`;
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(debugMessage: { data: { text: string } }): string {
        return `Sent: ${debugMessage.data.text}`;
    }

    onTagChange(): void {
        this.setState(
            {
                inputs: [
                    {
                        nameRender: 'renderInstance',
                        adapter: 'pushsafer',
                        frontText: 'Instance:',
                        defaultValue: 'pushsafer.0',
                        attr: 'instance',
                    },
                    {
                        nameRender: 'renderModalInput',
                        attr: 'text',
                        defaultValue: 'Hello',
                        nameBlock: '',
                        frontText: 'Text:',
                    },
                    {
                        nameRender: 'renderText',
                        attr: 'title',
                        defaultValue: 'ioBroker',
                        frontText: 'Title:',
                    },
                    {
                        nameRender: 'renderSelect',
                        attr: 'sound',
                        defaultValue: 'magic',
                        frontText: 'Sound:',
                        doNotTranslate: true,
                        options: [
                            { value: '_', title: 'Device Default' },
                            { value: '0', title: 'Silent' },
                            { value: '1', title: 'Ahem (IM)' },
                            { value: '2', title: 'Applause (Mail)' },
                            { value: '3', title: 'Arrow (Reminder)' },
                            { value: '4', title: 'Baby (SMS)' },
                            { value: '5', title: 'Bell (Alarm)' },
                            { value: '6', title: 'Bicycle (Alarm2)' },
                            { value: '7', title: 'Boing (Alarm3)' },
                            { value: '8', title: 'Buzzer (Alarm4)' },
                            { value: '9', title: 'Camera (Alarm5)' },
                            { value: '10', title: 'Car Horn (Alarm6)' },
                            { value: '11', title: 'Cash Register (Alarm7)' },
                            { value: '12', title: 'Chime (Alarm8)' },
                            { value: '13', title: 'Creaky Door (Alarm9)' },
                            { value: '14', title: 'Cuckoo Clock (Alarm10)' },
                            { value: '15', title: 'Disconnect (Call)' },
                            { value: '16', title: 'Dog (Call2)' },
                            { value: '17', title: 'Doorbell (Call3)' },
                            { value: '18', title: 'Fanfare (Call4)' },
                            { value: '19', title: 'Gun Shot (Call5)' },
                            { value: '20', title: 'Honk (Call6)' },
                            { value: '21', title: 'Jaw Harp (Call7)' },
                            { value: '22', title: 'Morse (Call8)' },
                            { value: '23', title: 'Electricity (Call9)' },
                            { value: '24', title: 'Radio Tuner (Call10)' },
                            { value: '25', title: 'Sirens' },
                            { value: '26', title: 'Military Trumpets' },
                            { value: '27', title: 'Ufo' },
                            { value: '28', title: 'Whah Whah Whah' },
                            { value: '29', title: 'Man Saying Goodbye' },
                            { value: '30', title: 'Man Saying Hello' },
                            { value: '31', title: 'Man Saying No' },
                            { value: '32', title: 'Man Saying Ok' },
                            { value: '33', title: 'Man Saying Ooohhhweee' },
                            { value: '34', title: 'Man Saying Warning' },
                            { value: '35', title: 'Man Saying Welcome' },
                            { value: '36', title: 'Man Saying Yeah' },
                            { value: '37', title: 'Man Saying Yes' },
                            { value: '38', title: 'Beep short' },
                            { value: '39', title: 'Weeeee short' },
                            { value: '40', title: 'Cut in and out short' },
                            { value: '41', title: 'Finger flicking glas short' },
                            { value: '42', title: 'Wa Wa Waaaa short' },
                            { value: '43', title: 'Laser short' },
                            { value: '44', title: 'Wind Chime short' },
                            { value: '45', title: 'Echo short' },
                            { value: '46', title: 'Zipper short' },
                            { value: '47', title: 'HiHat short' },
                            { value: '48', title: 'Beep 2 short' },
                            { value: '49', title: 'Beep 3 short' },
                            { value: '50', title: 'Beep 4 short' },
                            { value: '51', title: 'The Alarm is armed' },
                            { value: '52', title: 'The Alarm is disarmed' },
                            { value: '53', title: 'The Backup is ready' },
                            { value: '54', title: 'The Door is closed' },
                            { value: '55', title: 'The Door is opend' },
                            { value: '56', title: 'The Window is closed' },
                            { value: '57', title: 'The Window is open' },
                            { value: '58', title: 'The Light is off' },
                            { value: '59', title: 'The Light is on' },
                            { value: '60', title: 'The Doorbell rings' },
                            { value: '61', title: 'Pager short' },
                            { value: '62', title: 'Pager long' },
                        ],
                    },
                    {
                        nameRender: 'renderSelect',
                        attr: 'priority',
                        defaultValue: 0,
                        frontText: 'Priority:',
                        options: [
                            { value: -2, title: 'lowest priority' },
                            { value: -1, title: 'lower priority' },
                            { value: 0, title: 'normal priority' },
                            { value: 1, title: 'high priority' },
                            { value: 2, title: 'highest priority' },
                        ],
                    },
                    {
                        nameRender: 'renderSelect',
                        attr: 'vibration',
                        defaultValue: 0,
                        frontText: 'Vibration:',
                        options: [
                            { value: '_', title: 'default' },
                            { value: 1, title: '1' },
                            { value: 2, title: '2' },
                            { value: 3, title: '3' },
                        ],
                    },
                ],
            },
            () => super.onTagChange(),
        );
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'actions',
            name: 'Pushsafer',
            id: 'ActionPushsafer',
            adapter: 'pushsafer',
            title: 'Sends message via Pushsafer',
            helpDialog:
                'You can use %s in the text to display current trigger value or %id to display the triggered object ID',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return ActionPushsafer.getStaticData();
    }
}

export default ActionPushsafer;
