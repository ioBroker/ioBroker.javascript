![Logo](admin/js.jpeg)
# Javascript Script Engine

executes Javascript and Coffescript Scripts.

##Following functions can be used in scripts:

### require  
    function (md)
    
### Buffer
    Buffer
    
### log
    function (msg, sev)
    
### exec
    function (cmd, callback)
    
### subscribe
    function (pattern, callbackOrId, value)
    
### on
    same as **subscribe**
    
### schedule
    function (pattern, callback)
    
### setState: 
    function (id, state, callback)
    
### getState:  
    function (id)
    
### sendTo:    
    function (adapter, cmd, msg, callback)
    
### setInterval
    function (callback, ms, arg1, arg2, arg3, arg4)
    Same as javascript ***setInterval***.
    
### clearInterval
    function (id)
    Same as javascript ***clearInterval***.
    
### setTimeout 
    function (callback, ms, arg1, arg2, arg3, arg4)
    Same as javascript ***setTimeout***.
    
### clearTimeout
     function (id)
    Same as javascript ***clearTimeout***.

## Changelog
### 0.1.2
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
