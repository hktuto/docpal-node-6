# Phase 4.5: AI Assistant (Multi-Phase Feature)

**Status**: 📋 **Planned**  
**Overall Duration**: 6 weeks (across 3 sub-phases)  
**Dependencies**: Phase 4 (Real-time Features) ⚠️ **CRITICAL**  
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

**Key Architecture Decision**: Global AI window in desktop mode that can:
- Track and interact with all open windows
- Perform cross-window operations
- Receive real-time updates via WebSocket for context awareness
- Trigger changes that propagate instantly to all windows

This is a **multi-phase feature** that will be developed incrementally:
- **Phase 4.5.1**: Foundation & Core Functions (Week 1-2)
- **Phase 4.5.2**: Advanced Actions & Intelligence (Week 3-4)
- **Phase 4.5.3**: Proactive AI & Automation (Week 5-6)

---

## Why After Live Updates?

**Phase 4 (Live Updates) is a critical dependency** because:

1. **Real-time Context Awareness**
   - AI subscribes to WebSocket events
   - Knows when users make changes in any window
   - Can provide context-aware suggestions based on live activity
   - Example: "I see you just added a 'Status' column, should I create a Kanban view?"

2. **Instant Feedback Loop**
   - AI creates/modifies structures → Changes appear instantly
   - No need for manual refresh → Better UX
   - Users see AI actions happen in real-time across all windows

3. **Multi-Window Synchronization**
   - Desktop mode can have multiple windows open
   - AI changes in one window → All windows update automatically
   - Prevents confusion and stale data

4. **Collaborative Context**
   - AI can see what other users are doing
   - Provide suggestions based on team activity
   - Avoid conflicts when multiple users work simultaneously

5. **Smarter AI Decisions**
   - Access to real-time activity feed
   - Learn from live user patterns
   - Proactive suggestions based on current activity

---

## Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────┐
│            Frontend (Desktop Mode)               │
├─────────────────────────────────────────────────┤
│ • Global AI Window (DesktopWindow)              │
│ • Active Window Tracker (knows focus)           │
│ • AiChatMessage.vue (message bubbles)           │
│ • AiSuggestionCard.vue (structured suggestions) │
│ • AiActionPreview.vue (confirmation dialogs)    │
│ • useAiAssistant.ts (state management)          │
│ • WebSocket integration for live context        │
└─────────────────────────────────────────────────┘
                       ↕
┌─────────────────────────────────────────────────┐
│                  Backend API                     │
├─────────────────────────────────────────────────┤
│ • POST /api/workspaces/[slug]/ai/chat           │
│ • POST /api/workspaces/[slug]/ai/context        │
│ • GET  /api/workspaces/[slug]/ai/history        │
│ • POST /api/workspaces/[slug]/ai/feedback       │
│ • WebSocket events subscription                 │
└─────────────────────────────────────────────────┘
                       ↕
┌─────────────────────────────────────────────────┐
│                AI Engine Layer                   │
├─────────────────────────────────────────────────┤
│ • Ollama Client (Qwen 2.5 14B)                  │
│ • Function Registry (AI_FUNCTIONS)              │
│ • Context Builder (workspace + live activity)   │
│ • Permission System (safety checks)             │
│ • Action Executor (execute AI commands)         │
│ • Conversation Manager (history + context)      │
│ • WebSocket Event Listener (real-time context)  │
└─────────────────────────────────────────────────┘
```

### Desktop Mode AI Integration

```typescript
// Global AI Window Context
interface AiDesktopContext {
  // Active window tracking
  activeWindow: {
    id: string
    type: 'table' | 'form' | 'dashboard'
    workspaceSlug: string
    tableSlug?: string
    viewId?: string
    url: string
  }
  
  // All open windows
  openWindows: Array<{
    id: string
    title: string
    type: string
    url: string
  }>
  
  // Live activity stream (from WebSocket)
  recentActivity: Array<{
    type: 'table_created' | 'column_added' | 'record_updated'
    userId: string
    userName: string
    timestamp: Date
    data: any
  }>
  
