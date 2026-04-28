import { describe, it, expect } from 'vitest';
import { isChatModel } from '../AiChatService';

describe('isChatModel', () => {
    describe('accepts common chat models', () => {
        const chatModels = [
            // OpenAI GPT family
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-4-turbo',
            'gpt-4',
            'gpt-4.1',
            'gpt-4.1-mini',
            'gpt-4.1-nano',
            'gpt-5',
            'gpt-5-mini',
            'gpt-5-nano',
            'gpt-5-pro',
            'gpt-5-chat-latest',
            'gpt-5.1',
            'gpt-5.1-chat-latest',
            'gpt-5.2',
            'gpt-5.2-pro',
            'gpt-5.3-chat-latest',
            'gpt-5.4',
            'gpt-5.4-pro',
            'gpt-3.5-turbo',
            'gpt-3.5-turbo-16k',
            // OpenAI reasoning (o1/o3/o4)
            'o1',
            'o1-preview',
            'o1-mini',
            'o3',
            'o3-mini',
            'o4-mini',
            // OpenAI codex (specialized code, still chat-capable)
            'gpt-5-codex',
            'gpt-5.1-codex',
            'gpt-5.1-codex-max',
            'gpt-5.1-codex-mini',
            'gpt-5.2-codex',
            'gpt-5.3-codex',
            // Anthropic
            'claude-3-5-sonnet-20241022',
            'claude-3-5-haiku-20241022',
            'claude-3-opus-20240229',
            'claude-sonnet-4-5',
            'claude-opus-4-7',
            // Gemini (text chat variants)
            'gemini-2.5-flash',
            'gemini-2.5-flash-lite',
            'gemini-2.5-pro',
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
            'gemini-1.5-pro',
            'gemini-3-flash-preview',
            'gemini-3-pro-preview',
            'gemini-3.1-flash-lite-preview',
            'gemini-3.1-pro-preview',
            'gemini-3.1-pro-preview-customtools',
            'gemini-flash-latest',
            'gemini-flash-lite-latest',
            'gemini-pro-latest',
            // Google Gemma (instruction-tuned, chat-capable)
            'gemma-3-1b-it',
            'gemma-3-4b-it',
            'gemma-3-12b-it',
            'gemma-3-27b-it',
            'gemma-3n-e2b-it',
            'gemma-3n-e4b-it',
            'gemma-4-26b-a4b-it',
            'gemma-4-31b-it',
            // DeepSeek
            'deepseek-chat',
            'deepseek-coder',
            'deepseek-reasoner',
            // Local / Ollama
            'qwen2.5-coder:14b',
            'qwen2.5-coder:32b',
            'llama3.2:8b',
            'llama3.1:70b',
            'mistral:7b',
            'mixtral:8x7b',
            'codellama:13b',
            'phi3:medium',
            'gemma2:9b',
            // Ollama vision / multimodal chat families (keep accepted!)
            'llava',
            'llava:13b',
            'llava-llama3',
            'llava-phi3',
            'bakllava',
            'moondream',
            'minicpm-v',
            'qwen2.5vl',
            'qwen3-vl',
            'llama3.2-vision',
            'llama3.2-vision:11b',
            'llama3.2-vision:90b',
        ];

        chatModels.forEach(model => {
            it(`accepts "${model}"`, () => {
                expect(isChatModel(model)).toBe(true);
            });
        });
    });

    describe('rejects embedding models', () => {
        const embeddingModels = [
            'text-embedding-3-small',
            'text-embedding-3-large',
            'text-embedding-ada-002',
            'textembedding-gecko',
            'bge-large-en',
            'bge-large',
            'bge-m3',
            'nomic-embed-text',
            'nomic-embed-text-v2-moe',
            'mxbai-embed-large',
            'snowflake-arctic-embed',
            'snowflake-arctic-embed2',
            'all-minilm-l6-v2',
            'all-minilm',
            'multilingual-e5-large',
            'jina-embeddings-v2',
            'voyage-3',
            'embedding-001',
            // Ollama-specific embedding models
            'qwen3-embedding',
            'embeddinggemma',
            'granite-embedding',
            'paraphrase-multilingual',
        ];

        embeddingModels.forEach(model => {
            it(`rejects "${model}"`, () => {
                expect(isChatModel(model)).toBe(false);
            });
        });
    });

    describe('rejects image generation / editing models', () => {
        const imageModels = [
            'dall-e-3',
            'dall-e-2',
            'gpt-image-1',
            'image-edit-01',
            'stable-diffusion-xl',
            'sdxl-turbo',
            'midjourney-v6',
            'flux-pro',
            'flux-dev',
            'imagen-3',
            // Gemini image variants
            'gemini-2.5-flash-image',
            'gemini-3-pro-image-preview',
            'gemini-3.1-flash-image-preview',
            // Google image-editor codenames
            'nano-banana-pro-preview',
        ];

        imageModels.forEach(model => {
            it(`rejects "${model}"`, () => {
                expect(isChatModel(model)).toBe(false);
            });
        });
    });

    describe('rejects music generation models', () => {
        const musicModels = ['lyria-3-clip-preview', 'lyria-3-pro-preview'];

        musicModels.forEach(model => {
            it(`rejects "${model}"`, () => {
                expect(isChatModel(model)).toBe(false);
            });
        });
    });

    describe('rejects video generation models', () => {
        const videoModels = ['sora-1.0', 'veo-2', 'cogvideox-5b', 'runway-gen3', 'lumiere-v1'];

        videoModels.forEach(model => {
            it(`rejects "${model}"`, () => {
                expect(isChatModel(model)).toBe(false);
            });
        });
    });

    describe('rejects audio / speech / realtime / transcribe models', () => {
        const audioModels = [
            'whisper-1',
            'whisper-large-v3',
            'tts-1',
            'tts-1-hd',
            'speech-01',
            'gpt-4o-audio-preview',
            'gpt-4o-realtime-preview',
            'gpt-4o-mini-tts',
            'gpt-4o-mini-transcribe',
            'gpt-4o-transcribe',
            'gpt-4o-transcribe-diarize',
            'bark-small',
            'xtts-v2',
            // OpenAI gpt-audio family
            'gpt-audio',
            'gpt-audio-1.5',
            'gpt-audio-2025-08-28',
            'gpt-audio-mini',
            'gpt-audio-mini-2025-10-06',
            'gpt-audio-mini-2025-12-15',
            // Gemini TTS / native audio / live
            'gemini-2.5-flash-preview-tts',
            'gemini-2.5-pro-preview-tts',
            'gemini-2.5-flash-native-audio-latest',
            'gemini-3.1-flash-live-preview',
        ];

        audioModels.forEach(model => {
            it(`rejects "${model}"`, () => {
                expect(isChatModel(model)).toBe(false);
            });
        });
    });

    describe('rejects moderation / safety classifiers', () => {
        const moderationModels = [
            'text-moderation-latest',
            'omni-moderation-latest',
            'llama-guard-3-8b',
            'llama-guard3',
            'shieldgemma-2b',
            'prompt-guard-86m',
            // Ollama: granite3-guardian, gpt-oss-safeguard
            'granite3-guardian',
            'granite3-guardian-8b',
            'gpt-oss-safeguard',
        ];

        moderationModels.forEach(model => {
            it(`rejects "${model}"`, () => {
                expect(isChatModel(model)).toBe(false);
            });
        });
    });

    describe('rejects Ollama single-task / specialty models', () => {
        const specialtyModels = [
            'reader-lm', // HTML to Markdown
            'reader-lm-v2',
            'duckdb-nsql', // text-to-SQL
            'duckdb-nsql-7b',
            'bespoke-minicheck', // fact-checking classifier
        ];

        specialtyModels.forEach(model => {
            it(`rejects "${model}"`, () => {
                expect(isChatModel(model)).toBe(false);
            });
        });
    });

    describe('rejects reranker models', () => {
        const rerankerModels = ['rerank-english-v3.0', 'bge-reranker-v2-m3', 'jina-reranker-v2'];

        rerankerModels.forEach(model => {
            it(`rejects "${model}"`, () => {
                expect(isChatModel(model)).toBe(false);
            });
        });
    });

    describe('rejects legacy OpenAI GPT-3 completion models', () => {
        const legacyModels = [
            'babbage-002',
            'davinci-002',
            'curie-001',
            'text-davinci-003',
            'text-davinci-002',
            'text-curie-001',
            'text-babbage-001',
            'text-ada-001',
            'code-davinci-002',
            'code-cushman-001',
            // turbo-instruct (legacy completion, no chat/tool calling)
            'gpt-3.5-turbo-instruct',
            'gpt-3.5-turbo-instruct-0914',
        ];

        legacyModels.forEach(model => {
            it(`rejects "${model}"`, () => {
                expect(isChatModel(model)).toBe(false);
            });
        });
    });

    describe('rejects web search / browsing-only endpoints', () => {
        const searchModels = [
            'gpt-4o-search-preview',
            'gpt-4o-search-preview-2025-03-11',
            'gpt-4o-mini-search-preview',
            'gpt-4o-mini-search-preview-2025-03-11',
            'gpt-5-search-api',
            'gpt-5-search-api-2025-10-14',
        ];

        searchModels.forEach(model => {
            it(`rejects "${model}"`, () => {
                expect(isChatModel(model)).toBe(false);
            });
        });
    });

    describe('rejects legacy search / similarity endpoints', () => {
        const searchModels = ['code-search-babbage-001', 'text-search-ada-001', 'similarity-babbage-001'];

        searchModels.forEach(model => {
            it(`rejects "${model}"`, () => {
                expect(isChatModel(model)).toBe(false);
            });
        });
    });

    describe('rejects specialty / deprecated models', () => {
        const specialtyModels = [
            'computer-use-preview-2024-10-22',
            'deep-research-pro-preview-12-2025',
            'gemini-robotics-er-1.5-preview',
            'gemini-robotics-er-1.6-preview',
            'aqa',
            'claude-1.3',
            'claude-1-100k',
            'claude-instant-1.2',
            'claude-instant-v1',
        ];

        specialtyModels.forEach(model => {
            it(`rejects "${model}"`, () => {
                expect(isChatModel(model)).toBe(false);
            });
        });
    });

    describe('case-insensitive matching', () => {
        it('rejects upper-case variants of embedding keywords', () => {
            expect(isChatModel('Text-Embedding-3-Small')).toBe(false);
            expect(isChatModel('TEXT-EMBEDDING-ADA-002')).toBe(false);
            expect(isChatModel('BGE-Large-EN')).toBe(false);
        });

        it('rejects upper-case variants of image keywords', () => {
            expect(isChatModel('DALL-E-3')).toBe(false);
            expect(isChatModel('Stable-Diffusion-XL')).toBe(false);
        });

        it('accepts upper-case variants of chat keywords', () => {
            expect(isChatModel('GPT-4o')).toBe(true);
            expect(isChatModel('Claude-3-5-Sonnet')).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('handles empty string', () => {
            expect(isChatModel('')).toBe(true);
        });

        it('handles provider-prefixed model names (OpenRouter style)', () => {
            expect(isChatModel('openai/gpt-4o')).toBe(true);
            expect(isChatModel('anthropic/claude-3-5-sonnet')).toBe(true);
            expect(isChatModel('google/gemini-pro-1.5')).toBe(true);
            expect(isChatModel('openai/text-embedding-3-small')).toBe(false);
        });

        it('"aqa" keyword does not over-match similar-looking names (aqua ≠ aqa as substring)', () => {
            // "aqa" = a-q-a; "aqua" = a-q-u-a. The former is NOT a substring of the latter,
            // so filtering "aqa" safely excludes the Gemini AQA model without rejecting "aqua".
            expect(isChatModel('llama3.2:aqua')).toBe(true);
            expect(isChatModel('aqa')).toBe(false);
        });

        it('does not over-match common chat-model name fragments', () => {
            expect(isChatModel('gpt-4o-mini')).toBe(true);
            expect(isChatModel('llama3-chat')).toBe(true);
            expect(isChatModel('gemini-flash-latest')).toBe(true);
            // "instruct" substring alone must NOT reject — only "-turbo-instruct" is filtered.
            // (Gemma "-it" stands for instruction-tuned and remains a chat model.)
            expect(isChatModel('gemma-3-12b-it')).toBe(true);
        });

        it('treats "embed-" and "-embed" substrings as embeddings', () => {
            expect(isChatModel('embed-english-v3')).toBe(false);
            expect(isChatModel('foo-embed-bar')).toBe(false);
            expect(isChatModel('cohere-embed-v3')).toBe(false);
        });

        it('rejects Claude 1.x / instant but accepts Claude 2/3/4', () => {
            expect(isChatModel('claude-1')).toBe(false);
            expect(isChatModel('claude-1.3')).toBe(false);
            expect(isChatModel('claude-instant-1')).toBe(false);
            expect(isChatModel('claude-2')).toBe(true);
            expect(isChatModel('claude-3-opus')).toBe(true);
            expect(isChatModel('claude-opus-4-7')).toBe(true);
        });
    });
});
