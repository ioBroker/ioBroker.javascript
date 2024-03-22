The newest change log is in README.md
## 7.9.1 (2024-03-15)

* (klein0r) Configurable trigger warning limit (default: 100 per script)
* (klein0r) Allow to use objects in create state blocks for common
* (klein0r) Added warning if latitude or longitude is not configured correctly

## 7.9.0 (2024-03-13)

* (klein0r) Added block to create new objects
* (klein0r) Added HTTP get and post function
* (klein0r) Droped support of coffeescript (deprecated since version 6.0.0)
* (klein0r) Raise warning if more than 100 triggers have been registered (per script)
* (klein0r) Fixed astro state calculation (and display server time in dialog)

## 7.8.0 (2024-01-29)

* (klein0r) Added block for multiple or conditions
* (klein0r) Raised supported ecmaVersion from es2018 to es2021
* (klein0r) Fixed getIdByName (returned the same id as array)

## 7.7.0 (2024-01-14)

* (klein0r) Added block for multiple and conditions

## 7.6.3 (2024-01-11)

* (klein0r) Fixed bug in formatTimeDiff Blockly

## 7.6.2 (2024-01-02)

* (klein0r) Added missing console.info()
* (klein0r) Added missing type hints
* (klein0r) Creation of astro states is now optional
* (klein0r) Fixed logging of objects/sets

## 7.6.0 (2023-12-26)

* (klein0r) Added schedules by state value (scheduleById)

## 7.5.1 (2023-12-18)

* (klein0r) Added option for calendar week to Blockly
* (klein0r) Fixed inpaired round brackets of getMinutes (Blockly)

## 7.5.0 (2023-12-15)

* (klein0r) Blockly: Day of week as number always returns 1 (monday) to 7 (sunday)
* (klein0r) Fixed layout of script type selection
* (klein0r) Fixed sendto with multiple instances (for callback / timeout handling)

## 7.4.0 (2023-12-08)

* (klein0r) Download script as xml file (export)
* (klein0r) Import script as file (upload)
* (klein0r) Hide global folder if expert mode is disabled

## 7.3.0 (2023-12-07)

* (klein0r) Updated blockly logo
* (klein0r) Always set variables like isDaylightSaving
* (klein0r) Added astro times as states
* (klein0r) Fixed copied time blocks

## 7.2.0 (2023-12-04)
NodeJS 16.x is required

* (klein0r) Added function to format time difference `formatTimeDiff`
* (klein0r) Added blockly blocks for `formatTimeDiff`
* (klein0r) messageToAsync was not working without options
* (klein0r) Added timeout and custom options for sendToAsync
* (klein0r) Fixed valid switch statement expressions
* (klein0r) Added text replacement, cound and reverse blocks
* (klein0r) Added list reverse block

## 7.1.6 (2023-10-24)
* (bluefox) Fixed pushover rules block

## 7.1.5 (2023-10-09)
* (bluefox) Added play-ground for ChatGPT (API key required)

## 7.1.4 (2023-08-09)
* (bluefox) Added version to the side menu
* (klein0r) Added blockly blocks for `getHistory` and calculated times

## 7.1.1 (2023-06-20)
* (bluefox) corrected the script export

## 7.1.0 (2023-06-13)
* (klein0r) Added new blocks: new line, random number, value between min and max, if empty
* (klein0r) Updated blockly core to v9.3.3
* (bluefox) corrected blockly

## 7.0.8 (2023-06-12)
* (klein0r) Corrected trigger block
* (klein0r) Corrected typescript V5
* (bluefox) coffescript was degraded to the previous version
* (bluefox) tried to correct vscode font
* (bluefox) reverted blockly to the previous version

## 7.0.5 (2023-06-06)
* (klein0r) reset timeouts in blockly
* (klein0r) added additional blockly blocks

## 7.0.4 (2023-06-06)
* (bluefox) packages updated
* (bluefox) Files are used for export of scripts

## 7.0.3 (2023-03-16)
* (bluefox) made the editor visible in full height
* (paul53) small fixes on blockly and translations are made