  // User command context
  targetWindow?: string // User can say "in the Company table, ..."
}
```

---

## Phase 4.5.1: Foundation & Core Functions

**Duration**: 2 weeks  
**Status**: 📋 Planning

### Goals

- [x] Design AI assistant architecture ✅
- [ ] Build global AI window in desktop mode
- [ ] Integrate with Ollama (Qwen 2.5 14B)
- [ ] Implement function calling system
- [ ] Create 5-8 core functions
- [ ] Add context awareness (desktop mode)
- [ ] Build confirmation/preview system
- [ ] Implement streaming responses
- [ ] Integrate WebSocket for live context

### Backend Tasks

#### AI Infrastructure
- [ ] Set up Ollama client wrapper (`server/utils/ollama.ts`)
- [ ] Create AI function registry (`server/ai/functions.ts`)
- [ ] Build system prompt templates (`server/ai/prompts.ts`)
- [ ] Implement context builder (`server/ai/context.ts`)
- [ ] Create permission system (`server/ai/permissions.ts`)
- [ ] Add conversation history manager (`server/ai/conversation.ts`)
- [ ] WebSocket event listener for live context (`server/ai/liveContext.ts`)

#### Core AI Functions
- [ ] `createTable` - Create a new table with columns
- [ ] `addColumn` - Add column to existing table
- [ ] `removeColumn` - Remove column from table
- [ ] `updateColumn` - Modify column properties
- [ ] `createFolder` - Create folder in workspace menu
- [ ] `queryData` - Query table data with filters
- [ ] `navigateToWindow` - Open/focus specific window
- [ ] `suggestColumns` - Suggest columns based on table name

#### API Endpoints
- [ ] `POST /api/workspaces/[slug]/ai/chat` - Main chat endpoint
- [ ] `POST /api/workspaces/[slug]/ai/context` - Get current context
- [ ] `GET /api/workspaces/[slug]/ai/history` - Get conversation history
- [ ] `POST /api/workspaces/[slug]/ai/feedback` - User feedback on suggestions
- [ ] `DELETE /api/workspaces/[slug]/ai/history` - Clear history

#### Database Schema
```sql
-- ai_conversations
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
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
  context JSONB, -- Context at time of message (desktop windows, activity)
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
- [ ] `components/app/AiWindow.vue` - Global AI window (desktop mode)
- [ ] `components/app/AiChatMessage.vue` - Message bubble component
- [ ] `components/app/AiSuggestionCard.vue` - Structured suggestion display
- [ ] `components/app/AiActionPreview.vue` - Action confirmation modal
- [ ] `components/app/AiContextPills.vue` - Show current context (active window)
- [ ] `components/app/AiQuickActions.vue` - Quick action buttons

#### Composables
- [ ] `composables/useAiAssistant.ts` - Main AI state management
  - Messages array
  - Send message function
  - Execute action function
  - Conversation history
  - Desktop context tracking
  - WebSocket integration
  - Loading states

#### UI Features
- [ ] Global AI window in desktop mode (resizable, draggable)
- [ ] Message history with scroll
- [ ] Typing indicator
- [ ] Streaming response display
- [ ] Quick action buttons
- [ ] Context pills (show active window, open windows)
- [ ] Action preview/confirmation
- [ ] Error handling & retry
- [ ] Message feedback (thumbs up/down)
- [ ] Window targeting ("work on Company table")

#### Layout Integration
- [ ] Add AI window to desktop mode
- [ ] Add AI shortcut button in desktop toolbar
- [ ] Handle window management
- [ ] Add keyboard shortcuts (e.g., Cmd/Ctrl + K)

### Auto-Trigger Events (with Live Updates)
- [ ] On table created → "What columns should I add?" + live update all windows
- [ ] On empty table → "Want me to suggest a structure?"
- [ ] On first workspace visit → "Hi! I can help you build..."
- [ ] On real-time change detected → "I see someone added X, should I..."
- [ ] On error → "Need help fixing this?"

### Success Criteria

