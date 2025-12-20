# AI Column Type Suggestions - Quick Start

Get AI-powered column type suggestions up and running in 5 minutes!

## 🚀 Quick Setup

### 1. Install Ollama (One-line Install)

**Linux/macOS:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:** Download from [ollama.ai](https://ollama.ai/download)

### 2. Pull a Model
```bash
# Recommended: Best for this task
ollama pull qwen2.5-coder:7b

# Alternative: Faster but less accurate
ollama pull llama3.2:3b
```

### 3. Configure Environment
Create or edit `.env` in your project root:
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:7b
```

### 4. Restart Dev Server
```bash
# Stop current server (Ctrl+C)
pnpm dev  # or npm run dev
```

### 5. Try It Out!
1. Go to any app → Click "Create Table"
2. Add a column with a descriptive name (e.g., `email`, `birth_date`)
3. Click the "✨ Suggest" button
4. Watch the magic happen! ✨

## 📋 Supported Column Types

| Type | Used For | Examples |
|------|----------|----------|
| `text` | Short text | `name`, `email`, `title` |
| `long_text` | Multi-line text | `description`, `bio`, `notes` |
| `number` | Numeric values | `age`, `price`, `quantity` |
| `date` | Dates & times | `created_at`, `birth_date` |
| `switch` | Yes/No values | `is_active`, `enabled` |

## 🎯 How It Works

### With AI (when Ollama is configured):
- Analyzes column name, label, and table context
- Uses LLM to intelligently suggest the best type
- Shows: 🤖 AI: [reason for suggestion]

### Without AI (fallback mode):
- Uses smart pattern matching on column names
- Still provides good suggestions for common patterns
- Shows: 🔍 Pattern matching: [reason]

## 🔧 Common Issues

### "AI service unavailable"
- Check if Ollama is running: `ollama list`
- Verify BASE_URL is correct in `.env`
- Make sure you've pulled a model

### Slow suggestions?
Use a lighter/faster model:
```bash
ollama pull qwen2.5-coder:3b  # Faster than 7B
# or
ollama pull llama3.2:3b       # Very fast
```

### Don't have Ollama installed?
No problem! The system automatically falls back to pattern matching. You'll still get smart suggestions based on column names.

## 📚 Need More Help?

See **[AI_INTEGRATION_SETUP.md](./AI_INTEGRATION_SETUP.md)** for:
- Detailed troubleshooting
- Docker setup
- Remote Ollama configuration
- API reference
- Performance tuning

## 💡 Pro Tips

1. **Name columns descriptively**: `user_email` is better than just `email`
2. **Use table descriptions**: Helps AI understand context
3. **Pattern matters**: `is_*`, `has_*` → boolean; `*_at`, `*_date` → date
4. **Review suggestions**: AI is smart but not perfect - always verify!
5. **Choose the right model**: See [AI_MODEL_RECOMMENDATIONS.md](./AI_MODEL_RECOMMENDATIONS.md)

---

**Need help?** 
- Full setup guide: [AI_INTEGRATION_SETUP.md](./AI_INTEGRATION_SETUP.md)
- Model comparison: [AI_MODEL_RECOMMENDATIONS.md](./AI_MODEL_RECOMMENDATIONS.md)
