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
* `./iobroker-data/backup-objects` or anything below
* `./iobroker-data/files` or anything below
* `./iobroker-data/backitup` or anything below
* `./backups` or anything below
* `./node_modules` or anything below
* `./log` or anything below

## Todo
- Goto current line in debugger
- ...

## Changelog
<!--
	### **WORK IN PROGRESS**
-->
### 7.0.6 (2023-06-12)
* (bluefox) typescript and coffescript were degraded to previous versions
* (bluefox) tried to correct vscode font

### 7.0.5 (2023-06-06)
* (klein0r) reset timeouts in blockly
* (klein0r) added additional blockly blocks

### 7.0.4 (2023-06-06)
* (bluefox) packages updated
* (bluefox) Files are used for export of scripts

### 7.0.3 (2023-03-16)
* (bluefox) made the editor visible in full height
* (paul53) small fixes on blockly and translations are made

### 7.0.2 (2023-03-13)
* (bluefox) Breaking change: all usages of `jsonata` must be rewritten to use promises.
* (bluefox) Breaking change: all blockly scripts with `jsonata` blocks must be changed (just move some blocks) and saved anew.
* (bluefox) Extended `createState` command with possibility to create aliases. 
* (bluefox) Corrected CRON card in rules 
* (bluefox) Added additional options to show the attributes of object in blockly
* (bluefox) Corrected `existsStateAsync` function
* (bluefox) Added `isDaylightSaving` state to indicate day saving time
* (AlCalzone) Pinned `@types/node` to v14
* (bluefox) Added list of astrological events in GUI

## License
The MIT License (MIT)

Copyright (c) 2014-2023 bluefox <dogafox@gmail.com>,

Copyright (c) 2014      hobbyquaker
