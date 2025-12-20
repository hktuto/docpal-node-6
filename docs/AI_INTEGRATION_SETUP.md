# AI Integration Setup Guide

This guide will help you set up AI-powered column type suggestions using Ollama.

## Overview

The application includes an optional AI integration that provides intelligent column type suggestions when creating database tables. When enabled, the AI analyzes column names and context to suggest the most appropriate data type.

**Features:**
- 🤖 AI-powered column type suggestions
- 🔍 Automatic fallback to pattern matching if AI is unavailable
- ⚡ Fast response times with configurable timeout
- 🎯 Context-aware suggestions based on column name, label, and table description

## Prerequisites

- [Ollama](https://ollama.ai/) installed on your system or server
- An LLM model pulled in Ollama (e.g., `llama2`, `mistral`, `codellama`)

## Installation Steps

### 1. Install Ollama

#### On Linux/macOS:
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

#### On Windows:
Download and install from [ollama.ai/download](https://ollama.ai/download)

#### Using Docker:
```bash
docker run -d -p 11434:11434 --name ollama ollama/ollama
```

### 2. Pull an LLM Model

Choose and pull a model based on your needs:

```bash
# Recommended: Best for this task (technical/database understanding)
ollama pull qwen2.5-coder:7b

# Alternative models
ollama pull qwen2.5-coder:3b  # Faster, still excellent
ollama pull mistral           # Good balance of speed and quality
ollama pull llama3.2:3b       # Very fast, good accuracy
ollama pull deepseek-coder    # Excellent for technical content
```

**💡 New to model selection? See [AI_MODEL_RECOMMENDATIONS.md](AI_MODEL_RECOMMENDATIONS.md) for a detailed comparison of all models, including:**
- Performance benchmarks for this specific task
- Hardware requirements
- Speed vs accuracy trade-offs
- Real-world test results

### 3. Verify Ollama is Running

Check if Ollama is accessible:

```bash
curl http://localhost:11434/api/tags
```

You should see a JSON response listing your installed models.

### 4. Configure Environment Variables

Create a `.env` file in your project root (or copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` and add:

```env
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:7b
```

#### Configuration Options:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `OLLAMA_BASE_URL` | The base URL where Ollama is running | `http://localhost:11434` | `http://192.168.1.100:11434` |
| `OLLAMA_MODEL` | The model name to use for suggestions | `qwen2.5-coder:7b` | `mistral`, `llama3.2:3b`, `deepseek-coder` |

**Note:** If these variables are not set, the application will automatically fall back to pattern-matching logic without using AI.

### 5. Restart Your Application

After configuring the environment variables, restart your development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
# or
pnpm dev
```

## Usage

### In the UI

1. Open any app and click "Create Table"
2. Add a new column
3. Enter a column name (e.g., `email`, `birth_date`, `is_active`)
4. Click the **"✨ Suggest"** button next to the Type field
5. The AI will analyze the column name and suggest the best type

### Suggestion Types

The AI can suggest from these column types:

| Type | Description | Example Fields |
|------|-------------|----------------|
| `text` | Short text (single line) | `name`, `email`, `title`, `status` |
| `long_text` | Long text (multi-line) | `description`, `notes`, `bio`, `content` |
| `number` | Numeric values | `age`, `price`, `quantity`, `score` |
| `date` | Date/time values | `created_at`, `birth_date`, `due_date` |
| `switch` | Boolean (yes/no) | `is_active`, `enabled`, `published` |

## Advanced Configuration

### Using a Remote Ollama Server

If Ollama is running on a different machine:

```env
OLLAMA_BASE_URL=http://192.168.1.100:11434
OLLAMA_MODEL=qwen2.5-coder:7b
```

### Using a Different Model

Switch between models easily:

```env
# For best accuracy (recommended)
OLLAMA_MODEL=qwen2.5-coder:7b

# For speed
OLLAMA_MODEL=qwen2.5-coder:3b
OLLAMA_MODEL=llama3.2:3b

# For reliability
OLLAMA_MODEL=mistral

# Custom/fine-tuned model
OLLAMA_MODEL=my-custom-model:latest
```

See [AI_MODEL_RECOMMENDATIONS.md](AI_MODEL_RECOMMENDATIONS.md) for help choosing.

### Docker Compose Setup

If using Docker Compose, add Ollama as a service:

```yaml
services:
  app:
    # your app configuration
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
      - OLLAMA_MODEL=llama2

  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    # Optional: Pre-pull model on container start
    # command: ["ollama", "pull", "qwen2.5-coder:7b"]

volumes:
  ollama_data:
```

## Troubleshooting

### AI Suggestions Not Working

**Check if Ollama is running:**
```bash
curl http://localhost:11434/api/tags
```

**Check if the model is installed:**
```bash
ollama list
```

**Check application logs:**
Look for errors like:
- `"Error calling Ollama"`
- `"AI service unavailable"`

### Slow Response Times

**Use a lighter/faster model:**
```bash
ollama pull qwen2.5-coder:3b  # Fast and still accurate
ollama pull llama3.2:3b       # Very fast
ollama pull llama3.2:1b       # Ultra-fast
```

**Check your hardware:**
- 3B models need ~4GB RAM
- 7B models need ~8GB RAM
- CPU is sufficient, GPU makes it faster

**Adjust timeout in the API:**
Edit `/server/api/ai/suggest-column-type.post.ts` to modify the `timeout` setting (default: 10000ms).

### Fallback Mode

If AI is not configured or unavailable, the system automatically falls back to pattern-matching logic:

- Column names like `is_*`, `has_*`, `enabled` → `switch`
- Column names like `*_date`, `*_at`, `created*` → `date`
- Column names like `price`, `count`, `age`, `quantity` → `number`
- Column names like `description`, `notes`, `content` → `long_text`
- Everything else → `text`

The UI will show whether AI or pattern matching was used:
- 🤖 AI: Using AI-powered suggestion
- 🔍 Pattern matching: Using fallback logic

## Performance Considerations

- **Response Time:** 
  - 3B models: 300ms - 800ms
  - 7B models: 500ms - 1.5s
  - Depends on hardware (CPU/GPU)
- **Timeout:** API calls timeout after 10 seconds, falling back to pattern matching
- **Resource Usage:** 
  - 3B models: ~4GB RAM
  - 7B models: ~8GB RAM
  - 14B+ models: ~16GB RAM
- **Concurrency:** Each request is independent; multiple users can suggest simultaneously

**💡 See [AI_MODEL_RECOMMENDATIONS.md](AI_MODEL_RECOMMENDATIONS.md) for detailed performance benchmarks.**

## Security Notes

- The AI API endpoint does not expose sensitive data
- Only column names and table descriptions are sent to Ollama
- Ollama runs locally by default (no external API calls)
- Configure firewall rules if exposing Ollama on a network

## API Reference

### Endpoint: POST `/api/ai/suggest-column-type`

**Request Body:**
```json
{
  "columnName": "email",
  "columnLabel": "Email Address",
  "tableDescription": "User contact information"
}
```

**Response:**
```json
{
  "suggestedType": "text",
  "confidence": "high",
  "reason": "Email addresses are short text fields",
  "aiEnabled": true
}
```

**Response Fields:**
- `suggestedType`: The suggested column type
- `confidence`: AI confidence level (`high`, `medium`, `low`)
- `reason`: Brief explanation for the suggestion
- `aiEnabled`: Whether AI was used (true) or fallback (false)

## Further Resources

### Project Documentation
- [AI Model Recommendations](AI_MODEL_RECOMMENDATIONS.md) - **Detailed model comparison**
- [AI Quick Start](AI_QUICK_START.md) - 5-minute setup guide
- [Implementation Summary](../IMPLEMENTATION_SUMMARY.md) - Technical details

### External Resources
- [Ollama Documentation](https://github.com/ollama/ollama)
- [Ollama Model Library](https://ollama.ai/library)
- [Qwen2.5-Coder](https://github.com/QwenLM/Qwen2.5-Coder)
- [Nuxt Environment Variables](https://nuxt.com/docs/guide/directory-structure/env)

## Support

If you encounter issues or need help:
1. Check that Ollama is running and accessible
2. Verify environment variables are correctly set
3. Review application logs for error messages
4. Test the API endpoint directly using curl or Postman
