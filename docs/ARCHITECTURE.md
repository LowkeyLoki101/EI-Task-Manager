# Emergent Task Builder - Technical Architecture Documentation

## Project Overview
A comprehensive AI-powered project management platform featuring voice integration, real-time chat, task management, research capabilities, file handling, and shared knowledge base. Built with React/TypeScript frontend, Node.js/Express backend, PostgreSQL database schema (currently using in-memory storage), and extensive AI integrations.

## File Structure & Component Architecture

```
📁 emergent-task-builder/
│
├── 📁 client/                              # React TypeScript Frontend
│   └── 📁 src/
│       ├── 📁 components/                  # React Components
│       │   ├── 📄 DirectChatInterface.tsx  # CORE: Voice + Text Chat Interface
│       │   │   ├── Connects to: /api/transcribe, /api/chat/process
│       │   │   ├── Features: MediaRecorder API, FormData uploads, real-time messaging
│       │   │   ├── Audio: MP4/WebM recording → OpenAI Whisper transcription
│       │   │   └── State: Session management, message history, file uploads
│       │   │
│       │   ├── 📄 KnowledgeBaseManager.tsx # Knowledge Base UI Component
│       │   │   ├── Connects to: /api/knowledge-base/*, ElevenLabs KB API
│       │   │   ├── Features: File upload (PDF/TXT/DOCX/HTML/EPUB), bi-directional sync
│       │   │   └── State: Document management, search functionality
│       │   │
│       │   ├── 📄 TaskManager.tsx           # Task Management Interface  
│       │   │   ├── Connects to: /api/tasks, /api/steps, /api/artifacts
│       │   │   ├── Features: CRUD operations, drag-drop, context filtering
│       │   │   └── State: Task lists, status updates, priority management
│       │   │
│       │   ├── 📄 ProjectSwitcher.tsx      # Project Context Management
│       │   │   ├── Connects to: /api/projects, project-context system
│       │   │   └── Features: Project switching, context preservation
│       │   │
│       │   └── 📁 ui/                      # shadcn/ui Component Library
│       │       ├── 📄 button.tsx, dialog.tsx, form.tsx, input.tsx
│       │       └── Purpose: Consistent UI components with Tailwind CSS
│       │
│       ├── 📁 pages/                       # Application Pages (Wouter Router)
│       │   ├── 📄 assistant.tsx            # Main Chat Interface Page
│       │   ├── 📄 tasks.tsx                # Task Management Page
│       │   ├── 📄 projects.tsx             # Project Management Page
│       │   ├── 📄 calendar.tsx             # Calendar Integration Page
│       │   ├── 📄 knowledge-base.tsx       # Knowledge Base Management Page
│       │   └── 📄 home.tsx                 # Dashboard/Landing Page
│       │
│       ├── 📁 lib/                         # Utility Libraries
│       │   ├── 📄 queryClient.ts           # TanStack Query Configuration
│       │   │   ├── Purpose: API state management, caching, mutations
│       │   │   └── Features: Optimistic updates, error handling, cache invalidation
│       │   │
│       │   └── 📄 utils.ts                 # Utility Functions
│       │       └── Purpose: Common helpers, type guards, formatting
│       │
│       ├── 📄 App.tsx                      # MAIN: Root Application Component
│       │   ├── Features: Routing (Wouter), theme provider, query client setup
│       │   └── Connects to: All page components, global state
│       │
│       └── 📄 main.tsx                     # Application Entry Point
│           └── Purpose: React DOM rendering, Vite integration
│
├── 📁 server/                              # Node.js Express Backend
│   ├── 📄 index.ts                         # SERVER ENTRY: Main server bootstrap
│   │   ├── Purpose: Express app setup, middleware registration, server startup
│   │   ├── Features: CORS, session management, static file serving
│   │   └── Connects to: All route modules, Vite dev server integration
│   │
│   ├── 📄 routes.ts                        # PRIMARY ROUTES: Main API endpoints
│   │   ├── Endpoints: /api/tasks, /api/steps, /api/conversations, /api/status
│   │   ├── Features: CRUD operations, file uploads, status diagnostics
│   │   ├── Connects to: storage.ts, OpenAI API, project-context.ts
│   │   └── Dependencies: Multer (files), Zod (validation), OpenAI SDK
│   │
│   ├── 📄 elevenlabs-actions.ts           # ELEVENLABS INTEGRATION: Actions API
│   │   ├── Endpoints: /api/actions/* (add_task, update_step, get_todo_list, etc.)
│   │   ├── Purpose: Voice command processing → task creation workflow
│   │   ├── Features: 18 action endpoints, Zod validation, session management
│   │   ├── Connects to: storage.ts, ElevenLabs webhook system
│   │   └── Data Flow: ElevenLabs voice → NLP → action selection → API call
│   │
│   ├── 📄 enhanced-actions.ts             # ADVANCED ACTIONS: SDK integration
│   │   ├── Features: File operations, voice synthesis, complex workflows
│   │   ├── Connects to: ElevenLabs TTS SDK, storage operations
│   │   └── Purpose: Extended action library for voice responses
│   │
│   ├── 📄 transcription.ts                # AUDIO PROCESSING: Speech-to-text
│   │   ├── Endpoint: /api/transcribe
│   │   ├── Features: Multer file uploads, OpenAI Whisper integration
│   │   ├── Audio Formats: MP4, WebM, WAV, M4A (auto-detection)
│   │   ├── Process: MediaRecorder → FormData → Temporary file → Whisper → Cleanup
│   │   └── Security: File validation, size limits (25MB), immediate deletion
│   │
│   ├── 📄 knowledge-base.ts               # KNOWLEDGE BASE: Document management
│   │   ├── Endpoints: /api/knowledge-base/* (upload, search, sync)
│   │   ├── Features: ElevenLabs KB API integration, bi-directional sync
│   │   ├── File Types: PDF, TXT, DOCX, HTML, EPUB processing
│   │   └── Connects to: ElevenLabs Knowledge Base, local storage
│   │
│   ├── 📄 project-context.ts              # PROJECT MANAGEMENT: Context switching
│   │   ├── Features: Project-aware conversations, context preservation
│   │   ├── AI Integration: GPT-5 project context management
│   │   └── Purpose: Maintains project focus across sessions
│   │
│   ├── 📄 colby-actions.ts                # COLBY ACTIONS: Comprehensive toolset
│   │   ├── Features: 25+ specialized actions for voice commands
│   │   ├── Purpose: Extended capabilities beyond basic task management
│   │   └── Connects to: All major system components
│   │
│   ├── 📄 sharing-system.ts               # SHARING & TINKER: Extensibility
│   │   ├── Features: Shareable links, tinker framework, custom widgets
│   │   ├── Purpose: Component system for custom automations
│   │   └── Connects to: Task system, project management
│   │
│   └── 📄 storage.ts                      # DATA LAYER: Storage abstraction
│       ├── Interface: IStorage (CRUD operations for all entities)
│       ├── Implementation: MemStorage (in-memory with JSON persistence)
│       ├── Entities: Tasks, Steps, Artifacts, Sessions, Projects, etc.
│       ├── Features: Transaction support, data validation, indexing
│       └── Future: Ready for PostgreSQL migration via Drizzle ORM
│
├── 📁 shared/                              # Shared Type Definitions
│   └── 📄 schema.ts                        # TYPES & VALIDATION: Central schema
│       ├── Purpose: Drizzle ORM schema definitions, Zod validation schemas
│       ├── Entities: 15+ data models (Task, Step, Project, ResearchDoc, etc.)
│       ├── Features: Type safety, runtime validation, database migration ready
│       └── Connects to: All frontend/backend components requiring types
│
├── 📁 uploads/                             # TEMPORARY FILE STORAGE
│   ├── 📁 audio/                          # Audio transcription files (auto-deleted)
│   └── Purpose: Temporary storage for file processing
│
├── 📄 package.json                         # DEPENDENCIES: Project configuration
│   ├── Scripts: dev, build, db:push, type checking
│   ├── Dependencies: React, Express, OpenAI, ElevenLabs, Drizzle, etc.
│   └── Dev Tools: Vite, TypeScript, Tailwind, ESLint
│
├── 📄 vite.config.ts                      # BUILD TOOL: Vite configuration
│   ├── Features: React plugin, path aliases, HMR, production optimization
│   └── Connects to: Frontend build process, development server
│
├── 📄 drizzle.config.ts                   # DATABASE: ORM configuration
│   ├── Purpose: PostgreSQL connection, migration settings
│   └── Status: Ready for database deployment (currently using in-memory)
│
├── 📄 tsconfig.json                       # TYPESCRIPT: Compiler configuration
│   ├── Features: Strict mode, path mapping, ES2022 target
│   └── Purpose: Type checking across entire project
│
├── 📄 tailwind.config.ts                  # STYLING: CSS framework configuration
│   ├── Features: shadcn/ui integration, custom themes, dark mode
│   └── Connects to: All React components for styling
│
├── 📄 replit.md                           # PROJECT CONTEXT: Architecture documentation
│   ├── Purpose: Project state, user preferences, technical decisions
│   ├── Features: System status, recent updates, external dependencies
│   └── Maintenance: Updated by AI agent with architectural changes
│
├── 📄 ELEVENLABS_ACTIONS_SETUP.md         # INTEGRATION GUIDE: ElevenLabs setup
│   ├── Purpose: Action configuration, webhook setup, testing procedures
│   └── Features: Complete integration workflow documentation
│
└── 📄 ELEVENLABS_MODEL_INSTRUCTIONS.md    # AI CONFIGURATION: Model instructions
    ├── Purpose: ElevenLabs agent behavior, action definitions
    └── Features: Voice command processing guidelines
```

