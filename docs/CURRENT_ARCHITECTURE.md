# Emergent Intelligence - Current Architecture Documentation
*Last Updated: August 17, 2025*

## 🚨 Critical Architecture Issues

### 1. **Parallel Pathway Violation - Knowledge Base** (RESOLVED - Aug 17, 2025) 
**Status**: ✅ RESOLVED  
**Impact**: High - Complete system non-functionality
**Root Cause**: Two parallel knowledge base systems with conflicting APIs

#### The Problem
- **System A** (knowledge-base-manager.ts): Contains 108 loaded entries, uses `/api/knowledge-base/*` routes
- **System B** (knowledge-base-system.ts): Session-based system, uses `/api/kb/*` routes  
- **Frontend**: Was calling System B routes while data existed in System A

#### What We Thought vs Reality
**Initial Diagnosis**: SessionId consistency issues, frontend display problems
**Actual Problem**: API endpoint routing mismatch between systems
**Why We Missed It**: 
- Focused on sessionId parameters instead of fundamental API route differences
- Assumed frontend display issue rather than backend data source mismatch  
- Server logs showed "108 entries loaded" but didn't correlate this with API endpoints
- Different response structures (results vs entries) masked the routing problem

#### Resolution
- Frontend redirected to use System A endpoints (`/api/knowledge-base/search`)
- API parameter mapping corrected (sessionId, query, type format)
- Cache invalidation updated for correct endpoint paths
- Response structure handling updated (results vs entries vs count vs total)

#### Lesson Learned
**Critical**: Always verify which system holds the actual data before debugging frontend display issues. Two systems can coexist with identical functionality but different API contracts.

### 2. **UI Component Duplication** (ONGOING)
**Problem**: Two separate Knowledge Base implementations violating "single registry" principle
- **System 1**: Full page at `/knowledge-base` route → `KnowledgeBasePage.tsx` → uses `KnowledgeBaseManager.tsx`
- **System 2**: Workstation panel → `KnowledgeBasePanel.tsx` (simplified view)
- **Impact**: Same data has multiple access points instead of unified system
- **User Requirement**: "Single registries for their stuff that humans and AI and tools all go to"
- **Resolution Needed**: Consolidate to one Knowledge Base component used everywhere

### 3. **Layering & Visibility Issues**
**Problem**: AI Workstation getting hidden behind chat interface
- **Original Issue**: When expanded, Workstation overlapped with chat when typing
- **First Fix**: Hidden the Workstation to prevent overlap
- **Current Fix**: Increased z-index from 10 to 50, added bright borders for visibility
- **Controls**: +/- buttons (lines 426-441 in Workstation.tsx) for height adjustment

## System Architecture Overview

### Frontend Layer
```
React + TypeScript + Vite + shadcn/ui + TanStack Query
├── Pages (Routes via Wouter)
│   ├── /                    → Home (main workspace)
│   ├── /knowledge-base      → Full Knowledge Base page
│   ├── /code-analysis       → Code Analysis
│   ├── /diary              → AI Diary
│   ├── /autopoietic        → Autopoietic Diary
│   └── /assistant          → Assistant interface
│
├── Components
│   ├── Workstation.tsx     → AI Workstation (multi-tool container)
│   ├── KnowledgeBaseManager.tsx → Full KB component (page version)
│   ├── KnowledgeBasePanel.tsx  → Simplified KB (workstation version) 
│   ├── AutonomousChat.tsx      → Direct chat with GPT-5
│   ├── ProjectManager.tsx      → Project-based task management
│   └── VoiceWidget.tsx         → ElevenLabs voice interface
│
└── State Management
    ├── TanStack Query for API state
    ├── Local state for UI interactions
    └── Session-based persistence
```

### Backend Layer
```
Node.js + Express + TypeScript
├── Core Routes
│   ├── /api/tasks                → Task management
│   ├── /api/knowledge-base/*     → Knowledge Base operations
│   ├── /api/workstation/*        → AI Workstation control
│   ├── /api/diary/*              → Diary entries
│   └── /api/chat/*               → Chat conversations
│
├── AI Services
│   ├── ai-workstation.ts        → Autonomous AI coordinator
│   ├── autonomous-chat.ts       → GPT-5 chat system
│   ├── autopoietic-diary.ts     → Self-growing diary
│   ├── gpt-diary.ts            → GPT diary with memory
│   └── knowledge-base-manager.ts → Knowledge Base content management
│
└── Storage
    ├── In-memory with JSON persistence
    ├── PostgreSQL ready (Drizzle ORM)
    └── 107 Knowledge Base entries, 433 tasks, 29 blogs
```

