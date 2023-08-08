You can use the following function additionally to all Node.js functions:
### exec - execute some OS command, like "cp file1 file2"
```js
exec(cmd, [options], callback);
```

Execute system command and get the outputs.

```js
// Get the list of files and directories in /var/log
exec('ls /var/log', function (error, stdout, stderr) {
    console.log('stdout: ' + stdout);
});
```

Node.js uses `/bin/sh` to execute commands.
It is the best practice to always use fill path names to commands to make sure the right command is executed.

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

Example:
```js
let timer;

// Create state "javascript.0.counter"
createState('counter', 0);

// On change
on('adapter.0.device.channel.sensor', function (data) {
    // But not ofter than 30 seconds
    if (!timer) {
        timer = setTimeout(function () {
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

*Notice:* By default only states with quality 0x00 will be passed to callback function. If you want to get all events, add {q: '*'} to pattern structure.

*Notice:* Please note, that by default "change" is equal to "any", except when only id as string is set (like `on("id", function (){});`). In last case change will be set to `ne`.

*Notice:* If you want to also get state deletions/expires as trigger, you need to use change with "ne" or "any" AND q with "*" as filter!

*Notice:* from 4.3.2 it is possible to write type of trigger as second parameter: `on('my.id.0', 'any', obj => console.log(obj.state.val));`

### unsubscribe
```js
unsubscribe(id);
// or
unsubscribe(handler);
```

Remove all subscriptions for given object ID or for given handler.

```js
// By handler
let mySubscription = on({ id: 'javascript.0.myState', change: 'any' }, function (data) {
    // unsubscribe after first trigger
    if (unsubscribe(mySubscription)) {
        log('Subscription deleted');
    }
});

// by Object ID
on({ id: "javascript.0.myState1", change: 'ne' }, function (data) {
    log('Some event');
});

on({ id: 'javascript.0.myState1', change: 'any' }, function (data) {
    // unsubscribe
    if (unsubscribe("javascript.0.myState1")) {
        log('All subscriptions deleted');
    }
});
```

### schedule
```js
schedule(pattern, callback);
```

Time scheduler with astro-function.

#### Time schedule
Pattern can be a string with CRON-Syntax, which consists of 5 (without seconds) or 6 (with seconds) digits:
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
schedule('*/2 * * * *', function () {
    log('Will be triggered every 2 minutes!');
});

// Example with 6 digits:
schedule('*/3 * * * * *', function () {
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
schedule({ second: [20, 25] }, function () {
    log('Will be triggered at xx:xx:20 and xx:xx:25 of every minute!');
});

schedule({hour: 12, minute: 30}, function () {
    log('Will be triggered at 12:30!');
});
```
Pattern can be a Javascript Date object (some specific time point) - in this case only it will be triggered only one time.

