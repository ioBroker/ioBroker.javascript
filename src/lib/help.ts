/**
 * The answer of the message `help`: what the instance answers, written for AI agents (e.g. ioBroker.pi-agent, or
 * the MCP server with `send_to`) and script authors. Keep it in sync with `onMessage` in main.ts and with the AI
 * commands of `@iobroker/ai-core` (`AI_COMMANDS`, `JS_AI_ALIASES` in ai.ts).
 */

/** Every command `onMessage` answers; `write` = the command changes something */
export const COMMANDS: { command: string; write: boolean }[] = [
    { command: 'help', write: false },
    // for agents and scripts
    { command: 'toScript', write: true },
    { command: 'jsMessageBus', write: true },
    { command: 'execute', write: true },
    { command: 'calcAstro', write: false },
    { command: 'calcAstroAll', write: false },
    { command: 'restartScript', write: true },
    { command: 'getScriptVersions', write: false },
    { command: 'getScriptVersion', write: false },
    { command: 'getHistoryUsage', write: false },
    { command: 'deleteHistory', write: true },
    { command: 'prettier', write: false },
    { command: 'getSecrets', write: false },
    { command: 'getIoBrokerDataDir', write: false },
    // the editor and the settings
    { command: 'editorPing', write: false },
    { command: 'loadTypings', write: false },
    { command: 'debug', write: true },
    { command: 'debugStop', write: true },
    { command: 'rulesOn', write: true },
    { command: 'rulesOff', write: true },
    { command: 'fbdWatch', write: true },
    { command: 'fbdDebug', write: true },
    { command: 'ai:providers', write: false },
    { command: 'ai:models', write: false },
    { command: 'ai:chat', write: true },
    { command: 'getAvailableAiProviders', write: false },
    { command: 'testApiConnection', write: false },
    { command: 'chatCompletion', write: true },
];

export const HELP = `ioBroker.javascript: runs the scripts of ioBroker (JavaScript, TypeScript, Blockly, Rules, function block
diagrams). A script is an object script.js.<folder>.<name> (common.source, common.enabled, common.engine =
system.adapter.javascript.<n>). An agent can call a script that waits for messages, run a piece of code once,
start, stop and restart scripts, read the stored versions of a script and get the sun times of the location.
Scripts are written and changed as script objects (setObject), not by messages.

Commands (sendTo javascript.0):
- toScript (alias jsMessageBus) {script?, message, data?, instance?}: hands data to the scripts that registered
  onMessage(message, (data, callback) => ...). script: the ID of one script ("script.js.<folder>.<name>");
  without it every script of this instance with such a handler gets it. instance (a number or "javascript.<n>"),
  if given, must name this instance. The answer is what the script passes to its callback (the first answer
  counts); no answer at all if no running script handles message or it does not call back (wait for the
  timeout). Which messages a script takes, its source tells (onMessage('...')).
- execute {source, engineType?, timeout?, verbose?, logLevel?, maxLogs?}: runs the code once in this instance,
  with the whole script API (getState, setState, $, sendTo, exec, ...) and the global scripts; after timeout ms
  (default 5000, 0-60000) it is stopped with its timers and subscriptions: {ok, error?, engineType, runtime,
  truncated, logs: [{ts, severity, message}], output (the log lines as text)}. Results come out through log()
  or console.log() (into the answer, not into the ioBroker log). engineType "Javascript/js" (default) or
  "TypeScript/ts" ("ts"); verbose (default true): also a line for every getState, setState, ...; logLevel: the
  lowest level returned (silly, debug, info, warn, error); maxLogs default 5000; code is accepted for source.
  Not while a debug session runs. If the controller names the user, that user needs the right to execute
  commands on the host: else {ok: false, error}.
- calcAstro {latitude?, longitude?, sunriseEvent?, sunriseOffset?, sunriseLimitStart?, sunriseLimitEnd?,
  sunsetEvent?, sunsetOffset?, sunsetLimitStart?, sunsetLimitEnd?}: sunrise and sunset of today (also if
  already past, despite the names) as this instance takes them for day and night (variables.isDayTime):
  {nextSunrise: {isValidDate, serverTime, date}, nextSunset: {...}}. serverTime "HH:MM:SS" in the local time of
  the host, date ISO (UTC). Everything left out comes from the settings of the instance; events: dawn, sunrise,
  sunriseEnd, goldenHourEnd, solarNoon, goldenHour, sunsetStart, sunset, dusk, nauticalDusk, night, nightEnd,
  nauticalDawn, nadir; offsets in minutes; limits "HH:MM" (not earlier / not later). Send at least {} (without
  a message there is no answer).
- calcAstroAll {the same}: all sun times of today (the events above, isValidDate false and "n/a" for those that
  do not happen, e.g. night in summer) plus nextSunrise and nextSunset, sorted by time:
  {<event>: {isValidDate, serverTime, date}}.
- restartScript {script}: restarts a running script of this instance: {result: "script"}; a global script
  restarts the whole instance: {result: "instance"}; {error} if it does not run, is not of this instance or the
  user the controller names may not write objects.
- getScriptVersions {id}: the stored versions of a script (every change of its source, newest first; as many
  as the setting historyVersions, default 30, 0 = none, plus the oldest): {versions: [{ts, from, user, size,
  lines, protected?}]}, [] if none. getScriptVersion {id, ts}: {source} of one version (encrypted if protected)
  or {error}.
- getHistoryUsage: {rows: [{id, exists, versions, bytes}], total: {scripts, versions, bytes}}.
- deleteHistory {id, ts?} or {orphans: true} or {all: true}: deletes stored versions (one, all of a script,
  those of deleted scripts, or all), never the scripts: {deleted, bytes} or {error}.
- prettier {code, type?}: formats code (type "typescript" for TypeScript): {code} or {error}.
- getSecrets: {enabled, secrets: [{name, fields}]}: the credentials scripts read as SECRETS.<name>.<field> (no
  values). getIoBrokerDataDir: {dataDir, sep}.
- editorPing, loadTypings, debug, debugStop, rulesOn, rulesOff, fbdWatch, fbdDebug, ai:providers, ai:models,
  ai:chat, getAvailableAiProviders, testApiConnection, chatCompletion: for the editor and the settings, not for
  agents.

States (javascript.0.*):
- scriptEnabled.<folder>.<name>: true starts the script script.js.<folder>.<name> (a running one restarts),
  false stops it; scriptProblem.<folder>.<name>: true after an error of the script.
- variables.isDayTime, variables.dayTime (current time), variables.isDaylightSaving; with the setting
  createAstroStates variables.astro.<event> (today's sun times).
- Every state a script writes carries from = system.adapter.javascript.<n> and c = the ID of the script, e.g.
  "script.js.common.Light": to find out which script changed a state, read c of the state (or of its history).

How to talk to the user:
- Name scripts by their name and folder, not by the ID.
- execute runs code with full access to the house (it can switch devices, write objects and, if the settings
  allow exec, run shell commands): show the code and run it only on the user's request; read states with other
  tools.
- Starting, stopping or restarting scripts and deleteHistory change something: only on the user's request.
- Times in the local time of the user (serverTime is the time of the host).`;
