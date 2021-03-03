import GenericBlock from '../GenericBlock';

class ActionPushover extends GenericBlock {
    constructor(props) {
        super(props, ActionPushover.getStaticData());
        this.cachePromises = {};
    }

    static compile(config, context) {
        let text = (config.text || '').replace(/"/g, '\\"');
        if (!text) {
            return '// no text defined'
        } else {
            return `sendTo("${config.instance}", "send", {
            message: "${text}"${GenericBlock.getReplacesInText(context)},
            title: "${(config.title || '').replace(/"/g, '\\"')}"${GenericBlock.getReplacesInText(context)},
            sound: "${config.sound}"
            priority: ${config.priority}
        });`;
        }
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderInstance',
                    adapter: 'pushover',
                    frontText: 'Instance:',
                    defaultValue: 'pushover.0',
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
                        {value: "pushover", title: "pushover"},
                        {value: "bike", title: "bike"},
                        {value: "bugle", title: "bugle"},
                        {value: "cashregister", title: "cashregister"},
                        {value: "classical", title: "classical"},
                        {value: "cosmic", title: "cosmic"},
                        {value: "falling", title: "falling"},
                        {value: "gamelan", title: "gamelan"},
                        {value: "incoming", title: "incoming"},
                        {value: "intermission", title: "intermission"},
                        {value: "magic", title: "magic"},
                        {value: "mechanical", title: "mechanical"},
                        {value: "pianobar", title: "pianobar"},
                        {value: "siren", title: "siren"},
                        {value: "spacealarm", title: "spacealarm"},
                        {value: "tugboat", title: "tugboat"},
                        {value: "alien", title: "alien"},
                        {value: "climb", title: "climb"},
                        {value: "persistent", title: "persistent"},
                        {value: "echo", title: "echo"},
                        {value: "updown", title: "updown"},
                        {value: "none", title: "none"},
                    ]
                },
                {
                    nameRender: 'renderSelect',
                    attr: 'priority',
                    defaultValue: -1,
                    frontText: 'Priority:',
                    options: [
                        {value: -1, title: "quiet"},
                        {value: 0, title: "normal"},
                        {value: 1, title: "high-priority"},
                        {value: 2, title: "acknowledgment"},
                    ]
                }
            ]
        }, () => super.onTagChange());
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: 'Pushover',
            id: 'ActionPushover',
            adapter: 'pushover',
            title: 'Sends message via pushover',
            helpDialog: 'You can use %s in the text to display current trigger value or %id to display the triggered object ID'
        }
    }

    getData() {
        return ActionPushover.getStaticData();
    }
}

export default ActionPushover;
