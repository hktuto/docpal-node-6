# Phase 2.5: AI Assistant (Multi-Phase Feature)

**Status**: 🚀 **In Progress**  
**Overall Duration**: 6 weeks (across 3 sub-phases)  
**Started**: Dec 22, 2025  
**Current Progress**: Planning ⏳

---

## Overview

Build a comprehensive AI Assistant powered by self-hosted Ollama (Qwen 2.5 14B) that can help users:
- Get suggestions for table structures
- Create tables, folders, and dashboards via natural language
- Query and analyze data
- Navigate to records
- Automate repetitive tasks
- Learn user patterns and provide proactive suggestions

This is a **multi-phase feature** that will be developed incrementally:
- **Phase 2.5.1**: Foundation & Core Functions (Week 1-2)
- **Phase 2.5.2**: Advanced Actions & Intelligence (Week 3-4)
- **Phase 2.5.3**: Proactive AI & Automation (Week 5-6)

---

## Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────┐
│                  Frontend                        │
├─────────────────────────────────────────────────┤
│ • AiAssistant.vue (sidebar)                     │
│ • AiChatMessage.vue (message bubbles)           │
│ • AiSuggestionCard.vue (structured suggestions) │
│ • AiActionPreview.vue (confirmation dialogs)    │
│ • useAiAssistant.ts (state management)          │
└─────────────────────────────────────────────────┘
                       ↕
┌─────────────────────────────────────────────────┐
│                  Backend API                     │
├─────────────────────────────────────────────────┤
│ • POST /api/apps/[appSlug]/ai/chat              │
│ • POST /api/apps/[appSlug]/ai/context           │
│ • GET  /api/apps/[appSlug]/ai/history           │
│ • POST /api/apps/[appSlug]/ai/feedback          │
└─────────────────────────────────────────────────┘
                       ↕
┌─────────────────────────────────────────────────┐
│                AI Engine Layer                   │
├─────────────────────────────────────────────────┤
│ • Ollama Client (Qwen 2.5 14B)                  │
│ • Function Registry (AI_FUNCTIONS)              │
│ • Context Builder (app structure + user data)   │
│ • Permission System (safety checks)             │
│ • Action Executor (execute AI commands)         │
│ • Conversation Manager (history + context)      │
└─────────────────────────────────────────────────┘
```

---

## Phase 2.5.1: Foundation & Core Functions

**Duration**: 2 weeks  
**Status**: 📋 Planning

### Goals

- [x] Design AI assistant architecture ✅
- [ ] Build collapsible sidebar UI
- [ ] Integrate with Ollama (Qwen 2.5 14B)
- [ ] Implement function calling system
- [ ] Create 5-8 core functions
- [ ] Add context awareness
- [ ] Build confirmation/preview system
- [ ] Implement streaming responses

### Backend Tasks

#### AI Infrastructure
- [ ] Set up Ollama client wrapper (`server/utils/ollama.ts`)
- [ ] Create AI function registry (`server/ai/functions.ts`)
- [ ] Build system prompt templates (`server/ai/prompts.ts`)
- [ ] Implement context builder (`server/ai/context.ts`)
- [ ] Create permission system (`server/ai/permissions.ts`)
- [ ] Add conversation history manager (`server/ai/conversation.ts`)

#### Core AI Functions
- [ ] `createTable` - Create a new table with columns
- [ ] `addColumn` - Add column to existing table
- [ ] `removeColumn` - Remove column from table
- [ ] `updateColumn` - Modify column properties
- [ ] `createFolder` - Create folder in app menu
- [ ] `queryData` - Query table data with filters
- [ ] `navigateToRecord` - Navigate to specific record
- [ ] `suggestColumns` - Suggest columns based on table name

#### API Endpoints
- [ ] `POST /api/apps/[appSlug]/ai/chat` - Main chat endpoint
- [ ] `POST /api/apps/[appSlug]/ai/context` - Get current context
- [ ] `GET /api/apps/[appSlug]/ai/history` - Get conversation history
- [ ] `POST /api/apps/[appSlug]/ai/feedback` - User feedback on suggestions
- [ ] `DELETE /api/apps/[appSlug]/ai/history` - Clear history

#### Database Schema
```sql
-- ai_conversations
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY,
  app_id UUID REFERENCES apps(id),
  user_id UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  title TEXT, -- Generated from first message
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ai_messages
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES ai_conversations(id),
  role TEXT NOT NULL, -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  tool_calls JSONB, -- Function calls made
  tool_results JSONB, -- Results from functions
  context JSONB, -- Context at time of message
  created_at TIMESTAMP DEFAULT NOW()
);

