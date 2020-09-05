![Logo](admin-config/javascript.png)
# Javascript Script Engine

![Number of Installations](http://iobroker.live/badges/javascript-installed.svg) ![Number of Installations](http://iobroker.live/badges/javascript-stable.svg) [![NPM version](http://img.shields.io/npm/v/iobroker.javascript.svg)](https://www.npmjs.com/package/iobroker.javascript)
[![Downloads](https://img.shields.io/npm/dm/iobroker.javascript.svg)](https://www.npmjs.com/package/iobroker.javascript)
[![Tests](https://travis-ci.org/ioBroker/ioBroker.javascript.svg?branch=master)](https://travis-ci.org/ioBroker/ioBroker.javascript)

[![NPM](https://nodei.co/npm/iobroker.javascript.png?downloads=true)](https://nodei.co/npm/iobroker.javascript/)

Executes Javascript, Typescript and Coffescript Scripts.

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

### 4.6.8 (2020-05-16)
* (bluefox) Fixed blockly blocks because of deprecated functions
* (bluefox) Corrected schedule wizard 

### 4.6.4 (2020-05-15)
* (bluefox) Corrected block: request, exec

### 4.6.1 (2020-05-11)
* (bluefox) Updated blockly to 3.20200402.1
* (bluefox) Added to blockly the switch/case block. 
* (Mic-M) fix log crash
* (Apollon77) Add new Sentry key and exclude user script exceptions
* (Garfonso) Several fixes and optimizations for Mirroring functionality
* (Apollon77) add support for 0_userdata.0 to createState and deleteState 

### 4.5.1 (2020-04-17)
* (Apollon77) Nodejs 10 is new minimum Version!
* (Apollon77) Add Sentry for use in js-controller 3.0 and React component
* (Apollon77) prevent warnings with js-controller 3.0
* (Garfonso) fix enum object cache handling
* (bluefox/Apollon77) enhance existsState

## License

The MIT License (MIT)

Copyright (c) 2014-2020 bluefox <dogafox@gmail.com>,

Copyright (c) 2014      hobbyquaker
