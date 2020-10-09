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

<!--
	Placeholder for the next version (at the beginning of the line):
	### __WORK IN PROGRESS__
-->

## Changelog
### 4.9.0 (2020-10-09)
* (bluefox) All scripts support now `await` calls. THIS COULD HAVE SOME SIDE-EFFECT (unknown yet). 
* (AlCalzone) Matched the exact ID if the $ selector contains no wildcard
* (bluefox) Added new block in blockly: "pause" 
* (bluefox) Changed the order of folders and scripts to "folders first".
* (bluefox) Extend the documentation.
* (bluefox) Corrected the error with blockly and "day of week" conversion. 

### 4.8.4 (2020-09-21)
* (bluefox) Make the mirroring instance adjustable
* (bluefox) Correct the dark mode for blockly
* (bluefox) Corrected the special variables: isDayTime and dayTime

### 4.8.2 (2020-09-20)
* (Bluefox) Added the settings for columns in the state selection dialog

### 4.8.0 (2020-09-17)
* (AlCalzone) add xyzAsync methods and wait/sleep
* (Apollon77) Prevent a crash case (Sentry IOBROKER-JAVASCRIPT-3N)

### 4.7.4 (2020-09-10)
* (Bluefox) Fixed JS editor in blockly

## License

The MIT License (MIT)

Copyright (c) 2014-2020 bluefox <dogafox@gmail.com>,

Copyright (c) 2014      hobbyquaker
