import TriggerScriptSave from '../Blocks/TriggerScriptSave';
import TriggerSchedule from '../Blocks/TriggerSchedule';
import TriggerState from '../Blocks/TriggerState';
import ConditionState from '../Blocks/ConditionState';
import ConditionTime from '../Blocks/ConditionTime';
import ConditionAstronomical from '../Blocks/ConditionAstronomical';
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
    ConditionState,
    ConditionTime,
    ConditionAstronomical,
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
