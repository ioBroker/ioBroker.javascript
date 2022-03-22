import TriggerScriptSave from '../Blocks/TriggerScriptSave';
import TriggerSchedule from '../Blocks/TriggerSchedule';
import TriggerState from '../Blocks/TriggerState';
import ConditionState from '../Blocks/ConditionState';
import ConditionTime from '../Blocks/ConditionTime';
import ConditionAstrological from '../Blocks/ConditionAstrological';
import ActionSetState from '../Blocks/ActionSetState';
import ActionExec from '../Blocks/ActionExec';
import ActionHTTPCall from '../Blocks/ActionHTTPCall';
import ActionPrintText from '../Blocks/ActionPrintText';
import ActionPause from '../Blocks/ActionPause';
import ActionFunction from '../Blocks/ActionFunction';
import ActionSetStateDelayed from '../Blocks/ActionSetStateDelayed';
import ActionOperateStates from '../Blocks/ActionOperateStates';

const StandardBlocks = [
    TriggerSchedule,
    TriggerScriptSave,
    TriggerState,
    ConditionState,
    ConditionTime,
    ConditionAstrological,
    ActionSetState,
    ActionExec,
    ActionHTTPCall,
    ActionPrintText,
    ActionPause,
    ActionFunction,
    ActionSetStateDelayed,
    ActionOperateStates,
];

export default StandardBlocks;