If start or end times for a schedule are needed this could also be implemented with usage of an object. In this scenario the object have the properties:
- `start`
- `end`
- `rule`
  start and end defines a Date object a DateString or a number of milliseconds since 01 January 1970 00:00:00 UTC.
  Rule is a schedule string with [Cron-Syntax](http://en.wikipedia.org/wiki/Cron) or an object:
```js
let startTime = new Date(Date.now() + 5000);
let endTime = new Date(startTime.getTime() + 5000);
schedule({ start: startTime, end: endTime, rule: '*/1 * * * * *' }, function () {
    log('It will run after 5 seconds and stop after 10 seconds');
});
```

The rule itself could be also an object:

```js
let today = new Date();
let startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
let endTime =  new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
let ruleData = { hour: 12, minute: 30 };
schedule({ start: startTime, end: endTime, rule: ruleData }, function () {
    log('Will be triggered at 12:30, starting tomorow, ending in 7 days');
});
```

#### Astro-function

Astro-function can be used via "astro" attribute:

```js
schedule({ astro: 'sunrise' }, function () {
    log("Sunrise!");
});

schedule({ astro: 'sunset', shift: 10 }, function () {
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

**Note:** in some places sometimes it could be so, that no night/nightEnd exists.

**Note:** you can use "on" function for schedule with small modification:
```js
on({ time: '*/2 * * * *' }, function () {
    log((new Date()).toString() + " - Will be triggered every 2 minutes!");
});

on({ time: { hour: 12, minute: 30 }}, function () {
    log((new Date()).toString() + " - Will be triggered at 12:30!");
});

on({ astro: 'sunset', shift: 10 }, function () {
    log((new Date()).toString() + " - 10 minutes after sunset!");
});
```

### clearSchedule
If **no** "astro" function used, you can cancel the schedule later. To allow this, the schedule object must be saved:

```js
let sch = schedule('*/2 * * * *', function () { /* ... */ });

// later:
clearSchedule(sch);
```

### getAstroDate
```js
getAstroDate(pattern, date, offsetMinutes);
```
Returns a javascript Date object for the specified astro-name (e.g. "sunrise" or "sunriseEnd"). For valid values see the list of allowed values in the [Astro](#astro--function) section in the *schedule* function.

The returned Date object is calculated for the passed *date*. If no date is provided, the current day is used.

```js
let sunriseEnd = getAstroDate("sunriseEnd");
log("Sunrise ends today at " + sunriseEnd.toLocaleTimeString());

let today = new Date();
let tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
let tomorrowNight = getAstroDate("night", tomorrow);
```

**Note: Depending on your geographical location, there can be cases where e.g. 'night'/'nightEnd' do not exist on certain time points (e.g. locations north in May/June each year!**

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

```js
console.log(compareTime('sunsetStart', 'sunsetEnd', 'between') ? 'Now is sunrise' : 'Now is no sunrise');
```

It is possible to define the time with offset too:

```js
console.log(compareTime({astro: 'sunsetStart', offset: 30}, {astro: 'sunrise', offset: -30}, '>') ? 'Now is at least 30 minutes after sunset' : 'No idea');
```

Structure of an astro object.

```js
{
    astro: 'sunsetStart',// mandatory, can be written as string and not as object if offset and date are default
    offset: 30,          // optional
    date:   new Date()   // optional
}
```

### setStateAsync
```js
await setStateAsync(id, state, ack);
```
**Note**: The following commands are identical

```
await setStateAsync('myState', 1, false);
await setStateAsync('myState', {val: 1, ack: false});
await setStateAsync('myState', 1);
```

Explanation of an acknowledgement flag:
- `ack` = `false` - Script wants to send a command to be executed by the target device/adapter
- `ack` = `true`  - Command was successfully executed and state is updated as a positive result

### setStateDelayed
```js
setStateDelayed(id, state, isAck, delay, clearRunning, callback);
```

Same as setState but with delay in milliseconds. You can clear all running delays for this ID (by default). E.g.

```js
// Switch ON the light in the kitchen in one second
setStateDelayed('Kitchen.Light.Lamp', true,  1000);

// Switch OFF the light in the kitchen in 5 seconds and let first timeout run.
setStateDelayed('Kitchen.Light.Lamp', false, 5000, false, function () {
    console.log('Lamp is OFF');
});
```
This function returns the handler of the timer, and this timer can be individually stopped by clearStateDelayed

### clearStateDelayed
```js
clearStateDelayed(id);
```

Clears all delayed tasks for specified state ID or some specific delayed task.

```js
setStateDelayed('Kitchen.Light.Lamp', false,  10000); // Switch OFF the light in the kitchen in ten second
let timer = setStateDelayed('Kitchen.Light.Lamp', true,  5000, false); // Switch ON the light in the kitchen in five second
clearStateDelayed('Kitchen.Light.Lamp', timer); // Nothing will be switched on
clearStateDelayed('Kitchen.Light.Lamp'); // Clear all running delayed tasks for this ID
```

### getStateAsync
```js
const stateObject = await getStateAsync(id);
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

If state does not exist, a warning will be printed in the logs and the object: `{val: null, notExist: true}` will be returned.
To suppress the warning, check if the state exists before calling getState (see [existsState](#existsState)).

### existsStateAsync
```js
const exists = await existsStateAsync(id);
```

Check if a state exists.

### getObjectAsync
```js
await getObjectAsync(id, enumName);
```
Get description of object id as stored in a system.
You can specify the enumeration name. If this is defined, two additional attributes will be added to result: enumIds and enumNames.
These arrays have all enumerations, where ID is a member of. E.g:

```js
await getObjectAsync('adapter.N.objectName', 'rooms');
```
gives back in enumIds all rooms, where the requested object is a member. You can define "true" as enumName to get back *all* enumerations.

### setObjectAsync
```js
await setObjectAsync(id, obj, callback);
```
Write an object into DB. This command can be disabled in adapter's settings. Use this function carefully, while the global settings can be damaged.

You should use it to modify an existing object you read beforehand, e.g.:
```js
const obj = await getObjectAsync('adapter.N.objectName');
obj.native.settings = 1;
try {
    await setObjectAsync('adapter.N.objectName', obj);
} catch (e) {
    console.log('Cannot write object: ' + e);
}
```

### existsObjectAsync
```js
const objextExists = await existsObjectAsync(id);
```

Check if an object exists.

### extendObjectAsync
```js
await extendObjectAsync(id, obj);
```

It is almost the same as `setObjectAsync`, but first it reads the object and tries to merge all settings together.

Use it like this:
```js
// Stop instance
await extendObjectAsync('system.adapter.sayit.0', {common: {enabled: false}});
```

### deleteObjectAsync
```js
await deleteObjectAsync(id, isRecursive);
```

Delete an object from DB by ID. If the object has type `state`, the state value will be deleted too.

Additional parameter `isRecursive` could be provided, so all children of given ID will be deleted. Very dangerous!

Use it like this:
```js
// Delete state
await deleteObjectAsync('javascript.0.createdState');
```

### getIdByName
```js
getIdByName(name, alwaysArray);
```

returns id of the object with given name. If there is more than one object with this name, the result will be an array.
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

### createStateAsync
```js
await createStateAsync(name, initialValue, forceCreation, common, native);
```
Create state and object in javascript space if it does not exist, e.g. `javascript.0.mystate`.

!! Prefer to create own data points with the full ID '0_userdata.0.mystate' !!!

#### Parameters:
- `name`: name of the state without namespace, e.g. `mystate`
- `initialValue`: variable can be initialized after created. Value "undefined" means do not initialize value.
- `forceCreation`: create/overwrite state independent of if state yet exists or not.
- `common`: common description of object.
- `native`: native description of an object. Any specific information.
- `callback`: called after state is created and initialized.

If you set in `common` the flag `alias` to `true`, then alias will be created with the same name (but in `alias.0` namespace) as the state.
Alias is created only if it does not exist yet.

The following settings for aliases are valid too:
```js
common => {
    "alias": {
        "id": "alias.0.myOtherState", // will be created automatically if not already exists
        "write": 'val * 1000', // convert function for write to created state
        "read": 'val / 1000'   // convert function to read from created state
    }
}
```

or

```js
common => {
    "alias": {
        "id": "alias.0.myOtherState", // will be created automatically if not already exists
    }
}
```

It is possible short type of createState:

- `await createStateAsync('myDatapoint')` - simply create datapoint if it does not exist
- `await createStateAsync('myDatapoint', 1)` - create datapoint if it does not exist and initialize it with value 1
- `await createStateAsync('myDatapoint', {name: 'My own datapoint', unit: '°C'}, function () {log('created');});`
- `await createStateAsync('myDatapoint', 1, {name: 'My own datapoint', unit: '°C'})` - create datapoint if it does not exist with specific name and units

### deleteStateAsync
```js
await deleteStateAsync(name, callback);
```
Delete state and object in javascript space, e.g. `javascript.0.mystate`. States from other adapters cannot be deleted.

```js
deleteStateAsync('myDatapoint')
```
simply delete datapoint if exists.

### createAliasAsync
```js
await createAliasAsync(name, alias, forceCreation, common, native, callback);
```

Create alias in `alias.0` space if it does not exist, e.g. `javascript.0.myalias` and reference to a state or read/write states.
The common definition is taken from the read alias id object, but a provided common takes precedence.

#### Parameters:

- `name`: name of the alias state with or without alias namespace, e.g. `mystate` (namespace "alias.0." will be added)
- `alias`: can be either an existing state id as string or an object with full alias definition including read/write ids and read/write functions. Not: Alias definitions can not be set as part of the common parameter!
- `forceCreation`: create/overwrite alias independent of if state yet exists or not.
- `common`: common description of an alias object. Values provided here will take precedence over the common definition of the read alias id object. Not: Alias definitions can not be set as part of this common parameter, see alias parameter!
- `native`: native description of an object. Any specific information.
- `callback`: called after state is created and initialized.

It is possible a short type of createAlias:

- `createAlias('myAlias', 'myDatapoint')` - simply create alias.0.myAlias that refernces to javascript.X.myDatapoint if it does not exist
- `createAlias('myAlias', {id: {read: 'myReadDatapoint', write: 'myWriteDatapoint'}})` - create alias and reference to different read/write states

For other details, see createState, it is similar.

### createAliasAsync
```js
await createAliasAsync(name, alias, forceCreation, common, native);
```

Same as `createAlias`, but the promise will be returned.

### sendToAsync
```js
await sendToAsync(adapter, command, message, callback);
```

Send a message to a specific or all adapter instances. When using the adapter name, the message is sent to all instances.

To get specific information about messages, you must read the documentation for a particular adapter.

Example:

```js
await sendToAsync('telegram', {user: 'UserName', text: 'Test message'});
```

Some adapters also support responses to the sent messages. (e.g. history, sql, telegram)
The response is only returned to the callback if the message is sent to a specific instance!

Example with response:

```js
const result = await sendToAsync('telegram.0', {user: 'UserName', text: 'Test message'});
console.log('Sent to ' + result + ' users');
```

### sendToHostAsync
```js
await sendToHostAsync(hostName, command, message, callback);
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
const result = await sendToHostAsync('myComputer', 'cmdExec', {data: 'ls /'});
console.log('List of files: ' + result.data);
```

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

### getDateObject
```js
getDateObject(stringOrNumber);
```

Converts string or number to a Date object.
If only hours are given, it will add current date to it and will try to convert.

```js
getDateObject("20:00") // => "Tue Aug 09 2016 20:00:00 GMT+0200"
```

### formatValue
```js
formatValue(value, decimals, format);
```

Formats any value (strings too) to number. Replaces point with comma if configured in system.
Decimals specify digits after comma. The Default value is 2.
Format is optional:
- '.,': 1234.567 => 1.234,56
- ',.': 1234.567 => 1,234.56
- ' .': 1234.567 => 1 234.56

### $ - Selector
```js
$(selector).on(function(obj) {});
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
- `$('channel{TYPE=BLIND}[state.id=*.LEVEL]')` - Get all shutter of Homematic
- `$('channel[role=switch](rooms=Living room)[state.id=*.STATE]').setState(false)` - Switch all states with .STATE of channels with role "switch" in "Living room" to false
- `$('channel[state.id=*.STATE](functions=Windows)').each(function (id, i) {log(id);});` - print all states of enum "windows" in log
- `$('schedule[id=*65]').each(function (id, i) {log(id);});` - print all schedules with 65 at the end
- `$('.switch §"Living room")` - Take states with all switches in 'Living room' ***(not implemented - should be discussed)***
- `$('channel .switch §"Living room")` - Take states with all switches in 'Living room' ***(not implemented - should be discussed)***

***Explanation***
Lets take a look at:
```js
$('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').on(function (obj) {
   log('New state ' + obj.id + ' = ' + obj.state.val);
});
```

This code searches in channels.
Find all channels with `common.role="switch"` and belongs to `enum.rooms.Wohnzimmer`.
Take all their states, where id ends with `".STATE"` and make subscription on all these states.
If some of these states change, the callback will be called like for "on" function.

Following functions are possible, setState, getState (only from first), on, each

```js
// Switch on all switches in "Wohnzimmer"
$('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').setState(true);
```

You can interrupt the "each" loop by returning the false value, like:
```js
// print two first IDs of on all switches in "Wohnzimmer"
$('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').each(function (id, i) {
    console.log(id);
    if (i == 1) {
        return false;
    }
});
```

### readFileAsync
```js
const bytes = await readFileAsync(adapter, fileName);
```

The result will be given in callback.
Read file from DB from folder "javascript.0".

Argument *adapter* can be omitted.

```js
// read vis views
const data = await readFileAsync('vis.0', '/main/vis-views.json');
console.log(data.substring(0, 50));
```

By default, working directory/adapter is `javascript.0`.

### writeFileAsync
```js
await writeFileAsync(adapter, fileName, bytes);
```

The optional error code will be given in callback. Argument *adapter* can be omitted.
fileName is the name of file in DB. All files are stored in the folder "javascript". if you want to write to other folders, e.g. to "/vis.0/" use setFile for that.

The file that looks like `'/subfolder/file.txt'` will be stored under `"/javascript/subfolder/file.txt"` and can be accessed over web server with `"http://ip:8082/javascript/subfolder/file.txt"`

```js
// store screenshot in DB
const fs = require('fs');
let data = fs.readFileSync('/tmp/screenshot.png');
try {
    await writeFileAsync(null, '/screenshots/1.png', data);
    console.log('file written');
} catch (e) {
    console.error('Cannot write file: ' + e);
}
```

```js
// store file in '/vis.0' in DB
const fs = require('fs');
let data = fs.readFileSync('/tmp/screenshot.png');
await writeFileAsync('vis.0', '/screenshots/1.png', data);
```

### delFileAsync
```js
await delFileAsync(adapter, fileName);
```

Delete file or directory. fileName is the name of file or directory in DB.

### renameAsync
```js
await renameAsync(adapter, oldName, newName);
```

Rename file or directory. `oldName` is the name of file or directory in DB and is renamed to newName.

### onFile
```js
onFile(id, fileName, withFile, function (id, fileName, size, fileData, mimeType) {});
// or 
onFile(id, fileName, function (id, fileName, size) {});
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

### offFile
```js
offFile(id, fileName);
// or 
onFile(id, fileName);
```
Unsubscribe from file changes:
- `id` is ID of an object of type `meta`, like `vis.0`
- `fileName` is file name or pattern, like `main/*` or `main/vis-view.json`

### onStop
```js
onStop (function(){ /* do something when script is stopped */ }, timeout);
```
Install callback, that will be called if a script stopped. Used, e.g., to stop communication or to close connections.

```js
// establish connection
const conn = require('net');
// ...

// close connection if script stopped
onStop(function (callback) {
    if (conn) {
        // close connection
        conn.destroy();
    }
    callback();
}, 2000 /*ms*/);
```
`timeout` is 1000ms by default.

### runScriptAsync
```js
await runScriptAsync('scriptName');
console.log('Srcipt started, but not yet executed');
```

Starts or restarts other scripts (and itself too) by name.

```js
// restart script
await runScriptAsync('groupName.scriptName1');
```

### startScriptAsync
```js
await startScriptAsync('scriptName', ignoreIfStarted);
```

Start the script. If ignoreIfStarted set to true, nothing will be done if a script yet running, otherwise the script will be restarted.

```js
await startScriptAsync('scriptName', true); // start script if not started
```

### stopScriptAsync
```js
await stopScriptAsync('scriptName');
```

If stopScript is called without arguments, it will stop itself:

```js
await stopScriptAsync();
```

### isScriptActive
```js
isScriptActive('scriptName');
```

Returns if a script enabled or disabled.
Please note that that does not give back if the script now running or not.
The Script can be finished, but still activated.

### wait
Just pause the execution of the script.
Warning this function is `promise` and must be called as follows:
```js
await wait(1000);
```