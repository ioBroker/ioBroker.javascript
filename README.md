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

####Best practice: 
Create two instances of javascript adapter: one "test" and one "production".
After the script is tested in the "test" instance, it can be moved to "production". By that you can restart the "test" instance as you want.

##Following functions can be used in scripts:

### require - load some module
    var mod = require(module_name);
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
<pre><code>
    {
    	'id' : 'io.state.id',
    	'name' : 'state',
    	'common' : {
    		'def' :    'stop',
    		'type' :   'string',
    		'read' :   'true',
    		'write' :  'true',
    		'values' : 'stop,play,pause,next,previous,mute,unmute',
    		'role' :   'media.state',
    		'desc' :   'Play, stop, or pause, next, previous, mute, unmute',
    		'name' :   'state'
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
</code></pre>


Example:
<pre><code>
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
</code></pre>
### subscribe - same as **on**
    
### schedule
    schedule (pattern, callback)
    
### setState 
    setState (id, state, callback)
    
### getState 
    getState (id)
Returns state of id in form {val: value, ack: true/false, ts: timestamp, lc: lastchanged, from: origin}    
    
### getObject
    getObject (id)
Get description of object id as stored in DB.

### createState
    createState(name, initialValue, forceCreation, callback)
Create state and object in javascript space if does not exist, e.g. "javascript.0.mystate".

####Parameters:

- **name**: name of the state without namespace, e.g. "mystate"
- **initialValue**: variable can be initialized after created. Value "undefined" means do not initialize value.
- **forceCreation**: create state independent of if state yet exists or not.
- **callback**: called after state is created and initialized.
   
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
    '''name[commonAttr=something1](enumName=something2){nativeName=something3}[id=idfilter][state.id=idfilter]'''

name can be: state, channel or device
"idfilter" can have wildcards '*'

Prefixes ***(not implemented - should be discussed)*** :
 # - take by name and not by id
 . - filter by role
 § - filter by room

***Example***: 

- $('state[id=*.STATE]') or $('state[state.id=*.STATE]') or $('*.STATE') - select all states where id ends with ".STATE".
- $('state[id='hm-rpc.0.*]') or $('hm-rpc.0.*') - returns all states of adapter instance hm-rpc.0
- $('channel(room=Living room)' - all states in room "Living room"
- $('channel{TYPE=BLIND}[state.id=*.LEVEL]') - Get all shutter of Homematic 
- $('channel[role=switch](rooms=Living room)[state.id=*.STATE]').setState(false) - Switch all states with .STATE of channels with role "switch" in "Living room" to false
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

<pre><code>
// Switch on all switches in "Wohnzimmer"
$('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').setValue(true);
</code></pre>

### readFile
    readFile (fileName, function (error, bytes) {})
    
The result will be given in callback.
File will be stored in the DB and can be accessed from any host under name javascript.X.fileName

### writeFile
    writeFile (fileName, bytes, function (error) {})

The optional error code will be given in callback.


## Changelog
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
