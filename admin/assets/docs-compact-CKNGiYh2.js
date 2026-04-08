const e=`# ioBroker JavaScript Adapter - API Reference

IMPORTANT RULES:
- ONLY use functions listed in this document. NEVER define your own helper functions.
- Use on() to react to state changes. NEVER use setTimeout/setInterval for polling states.
- Use setState(id, value) to control devices. Use getState(id).val to read values.
- All functions are pre-imported. NEVER use require() or import.
- Code runs inside an async context. You can use await directly.

## Quick Reference - Most Used Functions

\`\`\`js
// React to state changes:
on('adapter.0.device.state', (obj) => {
    const val = obj.state.val;
});

// Read a state value:
const val = getState('adapter.0.device.state').val;

// Set a state (control a device):
setState('adapter.0.device.state', true);

// Time-based schedule (cron):
schedule('0 7 * * *', () => { /* runs daily at 07:00 */ });

// Selector - find states by room/function:
$('state[state.id=*.state](rooms=Living room)').each((id) => {
    setState(id, false);
});

// Log output:
log('message');
\`\`\`

---

## exec(cmd, [options], callback)
Execute OS command. \`callback(error, stdout, stderr)\`. Requires "Enable command exec" option.

## on(pattern, callbackOrId, value)
Subscribe to state changes. Alias: \`subscribe\`. Returns handler for \`unsubscribe\`.
Callback receives \`{id, state: {val, ts, ack, lc, from}, oldState: {val, ts, ack, lc, from}}\`.
\`on('stateId1', 'stateId2')\` connects two states. \`on('stateId1', 'stateId2', 'triggered')\` sets fixed value.
Pattern can be: string ID, RegExp, or object with these properties:
- \`logic\` (string): "and"|"or" (default "and")
- \`id\` (string|RegExp|Array): state ID filter
- \`name\` (string|RegExp|Array): state name filter
- \`change\` (string): "eq","ne","gt","ge","lt","le","any" (default "ne" for string ID, "any" otherwise)
- \`val\`, \`valNe\`, \`valGt\`, \`valGe\`, \`valLt\`, \`valLe\` (mixed): new value conditions
- \`ack\` (boolean): new ack filter; \`q\` (number): quality filter (default 0, use '*' for any)
- \`oldVal\`, \`oldValNe\`, \`oldValGt\`, \`oldValGe\`, \`oldValLt\`, \`oldValLe\` (mixed): previous value conditions
- \`oldAck\` (bool), \`oldQ\` (number): previous ack/quality filters
- \`ts\`, \`tsGt\`, \`tsGe\`, \`tsLt\`, \`tsLe\` (string): new timestamp conditions
- \`oldTs\`, \`oldTsGt\`, \`oldTsGe\`, \`oldTsLt\`, \`oldTsLe\` (string): previous timestamp conditions
- \`lc\`, \`lcGt\`, \`lcGe\`, \`lcLt\`, \`lcLe\` (string): last change timestamp conditions
- \`oldLc\`, \`oldLcGt\`, \`oldLcGe\`, \`oldLcLt\`, \`oldLcLe\` (string): previous last change conditions
- \`channelId\`, \`channelName\`, \`deviceId\`, \`deviceName\` (string|RegExp|Array): channel/device filters
- \`enumId\`, \`enumName\` (string|RegExp|Array): enum filters
- \`from\`, \`fromNe\`, \`oldFrom\`, \`oldFromNe\` (string|RegExp|Array): adapter source filters
To get state deletions/expires, use \`change: 'ne'\` or \`'any'\` AND \`q: '*'\`.

## once(pattern, callback)
Like \`on()\`, but triggers only once then auto-unsubscribes.

## unsubscribe(idOrHandler)
Remove subscriptions by object ID (removes all) or by handler (removes specific).

## getSubscriptions()
Returns object \`{stateId: [{name, pattern}]}\` listing all state subscriptions.

## getFileSubscriptions()
Returns object listing all file subscriptions.

## schedule(pattern, callback)
Time scheduler with cron and astro support. Returns schedule object for \`clearSchedule\`.
Cron string: \`"sec min hour dayOfMonth month dayOfWeek"\` (sec optional, 5 or 6 fields).
Object pattern: \`{second, minute, hour, date, month, year, dayOfWeek}\`.
Date object: triggers once at that time.
With time range: \`{start, end, rule}\` where start/end are Date/string/ms, rule is cron string or object.
Astro: \`{astro: 'sunrise', shift: 10}\` (shift in minutes, can be negative).
Astro values: sunrise, sunriseEnd, goldenHourEnd, solarNoon, goldenHour, sunsetStart, sunset, dusk, nauticalDusk, night, nightEnd, nauticalDawn, dawn, nadir.
Requires latitude/longitude in adapter settings for astro.
Also works via \`on()\`: \`on({time: '*/2 * * * *'}, cb)\` or \`on({astro: 'sunset', shift: 10}, cb)\`.

## scheduleById(id, [ack], callback)
Schedule based on state value (format \`[h]h:[m]m[:ss]\`). Auto-updates when state changes.

## getSchedules(allScripts)
Returns list of all CRON/schedule jobs. Pass \`true\` for all scripts, otherwise current script only.

## clearSchedule(scheduleObject)
Cancel a schedule created by \`schedule()\`.

## getAttr(obj, path)
Get nested attribute: \`getAttr({a: {b: 5}}, 'a.b')\` returns 5. Parses JSON strings automatically.

## getAstroDate(pattern, date, offsetMinutes)
Returns Date object for astro event. Uses current day if no date given.

## isAstroDay()
Returns \`true\` if current time is between astro sunrise and sunset.

## compareTime(startTime, endTime, operation, timeToCompare)
Compare time with limits. Operations: ">", ">=", "<", "<=", "==", "<>", "between", "not between".
Times can be Date objects, date strings, time strings, or astro names.
Astro with offset: \`{astro: 'sunsetStart', offset: 30, date: new Date()}\`.

## setState(id, state, ack, callback)
Set state value. \`setState('id', 1)\` = \`setState('id', {val: 1, ack: false})\`.
\`ack=false\`: command to device; \`ack=true\`: confirmed state update.

## setStateAsync(id, state, ack)
Promise version of setState.

## setStateDelayed(id, state, isAck, delay, clearRunning, callback)
setState with delay in ms. Returns timer handler. \`clearRunning\` (default true) cancels previous delays.

## setStateChanged(id, state, ack)
Like setState, but only sets if value actually changed.

## setStateChangedAsync(id, state, ack)
Promise version of setStateChanged.

## clearStateDelayed(id, [timerId])
Clear delayed tasks for state ID, or specific timer.

## getStateDelayed(id)
Get list of running timers. Returns \`[{timerId, left, delay, val, ack}]\` for specific ID, or object keyed by ID for all.

## getState(id)
Returns \`{val, ack, ts, lc, from}\`. Returns \`{val: null, notExist: true}\` if missing.

## getStateAsync(id)
Promise version of getState.

## existsState(id, [callback])
Check if state exists. Sync (returns bool) if "Do not subscribe all states on start" is off, otherwise async.

## getObject(id, [enumName])
Get object description. With enumName (e.g. 'rooms' or true for all), adds enumIds/enumNames arrays.

## setObject(id, obj, callback)
Write object to DB. Use to modify objects read with getObject. Requires "Enable setObject" option.

## existsObject(id, [callback])
Check if object exists. Sync or async like existsState.

## extendObject(id, obj, callback)
Merge-update object. E.g. \`extendObject('system.adapter.sayit.0', {common: {enabled: false}})\`.

## deleteObject(id, [isRecursive], callback)
Delete object (and state value if type=state). \`isRecursive\` deletes children too.

## getIdByName(name, [alwaysArray])
Returns ID(s) for object with given name. Returns array if multiple or if \`alwaysArray\` is true.

## getEnums(enumName)
Get enums with members. Returns \`[{id, members, name}]\`.

## createState(name, [initialValue], [forceCreation], [common], [native], [callback])
Create state in \`javascript.X\` namespace. Prefer \`0_userdata.0.mystate\` for custom data points.
Common options: \`{type, role, read, write, name, unit, min, max, def, alias}\`.
Alias: set \`alias: true\` or \`alias: {id: 'alias.0.x', read: 'val/1000', write: 'val*1000'}\`.

## createStateAsync(name, [initialValue], [forceCreation], [common], [native])
Promise version of createState.

## deleteState(name, [callback])
Delete state in \`javascript.X\` namespace.

## deleteStateAsync(name)
Promise version of deleteState.

## createAlias(name, alias, [forceCreation], [common], [native], [callback])
Create alias in \`alias.0\` namespace. \`alias\` can be string ID or \`{id: {read: 'id1', write: 'id2'}}\`.

## createAliasAsync(name, alias, [forceCreation], [common], [native])
Promise version of createAlias.

## sendTo(adapter, command, message, [options], [callback])
Send message to adapter instance(s). \`options: {timeout}\` (default 20000ms).
E.g. \`sendTo('telegram.0', {user: 'User', text: 'Hi'})\`.

## sendToAsync(adapter, command, message, [options])
Promise version of sendTo.

## sendToHost(hostName, command, message, [callback])
Send message to host controller. Commands: cmdExec, getRepository, getInstalled, getVersion, getDiagData, getLocationOnDisk, getDevList, getLogs, getHostInfo.

## sendToHostAsync(hostName, command, message)
Promise version of sendToHost.

## setInterval(callback, ms, ...args)
Same as JS setInterval.

## clearInterval(id)
Same as JS clearInterval.

## setTimeout(callback, ms, ...args)
Same as JS setTimeout.

## clearTimeout(id)
Same as JS clearTimeout.

## setImmediate(callback, ...args)
Same as JS setImmediate (higher priority than setTimeout 0).

## formatDate(millisecondsOrDate, [format])
Format date. Tokens: YYYY(year), MM(month), DD(day), hh(hours), mm(min), ss(sec), sss(ms), WW/W(weekday), OO/O(month name).

## formatTimeDiff(milliseconds, [format])
Format time difference. Default \`hh:mm:ss\`. Tokens: DD/D(days), hh/h, mm/m, ss/s.

## getDateObject(stringOrNumber)
Convert string/number to Date. \`getDateObject('20:00')\` adds current date.

## formatValue(value, [decimals], [format])
Format number with locale. \`decimals\` default 2. Format: '.,', ',.', or ' .'.

## adapterSubscribe(id)
Send "subscribe" message to adapter. Auto-called for subscribable adapters.

## adapterUnsubscribe(id)
Send "unsubscribe" message to adapter.

## $(selector)
jQuery-like selector. Methods: \`.on(cb)\`, \`.each(cb)\`, \`.setState(val, ack)\`, \`.getState()\`, \`.toArray()\`.
Format: \`'name[commonAttr=val](enumName=val){nativeAttr=val}[id=filter][state.id=filter]'\`.
Name: state, channel, device, schedule. Wildcards \`*\` supported.
E.g. \`$('channel[role=switch][state.id=*.STATE](rooms=Living room)').setState(false)\`.

## readFile(adapter, fileName, callback)
Read file from DB. \`callback(error, bytes)\`. Default adapter: \`javascript.0\`.

## writeFile(adapter, fileName, bytes, callback)
Write file to DB. Accessible via web: \`http://ip:8082/javascript/path/file.ext\`.

## delFile(adapter, fileName, callback)
Delete file or directory from DB. Alias: \`unlink\`.

## renameFile(adapter, oldName, newName, callback)
Rename file or directory in DB. Alias: \`rename\`.

## onFile(id, fileName, withFile, callback)
Subscribe to file changes. \`id\`: meta object ID (e.g. 'vis.0'). \`fileName\`: name or glob pattern.
Callback: \`(id, fileName, size, fileData, mimeType)\`. \`fileData\`/\`mimeType\` only if \`withFile=true\`.

## offFile(id, fileName)
Unsubscribe from file changes.

## onStop(callback, [timeout])
Register callback for script stop. Default timeout 1000ms. Call \`callback()\` when cleanup done.

## getHistory(instance, options, callback)
Read history data. Options: \`{id, start, end, aggregate, count, timeout}\`.
\`aggregate\`: 'none', 'minmax', 'max', 'min', 'average', 'total', 'count', 'm4'.
If instance omitted, uses system default. \`callback(err, result, options, instance)\`.

## runScript(scriptName, [callback])
Start or restart a script by name.

## runScriptAsync(scriptName)
Promise version of runScript.

## startScript(scriptName, [ignoreIfStarted], [callback])
Start script. If \`ignoreIfStarted=true\`, does nothing if already running.

## startScriptAsync(scriptName, [ignoreIfStarted])
Promise version of startScript.

## stopScript([scriptName], [callback])
Stop script. No args = stop self.

## stopScriptAsync([scriptName])
Promise version of stopScript.

## isScriptActive(scriptName)
Returns if script is enabled (not necessarily running).

## toInt(val)
Convert to integer.

## toFloat(val)
Convert to float.

## toBoolean(val)
Convert to boolean.

## jsonataExpression(expr)
Evaluate JSONata expression.

## wait(ms) / sleep(ms)
Pause execution. Must use \`await wait(1000)\`.

## messageTo(target, data, [options], [callback])
Send message via message bus to other scripts. Target: \`{instance, script, message}\` or just \`'messageName'\`.
Default timeout 5000ms.

## messageToAsync(target, data, [options])
Promise version of messageTo.

## onMessage(messageName, callback)
Subscribe to message bus. \`callback(data, callback)\` - call callback with response.

## onMessageUnregister(idOrName)
Unsubscribe from message by handler ID or message name.

## onLog(severity, callback)
Subscribe to logs. Severity: 'error', 'warn', 'info', 'debug', or '*' for all.
\`callback({message, severity, ts})\`. Cannot log same severity in handler (infinite loop).

## onLogUnregister(idOrHandlerOrSeverity)
Unsubscribe from log handler by ID, function, or severity string.

## httpGet(url, [options], callback)
HTTP GET request. Options: \`{timeout, responseType, headers, basicAuth, validateCertificate}\`.
\`callback(err, response)\` where \`response: {statusCode, data, headers}\`.
Use \`responseType: 'arraybuffer'\` for binary data.

## httpPost(url, data, [options], callback)
HTTP POST request. Same options as httpGet plus \`basicAuth: {user, password}\`.

## createTempFile(fileName, data)
Create temporary file. Returns file path string. Useful for sendTo with file attachments.

# Global Variables
- \`scriptName\` - name of current script
- \`instance\` - JavaScript adapter instance number (e.g. 0)
- \`defaultDataDir\` - absolute path to iobroker-data directory
- \`verbose\` - boolean, verbose mode enabled

# Notes
- "Do not subscribe all states on start" mode: getState requires async callback \`getState(id, (err, state) => {})\`.
- Scripts can be enabled/disabled via state \`javascript.INSTANCE.scriptEnabled.SCRIPT_NAME\` (set with ack=false).
`;export{e as default};
