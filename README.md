![Logo](admin/javascript.png)
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

- 🇺🇸 [Function documentation](docs/en/javascript.md)
- 🇺🇸 [Upgrade guide](docs/en/upgrade-guide.md)
- 🇩🇪 [Benutzung](docs/de/usage.md)
- Blockly
  - 🇺🇸 Here you can find the description of [blockly](docs/en/blockly.md). 
  - 🇩🇪 Hier kann man die Beschreibung von [Blockly](docs/de/blockly.md) finden. 
  - 🇷🇺 Описание по [blockly](docs/ru/blockly.md) можно найти [здесь](docs/ru/blockly.md).

## Changelog
<!--
    ### **WORK IN PROGRESS**
-->
### 9.1.0 (2026-03-19)
* Added support for custom OpenAI-compatible API endpoints (e.g. Ollama, LM Studio, Google Gemini, DeepSeek, OpenRouter)
* Added configurable base URL in adapter settings
* Models are now fetched dynamically from the configured API endpoint
* Added the "Test API connection" button in adapter settings
* Added error handling with user-friendly messages for unreachable providers
* Added retry functionality for failed model loading
* All API calls (models + chat) are proxied server-side to avoid CORS issues with local providers
* Strip LLM thinking artifacts from responses (for local models like Ollama)

### 9.0.18 (2026-01-11)
* (@GermanBluefox) Corrected an error message with `lastSync`
* (@klein0r) Corrected JavaScript filter

### 9.0.17 (2025-12-14)
* (@GermanBluefox) Added possibility to encrypt scripts with password (only for vendors)

### 9.0.11 (2025-07-29)
* (@GermanBluefox) Corrected the rule editor if the condition is empty
* (@GermanBluefox) Corrected types for TypeScript

### 9.0.10 (2025-07-27)
* (@klein0r) Added Blockly block to format a numeric value
* (@GermanBluefox) Fixing some blocks in blockly: cron, time
* (@GermanBluefox) Added a new block: "unconditional return"
* (@GermanBluefox) Type definitions for TypeScript were updated
* (@GermanBluefox) Corrected bug with deleting of sub-folders

## License
The MIT License (MIT)

Copyright (c) 2014-2026 bluefox <dogafox@gmail.com>,

Copyright (c) 2014      hobbyquaker

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