## 7.0.2 (2023-03-13)
* (bluefox) Breaking change: all usages of `jsonata` must be rewritten to use promises.
* (bluefox) Breaking change: all blockly scripts with `jsonata` blocks must be changed (just move some blocks) and saved anew.
* (bluefox) Extended `createState` command with possibility to create aliases. 
* (bluefox) Corrected CRON card in rules 
* (bluefox) Added additional options to show the attributes of object in blockly
* (bluefox) Corrected `existsStateAsync` function
* (bluefox) Added `isDaylightSaving` state to indicate day saving time
* (AlCalzone) Pinned `@types/node` to v14
* (bluefox) Added list of astrological events in GUI

## 6.2.0 (2023-02-17)
* (Apollon77) Prevented duplicate schedule triggering with inaccurate RTC clocks
* (Apollon77) Fixed sendToAsync and sendToHostAsync
* (Apollon77) Added rename/renameFile(Async) methods
* (Apollon77) Deprecated get/setBinaryState(Async) methods and log a message on usage. Use Files instead!
* (Apollon77) Deprecated usage of own states in javascript.X.scriptEnabled/Problem and log a message on usage. Use own states in 0_userdata.0 instead!
* (bluefox) added axios to pre-installed modules. `request` will be removed in the future

## 6.1.4 (2022-11-14)
* (bluefox) Corrected small error in rules
* (bluefox) Tried to fix debug mode

## 6.1.3 (2022-11-03)
* (Apollon77) Prevent the adapter crash when some script could not be compiled

## 6.1.2 (2022-11-03)
* (bluefox) Added ukrainian translation

## 6.1.0 (2022-11-03)
* (Apollon77) Add a configurable check for the number of setStates per Minute to prevent scripts from taking down ioBroker. Default is 1000 setState per minute. Only stops if the number is reached 2 minutes in a row!
* (Apollon77) Add createAlias method to create aliases for states
* (Apollon77) Add setStateDelayed to selector
* (Apollon77) Add options to exec command
* (Apollon77) Fix issues with cancelling schedules when stopping scripts
* (bluefox) Corrected debug mode

## 6.0.3 (2022-09-14)
* (AlCalzone) Downgrade Typescript to prevent errors with global typescript scripts

## 6.0.1 (2022-08-19)
* (bluefox) Fixed the wizard schedule
* (bluefox) Done small fixes on GUI

## 6.0.0 (2022-07-18)
* (bluefox) Removed support of coffeescript
* (bluefox) All coffee-scripts will be compiled to javascript permanently

## 5.8.10 (2022-07-15)
* (klein0r) Added variable timeout block
* (klein0r) Added `getInterval` and `getTimeout` blocks
* (klein0r) Added `sendTo` for scripts and message trigger blocks
* (bluefox) Corrected the syntax highlighting

## 5.8.8 (2022-07-13)
* (bluefox) Corrected error by start of GUI

## 5.8.7 (2022-07-12)
* (klein0r) Fixed function edit dialog (cursor jumps to first position)
* (klein0r) Added error message when using number or boolean as trigger id

## 5.8.5 (2022-07-07)
* (bluefox) Added preparations for cloud

## 5.8.3 (2022-06-27)
* (bluefox) Updated the object select dialog

## 5.8.2 (2022-06-22)
* (bluefox) Updated some packages 
* (bluefox) Made it work with ioBroker cloud

## 5.8.1 (2022-06-09)
* (bluefox) Allowed using javascript behind reverse proxy
* (bluefox) If adapter parameter set to null in `writeFile/readFile`, it will be used `0_userdata.0`

## 5.8.0 (2022-06-01)
* (bluefox) Implemented onFile and offFile functions (available with js-controller 4.1+)
* (Apollon77) Add sendToAsync und sendToHostAsync methods
* (bluefox) Added support of the custom rule plugins (actually only telegram)

