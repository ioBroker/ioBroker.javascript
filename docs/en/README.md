<img src="../../admin/javascript.svg" alt="ioBroker.javascript" width="100" />

# ioBroker.javascript

## Table of contents

- [Blockly](blockly.md)
- [JavaScript reference](javascript.md)
- [Upgrade guide](upgrade-guide.md)

## AI Code Generator - Custom API Support

The built-in AI code generator supports not only the OpenAI API but also any OpenAI-compatible API endpoint. This allows you to use alternative providers such as:

- **Ollama** (local LLMs)
- **LM Studio** (local LLMs)
- **OpenRouter** (multi-provider gateway)
- **DeepSeek**
- **Anthropic** (via OpenAI-compatible proxy)
- Any other provider with an OpenAI-compatible `/v1/chat/completions` endpoint

### Configuration

In the adapter settings under "Main settings", you will find three fields for AI configuration:

| Setting | Description |
|---------|-------------|
| **ChatGPT API key** | Your API key. Required for all providers. For Ollama you can use any non-empty string (e.g. `ollama`). |
| **Custom API Base URL** | The base URL of your API provider. Leave empty for OpenAI. Examples: `http://localhost:11434/v1` (Ollama), `http://localhost:1234/v1` (LM Studio). |

### Test API Connection

Use the **"Test API connection"** button in the adapter settings to verify your configuration. The test will:
- Connect to the configured API endpoint
- Validate the API key
- Return the number of available models

### Dynamic Model Loading

When opening the AI code generator dialog in the script editor, the available models are automatically fetched from the configured API endpoint. The model dropdown is populated dynamically — no hardcoded model list is used.

### Error Handling

If the API endpoint is unreachable or returns an error, user-friendly messages are displayed:
- Connection failures (endpoint not reachable)
- Invalid API key (401)
- Access denied (403)
- Model not found (404)

A **Retry** button is shown when model loading fails, allowing you to retry without closing the dialog.