- [ ] User can open AI window in desktop mode
- [ ] User can chat with AI using natural language
- [ ] AI knows which window is active
- [ ] AI can see all open windows
- [ ] AI can create tables with columns → changes appear instantly
- [ ] AI can add/remove/update columns → live update in all windows
- [ ] AI can query data and show results
- [ ] AI can navigate to windows/records
- [ ] All actions require user confirmation
- [ ] Streaming responses work smoothly
- [ ] Context awareness works (knows current window, workspace)
- [ ] Conversation history persists
- [ ] WebSocket integration provides live context

---

## Phase 4.5.2: Advanced Actions & Intelligence

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
- [ ] Add smart suggestions based on live patterns
- [ ] Cross-window operations

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
- [ ] `reorganizeMenu` - Restructure workspace menu
- [ ] `openMultipleWindows` - Open several related windows

#### Analysis & Intelligence
- [ ] `analyzeData` - Generate data insights
- [ ] `suggestRelationships` - Suggest table links
- [ ] `findDuplicates` - Detect duplicate records
- [ ] `validateData` - Check data quality
- [ ] `suggestFormula` - Suggest column formulas
- [ ] `optimizeStructure` - Suggest schema improvements
- [ ] `analyzeActivity` - Analyze real-time activity patterns

#### Automation
- [ ] `createWorkflow` - Set up basic automation
- [ ] `scheduleReport` - Set up scheduled reports
- [ ] `createTemplate` - Save structure as template

### Features

- [ ] Multi-step conversations (AI remembers context)
- [ ] Proactive suggestions based on live user actions
- [ ] Data visualization in chat (charts, tables)
- [ ] Code generation (formulas, scripts)
- [ ] Template library integration
- [ ] Undo/redo for AI actions (leveraging live updates)
- [ ] Batch operation preview
- [ ] Cross-window operations ("Compare Company and Contact tables")

### Success Criteria

- [ ] AI can create complex structures (tables + relationships)
- [ ] AI can analyze data and provide insights
- [ ] AI can create dashboards with widgets
- [ ] AI can suggest optimizations based on live activity
- [ ] Multi-turn conversations work naturally
- [ ] AI provides helpful examples and explanations
- [ ] AI can work across multiple windows

---

## Phase 4.5.3: Proactive AI & Automation

**Duration**: 2 weeks  
**Status**: 📋 Planned

### Goals

- [ ] Learn from user behavior (via activity feed)
- [ ] Provide proactive suggestions
- [ ] Automate repetitive tasks
- [ ] Smart defaults based on patterns
- [ ] Predictive actions
- [ ] Integration with workflows
- [ ] Voice input (optional)
- [ ] Advanced analytics

### Intelligence Features

#### Learning System (Powered by Live Activity)
- [ ] Track user patterns from WebSocket activity stream
- [ ] Learn common workflows
- [ ] Adapt suggestions based on real-time usage
- [ ] Personalize responses per user
- [ ] Company-wide learning (opt-in)

#### Proactive Suggestions
- [ ] "You usually add these columns next..."
- [ ] "Based on your data, consider adding..."
- [ ] "I noticed [issue] (from live activity), want me to fix it?"
- [ ] "Similar companies use [structure]..."
- [ ] "Your data quality score is X, here's how to improve..."
- [ ] "I see you opened 3 related tables, should I create relationships?"

#### Automation
- [ ] Auto-create views based on filters used
- [ ] Auto-suggest workflows for repetitive tasks
- [ ] Auto-optimize queries
- [ ] Auto-fix common errors
- [ ] Auto-generate reports
- [ ] Auto-sync across windows

#### Advanced Analytics
- [ ] Usage analytics from activity feed
- [ ] Data growth predictions
- [ ] Performance optimization suggestions
- [ ] Security and permission recommendations
- [ ] Collaboration pattern analysis (from live activity)

### Optional Enhancements
- [ ] Voice input/output
- [ ] Image upload and analysis
- [ ] Natural language to SQL
- [ ] Integration with external AI models
- [ ] Fine-tuning on company data
- [ ] Custom AI personality

### Success Criteria