## AI Workstation Component Structure

### Operating Modes
1. **Off** - No AI activity
2. **Human** - Manual control only, tracks user actions
3. **Hybrid** - AI assists with 8-second intervals
4. **AI** - Fully autonomous with 3-second intervals

### Available Tools
- **diary** - AI Diary (Brain/Memory) 
- **docs** - Document Management
- **calendar** - Calendar Integration
- **media** - YouTube/Media Player
- **browser** - Web Browser Panel
- **research** - Research Scratchpad
- **knowledge** - Knowledge Base (problematic - dual implementation)

### Control Elements
1. **Mode Toggle** - Cycles through off → human → hybrid → ai
2. **Organize Tasks** - Manual fractal organization trigger
3. **Height Controls** (+/-) - Adjust container by 50px increments (200-600px range)
4. **Layout Toggle** - Solo vs Grid layout
5. **Minimize/Expand** - Collapse to "Mind's Eye" view

## Data Flow & Integration Points

### Voice → Task Creation Flow
```
ElevenLabs Widget → Voice Command → Webhook → 
/api/actions/add_task → Storage → UI Update
```

### Knowledge Base Flow (BROKEN - Dual Path)
```
Path 1: /knowledge-base page → KnowledgeBaseManager → /api/knowledge-base/*
Path 2: Workstation tool → KnowledgeBasePanel → /api/knowledge-base/*
Problem: Same data, different interfaces
```

### AI Thinking Flow
```
Workstation (AI mode) → performAutonomousAiAction() → 
/api/workstation/ai-action → Tool selection → 
Knowledge/Diary/Research generation → UI update
```

## Current System State
- **Tasks**: 433 active tasks
- **Knowledge Base**: 107 entries loaded
- **Diary Entries**: 2340 legacy + enhanced entries
- **Blog Posts**: 29 published
- **AI Memory**: Context length issue (171K vs 128K limit)

## Known Issues & Solutions

### 1. Knowledge Base Display Issue
**Symptoms**: Can't see Knowledge Base entries when clicking button in Workstation
**Root Cause**: Parallel implementations + layering issues
**Solution Applied**: 
- Unified Knowledge Base component (KnowledgeBaseManager used everywhere)
- Increased z-index to 9999 (ensures always on top)
- Changed overflow from 'hidden' to 'visible' (prevents clipping)
- Added ErrorBoundary for better error visibility
- Fixed height adjustment controls

### 2. Chat Window Overlap
**Symptoms**: Workstation hidden when typing in chat
**Root Cause**: Low z-index (10) causing layering conflicts
**Solution**: Increased to z-index: 9999 with position: relative and overflow: visible

### 3. Parallel Pathways (RESOLVED)
**Symptoms**: Different interfaces for same data
**Root Cause**: Violated single registry principle
**Solution Applied**: 
- Consolidated to single KnowledgeBaseManager component
- Created wrapper component for type compatibility
- Both /knowledge-base page and Workstation tool now use same component
- Added error boundaries for debugging visibility

## Development Guidelines

### Self-Diagnostic Framework (6 Steps)
1. **Investigation** - Parse output for truncation/paraphrasing
2. **Diagnostic Report** - Structured analysis before code
3. **Fortify & Enhance** - Rewrite weak sections
4. **Adjust for Drift** - Realign to canonical form
5. **Final Output Policy** - Diagnostic + corrected code
6. **Continuous Improvement** - Integrate lessons learned

### Architecture Principles
1. **Single Registry** - One pathway for humans, AI, and tools
2. **Unified Access** - Same component regardless of access point
3. **Clear Layering** - Proper z-index management
4. **Visibility First** - User must see and interact with all elements
5. **No Parallel Paths** - Avoid duplicate implementations

## File Locations Reference
- **Workstation**: `client/src/components/Workstation.tsx`
- **Knowledge Base Manager**: `client/src/components/KnowledgeBaseManager.tsx`
- **Knowledge Base Panel**: `client/src/components/KnowledgeBasePanel.tsx`
- **Home Page**: `client/src/pages/home.tsx`
- **Knowledge Base Page**: `client/src/pages/KnowledgeBasePage.tsx`
- **App Routes**: `client/src/App.tsx`

## Next Steps
1. ~~Consolidate Knowledge Base implementations~~ ✅ COMPLETED
2. Fix AI memory context length issue
3. ~~Implement proper single registry pattern~~ ✅ COMPLETED
4. ~~Test all layering fixes~~ ✅ COMPLETED
5. Document user workflows
6. Verify Knowledge Base data is properly fetching and displaying