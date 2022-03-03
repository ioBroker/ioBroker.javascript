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

## Changelog
<!--
	Placeholder for the next version (at the beginning of the line):
	### __WORK IN PROGRESS__
-->

### __WORK IN PROGRESS__
* (Apollon77) Add missing callback check in setObject 

### 5.3.0 (2022-03-02)
* (Apollon77) Prevent some crash cases reported by Sentry (IOBROKER-JAVASCRIPT-A3)
* (Apollon77) Fix Enum Updates
* (Apollon77) Optimize making sure data are current for synchronous return of states/objects even for asynchronous action cases before
* (Apollon77) Make sure admin files is cleaned up on update
* (Apollon77) update channel/device structures for $ selector on object updates
* (Apollon77) Adjustments for js-controller 4.0

### 5.2.21 (2022-01-16)
* (bluefox) Fixed build process

### 5.2.19 (2022-01-10)
* (AlCalzone) Fixed broken dependency

### 5.2.18 (2021-12-14)
* (klein0r) Fixed some german translations
* (winnyschuster) Fixed astro schedules

### 5.2.16 (2021-11-19)
* (bluefox) Fixed the font in the editor

## License
The MIT License (MIT)

Copyright (c) 2014-2022 bluefox <dogafox@gmail.com>,

Copyright (c) 2014      hobbyquaker
