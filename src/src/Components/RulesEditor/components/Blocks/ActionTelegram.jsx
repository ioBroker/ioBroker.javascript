import GenericBlock from '../GenericBlock';
import { I18n } from '@iobroker/adapter-react-v5';

class ActionTelegram extends GenericBlock {
    constructor(props) {
        super(props, ActionTelegram.getStaticData());
        this.cachePromises = {};
    }

    static compile(config, context) {
        let text = (config.text || '').replace(/"/g, '\\"');
        if (!text) {
            return `// no text defined
_sendToFrontEnd(${config._id}, {text: 'No text defined'});`;
        } else {
            return `// Telegram ${text || ''}
\t\tconst subActionVar${config._id} = "${(text || '').replace(/"/g, '\\"')}"${GenericBlock.getReplacesInText(context)};
\t\t_sendToFrontEnd(${config._id}, {text: subActionVar${config._id}});
\t\tsendTo("${config.instance}", "send", ${config.user && config.user !== '_' ? `{user: "${(config.user || '').replace(/"/g, '\\"')}", text: subActionVar${config._id}}` : `subActionVar${config._id}`});`;
        }
    }

    renderDebug(debugMessage) {
        return `${I18n.t('Sent:')} ${debugMessage.data.text}`;
    }

    onValueChanged(value, attr) {
        if (attr === 'instance') {
            this._setUsers(value);
        }
    }

    _setUsers(instance) {
        instance = instance || this.state.settings.instance || 'telegram.0';
        this.cachePromises[instance] = this.cachePromises[instance] || this.props.socket.getState(`${instance}.communicate.users`);
        if (!this.state.settings._id) {
            return this.setState({
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
                        options: [{title: 'telegram.0', value: 'telegram.0'}],
                        defaultValue: '',
                        frontText: 'User:',
                    },
                    {
                        nameRender: 'renderModalInput',
                        attr: 'text',
                        defaultValue: 'Hallo',
                        nameBlock: '',
                        frontText: 'Text:',
                    }
                ]
            }, () => super.onTagChange());
        }

        this.cachePromises[instance]
            .then(users => {
                try {
                    users = users?.val ? JSON.parse(users.val) : null;
                    users = users && Object.keys(users).map(user => ({title: users[user].userName || users[user].firstName, value: user}));
                    users = users || [];
                    users.unshift({ title: 'all', value: '' });
                } catch (e) {
                    users = [{ title: 'all', value: '' }];
                }

                this.setState({
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
                    ]
                }, () => super.onTagChange());
            });
    }

    onTagChange(tagCard) {
        this._setUsers();
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: 'Telegram',
            id: 'ActionTelegram',
            adapter: 'telegram',
            title: 'Sends message via telegram',
            helpDialog: 'You can use %s in the text to display current trigger value or %id to display the triggered object ID',
        }
    }

    getData() {
        return ActionTelegram.getStaticData();
    }
}

export default ActionTelegram;
