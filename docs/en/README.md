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

Local models run on your own hardware without internet.

**Minimum requirement: 14B parameter models** (e.g. `qwen2.5-coder:14b`). Smaller models (7B/9B) produce unreliable code with incorrect API calls. A GPU with at least 12GB VRAM (e.g. RTX 3060) is recommended for 14B models.

Tested and recommended models:
- `qwen2.5-coder:14b` - Good code quality, runs on 12GB VRAM
- `qwen2.5-coder:32b` - Better quality, requires 24GB+ VRAM

Setup:
- **Ollama**: Set **Base URL** to `http://localhost:11434/v1`, leave API key empty
- **LM Studio**: Set **Base URL** to `http://localhost:1234/v1`, leave API key empty

**Note:** The free tier of the OpenAI API (ChatGPT) no longer provides API access for code generation. Consider using Google Gemini (free) or DeepSeek (very affordable) as alternatives.

### Configuration

In the adapter settings under "AI settings", you will find API key fields for each provider:

| Setting | Description |
|---------|-------------|
| **ChatGPT API key** | API key for OpenAI (platform.openai.com) |
| **Anthropic API key** | API key for Claude (console.anthropic.com) |
| **Gemini API key** | API key for Google Gemini (aistudio.google.com) |
| **DeepSeek API key** | API key for DeepSeek (platform.deepseek.com) |
| **Custom API Base URL** | Base URL for custom providers (e.g. `http://localhost:11434/v1` for Ollama) |
| **Custom API key** | Optional API key for custom providers (Ollama doesn't need one) |

Only enter the keys for providers you want to use. Each provider has its own **Test** button.

### Test API Connection

Each provider has a dedicated **Test** button next to its API key field. The test will:
- Connect to the provider's API endpoint
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