## Data Flow Architecture

### 1. Voice-to-Task Workflow
```
User Speech → MediaRecorder (MP4/WebM) → /api/transcribe → OpenAI Whisper → 
Text → DirectChatInterface → /api/chat/process → GPT-5 → 
Intent Recognition → ElevenLabs Actions → /api/actions/add_task → 
Storage → Task Creation → UI Update
```

### 2. Knowledge Base Sync
```
File Upload → KnowledgeBaseManager → /api/knowledge-base/upload → 
Local Storage + ElevenLabs KB API → Bi-directional Sync → 
Search Interface → Voice Commands → Document Retrieval
```

### 3. Project Context Management
```
Project Switch → ProjectSwitcher → /api/projects → project-context.ts → 
GPT-5 Context Update → Session State → All Components → 
Context-Aware Responses
```

## Key Technical Integrations

### External APIs
- **OpenAI GPT-5**: Chat completions, function calling, context management
- **OpenAI Whisper**: Audio transcription (MP4/WebM → text)
- **ElevenLabs ConvAI**: Voice interface, action processing, knowledge base
- **ElevenLabs TTS SDK**: Text-to-speech synthesis for responses

### Storage Architecture
- **Current**: In-memory storage with JSON file persistence
- **Schema**: Drizzle ORM with PostgreSQL definitions (migration-ready)
- **Entities**: 15+ models including Tasks, Projects, ResearchDocs, CalendarEvents

