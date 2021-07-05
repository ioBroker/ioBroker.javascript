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
* IMPORTANT: Admin 5.1.9 is now required for this JavaScript version!
* (Apollon77) Adjust logging for "array"/"object" type handling

### 5.2.0 (2021-07-04)
* (Apollon77) Handle state values for object types "array"/"object" stringifed as required by js-controller 3.3
* (foxriver76) add adapter to tier 1 for js-controller 3.3 (this means will be started first!)
* (bluefox) Implemented the change of theme and the expert mode via admin
* (bluefox) fixed the error with the simulation
* (Xyolyp) Blockly: Allow Value read from datapoint as switch input
* (ThomasPohl) Blockly: add text_multiline block
* (Apollon77) Prevent crash case(Sentry IOBROKER-JAVASCRIPT-70)

### 5.1.3 (2021-03-23)
* (bluefox) fixed the error in the debugging

### 5.1.2 (2021-03-22)
* (bluefox) Showed the runtime information for the rules

### 5.1.1 (2021-03-21)
* (bluefox) Implemented the debug of the instances from javascript adapter

### 5.1.0 (2021-03-19)
* (bluefox) Implemented the debug of scripts possibility

## License

The MIT License (MIT)

Copyright (c) 2014-2021 bluefox <dogafox@gmail.com>,

Copyright (c) 2014      hobbyquaker
