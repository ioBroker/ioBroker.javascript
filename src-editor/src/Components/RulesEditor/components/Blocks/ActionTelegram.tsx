import { I18n } from '@iobroker/adapter-react-v5';
import { GenericBlock, type GenericBlockProps } from '../GenericBlock';
import type { RuleBlockConfigActionTelegram, RuleBlockDescription, RuleContext } from '@/Components/RulesEditor/types';

class ActionTelegram extends GenericBlock<RuleBlockConfigActionTelegram> {
    private readonly cachePromises: Record<string, Promise<ioBroker.State | null | undefined>>;

    constructor(props: GenericBlockProps<RuleBlockConfigActionTelegram>) {
        super(props, ActionTelegram.getStaticData());
        this.cachePromises = {};
    }

    static compile(config: RuleBlockConfigActionTelegram, context: RuleContext): string {
        const text = (config.text || '').replace(/"/g, '\\"');
        if (!text) {
            return `// no text defined
_sendToFrontEnd(${config._id}, {text: 'No text defined'});`;
        }
        return `// Telegram ${text || ''}
\t\tconst subActionVar${config._id} = "${(text || '').replace(/"/g, '\\"')}"${GenericBlock.getReplacesInText(context)};
\t\t_sendToFrontEnd(${config._id}, {text: subActionVar${config._id}});
\t\tsendTo("${config.instance}", "send", ${config.user && config.user !== '_' ? `{user: "${(config.user || '').replace(/"/g, '\\"')}", text: subActionVar${config._id}}` : `subActionVar${config._id}`});`;
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(debugMessage: { data: { text: string } }): string {
        return `${I18n.t('Sent:')} ${debugMessage.data.text}`;
    }

    onValueChanged(value: any, attr: string): void {
        if (attr === 'instance') {
            this._setUsers(value);
        }
    }

    _setUsers(instance?: string): void {
        instance = instance || this.state.settings.instance || 'telegram.0';
        if (!(this.cachePromises[instance] instanceof Promise)) {
            this.cachePromises[instance] = this.props.socket.getState(`${instance}.communicate.users`);
        }
        if (!this.state.settings._id) {
            return this.setState(
                {
                    inputs: [
                        {
                            nameRender: 'renderSelect',
                            adapter: 'telegram',
                            frontText: 'Instance:',
                            defaultValue: 'telegram.0',
                            attr: 'instance',
                        },
                        {
                            nameRender: 'renderSelect',
                            attr: 'user',
                            options: [{ title: 'telegram.0', value: 'telegram.0' }],
                            defaultValue: '',
                            frontText: 'User:',
                        },
                        {
                            nameRender: 'renderModalInput',
                            attr: 'text',
                            defaultValue: 'Hallo',
                            nameBlock: '',
                            frontText: 'Text:',
                        },
                    ],
                },
                () => super.onTagChange(),
            );
        }

        void this.cachePromises[instance].then((usersObj: ioBroker.State | null | undefined) => {
            let users: { title: string; value: string }[];
            try {
                const usersA = usersObj?.val ? JSON.parse(usersObj.val as string) : null;
                users = usersA
                    ? Object.keys(usersA).map(user => ({
                          title: usersA[user].userName || usersA[user].firstName,
                          value: user,
                      }))
                    : [];
                users = users || [];
                users.unshift({ title: 'all', value: '' });
            } catch {
                users = [{ title: 'all', value: '' }];
            }

            this.setState(
                {
                    inputs: [
                        {
                            nameRender: 'renderInstance',
                            adapter: 'telegram',
                            frontText: 'Instance:',
                            defaultValue: 'telegram.0',
                            attr: 'instance',
                        },
                        {
                            nameRender: 'renderSelect',
                            attr: 'user',
                            options: users,
                            defaultValue: '_',
                            frontText: 'User:',
                        },
                        {
                            nameRender: 'renderModalInput',
                            attr: 'text',
                            defaultValue: 'Hallo',
                            nameBlock: '',
                            frontText: 'Text:',
                        },
                    ],
                },
                () => super.onTagChange(),
            );
        });
    }

    onTagChange(): void {
        this._setUsers();
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'actions',
            name: 'Telegram',
            id: 'ActionTelegram',
            adapter: 'telegram',
            title: 'Sends message via telegram',
            helpDialog:
                'You can use %s in the text to display current trigger value or %id to display the triggered object ID',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return ActionTelegram.getStaticData();
    }
}

export default ActionTelegram;
