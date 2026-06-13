# Ollama Setup for Claude Code

## Prerequisites
1. Make sure Ollama is installed: https://ollama.com/download
2. Pull your favorite model(s) (e.g., qwen3-coder, llama3.3, etc.)
   ```bash
   ollama pull qwen2.5-coder
   # or
   ollama pull llama3.3
   ```

## Environment Variables
Add these to your `.zshrc` (or project `.env`):

```bash
# Ollama configuration
export ANTHROPIC_BASE_URL=http://localhost:11434/v1  # Note the /v1 suffix!
export ANTHROPIC_API_KEY=ollama                     # Can be any string for Ollama
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_DEFAULT_OPUS_MODEL=qwen2.5-coder
export ANTHROPIC_DEFAULT_SONNET_MODEL=qwen2.5-coder
export ANTHROPIC_DEFAULT_HAIKU_MODEL=qwen2.5-coder
export CLAUDE_CODE_SUBAGENT_MODEL=qwen2.5-coder
```

Then restart your terminal or run:
```bash
source ~/.zshrc
```

## Important Notes
- The key is adding `/v1` to the base URL! Ollama's API is compatible with OpenAI's API format, which uses the `/v1` prefix.
- Claude Code uses the `ANTHROPIC_*` variables, so we just point them to Ollama's server.
- You can use any Ollama model as your "Opus/Sonnet/Haiku" models!
