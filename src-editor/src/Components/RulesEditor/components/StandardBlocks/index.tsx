import TriggerScriptSave from '../Blocks/TriggerScriptSave';
import TriggerSchedule from '../Blocks/TriggerSchedule';
import TriggerState from '../Blocks/TriggerState';
import TriggerMessage from '../Blocks/TriggerMessage';
import TriggerFile from '../Blocks/TriggerFile';
import ConditionState from '../Blocks/ConditionState';
import ConditionTime from '../Blocks/ConditionTime';
import ConditionAstronomical from '../Blocks/ConditionAstronomical';
import ConditionWeekday from '../Blocks/ConditionWeekday';
import ConditionFunction from '../Blocks/ConditionFunction';
import ActionSendTo from '../Blocks/ActionSendTo';
import ActionNotification from '../Blocks/ActionNotification';
import ActionToggleState from '../Blocks/ActionToggleState';
import ActionSetState from '../Blocks/ActionSetState';
import ActionExec from '../Blocks/ActionExec';
import ActionHTTPCall from '../Blocks/ActionHTTPCall';
import ActionPrintText from '../Blocks/ActionPrintText';
import ActionPause from '../Blocks/ActionPause';
import ActionFunction from '../Blocks/ActionFunction';
import ActionSetStateDelayed from '../Blocks/ActionSetStateDelayed';
import ActionOperateStates from '../Blocks/ActionOperateStates';
import type { GenericBlock } from '@/Components/RulesEditor/components/GenericBlock';

const StandardBlocks: (typeof GenericBlock<any>)[] = [
    TriggerSchedule,
    TriggerScriptSave,
    TriggerState,
    TriggerMessage,
    TriggerFile,
    ConditionState,
    ConditionTime,
    ConditionAstronomical,
    ConditionWeekday,
    ConditionFunction,
    ActionSetState,
    ActionToggleState,
    ActionSendTo,
    ActionExec,
    ActionHTTPCall,
    ActionPrintText,
    ActionNotification,
    ActionPause,
    ActionFunction,
    ActionSetStateDelayed,
    ActionOperateStates,
];

export default StandardBlocks;
