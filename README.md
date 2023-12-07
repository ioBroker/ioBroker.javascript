![Logo](admin-config/javascript.png)
# Javascript Script Engine

![Number of Installations](http://iobroker.live/badges/javascript-installed.svg)
![Number of Installations](http://iobroker.live/badges/javascript-stable.svg)
[![NPM version](http://img.shields.io/npm/v/iobroker.javascript.svg)](https://www.npmjs.com/package/iobroker.javascript)

![Test and Release](https://github.com/ioBroker/ioBroker.javascript/workflows/Test%20and%20Release/badge.svg)
[![Translation status](https://weblate.iobroker.net/widgets/adapters/-/javascript/svg-badge.svg)](https://weblate.iobroker.net/engage/adapters/?utm_source=widget)
[![Downloads](https://img.shields.io/npm/dm/iobroker.javascript.svg)](https://www.npmjs.com/package/iobroker.javascript)
**This adapter uses Sentry libraries to automatically report exceptions and code errors to the developers.** For more details and for information how to disable the error reporting see [Sentry-Plugin Documentation](https://github.com/ioBroker/plugin-sentry#plugin-sentry)! Sentry reporting is used starting with js-controller 3.0.

Executes Javascript, Typescript Scripts.

## Documentation
* [Function documentation](docs/en/javascript.md)

* [Benutzung](docs/de/usage.md)

* Blockly
  * Here you can find the description of [blockly](docs/en/blockly.md). 
  * Hier kann man die Beschreibung von [Blockly](docs/de/blockly.md) finden. 
  * Описание по [blockly](docs/ru/blockly.md) можно найти [здесь](docs/ru/blockly.md).

## Forbidden directories for Script Filesystem Mirroring
The Script Filesystem Mirroring will store all Source Files of the Scripts in your Filesystem to allow you to edit the Files in your favourite Script editor beside the Web-Editor. All changes are synced in both directions.

When enabling the Script Filesystem mirroring, please make sure to create a **dedicated new directory** and **do not** use an existing directory with other content. Please also make sure that no other script or process changes files in the provided directory to prevent access issues.
Any location needs to be writable by the "iobroker" user!

Since v5.5.0 of the JavaScript adapter the following locations (relative to the ioBroker Base directory, usually `/opt/iobroker`) are not allowed to be used:
* The ioBroker base directory itself and any path above!
* `./iobroker-data` itself, custom subdirectory (choose a name that do not overlap with any adapter!)
* `./iobroker-data/backup-objects` or the anything below
* `./iobroker-data/files` or the anything below
* `./iobroker-data/backitup` or the anything below
* `./backups` or the anything below
* `./node_modules` or the anything below
* `./log` or the anything below

## Todo
- Goto current line in debugger
- ...

## Changelog
<!--
	### **WORK IN PROGRESS**
-->
### **WORK IN PROGRESS**

* (klein0r) Updated blockly logo
* (klein0r) Always set variables like isDaylightSaving
* (klein0r) Added astro times as states
* (klein0r) Fixed copied time blocks

### 7.2.0 (2023-12-04)
NodeJS 16.x is required

* (klein0r) Added function to format time difference `formatTimeDiff`
* (klein0r) Added blockly blocks for `formatTimeDiff`
* (klein0r) messageToAsync was not working without options
* (klein0r) Added timeout and custom options for sendToAsync
* (klein0r) Fixed valid switch statement expressions
* (klein0r) Added text replacement, cound and reverse blocks
* (klein0r) Added list reverse block

### 7.1.6 (2023-10-24)
* (bluefox) Fixed pushover rules block

### 7.1.5 (2023-10-09)
* (bluefox) Added play-ground for ChatGPT (API key required)

### 7.1.4 (2023-08-09)
* (bluefox) Added version to the side menu
* (klein0r) Added blockly blocks for `getHistory` and calculated times

### 7.1.1 (2023-06-20)
* (bluefox) corrected the script export

## License
The MIT License (MIT)

Copyright (c) 2014-2023 bluefox <dogafox@gmail.com>,

Copyright (c) 2014      hobbyquaker
