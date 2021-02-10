import {Input} from  '@material-ui/core';

const icon = 'base64';

const SayIt = {
    name: 'SayIt',
    Icon: (props) => <img {...props} src={icon} />,
    typeBlock: 'then',

    // acceptedOn: ['then', 'else'],
    type: 'action',
    compile: (config, context) => `setState('id', obj.val);`,
    getConfig: () => { },
    setConfig: (config) => { },
    _acceptedBy: 'actions', // where it could be acceped: trigger, condition, action
    _type: 'action1',
    _name: { en: 'Action', ru: 'Действие' },
    _inputs: [
        { 
            nameRender: 'rendererSayIt', 
            name: { en: 'Object ID' }, 
            attr: 'objectID', 
            type: 'oid', 
            default: '', 
            icon: '' 
        }
    ],
    rendererSayIt: props => {
        return <Input />
    }
};

export default SayIt;