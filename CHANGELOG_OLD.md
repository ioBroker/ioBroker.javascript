The newest change log is in README.md

### 2.3.4 (2016-08-24)
* (bluefox) fix sayIt Block

### 2.3.2 (2016-08-18)
* (bluefox) add more blockly modules
* (bluefox) add debug mode and verbose mode

### 2.3.1 (2016-08-13)
* (bluefox) modify blockly modules
* (bluefox) give back some response even if state does not exist
* (bluefox) blockly support

### 2.3.0 (2016-07-01)
* (bluefox) export/import of scripts

### 2.2.1 (2016-06-27)
* (bluefox) fix delete state

### 2.2.0 (2016-06-16)
* (bluefox) adapter is compatible with redis

### 2.1.9 (2016-06-09)
* (bluefox) add for script onStop handler

### 2.1.8 (2016-05-31)
* (bluefox) do not show error if regexp ID

### 2.1.7 (2016-05-29)
* (bluefox) keep configured libraries by upgrade (once more)

### 2.1.5 (2016-05-29)
* (bluefox) keep configured libraries by upgrade

### 2.1.4 (2016-05-28)
* (bluefox) catch an error if some system object changed, e.g. _design/history

### 2.1.3 (2016-05-24)
* (bluefox) fix warning with wrong types one more time

### 2.1.2 (2016-05-23)
* (bluefox) fix warning with wrong types

### 2.1.1 (2016-05-21)
* (bluefox) try to fix "Duplicate name" error
* (bluefox) modify readFile/writeFile commands
* (gh-god) fix stop of script and unsubscribe
* (paul53) check type of set value and min, max by setState

### 2.1.0 (2016-05-13)
* (bluefox) add getHistory command

### 2.0.6 (2016-04-17)
* (bluefox) fix error in GUI

### 2.0.5 (2016-04-13)
* (bluefox) do not update script on save
* (bluefox) add lines wrap

### 2.0.4 (2016-03-15)
* (bluefox) sort drop down group selector
* (bluefox) check if object yet exists, when creates group

### 2.0.3 (2016-03-08)
* (bluefox) fix edit of instance
* (bluefox) add instance variable

### 2.0.2 (2016-02-20)
* (bluefox) fix start of scripts on adapter start
* (bluefox) add new scope variable "name" to print name of script: ```log(name) => script.js.common.ScriptName```

### 2.0.1 (2016-02-20)
* (bluefox) fix resize of script window
* (bluefox) delete state even if no object exists

### 2.0.0 (2016-02-19)
* Breaking changes.
* (bluefox) Support of script groups
* (bluefox) global scripts have name script.js.global.ScriptName and not script.js.ScriptName_global

### 1.2.0 (2016-02-11)
* (bluefox) start creation of tests
* (bluefox) add deleteState function

### 1.1.12 (2016-02-05)
* (bluefox) fix adapterSubscribe

### 1.1.11 (2016-02-03)
* (bluefox) do not allow empty IDs in pattern by subscription

### 1.1.10 (2016-02-02)
* (bluefox) fix error by getObject if object does't exist

### 1.1.9 (2016-02-01)
* (bluefox) use v1.0-pre version of node-schedule

### 1.1.8 (2016-01-31)
* (bluefox) try another version of node-schedule

### 1.1.7 (2016-01-31)
* (bluefox) use older node-schedule version 0.5.1

### 1.1.6 (2016-01-31)
* (bluefox) update node-schedule version

### 1.1.5 (2016-01-25)
* (bluefox) fix adapterSubscribe and adapterUnsubscribe

### 1.1.4 (2016-01-22)
* (bluefox) fix error by states to control activity of scripts

### 1.1.2 (2016-01-21)
* (bluefox) fix error by setStateDelayed
* (bluefox) add clearStateDelayed
* (bluefox) add javascript.INSTANCE.scriptEnabled.SCRIPT_NAME state to control activity of scripts

### 1.1.1 (2015-12-16)
* (bluefox) fix error if id is regExp

### 1.1.0 (2015-12-14)
* (bluefox) fix setObject
* (bluefox) implement adapterSubscribe/adapterUnsubscribe

### 1.0.9 (2015-12-08)
* (bluefox) clear enums cache if some enum changed
* (bluefox) add getSubscriptions function

### 1.0.8 (2015-11-30)
* (bluefox) fix error if name is null

### 1.0.7 (2015-11-16)
* (bluefox) Add setObject function

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
* (bluefox) convert automatically grad to decimal grad
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
