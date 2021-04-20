## Content
- [Note](#note)
- [Global functions](#global-functions)
    - [Best practice](#best-practice)

- [Functions](#following-functions-can-be-used-in-scripts)
    - [require - load some module](#require---load-some-module)
    - [Buffer](#buffer)
    - [log - Gives out the message into log](#log---gives-out-the-message-into-log)
    - [exec - execute some OS command, like "cp file1 file2"](#exec---execute-some-os-command-like-cp-file1-file2)
    - [on - Subscribe on changes or updates of some state](#on---subscribe-on-changes-or-updates-of-some-state)
    - [subscribe - same as on](#subscribe---same-as-on)
    - [unsubscribe](#unsubscribe)
    - [getSubscriptions](#getsubscriptions)
    - [schedule](#schedule)
        - [Time schedule](#time-schedule)
        - [Astro-function](#astro--function)
    - [getSchedules](#getschedules)
    - [clearSchedule](#clearschedule)
    - [getAttr](#getattr)
    - [getAstroDate](#getastrodate)
    - [isAstroDay](#isastroday)
    - [compareTime](#comparetime)
    - [setState](#setstate)
    - [setBinaryState](#setbinarystate)
    - [setStateDelayed](#setstatedelayed)
    - [clearStateDelayed](#clearstatedelayed)
    - [getStateDelayed](#getstatedelayed)
    - [getState](#getstate)
    - [existsState](#existsState)
    - [getObject](#getobject)
    - [setObject](#setobject)
    - [existsObject](#existsObject)
    - [extendObject](#extendobject)
    - [deleteObject](#deleteobject)
    - [getIdByName](#getidbyname)
    - [getEnums](#getenums)
    - [createState](#createstate)
    - [deleteState](#deletestate)
    - [sendTo](#sendto)
    - [sendToHost](#sendtohost)
    - [setInterval](#setinterval)
    - [clearInterval](#clearinterval)
    - [setTimeout](#settimeout)
    - [clearTimeout](#cleartimeout)
    - [setImmediate](#setImmediate)
    - [formatDate](#formatdate)
    - [getDateObject](#getDateObject)
    - [formatValue](#formatvalue)
    - [adapterSubscribe](#adaptersubscribe)
    - [adapterUnsubscribe](#adapterunsubscribe)
    - [$ - Selector](#---selector)
    - [readFile](#readfile)
    - [writeFile](#writefile)
    - [delFile](#delFile)
    - [onStop](#onstop)
    - [getHistory](#gethistory)
    - [runScript](#runscript)
    - [runScriptAsync](#runScriptAsync)
    - [startScript](#startscript)
    - [startScriptAsync](#startscript)
    - [stopScript](#stopscript)
    - [stopScriptAsync](#stopScriptAsync)
    - [isScriptActive](#isscriptactive)
    - [name](#name)
    - [instance](#instance)
    - [messageTo](#messageto)
    - [onMessage](#onmessage)
    - [onMessageUnregister](#onmessageunregister)
    - [onLog](#onlog)
    - [onLogUnregister](#onlogunregister)
    - [wait](#wait)
    - [sleep](#sleep)

- [Scripts activity](#scripts-activity)
- [Changelog](#changelog)

## Note
If in the script some modules or functions are used with callbacks or cyclic calls, except setTimeout/setInterval,
so they will be called again and again even if the new version of script exists or script is deleted. For example the following script:

```js
var http = require('http');
// Read www.google.com page
http.request('www.google.com', function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
        log('BODY: ' + chunk);
        });
}).on('error', function(e) {
        log('problem with request: ' + e.message, 'error');
});
```

was deleted by user before callback returns. The callback will be executed anyway. To fix this feature **restart** the javascript adapter.

You can use `cb` function to wrap you callback, like this

```js
http.request('www.google.com', cb(function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        log('BODY: ' + chunk);
      }));
}).on('error', cb(function(e) {
      log('problem with request: ' + e.message, 'error');
}));
```
to be sure, that no callback will be called if script is deleted or modified.

## Global functions
You can define the global scripts in the "global" folder.
All global scripts are available on all instances. If global script is disabled, it will not be used.
Global script will be just prepended to the normal script and compiled, so you cannot share data between scripts via global scripts. Use states for it.

To use global functions in TypeScript, you have to `declare` them first, so the compiler knows about the global functions. Example:
```typescript
// global script:
// ==============
function globalFn(arg: string): void {
    // actual implementation
}

// normal script:
// ==============
declare function globalFn(arg: string): void;
// use as normal:
globalFn("test");
```

#### Best practice:
Create two instances of javascript adapter: one "test" and one "production".
After the script is tested in the "test" instance, it can be moved to "production". By that you can restart the "test" instance as you want.

## Following functions can be used in scripts:

### require - load some module
```js
var mod = require('module_name');
```
Following modules are pre-loaded: `fs`, `crypto`, `wake_on_lan`, `request`, `suncalc2`, `util`, `path`, `os`, `net`, `events`, `dns`.

To use other modules, enter the name of the module in the configuration dialog. ioBroker will install the module, after which you can require and use it in your scripts.

**Notice** - module *request* is available via variable *request*. There is no need to write `var request = require('request');`.

### Buffer
Buffer - Node.js Buffer, read here [http://nodejs.org/api/buffer.html](http://nodejs.org/api/buffer.html)

### log - Gives out the message into log
```js
log(msg, sev);
```
Message is a string and sev is one of the following: 'debug', 'info', 'warn', 'error'.
Default severity is ***'info'***

### exec - execute some OS command, like "cp file1 file2"
```js
exec(cmd, callback);
```

Execute system command and get the outputs.

```js
// reboot linux system :)
exec('reboot');

// Get the list of files and directories in /var/log
exec('ls /var/log', function (error, stdout, stderr) {
    console.log('stdout: ' + stdout);
});
```

**Notice:** you must enable *Enable command "setObject"* option to call it.

### on - Subscribe on changes or updates of some state
```js
on(pattern, callbackOrId, value);
```

The callback function will return the object as parameter with following content:
```js
    {
    	'_id' : 'javascript.0.myplayer',
    	'type' : 'state',
    	'common' : {
    		'def' :    0,
            'min'  :   0,
            'max'  :   6,
    		'type' :   'number',
    		'read' :   true,
    		'write' :  true,
    		'states' : { 0:'stop', 1:'play', 2:'pause', 3:'next', 4:'previous', 5:'mute', 6:'unmute'},
    		'role' :   'media.state',
    		'desc' :   'Player handling',
    		'name' :   'MyPlayer'
    	},
    	'native' : {},
    	'channelId' :   'channelID',
    	'channelName' : 'channelName',
    	'deviceId' :    'deviceID',
    	'deviceName' :  'deviceName',
    	'enumIds' : [],
    	'enumNames' : [],
    	'state' : {
    		'val' :  'new state',
    		'ts' :   1416149118,
    		'ack' :  true,
    		'lc' :   1416149118,
    		'from' : 'system.adapter.sonos.0'
    	},
    	'oldState' : {
    		'val' :  'old state',
    		'ts' :   1416148233,
    		'ack' :  true,
    		'lc' :   1416145154,
    		'from' : 'system.adapter.sonos.0'
    	}
    }
```
**Note:** `state` was previously called `newState`. That is still working.

Example:
```js
var timer;

// Create state "javascript.0.counter"
createState('counter', 0);

// On change
on('adapter.0.device.channel.sensor', function (obj) {
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

You can use following parameters to specify the trigger:

| parameter   | type/value | description                                                                                            |
|-----------  |-------     |-------------------                                                                                     |
| logic       | string     |       "and" or "or" logic to combine the conditions \(default: "and"\)                                 |
|             |            |                                                                                                        |
| id          | string     |       id is equal to given one                                                                         |
|             | RegExp     |       id matched to regular expression                                                                 |
|             | Array      |       id matched to a list of allowed IDs                                                              |
|             |            |                                                                                                        |
| name        | string     |       name is equal to given one                                                                       |
|             | RegExp     |       name matched to regular expression                                                               |
|             | Array      |       name matched to a list of allowed names                                                          |
|             |            |                                                                                                        |
| change      | string     |       "eq", "ne", "gt", "ge", "lt", "le", "any"                                                        |
|             |   "eq"     |       (equal)            New value must be equal to old one (state.val == oldState.val)                |
|             |   "ne"     |       (not equal)        New value must be not equal to the old one (state.val != oldState.val) **If pattern is id-string this value is used by default**    |
|             |   "gt"     |       (greater)          New value must be greater than old value (state.val > oldState.val)           |
|             |   "ge"     |       (greater or equal) New value must be greater or equal to old one (state.val >= oldState.val)     |
|             |   "lt"     |       (smaller)          New value must be smaller than old one (state.val < oldState.val)             |
|             |   "le"     |       (smaller or equal) New value must be smaller or equal to old value (state.val <= oldState.val)   |
|             |  "any"     |       Trigger will be raised if just the new value comes                                               |
|             |            |                                                                                                        |
| val         | mixed      |       New value must be equal to given one                                                             |
| valNe       | mixed      |       New value must be not equal to given one                                                         |
| valGt       | mixed      |       New value must be greater than given one                                                         |
| valGe       | mixed      |       New value must be greater or equal to given one                                                  |
| valLt       | mixed      |       New value must be smaller than given one                                                         |
| valLe       | mixed      |       New value must be smaller or equal to given one                                                  |
|             |            |                                                                                                        |
| ack         | boolean    |       Acknowledged state of new value is equal to given one                                            |
| q           | number     |       Quality code state of new value is equal to given one. You can use '*' for matching to any code  |
|             |            |                                                                                                        |
| oldVal      | mixed      |       Previous value must be equal to given one                                                        |
| oldValNe    | mixed      |       Previous value must be not equal to given one                                                    |
| oldValGt    | mixed      |       Previous value must be greater than given one                                                    |
| oldValGe    | mixed      |       Previous value must be greater or equal to given one                                             |
| oldValLt    | mixed      |       Previous value must be smaller than given one                                                    |
| oldValLe    | mixed      |       Previous value must be smaller or equal to given one                                             |
|             |            |                                                                                                        |
| oldAck      | bool       |       Acknowledged state of previous value is equal to given one                                       |
| oldQ        | number     |       Quality code state of previous value is equal to given one. You can use '*' for matching to any code  |
|             |            |                                                                                                        |
| ts          | string     |       New value time stamp must be equal to given one (state.ts == ts)                                 |
| tsGt        | string     |       New value time stamp must be not equal to the given one (state.ts != ts)                         |
| tsGe        | string     |       New value time stamp must be greater than given value (state.ts > ts)                            |
| tsLt        | string     |       New value time stamp must be greater or equal to given one (state.ts >= ts)                      |
| tsLe        | string     |       New value time stamp must be smaller than given one (state.ts < ts)                              |
|             |            |                                                                                                        |
| oldTs       | string     |       Previous time stamp must be equal to given one (oldState.ts == ts)                               |
| oldTsGt     | string     |       Previous time stamp must be not equal to the given one (oldState.ts != ts)                       |
| oldTsGe     | string     |       Previous time stamp must be greater than given value (oldState.ts > ts)                          |
| oldTsLt     | string     |       Previous time stamp must be greater or equal to given one (oldState.ts >= ts)                    |
| oldTsLe     | string     |       Previous time stamp must be smaller than given one (oldState.ts < ts)                            |
|             |            |                                                                                                        |
| lc          | string     |       Last change time stamp must be equal to given one (state.lc == lc)                               |
| lcGt        | string     |       Last change time stamp must be not equal to the given one (state.lc != lc)                       |
| lcGe        | string     |       Last change time stamp must be greater than given value (state.lc > lc)                          |
| lcLt        | string     |       Last change time stamp must be greater or equal to given one (state.lc >= lc)                    |
| lcLe        | string     |       Last change time stamp must be smaller than given one (state.lc < lc)                            |
|             |            |                                                                                                        |
| oldLc       | string     |       Previous last change time stamp must be equal to given one (oldState.lc == lc)                   |
| oldLcGt     | string     |       Previous last change time stamp must be not equal to the given one (oldState.lc != lc)           |
| oldLcGe     | string     |       Previous last change time stamp must be greater than given value (oldState.lc > lc)              |
| oldLcLt     | string     |       Previous last change time stamp must be greater or equal to given one (oldState.lc >= lc)        |
| oldLcLe     | string     |       Previous last change time stamp must be smaller than given one (oldState.lc < lc)                |
|             |            |                                                                                                        |
| channelId   | string     |       Channel ID must be equal to given one                                                            |
|             | RegExp     |       Channel ID matched to regular expression                                                         |
|             | Array      |       Channel ID matched to a list of allowed channel IDs                                              |
|             |            |                                                                                                        |
| channelName | string     |       Channel name must be equal to given one                                                          |
|             | RegExp     |       Channel name matched to regular expression                                                       |
|             | Array      |       Channel name matched to a list of allowed channel names                                          |
|             |            |                                                                                                        |
| deviceId    | string     |       Device ID must be equal to given one                                                             |
|             | RegExp     |       Device ID matched to regular expression                                                          |
|             | Array      |       Device ID matched to a list of allowed device IDs                                                |
|             |            |                                                                                                        |
| deviceName  | string     |       Device name must be equal to given one                                                           |
|             | RegExp     |       Device name matched to regular expression                                                        |
|             | Array      |       Device name matched to a list of allowed device names                                            |
|             |            |                                                                                                        |
| enumId      | string     |       State belongs to given enum                                                                      |
|             | RegExp     |       One enum ID of the state satisfies the given regular expression                                  |
|             | Array      |       One enum ID of the state is in the given list of enum IDs                                        |
|             |            |                                                                                                        |
| enumName    | string     |       State belongs to given enum                                                                      |
|             | RegExp     |       One enum name of the state satisfies the given regular expression                                |
|             | Array      |       One enum name of the state is in the given list of enum names                                    |
|             |            |                                                                                                        |
| from        | string     |       New value is from defined adapter                                                                |
|             | RegExp     |       New value is from an adapter that matches the regular expression                                 |
|             | Array      |       New value is from an adapter that appears in the given list of allowed adapters                  |
|             |            |                                                                                                        |
| fromNe      | string     |       New value is not from defined adapter                                                            |
|             | RegExp     |       New value is not from an adapter that matches the regular expression                             |
|             | Array      |       New value is not from an adapter that appears in the given list of forbidden adapters            |
|             |            |                                                                                                        |
| oldFrom     | string     |       Old value is from defined adapter                                                                |
|             | RegExp     |       Old value is from an adapter that matches the regular expression                                 |
|             | Array      |       Old value is from an adapter that appears in the given list of allowed adapters                  |
|             |            |                                                                                                        |
| oldFromNe   | string     |       Old value is not from defined adapter                                                            |
|             | RegExp     |       Old value is not from an adapter that matches the regular expression                             |
|             | Array      |       Old value is not from an adapter that appears in the given list of forbidden adapters            |

Examples:
Trigger on all states with ID `'*.STATE'` if they are acknowledged and have new value `true`.

```js
{
    id: /\.STATE$/,
    val: true,
    ack: true,
    logic: "and"
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

Please note, that by default "change" is equal to "any", except when only id as string is set (like `on("id", function (){});`). In last case change will be set to "ne".

If the `value` parameter is set in combination with state id as the second parameter, on any change the state will filled with the `value`.
```js
on('stateId1', 'stateId2', 'triggered');
setState('stateId1', 'new value');

// stateId2 will be set to 'triggered'.
```

Function "on" returns handler back. This handler can be used by unsubscribe.

*Notice:* by default only states with quality 0x00 will be passed to callback function. If you want to get all events, add {q: '*'} to pattern structure.

*Notice:* from 4.3.2 it is possible to write type of trigger as second parameter: `on('my.id.0', 'any', obj => console.log(obj.state.val));`

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
var mySubscription = on({id: "javascript.0.myState", change: 'any'}, function (data) {
    // unsubscribe after first trigger
    if (unsubscribe(mySubscription)) {
        log('Subscription deleted');
    }
});

// by Object ID
on({id: "javascript.0.myState1", change: 'ne'}, function (data) {
    log('Some event');
});

on({id: "javascript.0.myState1", change: 'any'}, function (data) {
    // unsubscribe
    if (unsubscribe("javascript.0.myState1")) {
        log('All subscriptions deleted');
    }
});
```

### getSubscriptions
Get the list of subscriptions.

Example of result:
```js
{
	"megad.0.dataPointName" : [
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
schedule("*/2 * * * *", function () {
    log("Will be triggered every 2 minutes!");
});

// Example with 6 digits:
schedule("*/3 * * * * *", function () {
    log("Will be triggered every 3 seconds!");
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
schedule({second: [20, 25]}, function () {
    log("Will be triggered at xx:xx:20 and xx:xx:25 of every minute!");
});

schedule({hour: 12, minute: 30}, function () {
    log("Will be triggered at 12:30!");
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
    log("It will run after 5 seconds and stop after 10 seconds.");
});
```

The rule itself could be also an object:
```js
let today = new Date();
let startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()+1);
let endTime =  new Date(today.getFullYear(), today.getMonth(), today.getDate()+7);
let ruleData = {hour: 12, minute: 30};
schedule({ start: startTime, end: endTime, rule: ruleData }, function () {
    log("Will be triggered at 12:30, starting tomorow, ending in 7 days");
});
```

#### Astro-function

Astro-function can be used via "astro" attribute:

```js
schedule({astro: "sunrise"}, function () {
    log("Sunrise!");
});

schedule({astro: "sunset", shift: 10}, function () {
    log("10 minutes after sunset!");
});
```
The attribute "shift" is the offset in minutes. It can be negative too, to define time before astro event.

Following values can be used as attribute in astro-function:

- `"sunrise"`: sunrise (top edge of the sun appears on the horizon)
- `"sunriseEnd"`: sunrise ends (bottom edge of the sun touches the horizon)
- `"goldenHourEnd"`: morning golden hour (soft light, best time for photography) ends
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

**Note:** On some places sometines it could be so, that no night/nightEnd exists. Please read [here](https://github.com/mourner/suncalc/issues/70) about it.

**Note:** you can use "on" function for schedule with small modification:
```js
on({time: "*/2 * * * *"}, function () {
    log((new Date()).toString() + " - Will be triggered every 2 minutes!");
});

on({time: {hour: 12, minute: 30}}, function () {
    log((new Date()).toString() + " - Will be triggered at 12:30!");
});

on({astro: "sunset", shift: 10}, function () {
    log((new Date()).toString() + " - 10 minutes after sunset!");
});
```
### getSchedules
```js
const list = getSchedules(true);
```
Returns the list of all CRON jobs and schedules (except astro).
Argument must be true if you want to get the list for every running script. Else only schedules in this script will be returned.

```js
const list = getSchedules(true);
list.forEach(schedule => console.log(JSON.stringify(schedule)));

// clear all schedules in all scripts!
list.forEach(schedule => clearSchedule(schedule));
```

Example output:
```
2020-11-01 20:15:19.929  - {"type":"cron","pattern":"0 * * * *","scriptName":"script.js.Heizung","id":"cron_1604258108384_74924"}
2020-11-01 20:15:19.931  - {"type":"schedule","schedule":"{"period":{}}","scriptName":"script.js.Heizung","id":"schedule_19576"}
```
 

### clearSchedule
If **no** "astro" function used you can cancel the schedule later. To allow this the schedule object must be saved:

```js
var sch = schedule("*/2 * * * *", function () { /* ... */ });

// later:
clearSchedule(sch);
```

### getAttr
```js
getAttr({attr1: {attr2: 5}}, 'attr1.attr2');
```
Returns an attribute of the object. Path to attribute can be nested, like in the example.

If the first attribute is string, the function will try to parse the string as JSON string.

### getAstroDate
```js
getAstroDate(pattern, date);
```
Returns a javascript Date object for the specified pattern. For valid pattern values see the [Astro](#astro--function) section in the *schedule* function.

The returned Date object is calculated for the passed *date*. If no date is provided, the current day is used.

```js
let sunriseEnd = getAstroDate("sunriseEnd");
log("Sunrise ends today at " + sunriseEnd.toLocaleTimeString());

let today = new Date();
let tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
let tomorrowNight = getAstroDate("night", tomorrow);
```

### isAstroDay
```js
isAstroDay();
```
Returns `true` if the current time is between the astro sunrise and sunset.

### compareTime
```js
compareTime(startTime, endTime, operation, timeToCompare);
```
Compares given time with limits.

If `timeToCompare` is not given, so the actual time will be used.

The following operations are possible:

- `">"` - if given time is greater as startTime
- `">="` - if given time is greater or equal to startTime
- `"<"` - if given time is less as startTime
- `"<="` - if given time is less or equal to startTime
- `"=="` - if given time is equal to startTime
- `"<>"` - if given time is not equal to startTime
- `"between"` - if given time is between startTime and endTime
- `"not between"` - if given time is not between startTime and endTime

Time can be Date object or Date with time or just time.

You can use astro-names for the time definition. All 3 parameters can be set as astro time.
Following values are possible: 'sunrise', 'sunset', 'sunriseEnd', 'sunsetStart', 'dawn', 'dusk', 'nauticalDawn', 'nauticalDusk', 'nightEnd', 'night', 'goldenHourEnd', 'goldenHour'.
See [Astro](#astro--function) for detail.


```js
console.log(compareTime('sunsetStart', 'sunsetEnd', 'between') ? 'Now is sunrise' : 'Now is no sunrise');
```

It is possible to define the time with offset too:

```js
console.log(compareTime({astro: 'sunsetStart', offset: 30}, {astro: 'sunrise', offset: -30}, '>') ? 'Now is at least 30 minutes after sunset' : 'No idea');
```

Structure of astro object.

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

**Note**: The following commands are identical

```
setState('myState', 1, false);
setState('myState', {val: 1, ack: false});
setState('myState', 1);
```

Please refer to https://github.com/ioBroker/ioBroker/wiki/Adapter-Development-Documentation#commands-and-statuses for usage of "ack".
Short:
- `ack` = false : Script wants to send a command to be executed by the target device/adapter
- `ack` = true  : Command was successfully executed and state is updated as positive result

### setBinaryState
```js
setBinaryState(id, state, callback);
```
Same as setState, but for the binary states, like files, images, buffers.
The difference is that such a state has no ack, ts, lc, quality and so on flags und should be used only for binary things.
The object's common.type must be equal to 'file'.


### setStateDelayed
```js
setStateDelayed(id, state, isAck, delay, clearRunning, callback);
```

Same as setState but with delay in milliseconds. You can clear all running delay for this ID (by default). E.g.

```js
// Switch ON the light in the kitchen in one second
setStateDelayed('Kitchen.Light.Lamp', true,  1000);

// Switch OFF the light in the kitchen in 5 seconds and let first timeout run.
setStateDelayed('Kitchen.Light.Lamp', false, 5000, false, function () {
    log('Lamp is OFF');
});
```
This function returns handler of the timer and this timer can be individually stopped by clearStateDelayed

### clearStateDelayed
```js
clearStateDelayed(id);
```

Clears all delayed tasks for specified state ID or some specific delayed task.

```js
setStateDelayed('Kitchen.Light.Lamp', false,  10000); // Switch OFF the light in the kitchen in ten second
var timer = setStateDelayed('Kitchen.Light.Lamp', true,  5000, false); // Switch ON the light in the kitchen in five second
clearStateDelayed('Kitchen.Light.Lamp', timer); // Nothing will be switched on
clearStateDelayed('Kitchen.Light.Lamp'); // Clear all running delayed tasks for this ID
```

### getStateDelayed
```js
getStateDelayed(id);
```

This is synchronous call and you will get the list of all running timers (setStateDelayed) for this id.
You can call this function without id and get timers for all IDs.
In case you call this function for some specific object ID you will get following answer:

```js
getStateDelayed('hm-rpc.0.LQE91119.1.STATE');

// returns an array like
[
	{timerId: 1, left: 1123,   delay: 5000,  val: true,  ack: false},
	{timerId: 2, left: 12555,  delay: 15000, val: false, ack: false},
]
```

If you will ask for all IDS the answer will looks like:

```js
getStateDelayed();

// returns an object like
{
	"hm-rpc.0.LQE91119.1.STATE": [
		{timerId: 1, left: 1123,   delay: 5000,   val: true,  ack: false},
		{timerId: 2, left: 12555,  delay: 15000,  val: false, ack: false},
	],
	"hm-rpc.0.LQE91119.2.LEVEL": [
		{timerId: 3, left: 5679, delay: 10000,   val: 100,  ack: false}
	]
}
```

`left` is the time left in milliseconds.

`delay` is the initial delay value in milliseconds;

You can ask by timerId directly. In this case the answer will be:

```js
getStateDelayed(3);

// returns an object like
{id: "hm-rpc.0.LQE91119.2.LEVEL", left: 5679, delay: 10000, val: 100,  ack: false}
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

If state does not exist, a warning will be printed in the logs and the object: ```{val: null, notExist: true}``` will be returned.
To suppress the warning check if the state exists before calling getState (see [existsState](#existsState)).

### getBinaryState
```js
getBinaryState(id, function (err, data) {});
```
Same as getState, but for the binary states, like files, images, buffers.
The difference is that such a state has no ack, ts, lc, quality and so on flags und should be used only for binary "things".
The object's common.type must be equal to 'file'.
This function must be always used with callback. "data" is a buffer.

### existsState
```js
existsState(id, function (err, isExists) {});
```

If option "Do not subscribe all states on start" is deactivated, you can use simpler call:

```js
existsState(id)
```
the function returns in this case true or false.

Checks if a state exists.

### getObject
```js
getObject(id, enumName);
```
Get description of object id as stored in system.
You can specify the enumeration name. If this is defined, two additional attributes will be added to result: enumIds and enumNames.
These arrays has all enumerations, where ID is member of. E.g:

```js
getObject('adapter.N.objectName', 'rooms');
```

gives back in enumIds all rooms, where the requested object is a member. You can define "true" as enumName to get back *all* enumerations.

### setObject
```js
setObject(id, obj, callback);
```
Write object into DB. This command can be disabled in adapter's settings. Use this function carefully, while the global settings can be damaged.

You should use it to **modify** an existing object you read beforehand, e.g.:
```js
var obj = getObject('adapter.N.objectName');
obj.native.settings = 1;
setObject('adapter.N.objectName', obj, function (err) {
    if (err) log('Cannot write object: ' + err);
});
```

### existsObject
```js
existsObject(id, function (err, isExists) {});
```

If option "Do not subscribe all states on start" is deactivated, you can use simpler call:

```js
existsObject(id)
```
the function returns in this case true or false.

Checks if a object exists.


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

Deletes object from DB by ID. If the object has type `state`, the state value will be deleted too. 

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

returns id of the object with given name. If there are more than one object with this name the result will be an array. If _alwaysArray_ flag is set, the result will be always an array if some ID found.
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
Create state and object in javascript space if does not exist, e.g. "javascript.0.mystate".

#### Parameters:

- `name`: name of the state without namespace, e.g. "mystate"
- `initialValue`: variable can be initialized after created. Value "undefined" means do not initialize value.
- `forceCreation`: create state independent of if state yet exists or not.
- `common`: common description of object see description [here](https://github.com/ioBroker/ioBroker/blob/master/doc/SCHEMA.md#state)
- `native`: native description of object. Any specific information.
- `callback`: called after state is created and initialized.

It is possible short type of createState:

- `createState('myVariable')` - simply create variable if does not exist
- `createState('myVariable', 1)` - create variable if does not exist and initialize it with value 1
- `createState('myVariable', {name: 'My own variable', unit: '°C'}, function () {log('created');});`
- `createState('myVariable', 1, {name: 'My own variable', unit: '°C'})` - create variable if does not exist with specific name and units

### deleteState
```js
deleteState(name, callback);
```
Delete state and object in javascript space, e.g. "javascript.0.mystate". States from other adapters cannot be deleted.

```js
deleteState('myVariable')
```
simply delete variable if exists.

### sendTo
```js
sendTo(adapter, command, message, callback);
```

Send message to a specific or all adapter instances. When using the adapter name the message is send to all instances.

To get specific information about messages you must read the documentation for particular adapter.

Example:

```js
sendTo('telegram', {user: 'UserName', text: 'Test message'});
```

Some adapters also support responses to the send messages. (e.g. history, sql, telegram)
The response is only returned in the callback if the message is send to a specific instance!

Example with response:

```js
sendTo('telegram.0', {user: 'UserName', text: 'Test message'}, function (res) {
    console.log('Sent to ' + res + ' users');
});
```

### sendToHost
```js
sendToHost(hostName, command, message, callback);
```

Send message to controller instance.

Following commands are supported:
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
sendToHost('myComputer', 'cmdExec', {data: 'ls /'}, function (res) {
    console.log('List of files: ' + res.data);
});
```

**Notice:** you must enable *Enable command "setObject"* option to call it.

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

### getDateObject
```js
getDateObject (stringOrNumber);
```
Converts string or number to Date object.
If only hours are given it will add current date to it and will try to convert.

```js
getDateObject("20:00") // => "Tue Aug 09 2016 20:00:00 GMT+0200"
```

### formatValue
```js
formatValue(value, decimals, format);
```
Formats any value (strings too) to number. Replaces point with comma if configured in system.
Decimals specify digits after comma. Default value is 2.
Format is optional:
 - '.,': 1234.567 => 1.234,56
 - ',.': 1234.567 => 1,234.56
 - ' .': 1234.567 => 1 234.56


### adapterSubscribe
```js
adapterSubscribe(id);
```
Sends to adapter message "subscribe" to inform adapter. If adapter has common flag "subscribable" in case of function "subscribe" this function will be called automatically.

### adapterUnsubscribe
```js
adapterUnsubscribe(id);
```
Sends to adapter message "unsubscribe" to inform adapter to not poll the values.

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
"idfilter" can have wildcards '*'

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
}
```
This code searches in channels.
Find all channels with `common.role="switch"` and belongs to enum.rooms.Wohnzimmer.
Take all their states, where id ends with `".STATE"` and make subscription on all these states.
If some of these states changes the callback will be called like for "on" function.


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
    if (i == 1) return false;
});
```

### readFile
```js
readFile(adapter, fileName, function (error, bytes) {});
```

The result will be given in callback.
Read file from DB from folder "javascript".

Argument *adapter* can be omitted.

```js
// read vis views
readFile('vis.0', '/main/vis-views.json', function (error, data) {
    console.log(data.substring(0, 50));
});

// The same as
//readFile('/../vis.0/main/vis-views.json', function (error) {
//     console.log(data.substring(0, 50));
//});
```

By default working directory/adapter is "javascript.0".

### writeFile
```js
writeFile(adapter, fileName, bytes, function (error) { });
```

The optional error code will be given in callback. Argument *adapter* can be ommited.
fileName is the name of file in DB. All files are stored in folder "javascript". if you want to write to other folders, e.g. to "/vis.0/" use setFile for that.

The file that looks like `'/subfolder/file.txt'` will be stored under `"/javascript/subfolder/file.txt"` and can be accessed over web server with `"http://ip:8082/javascript/subfolder/file.txt"`

```js
// store screenshot in DB
var fs = require('fs');
var data = fs.readFileSync('/tmp/screenshot.png');
writeFile(null, '/screenshots/1.png', data, function (error) {
    console.log('file written');
});

// The same as
//writeFile('/screenshots/1.png', data, function (error) {
//    console.log('file written');
//});
```

```js
// store file in '/vis.0' in DB
var fs = require('fs');
var data = fs.readFileSync('/tmp/screenshot.png');
writeFile('vis.0', '/screenshots/1.png', data, function (error) {
    console.log('file written');
});
```

### delFile
```js
delFile(adapter, fileName, function (error) {});
```

Delete file or directory. fileName is the name of file or directory in DB.

This function is alias for *unlink*.

### onStop
```js
onStop (function(){ /* do something when script is stopped */ }, timeout);
```
Install callback, that will be called if script stopped. Used e.g. to stop communication or to close connections.

```js
// establish connection
var conn = require('net');
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

### getHistory
```js
getHistory(instance, options, function (error, result, options, instance) {});
```

Read history from specified instance. if no instance specified the system default history instance will be taken.
```js
// Read history of 'system.adapter.admin.0.memRss' from sql driver
var end = new Date().getTime();
getHistory('sql.0', {
        id:         'system.adapter.admin.0.memRss',
        start:      end - 3600000,
        end:        end,
        aggregate:  'm4',
        timeout:    2000
    }, function (err, result) {
        if (err) console.error(err);
        if (result) {
            for (var i = 0; i < result.length; i++) {
            console.log(result[i].id + ' ' + new Date(result[i].ts).toISOString());
            }
        }
    });
```
Possible options you can find [here](https://github.com/ioBroker/ioBroker.history#access-values-from-javascript-adapter).

Additionally to these parameters you must specify "id" and you may specify timeout (default: 20000ms).

One more example:
```js
// Get last 50 entries from default history instance with no aggregation:
getHistory({
        id:         'system.adapter.admin.0.alive',
        aggregate:  'none',
        count:      50
    }, function (err, result) {
        if (err) console.error(err);
        if (result) {
            for (var i = 0; i < result.length; i++) {
            console.log(result[i].id + ' ' + new Date(result[i].ts).toISOString());
            }
        }
    });
```

**Note: ** of course history must be first enabled for selected ID in admin.

### runScript
```js
runScript('scriptName', function () {
    // Callback is optional
    console.log('Srcipt started, but not yet executed');
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
    .then(() => console.log('Script started, but not yet executed'));

// or

await runScriptAsync('scriptName');
console.log(`Script was restarted`);
```

### startScript
```js
startScript('scriptName', ignoreIfStarted, callback);
```

Starts the script. If ignoreIfStarted set to true, nothing will be done if script yet running, elsewise the script will be restarted.

```js
startScript('scriptName', true); // start script if not started
```

### startScriptAsync
Same as runScript, but with `promise`.

```js
startScriptAsync('scriptName', ignoreIfStarted)
    .then(started => console.log(`Script was ${started ? 'started' : 'already started'}`));

// or

const started = await startScriptAsync('scriptName', ignoreIfStarted);
console.log(`Script was ${started ? 'started' : 'already started'}`);
```

Starts the script. If ignoreIfStarted set to true, nothing will be done if script yet running, elsewise the script will be restarted.

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
    .then(stopped => console.log(`Script was ${stopped ? 'stopped' : 'already stopped'}`));

//or
const stopped = await stopScriptAsync('scriptName');
console.log(`Script was ${stopped ? 'stopped' : 'already stopped'}`);
```

If stopScript is called without arguments, it will stop itself:

```js
stopScript();
```

### isScriptActive
```js
isScriptActive('scriptName');
```

Returns if script enabled or disabled. Please note, that that does not give back if the script now running or not. Script can be finished, but still activated.

It is not a function. It is a variable with javascript instance, that is visible in script's scope.

### toInt
### toFloat
### toBoolean
### jsonataExpression

### wait
Just pause the execution of the script.
Warning this function is `promise` and must be called as follows:
```
await wait(1000);
```

### sleep
Same as [wait](#wait)

### messageTo
```
messageTo({instance: 'instance', script: 'script.js.common.scriptName', message: 'messageName'}, data, {timeout: 1000}, result =>
    console.log(JSON.stringify(result)));
```

Sends via the "message bus" the message to some other script. Or even to some handler in the same script.

Timeout for callback is 5 seconds by default.

The target could be shorted to:

```
messageTo('messageName', data, result =>
    console.log(JSON.stringify(result)));
```

Callback and options are optional and timeout is by default 5000 milliseconds (if callback provided).

```
messageTo('messageName', dataWithNoResponse);
```

### onMessage
```
onMessage('messageName', (data, callback) => {console.log('Received data: ' + data); callback(null, Date.now())});
```

Subscribes on message bus and delivers response via callback.
The response from script which sends response as first will be accepted as answer, all other answers will be ignored.

### onMessageUnregister
```
const id = onMessage('messageName', (data, callback) => {console.log(data); callback(Date.now())});

// unsubscribe specific handler
onMessageUnregister(id);
// or unsubscribe by name
onMessageUnregister('messageName');
```

Unsubscribes from this message.

### onLog
```
onLog('error', data => {
    sendTo('telegram.0', {user: 'UserName', text: data.message});
    console.log('Following was sent to telegram: ' + data.message);
});
```

Subscribes on logs with specified severity.

*Important:* you cannot output logs in handler with the same severity to avoid infinite loops.

E.g. this will produce no logs:
```
onLog('error', data => {
    console.error('Error: ' + data.message);
});
```

To receive all logs the `*` could be used. In this case the log output in handler will be disabled at all.

```
onLog('*', data => {
    console.error('Error: ' + data.message); // will produce no logs
});
```

### onLogUnregister
```
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

Unsubscribes from this logs.

## Global script variables
### scriptName
scriptName - The name of the script.

```js
log('Script ' + scriptName + ' started!');
```

It is not a function. 
It is a variable with script name, that is visible in script's scope.

### instance
The javascript instance where script is executed.

```js
log('Script ' + name + ' started by ' + instance + '!');
```

## Option - "Do not subscribe all states on start"
There are two modes of subscribe on states:
- Adapter subscribes on all changes at start and receives all changes of all states (it is easy to use getStates(id), but required more CPU and RAM):

```js
console.log(getState('someID').val);
```

- Adapter subscribes every time on specified ID if "on/subscribe" called. In this mode the adapter receives only updates for desired states.
It is very perform and RAM efficiency, but you cannot access states directly in getState. You must use callback to get the result of state:

```js
getState('someID', function (error, state) {
    console.log(state.val);
});
```

It is because the adapter does not have the value of state in RAM and must ask central DB for the value.

## Scripts activity

There is a possibility to enabled and disable scripts via states. For every script the state will be created with name **javascript.INSTANCE.scriptEnabled.SCRIPT_NAME**.
Scripts can be activated and deactivated by controlling of this state with ack=false.

