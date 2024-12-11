import { GenericBlock, type GenericBlockProps } from '../GenericBlock';
import type { RuleBlockConfigActionExec, RuleBlockDescription, RuleContext, RuleTagCardTitle } from '../../types';

class ActionExec extends GenericBlock<RuleBlockConfigActionExec> {
    constructor(props: GenericBlockProps<RuleBlockConfigActionExec>) {
        super(props, ActionExec.getStaticData());
    }

    static compile(config: RuleBlockConfigActionExec, context: RuleContext): string {
        return `// exec "${config.exec}"
\t\tconst subActionVar${config._id} = "${(config.exec || '').replace(/"/g, '\\"')}"${GenericBlock.getReplacesInText(context)};
\t\t_sendToFrontEnd(${config._id}, {exec: subActionVar${config._id}});
\t\tconsole.log(subActionVar${config._id});`;
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(debugMessage: { data: RuleBlockConfigActionExec }): string {
        return `Exec: ${debugMessage.data.exec}`;
    }

    onTagChange(tagCard: RuleTagCardTitle): void {
        this.setState(
            {
                inputs: [
                    {
                        nameRender: 'renderModalInput',
                        attr: 'exec',
                        defaultValue: 'ls /opt/iobroker',
                        nameBlock: 'Shell command',
                    },
                ],
            },
            () => super.onTagChange(tagCard),
        );
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'actions',
            name: 'Exec',
            id: 'ActionExec',
            icon: 'Apps',
            title: 'Executes some shell command',
            helpDialog:
                'You can use %s in the command to use current trigger value or %id to use the triggered object ID',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return ActionExec.getStaticData();
    }
}

export default ActionExec;
