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
    createState(name, initialValue, callback)
    
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

### $ - Selector
    $(selector).on(function(obj) {});
    $(selector).each(function(id, i) {});
    $(selector).setState(value, ack);
    $(selector).getState();

Format of selector:
    '''name[commonAttr=something1](enumName=something2){nativeName=something3}[id=idfilter][state.id=idfilter]'''
    
name can be: state, channel or device
"idfilter" can have wildcards '*'

***Example***: 

- $('state[id=*.STATE]') or $('state[state.id=*.STATE]') or $('*.STATE') - select all states where id ends with ".STATE".
- $('state[id='hm-rpc.0.*]') or $('hm-rpc.0.*') - returns all states of adapter instance hm-rpc.0
- $('channel(room=Living room)' - all states in room "Living room"
- $('channel{TYPE=BLIND}[state.id=*.LEVEL]') - Get all shutter of Homematic 
- $('channel[role=switch](rooms=Living room)[state.id=*.STATE]').setState(false) - Switch all states with .STATE of channels with role "switch" in "Living room" to false

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
## Changelog
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