### Authentication & Security
- **File Validation**: MIME type checking, size limits, immediate cleanup
- **Session Management**: UUID-based sessions, context preservation
- **API Keys**: Environment variable configuration, secure storage

### Frontend State Management
- **TanStack Query**: Server state, caching, optimistic updates
- **React State**: Component-level state, form management
- **Context Providers**: Theme, project context, session state

## Performance Considerations

### Audio Processing
- **Time-sliced recording**: 1-second chunks prevent data loss
- **Format prioritization**: MP4 preferred for OpenAI compatibility
- **Immediate cleanup**: Audio files deleted within seconds

### API Optimization
- **Concurrent requests**: Multiple tool calls for efficiency
- **Caching strategy**: TanStack Query with smart invalidation
- **Error handling**: Comprehensive error states with user guidance

### Scalability Design
- **Modular architecture**: Clean separation of concerns
- **Storage abstraction**: Easy migration to PostgreSQL
- **Component reusability**: shadcn/ui component library
- **Type safety**: End-to-end TypeScript with runtime validation

This architecture enables a developer to:
1. **Understand data flow** between voice input and task creation
2. **Locate specific functionality** in the appropriate modules
3. **Modify or extend features** using the established patterns
4. **Debug issues** by following the component connections
5. **Add new integrations** using the existing API patterns