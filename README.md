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
### **WORK IN PROGRESS**
* (@GermanBluefox) Agent keys are encrypted now. You must enter your keys anew!
* (Eistee82) AI API keys are now stored encrypted and only used server-side (`encryptedNative` + `protectedNative`); the frontend never sees them
* (Eistee82) Code Lens above every top-level function/class/arrow with `💡 Explain | 🔧 Refactor | ✅ Tests` actions
* (Eistee82) Inline Chat Widget (Ctrl+Alt+I) directly in the editor with response preview and Apply button
* (Eistee82) Inline diff for AI "Show diff": only the targeted lines change as red/green, the rest of the script stays untouched; Accept replaces just those lines
* (Eistee82) Six VS-Code-like AI actions in the Monaco editor (right-click menu, Ctrl+Alt+I/E/R/C/F shortcuts, and `/explain`, `/refactor`, `/comment`, `/fix`, `/tests`, `/ask` slash commands with German aliases)
* (Eistee82) Hover over an ioBroker object ID in any string literal to see a rich tooltip with object metadata and the current live state — works without AI
* (Eistee82) Anthropic agent mode (native `tool_use`/`tool_result` blocks) and 10 new Monaco editor tools so the AI agent can read/navigate/edit the live editor
* (Eistee82) `search_datapoints` covers every object type (channels, devices, folders, enums, …) and matches on role; `get_object_info` lists children for containers — fixes finding aliases/motion-sensors modeled as channels
* (Eistee82) Non-chat model filter expanded (embeddings, image/audio/video/TTS, transcription, moderation, web-search, Ollama single-task models, …)

### 9.2.0 (2026-04-11)
* (Eistee82) AI Chat panel with multi-provider support, tool calling, inline completions, and smart-apply
* (Eistee82) Fix: prevent duplicate 'Stopping script' log when script is not running
* (Eistee82) Fix: only restart scripts on the instance that owns them
* (Eistee82) Added OID display mode toggle for Blockly editor: 4 display modes (Name, Name path, State ID, Full ID) with toolbar dropdown, context menu, optional object icons, and translations in 11 languages
* (Eistee82) Node 25 compatibility: replaced deprecated rmdirSync with rmSync in build tasks
* (@GermanBluefox) Added support for plain import/export
* (@GermanBluefox) Correcting error in configuration
* (@GermanBluefox) disallow writing into node_modules folder by scripts
* (@GermanBluefox) Correcting start of the script more than one time if restart is triggered
* (@GermanBluefox) All delayed writings are stopped by the script stop
* (@GermanBluefox) Added check if a script has been modified by another user/window
* (@GermanBluefox) Make the instance number more prominent

### 9.1.1 (2026-03-19)
* (GermanBluefox) Small GUI optimizations
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
