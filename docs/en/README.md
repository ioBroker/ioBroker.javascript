<img src="../../admin/javascript.svg" alt="ioBroker.javascript" width="100" />

# ioBroker.javascript

## Table of contents

- [Blockly](blockly.md)
- [JavaScript reference](javascript.md)
- [Upgrade guide](upgrade-guide.md)

## AI Code Generator - Custom API Support

The built-in AI code generator supports not only the OpenAI API but also any OpenAI-compatible API endpoint. This allows you to use alternative providers such as:

- **Google Gemini** (free tier available, recommended)
- **DeepSeek** (very affordable)
- **OpenRouter** (multi-provider gateway)
- **Ollama** (local LLMs)
- **LM Studio** (local LLMs)
- **Anthropic** (via OpenAI-compatible proxy)
- Any other provider with an OpenAI-compatible `/v1/chat/completions` endpoint

### Recommended Providers

#### Google Gemini (free, recommended)

Google offers a generous free tier with an OpenAI-compatible endpoint — ideal for ioBroker script generation:

| Model | Requests/min | Requests/day | Quality |
|-------|-------------|-------------|---------|
| Gemini 2.5 Flash | 10 | 500 | Very good for code |
| Gemini 2.5 Pro | 5 | 25 | Excellent |
| Gemini 2.0 Flash | 15 | 1500 | Good |

Setup:
1. Get a free API key at https://aistudio.google.com/apikey
2. Set **Base URL** to `https://generativelanguage.googleapis.com/v1beta/openai`
3. Select a Gemini model (e.g. `gemini-2.5-flash`)

#### DeepSeek (very affordable)

DeepSeek offers excellent code generation at very low cost (~$0.001 per request):
- Get an API key at https://platform.deepseek.com/
- Set **Base URL** to `https://api.deepseek.com/v1`
- Recommended model: `deepseek-chat`

#### Local models (Ollama / LM Studio)

Local models run on your own hardware without internet. However, for good ioBroker code generation, models with at least 14B+ parameters are recommended. Small models (7B) often generate incorrect API calls.

- **Ollama**: Set **Base URL** to `http://localhost:11434/v1`, use any string as API key
- **LM Studio**: Set **Base URL** to `http://localhost:1234/v1`

**Note:** The free tier of the OpenAI API (ChatGPT) no longer provides API access for code generation. Consider using Google Gemini (free) or DeepSeek (very affordable) as alternatives.

### Configuration

In the adapter settings under "Main settings", you will find the following fields for AI configuration:

| Setting | Description |
|---------|-------------|
| **ChatGPT API key** | Your API key. Required for all providers. For Ollama you can use any non-empty string (e.g. `ollama`). |
| **Custom API Base URL** | The base URL of your API provider. Leave empty for OpenAI. Examples: `https://generativelanguage.googleapis.com/v1beta/openai` (Google Gemini), `http://localhost:11434/v1` (Ollama). |

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