- [ ] AI provides relevant proactive suggestions
- [ ] AI learns user preferences from live activity
- [ ] AI can automate repetitive tasks
- [ ] AI provides accurate analytics
- [ ] Users feel AI is genuinely helpful
- [ ] AI suggestions based on real-time context are accurate

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

### System Prompt Template (Desktop Mode)

```typescript
function buildSystemPrompt(context: AiDesktopContext): string {
  return `You are an AI assistant for DocPal, helping users build and manage no-code databases.

DESKTOP MODE - MULTI-WINDOW CONTEXT:
- Active Window: ${context.activeWindow.title} (${context.activeWindow.type})
- Open Windows: ${context.openWindows.length}
  ${context.openWindows.map(w => `  • ${w.title}`).join('\n')}

CURRENT WORKSPACE:
- Workspace: ${context.workspace.name}
- User: ${context.user.name} (${context.user.role})
- Tables in Workspace: ${context.workspaceStructure.tables.length}
  ${context.workspaceStructure.tables.map(t => `  • ${t.name} (${t.rowCount} rows)`).join('\n')}

LIVE ACTIVITY (from WebSocket):
${context.recentActivity.slice(0, 5).map(a => 
  `  • ${a.userName} ${a.type} at ${a.timestamp.toLocaleTimeString()}`
).join('\n')}

CAPABILITIES:
You have access to functions that can:
1. Create/modify tables, columns, folders (changes propagate in real-time)
2. Query and analyze data
3. Create dashboards and views
4. Navigate and manage windows
5. Set up relationships and workflows
6. Analyze live activity patterns

BEHAVIOR GUIDELINES:
1. Be conversational and helpful, not robotic
2. Always confirm before destructive actions
3. Provide examples when helpful
4. Suggest best practices (naming, structure, relationships)
5. Ask clarifying questions if ambiguous
6. Explain what you're doing
7. Consider relationships to existing tables
8. Be aware of live activity and suggest based on context
9. When making changes, inform user they'll see updates in real-time

When users ask to create or modify things, use the appropriate tools.
Always validate that your suggestions make sense for their use case.
Leverage real-time context to provide smarter suggestions.`
}
```

### Function Registry Example (with Live Updates)

```typescript
// server/ai/functions.ts
export const AI_FUNCTIONS = {
  createTable: {
    description: "Create a new table in the current workspace",
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
                enum: ["text", "number", "date", "datetime", "select", "boolean", 
                       "email", "phone", "url", "relation", "lookup", "formula"]
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
      if (!canCreateTable(context.user, context.workspace)) {
        throw new Error("Permission denied")
      }
      
      // Create table with default system columns
      const table = await createTableInWorkspace(context.workspaceId, {
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
      
      // Broadcast via WebSocket - all windows will update automatically
      await broadcastToWorkspace(context.workspaceId, {
        type: 'table_created',
        data: table,
        userId: context.userId
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
          url: `/workspaces/${context.workspaceSlug}/tables/${table.slug}`
        },
        message: `Created table "${table.name}" with ${params.columns?.length || 0} columns. You'll see it appear in real-time!`
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
  deleteWorkspace: 'owner',
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
- Live context integration: <50ms

### Optimization Strategies
- Cache workspace structure (invalidate on WebSocket events)
- Limit conversation history (last 20 messages)
- Use streaming for better perceived performance
- Prefetch common suggestions
- Batch similar operations
- Efficient WebSocket event filtering

### Resource Usage
- Memory: ~8-16GB (Qwen 2.5 14B)
- CPU: High during inference
- GPU: Optional but recommended (10x faster)
- WebSocket: Minimal overhead (<1MB per connection)

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
- [ ] Context builder (including live activity)
- [ ] Response parser
- [ ] Action executor
- [ ] WebSocket event filtering

### Integration Tests
- [ ] Ollama connection
- [ ] Function calling flow
- [ ] Conversation persistence
- [ ] Multi-turn conversations
- [ ] Error handling
- [ ] WebSocket integration

### E2E Tests
- [ ] Complete user workflows
- [ ] Table creation via AI → live update in multiple windows
- [ ] Data querying via AI
- [ ] Dashboard creation via AI
- [ ] Error recovery
- [ ] Multi-window desktop mode scenarios

