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
### 5.0.8 (2021-03-03)
* (bluefox) Translations
* (bluefox) Added the "set state with delay" block

### 5.0.7 (2021-03-02)
* (bluefox) Added the pushsafer block

### 5.0.6 (2021-03-01)
* (bluefox) Implemented the hysteresis

### 5.0.5 (2021-02-28)
* (bluefox) Implemented the toggle functionality

### 5.0.4 (2021-02-28)
* (bluefox) Fixed errors in rules

## License

The MIT License (MIT)

Copyright (c) 2014-2021 bluefox <dogafox@gmail.com>,

Copyright (c) 2014      hobbyquaker
