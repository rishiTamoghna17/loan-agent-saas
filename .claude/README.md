# OpenRouter Configuration for Claude Code

## Setup Instructions

1. **Get your OpenRouter API key** from https://openrouter.ai/settings/keys

2. **Add environment variables to your shell profile** (~/.zshrc, ~/.bashrc, or ~/.config/fish/config.fish):

```bash
export OPENROUTER_API_KEY="your-actual-openrouter-api-key"
export ANTHROPIC_BASE_URL="https://openrouter.ai/api"
export ANTHROPIC_AUTH_TOKEN="$OPENROUTER_API_KEY"
export ANTHROPIC_API_KEY=""  # Important: Must be explicitly empty
```

3. **Restart your terminal** or source the file:
   ```bash
   source ~/.zshrc  # or ~/.bashrc
   ```

4. **Verify the setup** by running `/status` inside Claude Code

## Optional: Configure Models

You can also configure which models Claude Code uses:

```bash
export ANTHROPIC_DEFAULT_OPUS_MODEL="anthropic/claude-opus-4.6"
export ANTHROPIC_DEFAULT_SONNET_MODEL="anthropic/claude-sonnet-4.6"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="anthropic/claude-haiku-4.5"
export CLAUDE_CODE_SUBAGENT_MODEL="anthropic/claude-opus-4.6"
```

## Notes

- Your API keys are kept out of git via .gitignore
- If you were previously logged in to Claude Code with Anthropic, run `/logout` to clear cached credentials
