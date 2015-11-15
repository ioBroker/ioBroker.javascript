![Logo](admin/js.jpeg)
# Javascript Script Engine

executes Javascript and Coffescript Scripts.


##Note
If in the script some modules or functions are used with callbacks or cyclic calls, except setTimeout/setInterval, 
so they will be called again and again even if the new version of script exists or script is deleted. For example the following script:

```
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

You can use "cb" function to wrap you callback, like this

```
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
You can define the global scripts with suffux name "_global", like "MyGlobalFunctions_global".
All global scripts are available on all instances. If global script is disabled, it will not be used.
Global script will be just prepend to the normal script and compiled, so you cannot share data between scripts via global scrips. Use states for it.

####Best practice: 
Create two instances of javascript adapter: one "test" and one "production".
After the script is tested in the "test" instance, it can be moved to "production". By that you can restart the "test" instance as you want.

##Following functions can be used in scripts:

### require - load some module
    var mod = require('module_name');
Following modules are pre-loaded: fs, crypto, wake_on_lan, request, suncalc, util, path, os, net, events, dns.

To use other modules go to iobroker/adapter/javascript folder and run in console npm install <modulename>. After npm successfully finished it can be used in script engine. 
    
### Buffer
Buffer - Node.js Buffer, read here [http://nodejs.org/api/buffer.html](http://nodejs.org/api/buffer.html)
    
### log - Gives out the message into log 
    log(msg, sev)
Message is a string and sev is one of the following: 'debug', 'info', 'warn', 'error'.
Default severity is ***'info'***

### exec - execute some OS command, like "cp file1 file2"
    exec (cmd, callback)
    
### on - Subscribe on changes or updates of some state
    on(pattern, callbackOrId, value)

The callback function will return the object as parameter with following content:
```
    {
    	'_id' : 'javascript.0.myplayer',
    	'type' : 'state',
    	'common' : {
    		'def' :    '0',
            'min'  :   '0',
            'max'  :   '6',
    		'type' :   'number',
    		'read' :   'true',
    		'write' :  'true',
    		'states' : '0:stop;1:play;2:pause;3:next;4:previous;5:mute;6:unmute',
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
    	'newState' : {
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


Example:
```
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
| id          | string     |       name ist equal to given one                                                                      |
|             | RegExp     |       name matched to regular expression                                                               |
|             |            |                                                                                                        |
| name        | string     |       name ist equal to given one                                                                      |
|             | RegExp     |       name matched to regular expression                                                               |
|             |            |                                                                                                        |
| change      | string     |       "eq", "ne", "gt", "ge", "lt", "le", "any"                                                        |
|             |   "eq"     |       (equal)            New value must be euqal to old one (newState.val == oldState.val)             |
|             |   "ne"     |       (not equal)        New value must be not equal to the old one (newState.val != oldState.val)     |
|             |   "gt"     |       (greater)          New value must be greater than old value (newState.val > oldState.val)        |
|             |   "ge"     |       (greater or equal) New value must be greater or euqal to old one (newState.val >= oldState.val)  |
|             |   "lt"     |       (smaller)          New value must be smaller than old one (newState.val < oldState.val)          |
|             |   "le"     |       (smaller or equal) New value must be smaller or euqal to old value (newState.val <= oldState.val)|
|             |  "any"     |       Trigger will be rised if just the new value comes                                                |
|             |            |                                                                                                        |
| val         | mixed      |       New value must be euqal to given one                                                             |
| valNe       | mixed      |       New value must be not equal to given one                                                         |
| valGt       | mixed      |       New value must be greater than given one                                                         |
| valGe       | mixed      |       New value must be greater or euqal to given one                                                  |
| valLt       | mixed      |       New value must be smaller than given one                                                         |
| valLe       | mixed      |       New value must be smaller or euqal to given one                                                  |
|             |            |                                                                                                        |
| ack         | boolean    |       Acknowledged state of new value is equal to given one                                            |
|             |            |                                                                                                        |
| oldVal      | mixed      |       Previous value must be euqal to given one                                                        |
| oldValNe    | mixed      |       Previous value must be not equal to given one                                                    |
| oldValGt    | mixed      |       Previous value must be greater than given one                                                    |
| oldValGe    | mixed      |       Previous value must be greater or euqal to given one                                             |
| oldValLt    | mixed      |       Previous value must be smaller than given one                                                    |
| oldValLe    | mixed      |       Previous value must be smaller or euqal to given one                                             |
|             |            |                                                                                                        |
| oldAck      | bool       |       Acknowledged state of previous value is equal to given one                                       |
|             |            |                                                                                                        |
| ts          | string     |       New value time stamp must be euqal to given one (newState.ts == ts)                              |
| tsGt        | string     |       New value time stamp must be not equal to the given one (newState.ts != ts)                      |
| tsGe        | string     |       New value time stamp must be greater than given value (newState.ts > ts)                         |
| tsLt        | string     |       New value time stamp must be greater or euqal to given one (newState.ts >= ts)                   |
| tsLe        | string     |       New value time stamp must be smaller than given one (newState.ts < ts)                           |
|             |            |                                                                                                        |
| oldTs       | string     |       Previous time stamp must be euqal to given one (oldState.ts == ts)                               |
| oldTsGt     | string     |       Previous time stamp must be not equal to the given one (oldState.ts != ts)                       |
| oldTsGe     | string     |       Previous time stamp must be greater than given value (oldState.ts > ts)                          |
| oldTsLt     | string     |       Previous time stamp must be greater or euqal to given one (oldState.ts >= ts)                    |
| oldTsLe     | string     |       Previous time stamp must be smaller than given one (oldState.ts < ts)                            |
|             |            |                                                                                                        |
| lc          | string     |       Last change time stamp must be euqal to given one (newState.lc == lc)                            |
| lcGt        | string     |       Last change time stamp must be not equal to the given one (newState.lc != lc)                    |
| lcGe        | string     |       Last change time stamp must be greater than given value (newState.lc > lc)                       |
| lcLt        | string     |       Last change time stamp must be greater or euqal to given one (newState.lc >= lc)                 |
| lcLe        | string     |       Last change time stamp must be smaller than given one (newState.lc < lc)                         |
|             |            |                                                                                                        |
| oldLc       | string     |       Previous last change time stamp must be euqal to given one (oldState.lc == lc)                   |
| oldLcGt     | string     |       Previous last change time stamp must be not equal to the given one (oldState.lc != lc)           |
| oldLcGe     | string     |       Previous last change time stamp must be greater than given value (oldState.lc > lc)              |
| oldLcLt     | string     |       Previous last change time stamp must be greater or euqal to given one (oldState.lc >= lc)        |
| oldLcLe     | string     |       Previous last change time stamp must be smaller than given one (oldState.lc < lc)                |
|             |            |                                                                                                        |
| channelId   | string     |       Channel ID must be equal to given one                                                            |
|             | RegExp     |       Channel ID matched to regular expression                                                         |
|             |            |                                                                                                        |
| channelName | string     |       Channel name must be equal to given one                                                          |
|             | RegExp     |       Channel name matched to regular expression                                                       |
|             |            |                                                                                                        |
| deviceId    | string     |       Device ID must be equal to given one                                                             |
|             | RegExp     |       Device ID matched to regular expression                                                          |
|             |            |                                                                                                        |
| deviceName  | string     |       Device name must be equal to given one                                                           |
|             | RegExp     |       Device name matched to regular expression                                                        |
|             |            |                                                                                                        |
| enumId      | string     |       State belongs to given enum                                                                      |
|             | RegExp     |       One enum ID of state satisfy the given regular expression                                        |
|             |            |                                                                                                        |
| enumName    | string     |       State belongs to given enum                                                                      |
|             | RegExp     |       One enum name of state satisfy the given regular expression                                      |
|             |            |                                                                                                        |
| from        | string     |       New value is from defined adapter                                                                |
| fromNe      | string     |       New value is not from defined adapter                                                            |
| oldFrom     | string     |       Old value is from defined adapter                                                                |
| oldFromNe   | string     |       Old value is not from defined adapter                                                            |

Examples:
Trigger on all states with ID '*.STATE' if they are acknowledged and have new value "true".

```
{
    id: /\.STATE$/,
    val: true,
    ack: true,
    logic: "and"
}
```

**Note:** you can use RegExp directly:

```
on(/^system\.adapter\..*\.\d+\.memRss$/, function (obj) {
});

// same as
on({id: /^system\.adapter\..*\.\d+\.memRss$/, "change": "ne"}, function (obj) {
});
```
To simply connect two states with each other, write:
```
on('stateId1', 'stateId2');
```

All changes of *stateId1* will be written to *stateId2*.

Function "on" returns handler back. This handler can be used by unsubscribe. 

### subscribe - same as **[on](#on---subscribe-on-changes-or-updates-of-some-state)**
    
### unsubscribe 
    unsubscribe(id or handler)
    
Remove all subscriptions for given object ID or for given handler.

```
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
       
    
### schedule
    schedule (pattern, callback)

Time scheduler with astro-funktion.

####Time schedule
Pattern can be a string with [Cron-Syntax](http://en.wikipedia.org/wiki/Cron), e.G.:

     # *  *  * *  *  command to execute
     # │ │ │ │ │
     # │ │ │ │ │
     # │ │ │ │ └───── day of week (0 - 6) (0 to 6 are Sunday to Saturday, or use names; 7 is Sunday, the same as 0)
     # │ │ │ └────────── month (1 - 12)
     # │ │ └─────────────── day of month (1 - 31)
     # │ └──────────────────── hour (0 - 23)
     # └───────────────────────── min (0 - 59)

```
schedule("*/2 * * * *", function () {
    log("Will be triggered every 2 minutes!");
});
```
Pattern can be an object, it is used especially if seconds are required:

```
schedule({second: [20, 25]}, function () {
    log("Will be triggered at xx:xx:20 and xx:xx:25 of every minute!");
});

schedule({hour: 12, minute: 30}, function () {
    log("Will be triggered at 12:30!");
});
```
Pattern can be a Javascript Date object (some specific time point) - in this case only it will be triggered only one time.

####Astro- funktion

Astro-function can be used via "astro" attribute:

```
schedule({astro: "sunrise"}, function () {
    log("Sunrise!");
});

schedule({astro: "sunset", shift: 10}, function () {
    log("10 minutes after sunset!");
});
```
The attribute "shift" is the offset in minutes. It can be negative too, to define time before astro event.

Following values can be used as attribut in astro-function:

- sunrise: sunrise (top edge of the sun appears on the horizon)
- sunriseEnd: sunrise ends (bottom edge of the sun touches the horizon)
- goldenHourEnd: morning golden hour (soft light, best time for photography) ends
- solarNoon: solar noon (sun is in the highest position)
- goldenHour: evening golden hour starts
- sunsetStart: sunset starts (bottom edge of the sun touches the horizon)
- sunset: sunset (sun disappears below the horizon, evening civil twilight starts)
- dusk: dusk (evening nautical twilight starts)
- nauticalDusk: nautical dusk (evening astronomical twilight starts)
- night: night starts (dark enough for astronomical observations)
- nightEnd: night ends (morning astronomical twilight starts)
- nauticalDawn: nautical dawn (morning nautical twilight starts)
- dawn: dawn (morning nautical twilight ends, morning civil twilight starts)
- nadir: nadir (darkest moment of the night, sun is in the lowest position)

**Note:** to use "astro"-function the "latitude" and "longitude" must be defined in javascript adapter settings.

**Note:** you can use "on" function for schedule with small modification: 
```
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

### clearSchedule
If **no** "astro" function used you can cancel the schedule later. To allow this the schedule object must be saved:

```
var sch = schedule("*/2 * * * *", function () {...});

clearSchedule(sch);
```

### getAstroDate
    getAstroDate (pattern, date)
Returns a javascript Date object for the specified pattern. For valid pattern values see the *Astro* section in the *schedule* function.

The returned Date object is calculated for the passed *date*. If no date is provided, the current day is used.

```
var sunriseEnd = getAstroDate("sunriseEnd");
log("Sunrise ends today at " + sunriseEnd.toLocaleTimeString());

var today = new Date();
var tomorrow = today.setDate(today.getDate()+1);
var tomorrowNigh = getAstroDate("night", tomorrow);
```

### isAstroDay
    isAstroDay ()
Returns true if the current time is between the astro sunrise and sunset.

### setState 
    setState (id, state, ack, callback)
    
### setStateDelayed
    setStateDelayed (id, state, isAck, delay, clearRunning, callback)
    
Same as setState but with delay in milliseconds. You can clear all running delay for this ID (by default). E.g.

```
    setStateDelayed('Kitchen.Light.Lamp', true,  1000);// Switch ON the light in the kitchen in one second
    setStateDelayed('Kitchen.Light.Lamp', false, 5000, false, function () { // Switch OFF the light in the kitchen in 5 seconds and let first timeout run. 
        log('Lamp is OFF');
    });
``` 
    
### getState 
    getState (id)
Returns state of id in form {val: value, ack: true/false, ts: timestamp, lc: lastchanged, from: origin}    
    
### getObject
    getObject (id, enumName)
Get description of object id as stored in system.
You can specify the enumeration name. If this is defined, two additional attributes will be added to result: enumIds and enumNames.
These arrays has all enumerations, where ID is member of. E.g:

``` getObject ('adapter.N.objectName', 'rooms') ```
 
gives back in enumIds all rooms, where the requested object is a member. You can define "true" as enumName to get back *all* enumerations.

### getIdByName 
    getIdByName(name, alwaysArray)

returns id of the object with given name. If there are more than one object with this name the result will be an array. If _alwaysArray_ flag is set, the result will be always an array if some ID found.
### getEnums
    getEnums(enumName)
    
Get the list of existing enumerations with members, like: 

```
getEnums('rooms') =>
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
    createState(name, initialValue, forceCreation, common, native, callback)
Create state and object in javascript space if does not exist, e.g. "javascript.0.mystate".

####Parameters:

- **name**: name of the state without namespace, e.g. "mystate"
- **initialValue**: variable can be initialized after created. Value "undefined" means do not initialize value.
- **forceCreation**: create state independent of if state yet exists or not.
- **common**: common description of object see description [here](https://github.com/ioBroker/ioBroker/blob/master/doc/SCHEMA.md#state)
- **native**: native description of object. Any specific information.
- **callback**: called after state is created and initialized.

It is possible short type of createState:

- _createState('myVariable')_ - simply create variable if does not exist
- _createState('myVariable', 1)_ - create variable if does not exist and initialize it with value 1
- _createState('myVariable', {name: 'My own variable', unit: '°C'}, function () {log('created');});_
- _createState('myVariable', 1, {name: 'My own variable', unit: '°C'})_ - create variable if does not exist with specific name and units

### sendTo:    
    sendTo (adapter, cmd, msg, callback)
    
### setInterval
    setInterval (callback, ms, arg1, arg2, arg3, arg4)
Same as javascript ***setInterval***.
    
### clearInterval
    clearInterval (id)
Same as javascript ***clearInterval***.
    
### setTimeout 
    setTimeout (callback, ms, arg1, arg2, arg3, arg4)
Same as javascript ***setTimeout***.
    
### clearTimeout
    clearTimeout (id)
Same as javascript ***clearTimeout***.

### formatDate
    formatDate (secondsOrDate, format, isSeconds)
    
####Parameters:

- **date**: number of seconds from state.ts or state.lc (Number seconds from 1970.01.01 00:00:00) or javascript *new Date()* object or number of milliseconds from *(new Date().getTime())*
- **format**: Can be "null", so the system time format will be used, elsewise 

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
  
- **isSeconds**: If *date* seconds from state.ts ot state.lc or milliseconds from *(new Date().getTime())*

#### Example
  formatDate(new Date(), "YYYY-MM-DD") => Date "2015-02-24"
  formatDate(new Date(), "hh:mm") => Hours and minutes "17:41"
  formatDate(state.ts) => "24.02.2015"
  formatDate(state.ts, "JJJJ.MM.TT SS:mm:ss) => "2015.02.15 17:41:98"
  

### $ - Selector
    $(selector).on(function(obj) {});
    $(selector).each(function(id, i) {});
    $(selector).setState(value, ack);
    $(selector).getState();

Format of selector:
    '''name\[commonAttr=something1\]\(enumName=something2\){nativeName=something3}\[id=idfilter\]\[state.id=idfilter\]'''

name can be: state, channel or device
"idfilter" can have wildcards '*'

Prefixes ***(not implemented - should be discussed)*** :
 # - take by name and not by id
 . - filter by role
 § - filter by room

***Example***: 

- $('state[id=*.STATE]') or $('state[state.id=*.STATE]') or $('*.STATE') - select all states where id ends with ".STATE".
- $('state[id='hm-rpc.0.*]') or $('hm-rpc.0.*') - returns all states of adapter instance hm-rpc.0
- $('channel(rooms=Living room)') - all states in room "Living room"
- $('channel{TYPE=BLIND}[state.id=*.LEVEL]') - Get all shutter of Homematic 
- $('channel\[role=switch\]\(rooms=Living room\)\[state.id=*.STATE\]').setState(false) - Switch all states with .STATE of channels with role "switch" in "Living room" to false
- $('channel\[state.id=*.STATE\]\(functions=Windows\)').each(function (id, i) {log(id);}); - print all states of enum "windows" in log


- $('.switch §"Living room") - Take states with all switches in 'Living room' ***(not implemented - should be discussed)***
- $('channel .switch §"Living room") - Take states with all switches in 'Living room' ***(not implemented - should be discussed)***

*** Explanation ***
Lets take a look at:
<pre><code>
$('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').on(function (obj) {
   log('New state ' + obj.id + ' = ' + obj.newState.val);
}
</code></pre>
This code searches in channels. 
Find all channels with common.role="switch" and belongs to enum.rooms.Wohnzimmer.
Take all their states, where id ends with ".STATE and make subscription on all these states.
If some of these states changes the callback will be called like for "on" function.


Following functions are possible, setValue, getValue (only from first), on, each

```
// Switch on all switches in "Wohnzimmer"
$('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').setValue(true);
```

You can interrupt the "each" loop by returning the false value, like: 
```
// print two first IDs of on all switches in "Wohnzimmer"
$('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').each(function (id, i) {
    console.log(id);
    if (i == 1) return false;
});
```

### readFile
    readFile (fileName, function (error, bytes) {})
    
The result will be given in callback.
File will be stored in the DB and can be accessed from any host under name javascript.X.fileName

### writeFile
    writeFile (fileName, bytes, function (error) {})

The optional error code will be given in callback.


## Changelog
### 1.0.6 (2015-11-15)
* (angelnu) Add getAstroDay and isAstroDay functions.

### 1.0.5 (2015-11-03)
* (bluefox) fix clearSchedule

### 1.0.4 (2015-11-03)
* (bluefox) add unsubscribe

### 1.0.3 (2015-10-30)
* (bluefox) add clearSchedule function (only for non astro function)

### 1.0.2 (2015-10-12)
* (bluefox) allow break the "each" by returning of false value.

### 1.0.1 (2015-10-06)
* (bluefox) enable resize of columns in select ID dialog

### 1.0.0 (2015-10-05)
* (bluefox) fix error with regex and name
* (bluefox) adapter is stable => make 1.0.0

### 0.5.9 (2015-09-26)
* (bluefox) update ace editor

### 0.5.8 (2015-09-23)
* (bluefox) add new function "setStateDelayed"

### 0.5.7 (2015-09-13)
* (bluefox) change createState: if "def" exists, the state will be created with "def" value.

### 0.5.6 (2015-09-10)
* (bluefox) allow set state of object if value was never set

### 0.5.5 (2015-08-23)
* (bluefox) fix error if many additional npm packets

### 0.5.4 (2015-08-17)
* (bluefox) new function getIdByName

### 0.5.3 (2015-08-15)
* (bluefox) fix error with regexp

### 0.5.2 (2015-08-05)
* (bluefox) make edit buttons (in admin tab) visible
* (bluefox) add console.log, console.warn, console.error commands
* (bluefox) update packets

### 0.5.1 (2015-07-27)
* (bluefox) fix error with enums

### 0.5.0 (2015-07-27)
* (bluefox) extend getObject with enum names and add new function getEnums

### 0.4.13 (2015-07-20)
* (bluefox) sort scripts alphabetically and globals at begin

### 0.4.12 (2015-07-17)
* (bluefox) fix error in getObjectEnums

### 0.4.11 (2015-07-13)
* (bluefox) fix error with selector and enums

### 0.4.9 (2015-07-11)
* (bluefox) fix channelName and channelId and optimize matching

### 0.4.8 (2015-06-29)
* (bluefox) fix select dialog

### 0.4.7 (2015-06-28)
* (bluefox) own tab in admin
* (bluefox) cron editor (limited)

### 0.4.6 (2015-06-16)
* (bluefox) global scripts

### 0.4.5 (2015-06-04)
* (bluefox) fix error with schedule and sunday

### 0.4.4 (2015-06-03)
* (bluefox) show error if suncalc cannot calculate time and set time to 23:59:59

### 0.4.3 (2015-06-01)
* (bluefox) show error if suncalc cannot calculate time

### 0.4.2 (2015-05-16)
* (bluefox) fix error with invalid additional packages

### 0.4.0 (2015-05-16)
* (bluefox) allow additionally install other npm packages for javascript

### 0.3.2 (2015-04-30)
* (bluefox) fix warning with createState

### 0.3.1 (2015-04-29)
* (bluefox) fix astro function

### 0.3.0 (2015-03-22)
* (bluefox) extend createState with native and common
* (bluefox) add new convert functions: toInt, toFloat, toBool

### 0.2.6 (2015-03-16)
* (bluefox) convert automatical grad to decimal grad
* (bluefox) fix some errors

### 0.2.5 (2015-03-16)
* (bluefox) enable on('localVar', function ()...)

### 0.2.4 (2015-03-16)
* (bluefox) fix error with astro. Add longitude and latitude to settings.
* (bluefox) fix selector if brackets are wrong
* (bluefox) make possible use "on" instead schedule

### 0.2.3 (2015-03-06)
* (bluefox) extend readme
* (bluefox) add "change: 'any'" condition to trigger on updated value

### 0.2.2 (2015-03-04)
* (bluefox) fix log function

### 0.2.1 (2015-03-02)
* (bluefox) fix sendTo function

### 0.2.0 (2015-02-24)
* (bluefox) add functions to sandbox: formatDate, writeFile, readFile

### 0.1.12 (2015-02-21)
* (bluefox) fix createState and expand it.

### 0.1.11 (2015-01-10)
* (bluefox) fix "on('state1', 'state2');"

### 0.1.10 (2015-01-04)
* (bluefox) catch errors if states deleted

### 0.1.9 (2015-01-04)
* (bluefox) add settings page

### 0.1.8 (2015-01-03)
* (bluefox) enable npm install

### 0.1.7 (2014-12-12)
* (bluefox) check errors if invalid object.

### 0.1.6 (2014-12-08)
* (bluefox) add some log outputs.

### 0.1.5 (2014-11-26)
* (bluefox) fix context of all callbacks.

### 0.1.4 (2014-11-22)
* (bluefox) Support of jquery like selector $. See above for details.

### 0.1.3 (2014-11-16)
* (bluefox) Support of wrapper "cb" for callbacks in script. (Expert mode)

### 0.1.2 (2014-11-15)
* (bluefox) support change, delete and add of the scripts without restart of adapter

### 0.1.1
* (hobbyquaker) fixed typo

### 0.1.0

* (hobbyquaker) require() in scripts works now
* (hobbyquaker) fixes

### 0.0.2

* (hobbyquaker) CoffeeScript support
* (hobbyquaker) fixes

### 0.0.1

* (hobbyquaker) first release

## Todo

* $() 
* complete patternMatching 
* complete eventObj 
* global script?
