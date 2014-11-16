![Logo](admin/js.jpeg)
# Javascript Script Engine

executes Javascript and Coffescript Scripts.


##Note
If in the script some modules or functions are used with callbacks or cyclic calls, except setTimeout/setInterval, 
so they will be called again and again even if in the new version of script exist or script is deleted. For example the following script:

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

was deleted before callback returns. The callback will be executed anyway. To fix this feature restart the javascript adapter.

This is special case and only experts will use such a complex functions and they can restart javascript engine if required.
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

##Following functions can be used in scripts:

### require - load some module
    var mod = require(module_name);
Following modules can be loaded: fs, crypto, wake_on_lan, request, suncalc, util, path, os, net, events, dns
    
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
on('io.device.channel.sensor', function (obj) {
    if (!timer) {
        timer = setTimeout(function () {
            timer = null;
        }, 30000);

        // Set acknowledged value
        setState('io.device.channel.counter', 1 + getState('io.device.channel.counter'), true/*ack*/);
        
        // Or to set unacknowledged command
        setState('io.device.channel.actor', true);
    }
});

setObject('io.device.channel.counter', {
    name: "Counter",
    role: "
}, function () {
    setState(100015, 0);
});

</code></pre>
### subscribe - same as **on**
    
### schedule
    schedule (pattern, callback)
    
### setState: 
    setState (id, state, callback)
    
### getState:  
    getState (id)
    
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

## Changelog
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
