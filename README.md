![Logo](admin-config/javascript.png)
# Javascript Script Engine

![Number of Installations](http://iobroker.live/badges/javascript-installed.svg) ![Number of Installations](http://iobroker.live/badges/javascript-stable.svg) [![NPM version](http://img.shields.io/npm/v/iobroker.javascript.svg)](https://www.npmjs.com/package/iobroker.javascript)
[![Downloads](https://img.shields.io/npm/dm/iobroker.javascript.svg)](https://www.npmjs.com/package/iobroker.javascript)
[![Tests](https://travis-ci.org/ioBroker/ioBroker.javascript.svg?branch=master)](https://travis-ci.org/ioBroker/ioBroker.javascript)

[![NPM](https://nodei.co/npm/iobroker.javascript.png?downloads=true)](https://nodei.co/npm/iobroker.javascript/)

Executes Javascript, Typescript Scripts.

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
### 4.7.2 (2020-09-05)
* (Bluefox) Fixed blockly problem
* chore: release v4.7.0

### 4.7.1 (2020-09-04)
* (Bluefox) Fixed styling

### 4.7.0 (2020-09-03)
* (AlCalzone) Allowed async functions whenever a callback is accepted
* (AlCalzone) Allowed `true` as 2nd parameter in getObject
* (AlCalzone) Forced TypeScript to treat each script as a separate module
* (Bluefox) Replaced the Select-ID dialog

### 4.6.26 (2020-08-24)
* (Apollon77) Catch error case when npm installation fails (Sentry IOBROKER-JAVASCRIPT-3K)
* (Apollon77) Prevent crash case in mirroring (Sentry IOBROKER-JAVASCRIPT-3M)

### 4.6.25 (2020-08-24)
* (bluefox) Fixed the loading of page

### 4.6.23 (2020-08-19)
* (AlCalzone) fix type resolution for rxjs in TypeScripts

### 4.6.22 (2020-07-30)
* (Apollon77) caught some more file errors in mirror logic

### 4.6.21 (2020-07-28)
* (Apollon77) caught some more file errors in mirror logic (Sentry IOBROKER-JAVASCRIPT-2X, IOBROKER-JAVASCRIPT-3C)

## License

The MIT License (MIT)

Copyright (c) 2014-2020 bluefox <dogafox@gmail.com>,

Copyright (c) 2014      hobbyquaker