## 5.7.0 (2022-05-08)
* (Apollon77) Allows sending of messages to the scripts also from adapters and CLI by sending "toScript" message (see [onMessage Documentation](https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md#onmessage))
* (Apollon77) Lists returned by $-selector are now unified and do not contain double entries 
* (Apollon77) Fix subscribe multiple object ID lists in blockly

## 5.6.1 (2022-05-03)
* (Apollon77) Allow subscribing multiple object ID lists in blockly
* (Apollon77) Make sure lists returned by $-selector do not contain duplicates

## 5.5.4 (2022-04-03)
* (bluefox) Tried to solve the problem with the font

## 5.5.3 (2022-03-25)
* (bluefox) Fixed getObjectAsync function if object does not exist

## 5.5.2 (2022-03-23)
* (bluefox) Added new rules action block: sum two states (or minus)

## 5.5.0 (2022-03-22)
* (Apollon77) Prevent Mirror directory being set to central ioBroker directories because can produce various issues
* (Apollon77) Fixed existsState and existsObject
* (bluefox) Fixed translations

## 5.4.5 (2022-03-20)
* (Apollon77) Fix existsState and existsObject

## 5.4.3 (2022-03-17)
* (Apollon77) Fix handling of month schedules with given date list
* (Apollon77) Optimize scheduling to make sure to not miss triggers if callbacks would need too long

## 5.4.2 (2022-03-15)
* (Apollon77) Fix automatic start of Rules scripts when starting adapter

## 5.4.1 (2022-03-15)
* (Apollon77) Fix blockly subscribes broken in 5.4.0

## 5.4.0 (2022-03-13)
* (Apollon77) Automatically create missing folder objects when states are created using createState
* (Apollon77) Fix special characters in blockly subscribe logic
* (Apollon77) Fix timing issue where state updates could not be current on startup
* (Apollon77) Fix state name handing
* (Apollon77) Fix potential crash cases reported by Sentry

## 5.3.3 (2022-03-06)
* (bluefox) Added async functions: createStateAsync, deleteStateAsync

## 5.3.2 (2022-03-06)
* (Apollon77) fix problem that scripts were not starting when scriptsEnabled State was triggered (or startScript was used)
* (Apollon77) Make sure callbacks on startScript/stopScript work and Async variants also resolve
* (Apollon77) Make sure startScriptAsync, stopScriptAsync and runScriptAsync resolve in debug mode too

## 5.3.1 (2022-03-03)
* (Apollon77) Add missing callback check in setObject

## 5.3.0 (2022-03-02)
* (Apollon77) Prevent some crash cases reported by Sentry (IOBROKER-JAVASCRIPT-A3)
* (Apollon77) Fix Enum Updates
* (Apollon77) Optimize making sure data are current for synchronous return of states/objects even for asynchronous action cases before
* (Apollon77) Make sure admin files is cleaned up on update
* (Apollon77) update channel/device structures for $ selector on object updates
* (Apollon77) Adjustments for js-controller 4.0

## 5.2.21 (2022-01-16)
* (bluefox) Fixed build process

## 5.2.19 (2022-01-10)
* (AlCalzone) Fixed broken dependency

## 5.2.18 (2021-12-14)
* (klein0r) Fixed some german translations
* (winnyschuster) Fixed astro schedules

## 5.2.16 (2021-11-19)
* (bluefox) Fixed the font in the editor

## 5.2.15 (2021-11-18)
* (agross) Added the monitoring of symlinks my mirroring
* (Apollon77) Fix two crash cases reported by Sentry

## 5.2.14 (2021-11-17)
* (AlCalzone) Typings improvement
* (winnyschuster) added "Solar noon" to astro-list
* (agross) Allow to define different states for reading and writing alias values

## 5.2.13 (2021-09-13)
* (AlCalzone) Fixed the loading of Node.js typings

## 5.2.12 (2021-09-12)
* (bluefox) Fixed the font in the editor

## 5.2.10 (2021-09-08)
* (bluefox) Parse variables to floats for mathematical operations
* (bluefox) Names with the dot at the end are not allowed anymore
* (bluefox) The blockly sounds are disabled

## 5.2.9 (2021-09-02)
* (Apollon77) Make sure day of weeks is an array (Sentry IOBROKER-JAVASCRIPT-7Y)
* (bluefox) Report to sentry is disabled in GUI if sentry is deactivated
* (bluefox) Fixed many GitHub issues

## 5.2.8 (2021-07-22)
* (bluefox) Fixed the debug of scripts

## 5.2.7 (2021-07-17)
* (bluefox) Fixed error in rules

## 5.2.6 (2021-07-16)
* (bluefox) Added fallback for admin4

## 5.2.3 (2021-07-08)
* (agross) Fix imports like "rxjs/operators" for versioned npm modules

## 5.2.2 (2021-07-06)
* (Apollon77) Add support to install npm packages as defined version (name@version)

## 5.2.1 (2021-07-05)
* (Apollon77) Adjust logging for "array"/"object" type handling

## 5.2.0 (2021-07-04)
* IMPORTANT: Admin 5.1.9 is now required for this JavaScript version!
* (Apollon77) BREAKING: Convert state values for object types "array"/"object" to stringified  as required by js-controller 3.3. This means such objects should not be "JSON.parsed" after reading!
* (foxriver76) add adapter to tier 1 for js-controller 3.3 (this means will be started first!)
* (bluefox) Implemented the change of theme and the expert mode via admin
* (bluefox) fixed the error with the simulation
* (Xyolyp) Blockly: Allow Value read from datapoint as switch input
* (ThomasPohl) Blockly: add text_multiline block
* (Apollon77) Prevent crash case(Sentry IOBROKER-JAVASCRIPT-70)

## 5.1.3 (2021-03-23)
* (bluefox) fixed the error in the debugging

## 5.1.2 (2021-03-22)
* (bluefox) Showed the runtime information for the rules

## 5.1.1 (2021-03-21)
* (bluefox) Implemented the debug of the instances from javascript adapter

## 5.1.0 (2021-03-19)
* (bluefox) Implemented the debug of scripts possibility

## 5.0.15 (2021-03-13)
* (bluefox) Rules: added "use trigger value" for the "set action" blocks

## 5.0.14 (2021-03-11)
* (bluefox) fixed the font for the editor

## 5.0.12 (2021-03-07)
* (bluefox) fixed error in blockly

## 5.0.11 (2021-03-07)
* (bluefox) added date to the time condition

## 5.0.10 (2021-03-07)
* (bluefox) added date to the time condition

## 5.0.9 (2021-03-04)
* (bluefox) fixed the error if no condition

## 5.0.8 (2021-03-03)
* (bluefox) Translations
* (bluefox) Added the "set state with delay" block

## 5.0.7 (2021-03-02)
* (bluefox) Added the pushsafer block

## 5.0.6 (2021-03-01)
* (bluefox) Implemented the hysteresis

## 5.0.5 (2021-02-28)
* (bluefox) Implemented the toggle functionality

## 5.0.4 (2021-02-28)
* (bluefox) Fixed errors in rules

## 5.0.3 (2021-02-28)
* (bluefox) Implemented the memory for condition

## 5.0.2 (2021-02-27)
* (bluefox) Fixed error in the rules

## 5.0.0 (2021-02-27) [Birthday edition]
* (bluefox) added the rules engine

## 4.11.0 (2021-02-16)
* (Apollon77) Add some additional checks for getSchedules
* (Garfonso) make sure promisified methods reject with Error instead of string so that async errors can be catched correctly
* (Huseriato) update some german blockly translations

## 4.10.15 (2021-01-31)
* (Apollon77) Handle more cases with invalid script names/state-ids (Sentry IOBROKER-JAVASCRIPT-5W)

## 4.10.14 (2021-01-25)
* (Apollon77) Handle more cases with invalid script names/state-ids (Sentry IOBROKER-JAVASCRIPT-5R)

## 4.10.13 (2021-01-24)
* (Apollon77) Handle more cases with invalid script names/state-ids (Sentry IOBROKER-JAVASCRIPT-4B)

## 4.10.11 (2021-01-22)
* (Apollon77) Optimize error handling in createState and file mirror again

## 4.10.10 (2021-01-22)
* (Apollon77) Do not try to set a state value if object creation was not successful (Sentry IOBROKER-JAVASCRIPT-5G)
* (Apollon77) Make sure no incorrect states are trying to be set (Sentry IOBROKER-JAVASCRIPT-5F, IOBROKER-JAVASCRIPT-5A)

## 4.10.9 (2021-01-13)
* (Apollon77) Make sure to end all Timeouts
* (Apollon77) Prevent crash case (Sentry IOBROKER-JAVASCRIPT-51)

## 4.10.8 (2020-12-07)
* (paul53) Corrected `variables.isDayTime`
* (AlCalzone) catch errors during virtual-tsc compile calls
* (Apollon77) Prevent crash case (Sentry)

## 4.10.7 (2020-12-03)
* (Apollon77) Prevent crash case (Sentry IOBROKER-JAVASCRIPT-4Q)
* (paul53) Corrected `variables.isDayTime`

## 4.10.6 (2020-12-01)
* (AlCalzone) TypeScripts which augment the global scope are now correctly compiled
* (AlCalzone) If no type declarations are found for an installed package, `require` will no longer show the error "module not found"
* (AlCalzone) Removed the `--prefix` argument in `npm install`, so package installations on Windows no longer mess up the install directory
* (bluefox) Corrected the set of the binary state

## 4.10.5 (2020-11-15)
* (bluefox) null timeouts are checked now

## 4.10.4 (2020-11-09)
* (bluefox) null timeouts are checked now
* (AlCalzone) Correction for the typescript with async functions

## 4.10.3 (2020-11-08)
* (bluefox) Corrected search in scripts

## 4.10.1 (2020-11-04)
* (AlCalzone) In global TypeScripts, `import` can now be used
* (AlCalzone) Iteration of `$(...)` query results in TypeScript no longer causes compilation to fail
* (AlCalzone) Already-compiled TypeScripts are now recompiled after an update of the adapter to benefit of potential fixes
* (bluefox) Corrected schedule on date object
* (bluefox) Corrected the moving of scripts
* (bluefox) Corrected search tab
* (bluefox) Corrected the calculation of isDayTime variable
* (bluefox) Corrected `trim()` issue by CRON builder  
* (bluefox) Corrected functions call in blockly
* (bluefox) Corrected CRON name in blockly

## 4.9.8 (2020-11-01)
* (bluefox) Corrected search in blockly

## 4.9.7 (2020-10-28)
* (Apollon77) Fix possible crash case (Sentry IOBROKER-JAVASCRIPT-47, IOBROKER-JAVASCRIPT-44)
* (AlCalzone) pass ID as the result, not the error to the callback of createState
* (AlCalzone) update the editor's type declarations when switching scripts
* (AlCalzone) The corrections for typescript were added

## 4.9.4 (2020-10-19)
* (AlCalzone) corrected the crash IOBROKER-JAVASCRIPT-40
* (AlCalzone) corrected typescript for async/await

## 4.9.3 (2020-10-12)
* (bluefox) Corrected the function calls.
* (AlCalzone) Optimized the typescript compilation

## 4.9.0 (2020-10-09)
* (bluefox) All scripts support now `await` calls. THIS COULD HAVE SOME SIDE-EFFECT (unknown yet). 
* (AlCalzone) Matched the exact ID if the $ selector contains no wildcard
* (bluefox) Added new block in blockly: "pause" 
* (bluefox) Changed the order of folders and scripts to "folders first".
* (bluefox) Extend the documentation.
* (bluefox) Corrected the error with blockly and "day of week" conversion.

## 4.8.4 (2020-09-21)
* (bluefox) Make the mirroring instance adjustable
* (bluefox) Correct the dark mode for blockly
* (bluefox) Corrected the special variables: isDayTime and dayTime

## 4.8.2 (2020-09-20)
* (Bluefox) Added the settings for columns in the state selection dialog

## 4.8.0 (2020-09-17)
* (AlCalzone) add xyzAsync methods and wait/sleep
* (Apollon77) Prevent a crash case (Sentry IOBROKER-JAVASCRIPT-3N)

## 4.7.4 (2020-09-10)
* (Bluefox) Fixed JS editor in blockly

## 4.7.3 (2020-09-06)
* (Bluefox) Fixed the select ID dialog

## 4.7.2 (2020-09-05)
* (Bluefox) Fixed blockly problem

## 4.7.1 (2020-09-04)
* (Bluefox) Fixed styling

## 4.7.0 (2020-09-03)
* (AlCalzone) Allowed async functions whenever a callback is accepted
* (AlCalzone) Allowed `true` as 2nd parameter in getObject
* (AlCalzone) Forced TypeScript to treat each script as a separate module
* (Bluefox) Replaced the Select-ID dialog

## 4.6.26 (2020-08-24)
* (Apollon77) Catch error case when npm installation fails (Sentry IOBROKER-JAVASCRIPT-3K)
* (Apollon77) Prevent crash case in mirroring (Sentry IOBROKER-JAVASCRIPT-3M)

## 4.6.25 (2020-08-24)
* (bluefox) Fixed the loading of page

## 4.6.23 (2020-08-19)
* (AlCalzone) fix type resolution for rxjs in TypeScripts

## 4.6.22 (2020-07-30)
* (Apollon77) caught some more file errors in mirror logic

## 4.6.21 (2020-07-28)
* (Apollon77) caught some more file errors in mirror logic (Sentry IOBROKER-JAVASCRIPT-2X, IOBROKER-JAVASCRIPT-3C)

### 4.6.20 (2020-07-26)
* (Apollon77) make sure 0_userdata.0 objects/states are not overwritten on createState 

### 4.6.19 (2020-07-26)
* (Apollon77) Prevent wrong errors when setting "null" values for states
* (Apollon77) Prevent potential crash when no typings could be found (Sentry IOBROKER-JAVASCRIPT-2T)
* (Apollon77) catch an error in mirroring functionality( Sentry IOBROKER-JAVASCRIPT-2V)
* (Apollon77) make sure names are handled correctly if they are not strings (Sentry IOBROKER-JAVASCRIPT-2Y) 
* (Apollon77) make sure invalid schedules can not crash adapter (Sentry IOBROKER-JAVASCRIPT-31)
* (Apollon77/paul53) Allow "deleteState" with full javascript.X object Id again (from same instance only)
* (bluefox) Revert changes for sync getState, because "on change" detection is broken 
* (AlCalzone) Several issues with Typescript, Typings and virtual-tsc optimized and fixed
* (bluefox) Store JS in browser cache by enabling serviceWorkers
* (Apollon77) prevent multiple script restarts on fast file content change for mirroring or fast object changes

### 4.6.17 (2020-05-25)
* (bluefox) Fixed error with warnings collapsed blocks
* (Apollon77) optimize Sentry error reporting to prevent false positives

### 4.6.16 (2020-05-24)
* (bluefox) Corrected sendTo and clear delay blocks. 

### 4.6.15 (2020-05-23)
* (bluefox) BREAKING: Please check "stopTimeout" blocks in your blockly scripts that the correct timeout name is listed there and correct after the update!
* (paul53) fix "control" blockly node with "delete delay if running"
* (foxriver76) change dependencies with Admin

### 4.6.14 (2020-05-19)
* (bluefox) Names for scripts can not have dots anymore. They will be replaced by "_"
* (bluefox) "schedule" name is not allowed for CRON
* (bluefox) Convert strings to Date by formatDate

### 4.6.13 (2020-05-19)
* (bluefox) Fixed blockly blocks because of deprecated functions
* (bluefox) Corrected schedule wizard
* (AlCazone) Update monaco editor

### 4.6.8 (2020-05-16)
* (bluefox) Fixed blockly blocks because of deprecated functions
* (bluefox) Corrected schedule wizard 

### 4.6.4 (2020-05-15)
* (bluefox) Corrected block: request, exec

### 4.6.1 (2020-05-11)
* (bluefox) Updated blockly to 3.20200402.1
* (bluefox) Added to blockly the switch/case block. 
* (Mic-M) fix log crash
* (Apollon77) Add new Sentry key and exclude user script exceptions
* (Garfonso) Several fixes and optimizations for Mirroring functionality
* (Apollon77) add support for 0_userdata.0 to createState and deleteState 

### 4.5.1 (2020-04-17)
* (Apollon77) Nodejs 10 is new minimum Version!
* (Apollon77) Add Sentry for use in js-controller 3.0 and React component
* (Apollon77) prevent warnings with js-controller 3.0
* (Garfonso) fix enum object cache handling
* (bluefox/Apollon77) enhance existsState

### 4.4.3 (2020-03-03)
* (klein0r) Added JSONata for Object conversion

### 4.4.2 (2020-02-10)
* (Apollon77) Fix Astro functions and error message
* (Apollon77) usage with all kinds of admin ports and reverse proxies optimized

### 4.4.0 (2020-02-08)
* (Apollon77) Add new socket.io client library to prevent errors

### 4.3.8 (2020-02-07)
* (bluefox) Fixed the authentication error detection

### 4.3.7 (2020-01-26)
* (bluefox) Made adapter compatible with js-controller >= 2.2.x 

### 4.3.5 (2020-01-26)
* (bluefox) fixed the load of zip files if more than one host

### 4.3.4 (2019-10-28)
* (bluefox) Values are showed in select ID dialog
* (bluefox) Allow select with $ the schedule objects

### 4.3.3 (2019-10-28)
* (bluefox) Search in scripts was corrected

### 4.3.2 (2019-10-27)
* (AlCalzone) Fix syntax help for Node.js runtime methods (#418)
* (AlCalzone) Target ES 2017 in TypeScript (#419)
* (AlCalzone) Automatically load declarations for 3rd party modules (#422)
* (bluefox) Functions with non latin text are working now

### 4.3.1 (2019-10-16)
* (bluefox) Fixed login with non-admin user
* (bluefox) fixed log
* (bluefox) Some GUI fixes

### 4.3.0 (2019-10-09)
* (bluefox) log handlers were implemented
* (bluefox) fixed the error with $ selector and with disabled subscribes

### 4.2.1 (2019-10-07)
* (bluefox) implement inter-script communication.
* (bluefox) Implemented the mirroring on disk
* (bluefox) Translation for other languages was added

### 4.1.16 (2019-08-24)
* (bluefox) Fixed the errors in editor

### 4.1.15 (2019-08-24)
* (bluefox) Added the polish language to CRON
* (bluefox) Fixed the import of scripts

### 4.1.14 (2019-07-14)
* (bluefox) Fixed locale settings

### 4.1.13 (2019-06-02)
* (bluefox) fixed Monaco Loading
* (bluefox) added missing blockly element
* (AlCalzone) Improved the warning message when assigning a variable of wrong type to a state
* (thewhobox) Added selector blockly, language strings, regexp
* (thewhobox) Fixed Blockly bug
* (paul53) fixed for suncalc.getTimes between middle night and nadir

### 4.1.12 (2019-03-07)
* (bluefox) Schedule was corrected

### 4.1.8 (2019-02-03)
* (jkuehner) Updated the blockly to the latest code
* (bleufox) scriptEnabled variables not only for experts
* (bleufox) fixed one error with "cannot extract blockly"
* (bluefox) GUI fixes
* (bluefox) show problem scripts as yellow pause icon

### 4.0.12 (2019-01-20)
* (Apollon77/AlCalzone) fixes unwanted changes in last version
* (SchumyHao) Add Chinese support

### 4.0.11 (2019-01-14)
* (bluefox) add set/getBinaryState

### 3.7.0 (2018-05-05)
* (bluefox) Used VM2 as sandbox. The script errors will be caught.
* (bluefox) refactoring: split into many modules
* (AlCalzone) Change TypeScript version range to include TS 3.0+

### 3.6.5 (2019-02-13)
* (bluefox) Error with formatDate was fixed

### 3.6.4 (2018-02-05)
* (bluefox) Pattern error is fixed

### 3.6.3 (2018-01-31)
* (bluefox) Fixing the CSS for CRON dialog
* (bluefox) Fixing the reorder of scripts

### 3.6.1 (2018-01-23)
* (bluefox) Pattern error is fixed

### 3.6.0 (2017-12-28)
* (bluefox) more translations are added
* (bluefox) update blockly engine

### 3.5.1 (2017-11-14)
* (bluefox) fixed: sometimes MSG is not defined
* (AlCalzone) TypeScript support (preparations)
* (bluefox) add sendToHost call
* (bluefox) protect exec call
* (bluefox) add getStateDelayed function

### 3.4.4 (2017-09-12)
* (soef) typo error in line number correction fixed

### 3.4.1 (2017-08-12)
* (soef) patternMatching optimized

### 3.4.0 (2017-08-06)
* (bluefox) Support of new admin

### 3.3.12 (2017-07-24)
* (bluefox) file and line info added to log outputs

### 3.3.11 (2017-07-18)
* (bluefox) fix build CRON block

### 3.3.9 (2017-06-18)
* (bluefox) Add the toggle blockly block

### 3.3.8 (2017-05-22)
* (Apollon77/bluefox) Accept for subscribes arrays of IDs

### 3.3.6 (2017-05-17)
* (bluefox) add the genitive month for formatDate

### 3.3.4 (2017-04-01)
* (bluefox) Catch error by request if host unavailable
* (bluefox) add "request" to script namespace

### 3.3.3 (2017-03-27)
* (bluefox)Fix stopScript

### 3.3.2 (2017-03-18)
* (bluefox) Support of system coordinates

### 3.3.1 (2017-03-15)
 * (bluefox) fix error if no scripts exists

### 3.3.0 (2017-03-14)
* (bluefox) all callbacks in try/catch

### 3.2.8 (2017-03-08)
* (bluefox) Translations

### 3.2.7 (2017-03-03)
* (bluefox) allow creation of states for other javascript instances

### 3.2.6 (2017-02-14)
* (bluefox) Fix import of scripts
* (bluefox) Ask to save before start the script

### 3.2.5 (2017-01-23)
* (bluefox) Extend compareTime function with astro features

### 3.2.4 (2017-01-13)
* (bluefox) fix stopScript

### 3.2.3 (2017-01-05)
* (bluefox) Try to fix error with sayit

### 3.2.2 (2016-12-17)
* (bluefox) Allow with stopScript() to stop itself

### 3.2.1 (2016-11-24)
* (bluefox) Fix error with subscribe for only required states

### 3.2.0 (2016-11-14)
* (bluefox) Fix error with of blocks in adapters
* (bluefox) Support of subscribe for only required states
* (bluefox) add delFile
* (bluefox) fix error with names

### 3.1.0 (2016-10-12)
* (bluefox) Support of blocks in adapters
* (bluefox) Move sendTo blocks into adapters

### 3.0.10 (2016-09-30)
* (bluefox) New blocks: compare time, write state
* (bluefox) Documentation

### 3.0.9 (2016-09-20)
* (bluefox) Bugfixing of blockly

### 3.0.7 (2016-09-09)
* (bluefox) add ack for trigger in blockly
* (bluefox) add block to get info about trigger
* (bluefox) start description of blockly
* (bluefox) add runScript functions
* (bluefox) disable zoom on wheel in blockly
* (bluefox) fix block: time compare

### 3.0.6 (2016-09-07)
* (bluefox) add extendObject function
* (bluefox) add custom sendTo block
* (bluefox) add multiple trigger block

### 3.0.5 (2016-09-03)
* (bluefox) Fix sendTo blocks

### 3.0.4 (2016-09-01)
* (bluefox) Support of convert day of week into text in blockly

### 3.0.3 (2016-08-29)
* (bluefox) Fixed the convert date block

### 3.0.2 (2016-08-28)
* (bluefox) Change name of sandbox debug variable

### 3.0.1 (2016-08-27)
* (bluefox) Fix disabling of script

### 3.0.0 (2016-08-27)
* (bluefox) Beta Release with Blockly


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
