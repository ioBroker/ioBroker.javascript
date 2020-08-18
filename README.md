![Logo](admin-config/javascript.png)
# Javascript Script Engine

![Number of Installations](http://iobroker.live/badges/javascript-installed.svg) ![Number of Installations](http://iobroker.live/badges/javascript-stable.svg) [![NPM version](http://img.shields.io/npm/v/iobroker.javascript.svg)](https://www.npmjs.com/package/iobroker.javascript)
[![Downloads](https://img.shields.io/npm/dm/iobroker.javascript.svg)](https://www.npmjs.com/package/iobroker.javascript)
[![Tests](https://travis-ci.org/ioBroker/ioBroker.javascript.svg?branch=master)](https://travis-ci.org/ioBroker/ioBroker.javascript)

[![NPM](https://nodei.co/npm/iobroker.javascript.png?downloads=true)](https://nodei.co/npm/iobroker.javascript/)

Executes Javascript and Typescript Scripts.

**Coffescript is deprecated**

[Function documentation](docs/en/javascript.md)

[Benutzung](docs/de/usage.md)

Here you can find description of [blockly](docs/en/blockly.md).

Hier kann man die Beschreibung von [Blockly](docs/de/blockly.md) finden.

Описание по [blockly](docs/ru/blockly.md) можно найти [здесь](docs/ru/blockly.md).

**This adapter uses Sentry libraries to automatically report exceptions and code errors to the developers.** For more details and for information how to disable the error reporting see [Sentry-Plugin Documentation](https://github.com/ioBroker/plugin-sentry#plugin-sentry)! Sentry reporting is used starting with js-controller 3.0.

## How to build (only for developers)
Just run "npm i" in the root and in the src folders.

And then call "npm run build".

## Todo
- search in all files
- new rule editor (future releases)
- heating profile (future releases)
- ...

## Changelog

### 4.6.23 (2020-08-19)
* (AlCalzone) fix type resolution for rxjs in TypeScripts

### 4.6.22 (2020-07-30)
* (Apollon77) catched some more file errors in mirror logic

### 4.6.21 (2020-07-28)
* (Apollon77) catched some more file errors in mirror logic (Sentry IOBROKER-JAVASCRIPT-2X, IOBROKER-JAVASCRIPT-3C)

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

## License

The MIT License (MIT)

Copyright (c) 2014-2020 bluefox <dogafox@gmail.com>,

Copyright (c) 2014      hobbyquaker
