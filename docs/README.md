# DocPal Documentation

This folder contains the essential documentation for the DocPal project.

## 📋 Documentation Files

### [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) (44KB)
**The master plan for the entire project.**

**Contains:**
- Complete 5-phase development roadmap
- Detailed database schemas for each phase
- API endpoint specifications
- Frontend structure and components
- Field type specifications (basic + advanced)
- Audit logging system (Phase 2)
- Workflow engine architecture (Phase 3)
- Activity feed with comments and approvals (Phase 4)
- Timeline estimates and deliverables
- Risk mitigation strategies

**Use this for:**
- Understanding the full project scope
- Implementation guidance
- Technical specifications
- Feature planning

---

### [ARCHITECTURE.md](./ARCHITECTURE.md) (27KB)
**Key architectural decisions and system design.**

**Contains:**
- High-level system architecture
- Database design (two-tier: metadata + dynamic tables)
- Company-prefixed table naming strategy (`dt_[companyId]_[tableId]`)
- Multi-tenancy isolation approach
- Dynamic schema management
- Type system and field mappings
- Query building system
- Context provider pattern (provide/inject)
- Permission system design
- Security considerations
- Performance optimization strategies
- Caching strategy
- Technology decisions and rationale

**Use this for:**
- Understanding why we made specific decisions
- Architectural reference
- Multi-tenancy strategy
- Scalability planning
- Security guidelines

---

## 🎯 Quick Start

For setup instructions, see the main [README.md](../README.md) in the project root.

For detailed phase-by-phase implementation, start with [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md).

---

## 📚 What's NOT Here (Intentionally)

**Removed for simplicity:**
- ~~PHASE_1_TECHNICAL_SPEC.md~~ - Details consolidated into DEVELOPMENT_PLAN.md
- ~~GETTING_STARTED.md~~ - Setup info in main README.md
- ~~MULTI_TENANCY_STRATEGY.md~~ - Key points in ARCHITECTURE.md
- ~~ADVANCED_FIELD_TYPES.md~~ - Implementation details in DEVELOPMENT_PLAN.md

**Reason**: Keep documentation lean and maintainable. All essential information is in the 2 core docs.

---

## 🔄 Documentation Updates

When making changes:

1. **Architecture changes** → Update ARCHITECTURE.md
2. **Feature specs/timeline** → Update DEVELOPMENT_PLAN.md
3. **Setup/quick start** → Update main README.md

Keep these docs **in sync** with actual implementation.

---

## 📖 Reading Order

**For new team members:**
1. Main README.md (project overview)
2. ARCHITECTURE.md (understand the system)
3. DEVELOPMENT_PLAN.md (implementation details)

**For implementation:**
1. DEVELOPMENT_PLAN.md → Find your phase
2. Follow the specifications
3. Reference ARCHITECTURE.md for design decisions

---

## 🎯 Key Features Documented

### Phase 1: Dynamic Tables
- Company-prefixed table naming
- Runtime schema management
- 13 field types (basic + advanced)
- Auto-generated forms and views

### Phase 2: Auth & Audit
- Session-based authentication
- Company management with invitations
- **Audit logging system** (all operations tracked)
- Magic links and invite codes

### Phase 3: Workflows
- Trigger system (record events)
- Action engine (update, create, user forms)
- **Workflow audit integration**
- Execution history

### Phase 4: Real-time & Activity
- WebSocket connections
- User presence tracking
- **Unified activity feed** (audits + comments + workflows)
- **Interactive workflow approvals**
- @mentions and notifications
- Live updates

### Phase 5: Advanced
- Temporal workflows
- Row-level permissions
- Dashboard builder
- Folder system
- Document generation

---

## 💡 Design Principles

1. **Company-First**: Everything scoped to company for multi-tenancy
2. **Dynamic by Default**: Tables, forms, views all runtime-configurable
3. **Physical Tables**: Use real PostgreSQL tables (not JSON) for performance
4. **Audit Everything**: Immutable audit log for compliance
5. **Real-time Collaboration**: Activity feed brings everything together
6. **Progressive Enhancement**: Start simple (Phase 1), add complexity incrementally

---

Last updated: December 2025