### AI Quality Tests
- [ ] Response relevance
- [ ] Function calling accuracy
- [ ] Context understanding (including live activity)
- [ ] Multi-step task completion
- [ ] Edge case handling
- [ ] Real-time context awareness

---

## Documentation

### User Documentation
- [ ] AI Assistant user guide (desktop mode)
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
- [ ] WebSocket integration guide

---

## Success Metrics

### Phase 4.5.1 (Foundation)
- 90% of basic commands work correctly
- <3s average response time
- User can create tables and add columns
- Real-time updates work across windows
- Zero critical bugs in production

### Phase 4.5.2 (Advanced)
- 85% of advanced commands work correctly
- Users create 30%+ of tables via AI
- Positive user feedback (>4/5 rating)
- 50% reduction in support tickets
- AI suggestions based on live activity are relevant

### Phase 4.5.3 (Proactive)
- AI suggestions accepted 40%+ of time
- Users feel AI is "helpful" (survey)
- AI catches 60%+ of common errors
- Measurable productivity gains
- Proactive suggestions from live context are accurate 70%+ of time

---

## Risks & Mitigation

### Risks
1. **Ollama latency** → Use streaming, optimize prompts
2. **AI hallucinations** → Strict validation, confirmation system
3. **User confusion** → Clear UI, good examples, tutorials
4. **Resource usage** → Rate limiting, efficient context management
5. **Scope creep** → Strict phase boundaries, MVP first
6. **WebSocket overhead** → Efficient event filtering, connection pooling

### Mitigation Strategies
- Start with template-based suggestions before full AI
- Implement comprehensive testing
- Gather user feedback early and often
- Keep escape hatches (manual mode always available)
- Monitor AI performance and adjust prompts
- Optimize WebSocket event handling

---

## Dependencies

**Required:**
- Ollama running with Qwen 2.5 14B model
- Phase 2 (Auth & Audit Logging) ✅ Complete
- Phase 2.4 (Column Management & Field Types) ✅ Complete
- **Phase 4 (Real-time Features / Live Updates)** ⚠️ **CRITICAL DEPENDENCY**
  - WebSocket infrastructure
  - Activity feed
  - Real-time data updates
  - Multi-window synchronization
- Desktop mode implementation ✅ Complete
- Database schema in place

**Optional:**
- GPU for faster inference
- Vector database for semantic search (future)
- External AI APIs as fallback (future)

---

## Next Steps (After Phase 4 Completion)

1. **Week 1 - Days 1-3:**
   - Set up database schema for AI conversations
   - Create Ollama client wrapper
   - Build function registry with 3 core functions
   - Integrate WebSocket event listener for context
   - Create basic chat API endpoint

2. **Week 1 - Days 4-5:**
   - Build AI window component for desktop mode
   - Implement message display
   - Add basic chat functionality (mock responses)
   - Test streaming responses
   - Add active window tracking

3. **Week 2 - Days 1-2:**
   - Integrate real Ollama responses
   - Implement function calling
   - Add confirmation system
   - Create 5 more core functions
   - Test real-time update integration

4. **Week 2 - Days 3-5:**
   - Polish UI/UX
   - Add context awareness (desktop mode)
   - Implement auto-trigger events
   - Testing and bug fixes
   - Multi-window testing

---

**Dependencies**: Phase 4 (Real-time Features) ⚠️ **CRITICAL** | Phase 2 (Auth) ✅ | Phase 2.4 (Field Types) ✅ | Desktop Mode ✅  
**Blocks**: None (optional enhancement)  
**Next Phase**: Phase 5 (Advanced Features)

---

## Notes

- This is a **foundational feature** that will improve over time
- Start simple, iterate based on feedback
- Keep manual mode always available
- Monitor usage and adjust priorities
- Consider fine-tuning Qwen model on DocPal-specific data later
- **Desktop mode + Live Updates = Game-changing AI experience**
- Real-time context makes AI dramatically smarter and more useful

**Last Updated**: December 23, 2025



