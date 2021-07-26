![Logo](admin-config/javascript.png)
# Javascript Script Engine

![Number of Installations](http://iobroker.live/badges/javascript-installed.svg)
![Number of Installations](http://iobroker.live/badges/javascript-stable.svg)
[![NPM version](http://img.shields.io/npm/v/iobroker.javascript.svg)](https://www.npmjs.com/package/iobroker.javascript)

![Test and Release](https://github.com/ioBroker/ioBroker.javascript/workflows/Test%20and%20Release/badge.svg)
[![Translation status](https://weblate.iobroker.net/widgets/adapters/-/javascript/svg-badge.svg)](https://weblate.iobroker.net/engage/adapters/?utm_source=widget)
[![Downloads](https://img.shields.io/npm/dm/iobroker.javascript.svg)](https://www.npmjs.com/package/iobroker.javascript)

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
- Goto current line in debugger
- heating profile (future releases)
- ...

<!--
	Placeholder for the next version (at the beginning of the line):
	### __WORK IN PROGRESS__
-->

## Changelog

### __WORK IN PROGRESS__
* (Apollon77) Make sure day of weeks is an array (Sentry IOBROKER-JAVASCRIPT-7Y)

### 5.2.8 (2021-07-22)
* (bluefox) Fixed the debug of scripts

### 5.2.7 (2021-07-17)
* (bluefox) Fixed error in rules

### 5.2.6 (2021-07-16)
* (bluefox) Added fallback for admin4

### 5.2.3 (2021-07-08)
* (agross) Fix imports like "rxjs/operators" for versioned npm modules

### 5.2.2 (2021-07-06)
* (Apollon77) Add support to install npm packages as defined version (name@version)

## License

The MIT License (MIT)

Copyright (c) 2014-2021 bluefox <dogafox@gmail.com>,

Copyright (c) 2014      hobbyquaker
