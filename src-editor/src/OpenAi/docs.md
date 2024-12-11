### exec - execute some OS command, like `cp file1 file2`
```js
exec(cmd, [options], callback);
```

Execute system command and get the outputs.

```js
// reboot linux system :)
exec('reboot');

// Get the list of files and directories in /var/log
exec('ls /var/log', function (error, stdout, stderr) {
    log(`stdout: ${stdout}`);
});
```

Node.js uses /bin/sh to execute commands. If you want to use another shell, you can use the option object as described in the [Node.js documentation](https://nodejs.org/api/child_process.html#child_processexeccommand-options-callback) for child_process.exec.
It is the best practice to always use fill path names to commands to make sure the right command is executed.

**Notice:** you must enable *Enable command "exec"* option to use this feature!

### on - Subscribe on changes or updates of some state
```js
on(pattern, callbackOrId, value);
```

The callback function will return the object as parameter with the following content:
```js
{
    'id': 'javascript.0.myplayer',
    'state': {
        'val':  'new state',
        'ts':   1416149118,
        'ack':  true,
        'lc':   1416149118,
        'from': 'system.adapter.sonos.0'
    },
    'oldState': {
        'val':  'old state',
        'ts':   1416148233,
        'ack':  true,
        'lc':   1416145154,
        'from': 'system.adapter.sonos.0'
    }
}
```
**Note:** `state` was previously called `newState`. That is still working.

Example:
```js
let timer;

// Create state "javascript.0.counter"
createState('counter', 0);

// On change
on('adapter.0.device.channel.sensor', (data) => {
    // But not ofter than 30 seconds
    if (!timer) {
        timer = setTimeout(() => {
            timer = null;
        }, 30000);

        // Set acknowledged value
        setState('counter', 1 + getState('counter'), true/*ack*/);

        // Or to set unacknowledged command
        setState('adapter.0.device.channel.actor', true);
    }
});
```

You can use the following parameters to specify the trigger:

| parameter   | type/value | description                                                                                                                                         |
|-----------  |-------     |-----------------------------------------------------------------------------------------------------------------------------------------------------|
| logic       | string     | "and" or "or" logic to combine the conditions \(default: "and"\)                                                                                    |
|             |            |                                                                                                                                                     |
| id          | string     | id is equal to given one                                                                                                                            |
|             | RegExp     | id matched to regular expression                                                                                                                    |
|             | Array      | id matched to a list of allowed IDs                                                                                                                 |
|             |            |                                                                                                                                                     |
| name        | string     | name is equal to given one                                                                                                                          |
|             | RegExp     | name matched to regular expression                                                                                                                  |
|             | Array      | name matched to a list of allowed names                                                                                                             |
|             |            |                                                                                                                                                     |
| change      | string     | "eq", "ne", "gt", "ge", "lt", "le", "any"                                                                                                           |
|             |   "eq"     | (equal)            New value must be equal to old one (state.val == oldState.val)                                                                   |
|             |   "ne"     | (not equal)        New value must be not equal to the old one (state.val != oldState.val) **If pattern is id-string this value is used by default** |
|             |   "gt"     | (greater)          New value must be greater than old value (state.val > oldState.val)                                                              |
|             |   "ge"     | (greater or equal) New value must be greater or equal to old one (state.val >= oldState.val)                                                        |
|             |   "lt"     | (smaller)          New value must be smaller than old one (state.val < oldState.val)                                                                |
|             |   "le"     | (smaller or equal) New value must be smaller or equal to old value (state.val <= oldState.val)                                                      |
|             |  "any"     | Trigger will be raised if just the new value comes                                                                                                  |
|             |            |                                                                                                                                                     |
| val         | mixed      | New value must be equal to given one                                                                                                                |
| valNe       | mixed      | New value must be not equal to given one                                                                                                            |
| valGt       | mixed      | New value must be greater than given one                                                                                                            |
| valGe       | mixed      | New value must be greater or equal to given one                                                                                                     |
| valLt       | mixed      | New value must be smaller than given one                                                                                                            |
| valLe       | mixed      | New value must be smaller or equal to given one                                                                                                     |
|             |            |                                                                                                                                                     |
| ack         | boolean    | Acknowledged state of new value is equal to given one                                                                                               |
| q           | number     | Quality code state of new value is equal to given one. You can use '*' for matching to any code. **If not provided q = 0 is set as pattern!**       |
|             |            |                                                                                                                                                     |
| oldVal      | mixed      | Previous value must be equal to given one                                                                                                           |
| oldValNe    | mixed      | Previous value must be not equal to given one                                                                                                       |
| oldValGt    | mixed      | Previous value must be greater than given one                                                                                                       |
| oldValGe    | mixed      | Previous value must be greater or equal to given one                                                                                                |
| oldValLt    | mixed      | Previous value must be smaller than given one                                                                                                       |
| oldValLe    | mixed      | Previous value must be smaller or equal to given one                                                                                                |
|             |            |                                                                                                                                                     |
| oldAck      | bool       | Acknowledged state of previous value is equal to given one                                                                                          |
| oldQ        | number     | Quality code state of previous value is equal to given one. You can use '*' for matching to any code                                                |
|             |            |                                                                                                                                                     |
| ts          | string     | New value time stamp must be equal to given one (state.ts == ts)                                                                                    |
| tsGt        | string     | New value time stamp must be not equal to the given one (state.ts != ts)                                                                            |
| tsGe        | string     | New value time stamp must be greater than given value (state.ts > ts)                                                                               |
| tsLt        | string     | New value time stamp must be greater or equal to given one (state.ts >= ts)                                                                         |
| tsLe        | string     | New value time stamp must be smaller than given one (state.ts < ts)                                                                                 |
|             |            |                                                                                                                                                     |
| oldTs       | string     | Previous time stamp must be equal to given one (oldState.ts == ts)                                                                                  |
| oldTsGt     | string     | Previous time stamp must be not equal to the given one (oldState.ts != ts)                                                                          |
| oldTsGe     | string     | Previous time stamp must be greater than given value (oldState.ts > ts)                                                                             |
| oldTsLt     | string     | Previous time stamp must be greater or equal to given one (oldState.ts >= ts)                                                                       |
| oldTsLe     | string     | Previous time stamp must be smaller than given one (oldState.ts < ts)                                                                               |
|             |            |                                                                                                                                                     |
| lc          | string     | Last change time stamp must be equal to given one (state.lc == lc)                                                                                  |
| lcGt        | string     | Last change time stamp must be not equal to the given one (state.lc != lc)                                                                          |
| lcGe        | string     | Last change time stamp must be greater than given value (state.lc > lc)                                                                             |
| lcLt        | string     | Last change time stamp must be greater or equal to given one (state.lc >= lc)                                                                       |
| lcLe        | string     | Last change time stamp must be smaller than given one (state.lc < lc)                                                                               |
|             |            |                                                                                                                                                     |
| oldLc       | string     | Previous last change time stamp must be equal to given one (oldState.lc == lc)                                                                      |
| oldLcGt     | string     | Previous last change time stamp must be not equal to the given one (oldState.lc != lc)                                                              |
| oldLcGe     | string     | Previous last change time stamp must be greater than given value (oldState.lc > lc)                                                                 |
| oldLcLt     | string     | Previous last change time stamp must be greater or equal to given one (oldState.lc >= lc)                                                           |
| oldLcLe     | string     | Previous last change time stamp must be smaller than given one (oldState.lc < lc)                                                                   |
|             |            |                                                                                                                                                     |
| channelId   | string     | Channel ID must be equal to given one                                                                                                               |
|             | RegExp     | Channel ID matched to regular expression                                                                                                            |
|             | Array      | Channel ID matched to a list of allowed channel IDs                                                                                                 |
|             |            |                                                                                                                                                     |
| channelName | string     | Channel name must be equal to given one                                                                                                             |
|             | RegExp     | Channel name matched to regular expression                                                                                                          |
|             | Array      | Channel name matched to a list of allowed channel names                                                                                             |
|             |            |                                                                                                                                                     |
| deviceId    | string     | Device ID must be equal to given one                                                                                                                |
|             | RegExp     | Device ID matched to regular expression                                                                                                             |
|             | Array      | Device ID matched to a list of allowed device IDs                                                                                                   |
|             |            |                                                                                                                                                     |
| deviceName  | string     | Device name must be equal to given one                                                                                                              |
|             | RegExp     | Device name matched to regular expression                                                                                                           |
|             | Array      | Device name matched to a list of allowed device names                                                                                               |
|             |            |                                                                                                                                                     |
| enumId      | string     | State belongs to given enum                                                                                                                         |
|             | RegExp     | One enum ID of the state satisfies the given regular expression                                                                                     |
|             | Array      | One enum ID of the state is in the given list of enum IDs                                                                                           |
|             |            |                                                                                                                                                     |
| enumName    | string     | State belongs to given enum                                                                                                                         |
|             | RegExp     | One enum name of the state satisfies the given regular expression                                                                                   |
|             | Array      | One enum name of the state is in the given list of enum names                                                                                       |
|             |            |                                                                                                                                                     |
| from        | string     | New value is from defined adapter                                                                                                                   |
|             | RegExp     | New value is from an adapter that matches the regular expression                                                                                    |
|             | Array      | New value is from an adapter that appears in the given list of allowed adapters                                                                     |
|             |            |                                                                                                                                                     |
| fromNe      | string     | New value is not from defined adapter                                                                                                               |
|             | RegExp     | New value is not from an adapter that matches the regular expression                                                                                |
|             | Array      | New value is not from an adapter that appears in the given list of forbidden adapters                                                               |
|             |            |                                                                                                                                                     |
| oldFrom     | string     | Old value is from defined adapter                                                                                                                   |
|             | RegExp     | Old value is from an adapter that matches the regular expression                                                                                    |
|             | Array      | Old value is from an adapter that appears in the given list of allowed adapters                                                                     |
|             |            |                                                                                                                                                     |
| oldFromNe   | string     | Old value is not from defined adapter                                                                                                               |
|             | RegExp     | Old value is not from an adapter that matches the regular expression                                                                                |
|             | Array      | Old value is not from an adapter that appears in the given list of forbidden adapters                                                               |

Examples:
Trigger on all states with ID `'*.STATE'` if they are acknowledged and have new value `true`.

```js
{
    "id": /\.STATE$/,
    "val": true,
    "ack": true,
    "logic": "and"
}
```

**Note:** you can use RegExp directly:

```js
on(/^system\.adapter\..*\.\d+\.memRss$/, function (obj) {
});

// same as
on({id: /^system\.adapter\..*\.\d+\.memRss$/, change: "ne"}, function (obj) {
});
```

To simply connect two states with each other, write:
```js
on('stateId1', 'stateId2');
```

All changes of *stateId1* will be written to *stateId2*.

If the `value` parameter is set in combination with state id as the second parameter, on any change the state will filled with the `value`.
```js
on('stateId1', 'stateId2', 'triggered');
setState('stateId1', 'new value');

// stateId2 will be set to 'triggered'.
```

Function `on` returns handler back. This handler can be used by unsubscribe.

*Notice:* By default only states with quality 0x00 will be passed to callback function. If you want to get all events, add `{q: '*'}` to pattern structure.

*Notice:* Please note, that by default "change" is equal to "any", except when only id as string is set (like `on('id', () => {});`). In last case change will be set to "ne".

*Notice:* If you want to also get state deletions/expires as trigger, you need to use change with `ne` or `any` AND q with `*` as filter!

*Notice:* from 4.3.2 it is possible to write a type of trigger as second parameter: `on('my.id.0', 'any', obj => log(obj.state.val));`

### once
Registers a one-time subscription which automatically unsubscribes after the first invocation. Same as [on](#on---subscribe-on-changes-or-updates-of-some-state), but just executed once.

```js
once(pattern, callback);
```

### subscribe - same as **[on](#on---subscribe-on-changes-or-updates-of-some-state)**

### unsubscribe
```js
unsubscribe(id);
// or
unsubscribe(handler);
```

Remove all subscriptions for given object ID or for given handler.

```js
// By handler
let mySubscription = on({ id: 'javascript.0.myState', change: 'any' }, (data) => {
    // unsubscribe after first trigger
    if (unsubscribe(mySubscription)) {
        log('Subscription deleted');
    }
});

// by Object ID
on({ id: 'javascript.0.myState1', change: 'ne' }, (data) => {
    log('Some event');
});

on({ id: 'javascript.0.myState1', change: 'any' }, (data) => {
    // unsubscribe
    if (unsubscribe('javascript.0.myState1')) {
        log('All subscriptions deleted');
    }
});
```

### getSubscriptions
Get the list of subscriptions.

Example of a result:
```js
{
	"megad.0.dataPointName": [
		{
			"name" : "script.js.NameOfScript",
			"pattern" : {
				"id" : "megad.0.dataPointName",
				"change" : "ne"
			}
		}
	]
}
```

### getFileSubscriptions
Get the list of file subscriptions.

Example of a result:
```js
{
	"vis.0$%$main/*": [
		{
			"name" : "script.js.NameOfScript",
			"id" : "vis.0",
            "fileNamePattern": "main/*"
		}
	]
}
```

### schedule
```js
schedule(pattern, callback);
```

Time scheduler with astro-function.

#### Time schedule
Pattern can be a string with [Cron-Syntax](http://en.wikipedia.org/wiki/Cron), which consists of 5 (without seconds) or 6 (with seconds) digits:
```
* * * * * *
│ │ │ │ │ │
│ │ │ │ │ │
│ │ │ │ │ └───── day of week (0 - 6) (0 to 6 are Sunday to Saturday, or use names; 7 is Sunday, the same as 0)
│ │ │ │ └────────── month (1 - 12)
│ │ │ └─────────────── day of month (1 - 31)
│ │ └──────────────────── hour (0 - 23)
│ └───────────────────────── min (0 - 59)
└───────────────────────────── [optional] sec (0 - 59)
```

```js
// Example with 5 digits:
schedule('*/2 * * * *', () => {
    log('Will be triggered every 2 minutes!');
});

// Example with 6 digits:
schedule('*/3 * * * * *', () => {
    log('Will be triggered every 3 seconds!');
});
```

The pattern can also be an object, it is used especially if seconds are required:

the object could have the following properties:
- `second`
- `minute`
- `hour`
- `date`
- `month`
- `year`
- `dayOfWeek`

```js
schedule({ second: [20, 25] }, () => {
    log('Will be triggered at xx:xx:20 and xx:xx:25 of every minute!');
});

schedule({ hour: 12, minute: 30 }, () => {
    log('Will be triggered at 12:30!');
});
```
Pattern can be a Javascript Date object (some specific time point) - in this case only it will be triggered only one time.

If start or end times for a schedule are needed, this could also be implemented with usage of an object. In this scenario the object has the properties:
- `start`
- `end`
- `rule`

start and end defines a Date object a DateString or a number of milliseconds since 01 January 1970 00:00:00 UTC.
Rule is a schedule string with [Cron-Syntax](http://en.wikipedia.org/wiki/Cron) or an object:
```js
let startTime = new Date(Date.now() + 5000);
let endTime = new Date(startTime.getTime() + 5000);
schedule({ start: startTime, end: endTime, rule: '*/1 * * * * *' }, () => {
    log('It will run after 5 seconds and stop after 10 seconds');
});
```

The rule itself could be also an object:

```js
let today = new Date();
let startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
let endTime =  new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
let ruleData = { hour: 12, minute: 30 };
schedule({ start: startTime, end: endTime, rule: ruleData }, () => {
    log('Will be triggered at 12:30, starting tomorow, ending in 7 days');
});
```

#### Astro-function

Astro-function can be used via "astro" attribute:

```js
schedule({ astro: 'sunrise' }, () => {
    log("Sunrise!");
});

schedule({ astro: 'sunset', shift: 10 }, () => {
    log("10 minutes after sunset!");
});
```

The attribute "shift" is the offset in minutes. It can be negative, too, to define time before astro event.

The following values can be used as attribute in astro-function:

- `"sunrise"`: sunrise (top edge of the sun appears on the horizon)
- `"sunriseEnd"`: sunrise ends (bottom edge of the sun touches the horizon)
- `"goldenHourEnd"`: morning golden hour (soft light, the best time for photography) ends
- `"solarNoon"`: solar noon (sun is in the highest position)
- `"goldenHour"`: evening golden hour starts
- `"sunsetStart"`: sunset starts (bottom edge of the sun touches the horizon)
- `"sunset"`: sunset (sun disappears below the horizon, evening civil twilight starts)
- `"dusk"`: dusk (evening nautical twilight starts)
- `"nauticalDusk"`: nautical dusk (evening astronomical twilight starts)
- `"night"`: night starts (dark enough for astronomical observations)
- `"nightEnd"`: night ends (morning astronomical twilight starts)
- `"nauticalDawn"`: nautical dawn (morning nautical twilight starts)
- `"dawn"`: dawn (morning nautical twilight ends, morning civil twilight starts)
- `"nadir"`: nadir (darkest moment of the night, sun is in the lowest position)

**Note:** to use "astro"-function the "latitude" and "longitude" must be defined in javascript adapter settings.

**Note:** in some places sometimes it could be so, that no night/nightEnd exists. Please read [here](https://github.com/mourner/suncalc/issues/70) about it.

**Note:** you can use "on" function for schedule with small modification:
```js
on({ time: '*/2 * * * *' }, () => {
    log((new Date()).toString() + " - Will be triggered every 2 minutes!");
});

on({ time: { hour: 12, minute: 30 }}, () => {
    log((new Date()).toString() + " - Will be triggered at 12:30!");
});

on({ astro: 'sunset', shift: 10 }, () => {
    log((new Date()).toString() + " - 10 minutes after sunset!");
});
```

## scheduleById
```js
scheduleById(id, callback);
scheduleById(id, ack, callback);
```

Allows to create a schedule based on a state value. If the state value changes, the old schedule will be deleted and a new schedule is created automatically.

Supported formats:

- `[h]h:[m]m:ss` (e.g. `12:42:15`, `15:3:12`, `3:10:25`)
- `[h]h:[m]m` (e.g. `13:37`, `9:40`)

```js
scheduleById('0_userdata.0.configurableTimeFormat', () => {
    log('Executed!');
});
```

Example: Create state and register schedule on changes:

```js
createState(
    '0_userdata.0.myTime',
    '00:00:00', // default value
    {
        type: 'string',
        read: true,
        write: true
    },
    () => {
        scheduleById('0_userdata.0.myTime', () => {
            log('Executed!');
        });
    }
);
```

### getSchedules
```js
const list = getSchedules(true);
```
Returns the list of all CRON jobs and schedules (except astro).
Argument must be `true` if you want to get the list for **every running script**. Otherwise only schedules in the current script will be returned.

```js
const list = getSchedules(true);
list.forEach(schedule => log(JSON.stringify(schedule)));

// clear all schedules in all scripts!
list.forEach(schedule => clearSchedule(schedule));
```

Example output:
```
2020-11-01 20:15:19.929  - {"type":"cron","pattern":"0 * * * *","scriptName":"script.js.Heizung","id":"cron_1604258108384_74924"}
2020-11-01 20:15:19.931  - {"type":"schedule","schedule":"{"period":{}}","scriptName":"script.js.Heizung","id":"schedule_19576"}
```

### clearSchedule
If **no** "astro" function is used, you can cancel the schedule later. To allow this, the schedule object must be saved:

```js
let sch = schedule('*/2 * * * *', () => { /* ... */ });

// later:
clearSchedule(sch);
```

### getAttr
```js
getAttr({ attr1: { attr2: 5 } }, 'attr1.attr2');
```
Returns an attribute of the object. Path to attribute can be nested, like in the example.

If the first attribute is string, the function will try to parse the string as JSON string.

### getAstroDate
```js
getAstroDate(pattern, date, offsetMinutes);
```
Returns a javascript Date object for the specified astro-name (e.g. `"sunrise"` or `"sunriseEnd"`). For valid values see the list of allowed values in the [Astro](#astro--function) section in the *schedule* function.

The returned Date object is calculated for the passed *date*. If no date is provided, the current day is used.

```js
let sunriseEnd = getAstroDate('sunriseEnd');
log(`Sunrise ends today at ${sunriseEnd.toLocaleTimeString()}`);

let today = new Date();
let tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
let tomorrowNight = getAstroDate('night', tomorrow);
```

**Note: Depending on your geographical location, there can be cases where e.g. 'night'/'nightEnd' do not exist on certain time points (e.g. locations north in May/June each year!**

You can use webpages like [suncalc.net](http://suncalc.net) to check if the time points are correct.

### isAstroDay
```js
isAstroDay();
```
Returns `true` if the current time is between the astro sunrise and sunset.

### compareTime
```js
compareTime(startTime, endTime, operation, timeToCompare);
```
Compare given time with limits.

If `timeToCompare` is not given, so the actual time will be used.

The following operations are possible:

- `">"` - if given time is greater than `startTime`
- `">="` - if given time is greater or equal to `startTime`
- `"<"` - if given time is less than `startTime`
- `"<="` - if given time is less or equal to `startTime`
- `"=="` - if given time is equal to `startTime`
- `"<>"` - if given time is not equal to `startTime`
- `"between"` - if given time is between `startTime` and `endTime`
- `"not between"` - if given time is not between `startTime` and `endTime`

Time can be Date object or Date with time or just time.

You can use astro-names for the time definition. All 3 parameters can be set as astro time.
Following values are possible: `sunrise`, `sunset`, `sunriseEnd`, `sunsetStart`, `dawn`, `dusk`, `nauticalDawn`, `nauticalDusk`, `nightEnd`, `night`, `goldenHourEnd`, `goldenHour`.
See [Astro](#astro--function) for detail.

```js
log(compareTime('sunsetStart', 'sunsetEnd', 'between') ? 'Now is sunrise' : 'Now is no sunrise');
```

It is possible to define the time with offset too:

```js
log(compareTime({ astro: 'sunsetStart', offset: 30 }, { astro: 'sunrise', offset: -30 }, '>') ? 'Now is at least 30 minutes after sunset' : 'No idea');
```

Structure of an astro object.

```js
{
    astro: 'sunsetStart',// mandatory, can be written as string and not as object if offset and date are default
    offset: 30,          // optional
    date:   new Date()   // optional
}
```

### setState
```js
setState(id, state, ack, callback);
```

*Note*: The following commands are identical

```js
setState('myState', 1, false);
setState('myState', { val: 1, ack: false });
setState('myState', 1);
```

Please refer to https://github.com/ioBroker/ioBroker/wiki/Adapter-Development-Documentation#commands-and-statuses for usage of `ack`.
Short:
- `ack` = false : Script wants to send a command to be executed by the target device/adapter
- `ack` = true  : Command was successfully executed, and state is updated as a positive result

### setStateAsync
```js
await setStateAsync(id, state, ack);
```
Same as setState, but with `promise`.

### setStateDelayed
```js
setStateDelayed(id, state, isAck, delay, clearRunning, callback);
```

Same as setState but with delay in milliseconds. You can clear all running delays for this ID (by default). E.g.

```js
// Switch ON the light in the kitchen in one second
setStateDelayed('Kitchen.Light.Lamp', true,  1000);

// Switch OFF the light in the kitchen in 5 seconds and let first timeout run.
setStateDelayed('Kitchen.Light.Lamp', false, 5000, false, () => {
    log('Lamp is OFF');
});
```
This function returns the handler of the timer, and this timer can be individually stopped by clearStateDelayed

### setStateChanged
```js
await setStateChanged(id, state, ack);
```
Same as setState, but set value only if the value is really changed.

### setStateChangedAsync
```js
await setStateChangedAsync(id, state, ack);
```
Same as setStateChanged, but with `promise`.

### clearStateDelayed
```js
clearStateDelayed(id);
```

Clears all delayed tasks for specified state ID or some specific delayed task.

```js
setStateDelayed('Kitchen.Light.Lamp', false,  10000); // Switch OFF the light in the kitchen in ten second
let timer = setStateDelayed('Kitchen.Light.Lamp', true, 5000, false); // Switch ON the light in the kitchen in five second
clearStateDelayed('Kitchen.Light.Lamp', timer); // Nothing will be switched on
clearStateDelayed('Kitchen.Light.Lamp'); // Clear all running delayed tasks for this ID
```

### getStateDelayed
```js
getStateDelayed(id);
```

This is a synchronous call, and you will get the list of all running timers (setStateDelayed) for this id.
You can call this function without id and get timers for all IDs.
In case you call this function for some specific object ID, you will get the following answer:

```js
getStateDelayed('hm-rpc.0.LQE91119.1.STATE');

// returns an array like
[
	{ timerId: 1, left: 1123,   delay: 5000,  val: true,  ack: false },
	{ timerId: 2, left: 12555,  delay: 15000, val: false, ack: false },
]
```

If you ask for all IDs the answer will look like:

```js
getStateDelayed();

// returns an object like
{
	'hm-rpc.0.LQE91119.1.STATE': [
		{ timerId: 1, left: 1123,   delay: 5000,   val: true,  ack: false },
		{ timerId: 2, left: 12555,  delay: 15000,  val: false, ack: false },
	],
	'hm-rpc.0.LQE91119.2.LEVEL': [
		{ timerId: 3, left: 5679, delay: 10000,   val: 100,  ack: false }
	]
}
```

- `left` is the time left in milliseconds
- `delay` is the initial delay value in milliseconds

You can ask by timerId directly. In this case, the answer will be:

```js
getStateDelayed(3);

// returns an object like
{ id: 'hm-rpc.0.LQE91119.2.LEVEL', left: 5679, delay: 10000, val: 100, ack: false }
```

### getState
```js
getState(id);
```

Returns state with the given id in the following form:

```js
{
    val: value,
    ack: true/false,
    ts: timestamp,
    lc: lastchanged,
    from: origin
}
```

If state does not exist, a warning will be printed in the logs and the object `{ val: null, notExist: true }` will be returned.
To suppress the warning check if the state exists before calling getState (see [existsState](#existsState)).

### getStateAsync
```js
const stateObject = await getStateAsync(id);
```
Same as getState, but with `promise`.

### existsState
```js
existsState(id, (err, isExists) => {});
```

If option "Do not subscribe all states on start" is deactivated, you can use simpler call:

```js
existsState(id)
```
the function returns in this case true or false.

Check if a state exists.

### getObject
```js
getObject(id, enumName);
```
Get description of object id as stored in a system.
You can specify the enumeration name. If this is defined, two additional attributes will be added to result: enumIds and enumNames.
These arrays have all enumerations, where ID is a member of. E.g:

```js
getObject('adapter.N.objectName', 'rooms');
```

gives back in enumIds all rooms, where the requested object is a member. You can define "true" as enumName to get back *all* enumerations.

### setObject
```js
setObject(id, obj, callback);
```
Write an object into DB. This command can be disabled in adapter's settings. Use this function carefully, while the global settings can be damaged.

You should use it to **modify** an existing object you read beforehand, e.g.:
```js
const obj = getObject('adapter.N.objectName');
obj.native.settings = 1;
setObject('adapter.N.objectName', obj, (err) => {
    if (err) log('Cannot write object: ' + err);
});
```

### existsObject
```js
existsObject(id, function (err, isExists) {});
```

If the option "Do not subscribe all states on start" is deactivated, you can use simpler call:

```js
existsObject(id)
```
the function returns in this case true or false.

Check if an object exists.


### extendObject
```js
extendObject(id, obj, callback);
```

It is almost the same as `setObject`, but first it reads the object and tries to merge all settings together.

Use it like this:
```js
// Stop instance
extendObject('system.adapter.sayit.0', {common: {enabled: false}});
```

### deleteObject
```js
deleteObject(id, isRecursive, callback);
```

Delete an object from DB by ID. If the object has type `state`, the state value will be deleted too.

Additional parameter `isRecursive` could be provided, so all children of given ID will be deleted. Very dangerous!

Use it like this:
```js
// Delete state
deleteObject('javascript.0.createdState');
```

*Notice: `isRecursive` option is available only with js-controller >= 2.2.x*

### getIdByName
```js
getIdByName(name, alwaysArray);
```

Returns id of the object with given name.
If there is more than one object with this name, the result will be an array.
If `alwaysArray` flag is set, the result will always be an array if some ID found.
### getEnums
```js
getEnums(enumName);
```

Get the list of existing enumerations with members, like:

```js
getEnums('rooms');

// returns:
[
    {
        "id":"enum.rooms.LivingRoom",
        "members":["hm-rpc.0.JEQ0024123.1","hm-rpc.0.BidCoS-RF.4"],
        "name": "Living room"
    },
    {
        "id":"enum.rooms.Bath",
        "members":["hm-rpc.0.JEQ0024124.1","hm-rpc.0.BidCoS-RF.5"],
        "name": "Bath"
    }
]
```

### createState
```js
createState(name, initialValue, forceCreation, common, native, callback);
```
Create state and object in javascript space if it does not exist, e.g. `javascript.0.mystate`.

!! Prefer to create own data points with the full ID `0_userdata.0.mystate` !!!

#### Parameters:

- `name`: name of the state without namespace, e.g. `mystate`
- `initialValue`: variable can be initialized after created. Value "undefined" means do not initialize value.
- `forceCreation`: create/overwrite state independent of if state yet exists or not.
- `common`: common description of object see description [here](https://github.com/ioBroker/ioBroker/blob/master/doc/SCHEMA.md#state)
- `native`: native description of an object. Any specific information.
- `callback`: called after state is created and initialized.

If you set in `common` the flag `alias` to `true`, then alias will be created with the same name (but in `alias.0` namespace) as the state.
Alias is created only if it does not exist yet.

The following settings for aliases are valid too:
```js
common => {
    alias: {
        id: 'alias.0.myOtherState', // will be created automatically if not already exists
        write: 'val * 1000', // convert function for write to created state
        read: 'val / 1000'   // convert function to read from created state
    }
}
```

or

```js
common => {
    alias: {
        id: 'alias.0.myOtherState', // will be created automatically if not already exists
    }
}
```

It is possible short type of createState:

- `createState('myDatapoint')` - simply create datapoint if it does not exist
- `createState('myDatapoint', 1)` - create datapoint if it does not exist and initialize it with value 1
- `createState('myDatapoint', { type: 'string', role: 'json', read: true, write: false }, () => { log('created'); });` - with common definitions like type, read, write and role
- `createState('myDatapoint', { name: 'My own datapoint', unit: '°C' }, () => { log('created'); });`
- `createState('myDatapoint', 1, { name: 'My own datapoint', unit: '°C' })` - create datapoint if it does not exist with specific name and units

### createStateAsync
```js
await createStateAsync(name, initialValue, forceCreation, common, native);
```

Same as `createState`, but the promise will be returned.

### deleteState
```js
deleteState(name, callback);
```
Delete state and object in javascript space, e.g. `javascript.0.mystate`. States from other adapters cannot be deleted.

```js
deleteState('myDatapoint')
```
simply delete datapoint if exists.

### deleteStateAsync
```js
await deleteStateAsync(name);
```

Same as `deleteState`, but the promise will be returned.

### createAlias
```js
createAlias(name, alias, forceCreation, common, native, callback);
```

Create alias in `alias.0` space if it does not exist, e.g. `javascript.0.myalias` and reference to a state or read/write states.
The common definition is taken from the read alias id object, but a provided common takes precedence.

#### Parameters:

- `name`: id of the new alias state with (possible without alias namespace), e.g. `test.mystate` (namespace `alias.0.` will be added = `alias.0.test.mystate`)
- `alias`: can be either an existing state id as string or an object with full alias definition including read/write ids and read/write functions. Note: Alias definitions can not be set as part of the common parameter!
- `forceCreation`: create/overwrite alias independent of if state yet exists or not.
- `common`: common description of alias object see description [here](https://github.com/ioBroker/ioBroker/blob/master/doc/SCHEMA.md#state). Values provided here will take precedence over the common definition of the read alias id object. Not: Alias definitions can not be set as part of this common parameter, see alias parameter!
- `native`: native description of an object. Any specific information.
- `callback`: called after state is created and initialized.

It is possible a short type of createAlias:

- `createAlias('myAlias', 'myDatapoint')` - simply create alias.0.myAlias that refernces to javascript.X.myDatapoint if it does not exist
- `createAlias('myAlias', { id: { read: 'myReadDatapoint', write: 'myWriteDatapoint' }})` - creates alias and reference to different read/write states

For other details, see createState, it is similar.

### createAliasAsync
```js
await createAliasAsync(name, alias, forceCreation, common, native);
```

Same as `createAlias`, but the promise will be returned.

### sendTo
```js
sendTo(adapter, command, message, callback);
sendTo(adapter, command, message, options, callback);
```

Send a message to a specific or all adapter instances. When using the adapter name, the message is sent to all instances.

To get specific information about messages, you must read the documentation for a particular adapter.

Example (with custom timeout):

```js
sendTo('telegram', { user: 'UserName', text: 'Test message' }, { timeout: 2000 });
```

Some adapters also support responses to the sent messages. (e.g. history, sql, telegram)
The response is only returned to the callback if the message is sent to a specific instance!

Example (with callback):

```js
sendTo('telegram.0', { user: 'UserName', text: 'Test message' }, (res) => {
    log(`Sent to ${res} users`);
});
```

*Default timeout is 20000 milliseconds (if a callback function has been defined)*

```js
sendTo('telegram.0', { user: 'UserName', text: 'Test message' }, { timeout: 2000 }, (res) => {
    log(`Sent to ${res} users`);
});
```

### sendToAsync
```js
await sendToAsync(adapter, command, message);
await sendToAsync(adapter, command, message, options);
```
Same as sendTo, but with `promise`.

Example:

```js
const res = await sendToAsync('sql.0', 'getEnabledDPs', {});
log(JSON.stringify(res));
```

### sendToHost
```js
sendToHost(hostName, command, message, callback);
```

Send a message to controller instance.

The following commands are supported:
- `"cmdExec"`
- `"getRepository"`
- `"getInstalled"`
- `"getVersion"`
- `"getDiagData"`
- `"getLocationOnDisk"`
- `"getDevList"`
- `"getLogs"`
- `"getHostInfo"`

It is rather specific commands and are not required often.

Example:

```js
sendToHost('myComputer', 'cmdExec', { data: 'ls /' }, (res) => {
    log('List of files: ' + res.data);
});
```

**Notice:** you must enable *Enable command "setObject"* option to call it.

### sendToHostAsync
```js
await sendToHostAsync(hostName, command, message);
```
Same as sendToHost, but with `promise`.

### setInterval
```js
setInterval(callback, ms, arg1, arg2, arg3, arg4);
```

Same as javascript `setInterval`.

### clearInterval
```js
clearInterval(id);
```

Same as javascript `clearInterval`.

### setTimeout
```js
setTimeout(callback, ms, arg1, arg2, arg3, arg4);
```
Same as javascript `setTimeout`.

### clearTimeout
```js
clearTimeout(id);
```

Same as javascript `clearTimeout`.

### setImmediate
```js
setImmediate(callback, arg1, arg2, arg3, arg4);
```

Same as javascript `setImmediate` and almost the same as `setTimeout(callback, 0, arg1, arg2, arg3, arg4)` but with higher priority.

### formatDate
```js
formatDate(millisecondsOrDate, format);
```

#### Parameters:

- `millisecondsOrDate`: number of milliseconds from state.ts or state.lc (Number milliseconds from 1970.01.01 00:00:00) or javascript *new Date()* object or number of milliseconds from *(new Date().getTime())*
- `format`: Can be `null`, so the system time format will be used, otherwise

* YYYY, JJJJ, ГГГГ - full year, e.g 2015
* YY, JJ, ГГ - short year, e.g 15
* MM, ММ(cyrillic) - full month, e.g. 01
* M, М(cyrillic) - short month, e.g. 1
* DD, TT, ДД - full day, e.g. 02
* D, T, Д - short day, e.g. 2
* hh, SS, чч - full hours, e.g. 03
* h, S, ч - short hours, e.g. 3
* mm, мм(cyrillic) - full minutes, e.g. 04
* m, м(cyrillic) - short minutes, e.g. 4
* ss, сс(cyrillic) - full seconds, e.g. 05
* s, с(cyrillic) - short seconds, e.g. 5
* sss, ссс(cyrillic) - milliseconds
* WW, НН(cyrillic) - full week day as text
* W, Н(cyrillic) - short week day as text
* OO, ОО(cyrillic) - full month as text
* OOO, ООО(cyrillic) - full month as text as genitiv
* O, О(cyrillic) - short month as text

#### Example

```js
formatDate(new Date(), "YYYY-MM-DD") // => Date "2015-02-24"
formatDate(new Date(), "hh:mm") // => Hours and minutes "17:41"
formatDate(state.ts) // => "24.02.2015"
formatDate(state.ts, "JJJJ.MM.TT SS:mm:ss.sss") // => "2015.02.15 17:41:98.123"
formatDate(new Date(), "WW") // => Day of week "Tuesday"
formatDate(new Date(), "W") // => Day of week "Tu"
```

### formatTimeDiff
```js
formatTimeDiff(milliseconds, format);
```

#### Parameters:

- `milliseconds`: difference in milliseconds*
- `format`: Can be `null`, so the `hh:mm:ss` format will be used, otherwise

* DD, TT, ДД - full day, e.g. 02
* D, T, Д - short day, e.g. 2
* hh, SS, чч - full hours, e.g. 03
* h, S, ч - short hours, e.g. 3
* mm, мм(cyrillic) - full minutes, e.g. 04
* m, м(cyrillic) - short minutes, e.g. 4
* ss, сс(cyrillic) - full seconds, e.g. 05
* s, с(cyrillic) - short seconds, e.g. 5

#### Example

```js
formatTimeDiff(60000, "mm:ss") // => "01:00"

const diff = 172800000 + 10800000 + 540000 + 15000; // 2 days, 3 hours, 9 minutes + 15 secoonds
formatTimeDiff(diff); // "51:09:15"
formatTimeDiff(diff, 'DD hh:mm'); // "02 03:09"
formatTimeDiff(diff, 'D hh:mm'); // "2 03:09"
formatTimeDiff(diff, 'hh:mm:ss'); // "51:09:15"
formatTimeDiff(diff, 'h:m:s'); // "51:9:15"
formatTimeDiff(diff, 'hh:mm'); // "51:09"
formatTimeDiff(diff, 'mm:ss'); // "3069:15"
formatTimeDiff(diff, 'hh'); // "51"
formatTimeDiff(diff, 'mm'); // "3069"
```

### getDateObject
```js
getDateObject(stringOrNumber);
```

Converts string or number to a Date object.
If only hours are given, it will add current date to it and will try to convert.

```js
getDateObject('20:00'); // 2024-05-18T18:00:00.000Z
getDateObject('2024-01-01'); // 2024-01-01T00:00:00.000Z
```

### formatValue
```js
formatValue(value, decimals, format);
```

Formats any value (strings too) to number. Replaces point with comma if configured in system.
Decimals specify digits after comma. The default value is 2.
Format is optional:
 - '.,': 1234.567 => 1.234,56
 - ',.': 1234.567 => 1,234.56
 - ' .': 1234.567 => 1 234.56


### adapterSubscribe
```js
adapterSubscribe(id);
```

Send to an adapter message "subscribe" to inform adapter. If adapter has the common flag "subscribable" in case of function "subscribe" this function will be called automatically.

### adapterUnsubscribe
```js
adapterUnsubscribe(id);
```

Sends to an adapter the message `unsubscribe` to inform adapter to not poll the values.

### $ - Selector
```js
$(selector).on(function(obj) {});
$(selector).toArray(); // Requires version >= 8.2.0
$(selector).each(function(id, i) {});
$(selector).setState(value, ack);
$(selector).getState();
```

Format of selector:
```js
"name[commonAttr=something1](enumName=something2){nativeName=something3}[id=idfilter][state.id=idfilter]"
```

name can be: state, channel, device or schedule
`idfilter` can have wildcards '*'

Prefixes ***(not implemented - should be discussed)*** :

* \# - take by name and not by id
* . - filter by role
* § - filter by room

***Example***:

- `$('state[id=*.STATE]')` or `$('state[state.id=*.STATE]')` or `$('*.STATE')` - select all states where id ends with ".STATE".
- `$('state[id='hm-rpc.0.*]')` or `$('hm-rpc.0.*')` - returns all states of adapter instance hm-rpc.0
- `$('channel(rooms=Living room)')` - all states in room "Living room"
- `$('channel{TYPE=BLIND}[state.id=*.LEVEL]')` - Get all shutters of Homematic
- `$('channel[role=switch](rooms=Living room)[state.id=*.STATE]').setState(false)` - Switch all states with .STATE of channels with role "switch" in "Living room" to false
- `$('channel[state.id=*.STATE](functions=Windows)').each(function (id, i) {log(id);});` - print all states of enum "windows" in log
- `$('schedule[id=*65]').each(function (id, i) {log(id);});` - print all schedules with 65 at the end
- `$('.switch §"Living room")` - Take states with all switches in 'Living room' ***(not implemented - should be discussed)***
- `$('channel .switch §"Living room")` - Take states with all switches in 'Living room' ***(not implemented - should be discussed)***

***Explanation***
Lets take a look at:
```js
$('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').on(obj => {
   log('New state ' + obj.id + ' = ' + obj.state.val);
});
```

This code searches in channels.
Find all channels with `common.role="switch"` and belongs to `enum.rooms.Wohnzimmer`.
Take all their states, where id ends with `".STATE"` and make subscription on all these states.
If some of these states change, the callback will be called like for "on" function.

Following functions are possible, setState, getState (only from first), on, each, toArray

```js
// Switch on all switches in "Wohnzimmer"
$('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').setState(true);
```

You can interrupt the "each" loop by returning the false value, like:
```js
// print two first IDs of on all switches in "Wohnzimmer"
$('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').each((id, i) => {
    log(id);
    if (i == 1) {
        return false;
    }
});
```
Or you can get a an usual array of ids and process it your own way:
```js
// get some state and filter only which has an `true` value
const enabled = $('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').toArray().filter((id) => getState(id)?.val === true);
```

### readFile
```js
readFile(adapter, fileName, (error, bytes) => {});
```

The result will be given in callback.
Read file from DB from folder `javascript.0`.

Argument *adapter* can be omitted.

```js
// read vis views
readFile('vis.0', '/main/vis-views.json', (error, data) => {
    log(data.substring(0, 50));
});

// The same as
//readFile('/../vis.0/main/vis-views.json', (error, data) => {
//     log(data.substring(0, 50));
//});
```

By default, working directory/adapter is `javascript.0`.

### writeFile
```js
writeFile(adapter, fileName, bytes, (error) => {});
```

The optional error code will be given in callback. Argument *adapter* can be omitted.
fileName is the name of file in DB. All files are stored in the folder "javascript".
if you want to write to other folders, e.g. to "/vis.0/" use setFile for that.

The file that looks like `'/subfolder/file.txt'` will be stored under `"/javascript/subfolder/file.txt"` and can be accessed over web server with `"http://ip:8082/javascript/subfolder/file.txt"`

```js
// store screenshot in DB
const fs = require('node:fs');
let data = fs.readFileSync('/tmp/screenshot.png');
writeFile(null, '/screenshots/1.png', data, (error) => {
    log('file written');
});

// The same as
//writeFile('/screenshots/1.png', data, function (error) {
//    log('file written');
//});
```

```js
// store file in '/vis.0' in DB
const fs = require('node:fs');
let data = fs.readFileSync('/tmp/screenshot.png');
writeFile('vis.0', '/screenshots/1.png', data, (error) => {
    log('file written');
});
```

### delFile
```js
delFile(adapter, fileName, (error) => {});
```

Delete file or directory. fileName is the name of file or directory in DB.

The alternative name of this method is `unlink`

### renameFile
```js
renameFile(adapter, oldName, newName, (error) => {});
```

Rename file or directory. oldName is the name of file or directory in DB and is renamed to newName.

The alternative name of this method is `rename`

### onFile
```js
onFile(id, fileName, withFile, (id, fileName, size, fileData, mimeType) => {});
// or
onFile(id, fileName, (id, fileName, size) => {});
```

Subscribe to file changes:
- `id` is ID of an object of type `meta`, like `vis.0`
- `fileName` is file name or pattern, like `main/*` or `main/vis-view.json`
- `withFile` if the content of file should be delivered in callback or not. the delivery of file content costs memory and time, so if you want to be just informed about changes, set `withFile`to false.

Arguments in callback:
- `id` - ID of `meta` object;
- `fileName` - file name (not pattern);
- `size` - new file size;
- `fileData` - file content of type `Buffer` if file is binary (detected by extension) or `string`. Delivered only if `withFile`;
- `mimeType` - mime type of file, like `image/jpeg`. Delivered only if `withFile`;

**Important**: this functionality is only available with js-controller@4.1.x or newer.

### offFile
```js
offFile(id, fileName);
// or
onFile(id, fileName);
```
Unsubscribe from file changes:
- `id` is ID of an object of type `meta`, like `vis.0`
- `fileName` is file name or pattern, like `main/*` or `main/vis-view.json`

**Important**: this functionality is only available with js-controller@4.1.x or newer.

### onStop
```js
onStop (() => { /* do something when script is stopped */ }, timeout);
```
Install callback, that will be called if a script stopped. Used, e.g., to stop communication or to close connections.

```js
// establish connection
const conn = require('net');
// ...

// close connection if script stopped
onStop((callback) => {
    if (conn) {
        // close connection
        conn.destroy();
    }
    callback();
}, 2000 /*ms*/);
```
`timeout` is 1000ms by default.

### getHistory
```js
getHistory(instance, options, (error, result, options, instance) => {});
```

Read history from specified instance. If no instance is specified, the system default history instance will be taken.
```js
// Read history of 'system.adapter.admin.0.memRss' from sql driver
const end = new Date().getTime();
getHistory(
    'sql.0',
    {
        id:         'system.adapter.admin.0.memRss',
        start:      end - 3600000,
        end:        end,
        aggregate:  'm4',
        timeout:    2000
    },
    (err, result) => {
        if (err) console.error(err);
        if (result) {
            for (let i = 0; i < result.length; i++) {
                log(result[i].id + ' ' + new Date(result[i].ts).toISOString());
            }
        }
    }
);
```

Possible options you can find [here](https://github.com/ioBroker/ioBroker.history#access-values-from-javascript-adapter).

Additionally, to these parameters you must specify "id" and you may specify timeout (default: 20000ms).

One more example:
```js
// Get last 50 entries from default history instance with no aggregation:
getHistory({
        id:         'system.adapter.admin.0.alive',
        aggregate:  'none',
        count:      50
    }, (err, result) => {
        if (err) console.error(err);
        if (result) {
            for (let i = 0; i < result.length; i++) {
                log(result[i].id + ' ' + new Date(result[i].ts).toISOString());
            }
        }
    });
```

**Note: ** of course, history must be first enabled for selected ID in admin.

### runScript
```js
runScript('scriptName', () => {
    // Callback is optional
    log('Srcipt started, but not yet executed');
});
```

Starts or restarts other scripts (and itself too) by name.

```js
// restart script
runScript('groupName.scriptName1');
```

### runScriptAsync
Same as runScript, but with `promise`.
```js
runScriptAsync('scriptName')
    .then(() => log('Script started, but not yet executed'));

// or

await runScriptAsync('scriptName');
log(`Script was restarted`);
```

### startScript
```js
startScript('scriptName', ignoreIfStarted, callback);
```

Starts the script. If ignoreIfStarted set to true, nothing will be done if a script yet running, otherwise the script will be restarted.

```js
startScript('scriptName', true); // start script if not started
```

### startScriptAsync
Same as runScript, but with `promise`.

```js
startScriptAsync('scriptName', ignoreIfStarted)
    .then(started => log(`Script was ${started ? 'started' : 'already started'}`));

// or

const started = await startScriptAsync('scriptName', ignoreIfStarted);
log(`Script was ${started ? 'started' : 'already started'}`);
```

Starts the script. If ignoreIfStarted set to true, nothing will be done if a script yet running, otherwise the script will be restarted.

```js
startScript('scriptName', true); // start script if not started
```

### stopScript
```js
stopScript('scriptName', callback);
```

If stopScript is called without arguments, it will stop itself:

```js
stopScript();
```

### stopScriptAsync
Same as stopScript, but with `promise`:
```js
stopScriptAsync('scriptName')
    .then(stopped => log(`Script was ${stopped ? 'stopped' : 'already stopped'}`));

//or
const stopped = await stopScriptAsync('scriptName');
log(`Script was ${stopped ? 'stopped' : 'already stopped'}`);
```

If stopScript is called without arguments, it will stop itself:

```js
stopScript();
```

### isScriptActive
```js
isScriptActive('scriptName');
```

Returns if a script enabled or disabled. Please note that that does not give back if the script is now running or not.
The script can be finished, but still activated.

It is not a function. It is a variable with javascript instance, that is visible in script's scope.

### toInt
### toFloat
### toBoolean
### jsonataExpression

### wait
Just pause the execution of the script.
Warning this function is `promise` and must be called as follows:
```js
await wait(1000);
```

### sleep
Same as [wait](#wait)

### messageTo
```js
messageTo({ instance: 'instance', script: 'script.js.common.scriptName', message: 'messageName' }, data, {timeout: 1000}, result =>
    log(JSON.stringify(result)));
```

Send via the "message bus" the message to some other script. Or even to some handler in the same script.

Timeout for callback is 5 seconds by default.

The target could be shorted to:

```js
messageTo('messageName', data, result => {
    log(JSON.stringify(result));
});
```

Callback and options are optional and timeout is by default 5000 milliseconds (if callback provided).

```js
messageTo('messageName', dataWithNoResponse);
```

### messageToAsync
```js
onMessage('myTopic', async (data, callback) => {
    log(data);

    if (!data.myPayload) {
        // return error (promise reject)
        callback({ error: 'something went wrong!!' });
    } else {
        // return result (promise resolve)
        callback({ result: 'ok' });
    }
});

(async () => {
    try {
        const msg = await messageToAsync({ instance: 0, script: 'script.js.test2', message: 'myTopic' }, { myPayload: true }, { timeout: 1000 });
        log(`Done with: ${JSON.stringify(msg)}`);
    } catch (error) {
        // contents of result.error
        console.error(error);
    }
})();
```

### onMessage
```js
onMessage('messageName', (data, callback) => {
    log(`Received data: ${data}`); callback({ result: Date.now() });
});
```

Subscribes on javascript adapter message bus and delivers response via callback.
The response from script which sends response as first will be accepted as answer, all other answers will be ignored.

To send a message to a JavaScript script which is then received by this handler, use [messageTo](#messageTo).

To send a message from any other adapter use

```js
adapter.sendTo('javascript.0', 'toScript', {
    script: 'script.js.messagetest',
    message: 'messageName',
    data: {
        flag: true
    }
});
```

to send a message from CLI use

```bash
iob message javascript.0 toScript '{"script": "script.js.messagetest", "message": "messageName", "data": { "flag": true }}'
```

### onMessageUnregister
```js
const id = onMessage('messageName', (data, callback) => {
    log(data);
    callback(Date.now());
});

// unsubscribe specific handler
onMessageUnregister(id);
// or unsubscribe by name
onMessageUnregister('messageName');
```

Unsubscribes from this message.

### onLog
```js
onLog('error', data => {
    sendTo('telegram.0', { user: 'UserName', text: data.message });
    log('Following was sent to telegram: ' + data.message);
});
```

Subscribe on logs with specified severity.

*Important:* you cannot output logs in handler with the same severity to avoid infinite loops.

E.g., this will produce no logs:
```js
onLog('error', data => {
    console.error('Error: ' + data.message);
});
```

To receive all logs the `*` could be used. In this case, the log output in handler will be disabled completely.

```js
onLog('*', data => {
    console.error('Error: ' + data.message); // will produce no logs
});
```

### onLogUnregister
```js
function logHandler(data) {
    console.error('Error: ' + data.message);
}
const id = onLog('warn', logHandler);

// unsubscribe by ID
onLogUnregister(id);
// or unsubscribe by function handler
onLogUnregister(logHandler);
// or unsubscribe all handlers with specific severity
onLogUnregister('warn');
```

Unsubscribes from these logs.

### httpGet

*Requires version >= 7.9.0*

```js
httpGet('http://jsonplaceholder.typicode.com/posts', { timeout: 1000 }, (err, response) => {
    if (!err) {
        console.log(response.statusCode);
        console.log(response.data);
    } else {
        console.error(err);
    }
});
```

Download file to ioBroker file system:

```js
httpGet('http://1.2.3.4/image.jpg', { responseType: 'arraybuffer' }, async (err, response) => {
    if (!err) {
        writeFile('0_userdata.0', 'test.jpg', response.data, (err) => {
            if (err) {
                console.error(err);
            }
        });
    } else {
        console.error(err);
    }
});
```

Disable certificate validation - *Requires version >= 8.4.0*

```js
httpGet('http://jsonplaceholder.typicode.com/posts', { validateCertificate: false }, (err, response) => {
    if (!err) {
        console.log(response.statusCode);
        console.log(response.data);
    } else {
        console.error(err);
    }
});
```

### httpPost

*Requires version >= 7.9.0*

```js
httpPost('http://jsonplaceholder.typicode.com/posts', { title: 'foo', body: 'bar', userId: 1 }, { timeout: 1000 }, (error, response) => {
    if (!error) {
        console.log(response.statusCode);
        console.log(response.data);
        console.log(response.headers);
    } else {
        console.error(error);
    }
});
```

With custom headers and authentication

```js
httpPost(
    'http://jsonplaceholder.typicode.com/posts',
    {
        title: 'foo',
        body: 'bar',
        userId: 1
    },
    {
        timeout: 2000,
        basicAuth: {
            user: 'admin',
            password: 'dg2LdALNznHFNo'
        },
        headers: {
            'Cookie': 'PHPSESSID=298zf09hf012fh2; csrftoken=u32t4o3tb3gg43; _gat=1'
        }
    },
    (error, response) => {
        if (!error) {
            console.log(response.statusCode);
            console.log(response.data);
            console.log(response.headers);
        } else {
            console.error(error);
        }
    }
);
```

### createTempFile

*Requires version >= 8.3.0*

```js
httpGet('https://raw.githubusercontent.com/ioBroker/ioBroker.javascript/master/admin/javascript.png', { responseType: 'arraybuffer' }, async (err, response) => {
    if (err) {
        console.error(err);
    } else {
        const tempFilePath = createTempFile('javascript.png', response.data);
        console.log(`Saved to ${tempFilePath}`);

        // Use the new path in other scripts (e.g. sendTo)
    }
});
```

```js
onFile('0_userdata.0', 'test.jpg', true, async (id, fileName, size, data, mimeType) => {
    const tempFilePath = createTempFile(fileName, response.data);

    // Use the new path in other scripts (e.g. sendTo)
});
```

## Global script variables
### scriptName
`scriptName` - The name of the script.

```js
log(`Script ${scriptName} started!`);
```

### instance
`instance` - The javascript instance where script is executed (e.g. `0`).

```js
log(`Script ${scriptName} started started by ${instance}`);
```

### defaultDataDir
`defaultDataDir` - Absolute path to iobroker-data.

```js
log(`Data dir: ${defaultDataDir}`);
```

### verbose
`verbose` - Verbose mode enabled?

```js
log(`Verbose mode: ${verbose ? 'enabled' : 'disabled'}`);

// Example
if (verbose) {
    log('...');
}
```

## Option - "Do not subscribe all states on start"
There are two modes of subscribe to states:
- Adapter subscribes to all changes at start and receives all changes of all states (it is easy to use getStates(id), but requires more CPU and RAM):

```js
log(getState('someID').val);
```

- Adapter subscribes every time on specified ID if "on/subscribe" called. In this mode, the adapter receives only updates for desired states.
It is very performed and RAM efficiency, but you cannot access states directly in getState. You must use callback to get the result of state:

```js
getState('someID', (error, state) => {
    log(state.val);
});
```

It is because the adapter does not have the value of state in RAM and must ask central DB for the value.

## Scripts activity

There is a possibility to enable and disable scripts via states. For every script, the state will be created with the name `javascript.INSTANCE.scriptEnabled.SCRIPT_NAME`.
Scripts can be activated and deactivated by controlling this state with `ack=false`.
