# Claude Code Cheatsheet

## 1. Skills vs MCP Servers
| **Skills** | **MCP Servers** |
| --- | --- |
| Project-specific instructions and workflows | Extend AI's toolbox with external services |
| Just Markdown files in `.claude/skills/` | Require a server process to run |
| Ideal for documenting your project's SOPs | Ideal for browser automation, database access, etc. |
| Example: Your `run-loan-agent-saas` skill | Example: Playwright, Supabase, Vercel |

---

## 2. CLI Commands (Run in Terminal)
| Command | Purpose | Example |
| --- | --- | --- |
| `claude` | Start interactive session | `claude` |
| `claude "query"` | Start with initial prompt | `claude "explain this project"` |
| `claude -c` | Continue last conversation in this dir | `claude -c` |
| `claude update` | Update to latest version | `claude update` |
| `claude auth login` | Log in to Anthropic | `claude auth login` |
| `claude auth logout` | Log out | `claude auth logout` |
| `claude mcp` | Manage MCP servers | `claude mcp list` |
| `claude agents` | List available subagents | `claude agents` |
| `claude project purge` | Clear project state | `claude project purge ./` |

---

## 3. Interactive Slash Commands (Inside Claude Code)
| Command | Purpose |
| --- | --- |
| `/help` | Get help with commands |
| `/status` | Show system status (model, connection, etc.) |
| `/config` | Open settings config |
| `/model` | Change AI model |
| `/mcp` | Manage MCP servers |
| `/init` | Initialize project with `CLAUDE.md` |
| `/clear` | Clear conversation history |
| `/logout` | Log out of Anthropic account |
| `/add-dir` | Add extra working directories |
| `/compact` | Compact conversation |
| `/rewind` | Rewind conversation/code changes |

---

## 4. Keyboard Shortcuts
| Shortcut | Purpose |
| --- | --- |
| `Ctrl+C` | Cancel input/generation |
| `Ctrl+D` | Exit session |
| `Ctrl+O` | Toggle transcript viewer |
| `Ctrl+R` | Reverse search command history |
| `Ctrl+T` | Toggle task list |
| `?` | Show available shortcuts |
