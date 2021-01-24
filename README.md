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
Just run `npm i` in the root and in the src folders.

And then call `npm run build`.

## Todo
- new rule editor (future releases)
- heating profile (future releases)
- ...

<!--
	Placeholder for the next version (at the beginning of the line):
	### __WORK IN PROGRESS__
-->

## Changelog

### 4.10.13 (2021-01-24)
* (Apollon77) Handle more cases with invalid script names/state-ids (Sentry IOBROKER-JAVASCRIPT-4B)

### 4.10.11 (2021-01-22)
* (Apollon77) Optimize error handling in createState and file mirror again

### 4.10.10 (2021-01-22)
* (Apollon77) Do not try to set a state value if object creation was not successful (Sentry IOBROKER-JAVASCRIPT-5G)
* (Apollon77) Make sure no incorrect states are trying to be set (Sentry IOBROKER-JAVASCRIPT-5F, IOBROKER-JAVASCRIPT-5A)

### 4.10.9 (2021-01-13)
* (Apollon77) Make sure to end all Timeouts
* (Apollon77) Prevent crash case (Sentry IOBROKER-JAVASCRIPT-51)

### 4.10.8 (2020-12-07)
* (paul53) Corrected `variables.isDayTime`
* (AlCalzone) catch errors during virtual-tsc compile calls
* (Apollon77) Prevent crash case (Sentry)

## License

The MIT License (MIT)

Copyright (c) 2014-2020 bluefox <dogafox@gmail.com>,

Copyright (c) 2014      hobbyquaker