-- ai_actions
CREATE TABLE ai_actions (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES ai_conversations(id),
  message_id UUID REFERENCES ai_messages(id),
  action_type TEXT NOT NULL, -- Function name
  parameters JSONB NOT NULL,
  result JSONB,
  status TEXT, -- 'pending' | 'executed' | 'failed' | 'rejected'
  executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ai_feedback
CREATE TABLE ai_feedback (
  id UUID PRIMARY KEY,
  message_id UUID REFERENCES ai_messages(id),
  user_id UUID REFERENCES users(id),
  rating INTEGER, -- 1-5 or thumbs up/down
  feedback_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Frontend Tasks

#### Components
- [ ] `components/app/AiAssistant.vue` - Main sidebar container
- [ ] `components/app/AiChatMessage.vue` - Message bubble component
- [ ] `components/app/AiSuggestionCard.vue` - Structured suggestion display
- [ ] `components/app/AiActionPreview.vue` - Action confirmation modal
- [ ] `components/app/AiContextPills.vue` - Show current context
- [ ] `components/app/AiQuickActions.vue` - Quick action buttons

#### Composables
- [ ] `composables/useAiAssistant.ts` - Main AI state management
  - Messages array
  - Send message function
  - Execute action function
  - Conversation history
  - Context management
  - Loading states

#### UI Features
- [ ] Collapsible sidebar (slide in/out animation)
- [ ] Message history with scroll
- [ ] Typing indicator
- [ ] Streaming response display
- [ ] Quick action buttons
- [ ] Context pills (show what AI knows)
- [ ] Action preview/confirmation
- [ ] Error handling & retry
- [ ] Message feedback (thumbs up/down)

#### Layout Integration
- [ ] Add AI assistant toggle button in app header
- [ ] Add AI sidebar to app layout
- [ ] Handle responsive design
- [ ] Add keyboard shortcuts (e.g., Cmd/Ctrl + K)

### Auto-Trigger Events
- [ ] On table created → "What columns should I add?"
- [ ] On empty table → "Want me to suggest a structure?"
- [ ] On first app visit → "Hi! I can help you build..."
- [ ] On error → "Need help fixing this?"

### Success Criteria

- [ ] User can open AI assistant sidebar
- [ ] User can chat with AI using natural language
- [ ] AI can create tables with columns
- [ ] AI can add/remove/update columns
- [ ] AI can query data and show results
- [ ] AI can navigate to records
- [ ] All actions require user confirmation
- [ ] Streaming responses work smoothly
- [ ] Context awareness works (knows current app/table)
- [ ] Conversation history persists

---

## Phase 2.5.2: Advanced Actions & Intelligence

**Duration**: 2 weeks  
**Status**: 📋 Planned

### Goals

- [ ] Add 10+ advanced functions
- [ ] Implement dashboard creation
- [ ] Add data analysis capabilities
- [ ] Build relationship management
- [ ] Create bulk operations
- [ ] Add formula suggestions
- [ ] Implement multi-step workflows
- [ ] Add smart suggestions based on patterns

### Advanced AI Functions

#### Data Operations
- [ ] `updateRecord` - Update specific record
- [ ] `deleteRecord` - Delete record (with confirmation)
- [ ] `bulkImport` - Import multiple records
- [ ] `bulkUpdate` - Update multiple records
- [ ] `duplicateTable` - Clone table structure
- [ ] `exportData` - Export data to CSV/JSON

#### Structure Operations
- [ ] `createRelationship` - Link tables together
- [ ] `createView` - Create filtered/sorted view
- [ ] `createDashboard` - Create dashboard with widgets
- [ ] `createWidget` - Add widget to dashboard
- [ ] `updateTableSchema` - Modify multiple columns at once
- [ ] `reorganizeMenu` - Restructure app menu

#### Analysis & Intelligence
- [ ] `analyzeData` - Generate data insights
- [ ] `suggestRelationships` - Suggest table links
- [ ] `findDuplicates` - Detect duplicate records
- [ ] `validateData` - Check data quality
- [ ] `suggestFormula` - Suggest column formulas
- [ ] `optimizeStructure` - Suggest schema improvements

#### Automation
- [ ] `createWorkflow` - Set up basic automation
- [ ] `scheduleReport` - Set up scheduled reports
- [ ] `createTemplate` - Save structure as template

### Features

- [ ] Multi-step conversations (AI remembers context)
- [ ] Proactive suggestions based on user actions
- [ ] Data visualization in chat (charts, tables)
- [ ] Code generation (formulas, scripts)
- [ ] Template library integration
- [ ] Undo/redo for AI actions
- [ ] Batch operation preview

### Success Criteria

- [ ] AI can create complex structures (tables + relationships)
- [ ] AI can analyze data and provide insights
- [ ] AI can create dashboards with widgets
- [ ] AI can suggest optimizations
- [ ] Multi-turn conversations work naturally
- [ ] AI provides helpful examples and explanations

---

## Phase 2.5.3: Proactive AI & Automation

**Duration**: 2 weeks  
**Status**: 📋 Planned

### Goals

- [ ] Learn from user behavior
- [ ] Provide proactive suggestions
- [ ] Automate repetitive tasks
- [ ] Smart defaults based on patterns
- [ ] Predictive actions
- [ ] Integration with workflows
- [ ] Voice input (optional)
- [ ] Advanced analytics

### Intelligence Features

#### Learning System
- [ ] Track user patterns and preferences
- [ ] Learn common workflows
- [ ] Adapt suggestions based on usage
- [ ] Personalize responses per user
- [ ] Company-wide learning (opt-in)

#### Proactive Suggestions
- [ ] "You usually add these columns next..."
- [ ] "Based on your data, consider adding..."
- [ ] "I noticed [issue], want me to fix it?"
- [ ] "Similar companies use [structure]..."
- [ ] "Your data quality score is X, here's how to improve..."

#### Automation
- [ ] Auto-create views based on filters used
- [ ] Auto-suggest workflows for repetitive tasks
- [ ] Auto-optimize queries
- [ ] Auto-fix common errors
- [ ] Auto-generate reports

#### Advanced Analytics
- [ ] Usage analytics and recommendations
- [ ] Data growth predictions
- [ ] Performance optimization suggestions
- [ ] Security and permission recommendations
- [ ] Collaboration pattern analysis

### Optional Enhancements
- [ ] Voice input/output
- [ ] Image upload and analysis
- [ ] Natural language to SQL
- [ ] Integration with external AI models
- [ ] Fine-tuning on company data
- [ ] Custom AI personality

### Success Criteria

- [ ] AI provides relevant proactive suggestions
- [ ] AI learns user preferences
- [ ] AI can automate repetitive tasks
- [ ] AI provides accurate analytics
- [ ] Users feel AI is genuinely helpful

---

## Technical Specifications

### Ollama Integration

```typescript
// server/utils/ollama.ts
import { Ollama } from 'ollama'

const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || 'http://localhost:11434'
})

export async function chatWithAi(
  messages: Message[],
  tools: Tool[],
  stream: boolean = true
) {
  return await ollama.chat({
    model: process.env.OLLAMA_MODEL || 'qwen2.5:14b',
    messages,
    tools,
    stream,
    options: {
      temperature: 0.7,
      top_p: 0.9,
      num_ctx: 8192, // Context window
    }
  })
}
```

### System Prompt Template

```typescript
function buildSystemPrompt(context: AiContext): string {
  return `You are an AI assistant for DocPal, helping users build and manage no-code databases.

CURRENT CONTEXT:
- App: ${context.app.name} (${context.app.description || 'No description'})
- User: ${context.user.name} (${context.user.role})
- Current Page: ${context.currentPage}
- Tables in App: ${context.appStructure.tables.length}
  ${context.appStructure.tables.map(t => `  • ${t.name} (${t.rowCount} rows)`).join('\n')}

CAPABILITIES:
You have access to functions that can:
1. Create/modify tables, columns, folders
2. Query and analyze data
3. Create dashboards and views
4. Navigate the interface
5. Set up relationships and workflows

BEHAVIOR GUIDELINES:
1. Be conversational and helpful, not robotic
2. Always confirm before destructive actions
3. Provide examples when helpful
4. Suggest best practices (naming, structure, relationships)
5. Ask clarifying questions if ambiguous
6. Explain what you're doing
7. When creating structures, consider relationships to existing tables

When users ask to create or modify things, use the appropriate tools.
Always validate that your suggestions make sense for their use case.`
}
```

### Function Registry Example

```typescript
// server/ai/functions.ts
export const AI_FUNCTIONS = {
  createTable: {
    description: "Create a new table in the current app",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Table name (user-friendly, will be slugified)"
        },
        description: {
          type: "string",
          description: "Optional description of the table's purpose"
        },
        columns: {
          type: "array",
          description: "Initial columns to create",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: { 
                type: "string", 
                enum: ["text", "number", "date", "select", "boolean", "email", "phone", "url"]
              },
              required: { type: "boolean", default: false }
            }
          }
        }
      },
      required: ["name"]
    },
    handler: async (params, context) => {
      // Validate user permissions
      if (!canCreateTable(context.user, context.app)) {
        throw new Error("Permission denied")
      }
      
      // Create table with default system columns
      const table = await createTableInApp(context.appId, {
        name: params.name,
        description: params.description,
        columns: [
          // System columns (always included)
          { name: 'id', type: 'uuid', system: true },
          { name: 'created_at', type: 'timestamp', system: true },
          { name: 'updated_at', type: 'timestamp', system: true },
          // User columns
          ...(params.columns || [])
        ]
      })
      
      // Audit log
      await auditLog({
        action: 'ai_create_table',
        entityType: 'table',
        entityId: table.id,
        userId: context.userId,
        companyId: context.companyId,
        changes: { after: params }
      })
      
      return {
        success: true,
        table: {
          id: table.id,
          name: table.name,
          slug: table.slug,
          url: `/apps/${context.appSlug}/tables/${table.slug}`
        },
        message: `Created table "${table.name}" with ${params.columns?.length || 0} columns`
      }
    }
  }
  // ... more functions
}
```

### Permission System

```typescript
// server/ai/permissions.ts
export const AI_PERMISSIONS = {
  // Read operations - always allowed
  queryData: 'allow',
  getTableSchema: 'allow',
  searchRecords: 'allow',
  analyzeData: 'allow',
  
  // Write operations - need confirmation in UI
  createTable: 'confirm',
  addColumn: 'confirm',
  updateColumn: 'confirm',
  createFolder: 'confirm',
  updateRecord: 'confirm',
  
  // Destructive operations - explicit confirmation required
  deleteTable: 'explicit',
  deleteColumn: 'explicit',
  deleteRecord: 'explicit',
  bulkDelete: 'explicit',
  
  // Admin operations - role check
  changePermissions: 'admin',
  inviteUser: 'admin',
  deleteApp: 'owner',
}

export async function checkPermission(
  user: User,
  action: string,
  context: AiContext
): Promise<'allow' | 'confirm' | 'deny'> {
  const permission = AI_PERMISSIONS[action]
  
  if (permission === 'allow') return 'allow'
  if (permission === 'confirm' || permission === 'explicit') return 'confirm'
  
  // Role-based checks
  if (permission === 'admin' && !['owner', 'admin'].includes(user.role)) {
    return 'deny'
  }
  if (permission === 'owner' && user.role !== 'owner') {
    return 'deny'
  }
  
  return 'allow'
}
```

---

## Configuration

### Environment Variables

```bash
# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen2.5:14b
OLLAMA_TIMEOUT=30000

# AI Features
AI_ENABLED=true
AI_MAX_CONTEXT_TOKENS=8192
AI_MAX_HISTORY_MESSAGES=20
AI_STREAMING=true

# Safety
AI_REQUIRE_CONFIRMATION=true
AI_RATE_LIMIT_PER_MINUTE=20
AI_RATE_LIMIT_PER_DAY=500
```

---

## Performance Considerations

### Response Times (Expected)
- Simple queries: 1-3 seconds
- Complex operations: 3-8 seconds
- Streaming: 20-40 tokens/second
- Context building: <100ms

### Optimization Strategies
- Cache app structure (invalidate on schema changes)
- Limit conversation history (last 20 messages)
- Use streaming for better perceived performance
- Prefetch common suggestions
- Batch similar operations

### Resource Usage
- Memory: ~8-16GB (Qwen 2.5 14B)
- CPU: High during inference
- GPU: Optional but recommended (10x faster)

---

## Security & Safety

### Safety Measures
- All destructive actions require explicit confirmation
- Permission checks before execution
- Audit all AI actions
- Rate limiting per user
- Validation of AI-generated code
- Sandbox for testing formulas
- Dry-run mode for bulk operations

### Privacy
- All processing on self-hosted Ollama
- No data sent to external APIs
- Conversation history encrypted
- Option to disable learning
- Company data isolation

---

## Testing Strategy

### Unit Tests
- [ ] AI function registry
- [ ] Permission system
- [ ] Context builder
- [ ] Response parser
- [ ] Action executor

### Integration Tests
- [ ] Ollama connection
- [ ] Function calling flow
- [ ] Conversation persistence
- [ ] Multi-turn conversations
- [ ] Error handling

### E2E Tests
- [ ] Complete user workflows
- [ ] Table creation via AI
- [ ] Data querying via AI
- [ ] Dashboard creation via AI
- [ ] Error recovery

### AI Quality Tests
- [ ] Response relevance
- [ ] Function calling accuracy
- [ ] Context understanding
- [ ] Multi-step task completion
- [ ] Edge case handling

---

## Documentation

### User Documentation
- [ ] AI Assistant user guide
- [ ] Example conversations
- [ ] Best practices
- [ ] Troubleshooting guide
- [ ] FAQ

### Developer Documentation
- [ ] AI architecture overview
- [ ] Adding new functions
- [ ] Prompt engineering guide
- [ ] Testing AI features
- [ ] Performance optimization

---

## Success Metrics

### Phase 2.5.1 (Foundation)
- 90% of basic commands work correctly
- <3s average response time
- User can create tables and add columns
- Zero critical bugs in production

### Phase 2.5.2 (Advanced)
- 85% of advanced commands work correctly
- Users create 30%+ of tables via AI
- Positive user feedback (>4/5 rating)
- 50% reduction in support tickets

### Phase 2.5.3 (Proactive)
- AI suggestions accepted 40%+ of time
- Users feel AI is "helpful" (survey)
- AI catches 60%+ of common errors
- Measurable productivity gains

---

## Risks & Mitigation

### Risks
1. **Ollama latency** → Use streaming, optimize prompts
2. **AI hallucinations** → Strict validation, confirmation system
3. **User confusion** → Clear UI, good examples, tutorials
4. **Resource usage** → Rate limiting, efficient context management
5. **Scope creep** → Strict phase boundaries, MVP first

### Mitigation Strategies
- Start with template-based suggestions before full AI
- Implement comprehensive testing
- Gather user feedback early and often
- Keep escape hatches (manual mode always available)
- Monitor AI performance and adjust prompts

---

## Dependencies

**Required:**
- Ollama running with Qwen 2.5 14B model
- Phase 2 (Auth & Audit Logging) ✅ Complete
- **Phase 2.4 (Column Management & Field Types)** ⚠️ **CRITICAL** - AI needs variety of field types to suggest
- Database schema in place

**Optional:**
- GPU for faster inference
- Vector database for semantic search (future)
- External AI APIs as fallback (future)

---

## Next Steps (Immediate)

1. **Week 1 - Days 1-3:**
   - Set up database schema for AI conversations
   - Create Ollama client wrapper
   - Build function registry with 3 core functions
   - Create basic chat API endpoint

2. **Week 1 - Days 4-5:**
   - Build AI assistant sidebar UI
   - Implement message display
   - Add basic chat functionality (mock responses)
   - Test streaming responses

3. **Week 2 - Days 1-2:**
   - Integrate real Ollama responses
   - Implement function calling
   - Add confirmation system
   - Create 5 more core functions

4. **Week 2 - Days 3-5:**
   - Polish UI/UX
   - Add context awareness
   - Implement auto-trigger events
   - Testing and bug fixes

---

**Dependencies**: Phase 2 (Auth & Audit Logging) ✅ | Phase 2.4 (Column Management & Field Types) ⚠️ **Required**  
**Blocks**: None (optional enhancement)  
**Next Phase**: Phase 1.5 (Table Enhancements - Views & Bulk Operations) or Phase 3 (Workflows)

---

## Notes

- This is a **foundational feature** that will improve over time
- Start simple, iterate based on feedback
- Keep manual mode always available
- Monitor usage and adjust priorities
- Consider fine-tuning Qwen model on DocPal-specific data later

**Last Updated**: December 22, 2025

