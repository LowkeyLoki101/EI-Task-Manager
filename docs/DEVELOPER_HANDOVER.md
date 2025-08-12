# Developer Handover Guide - Emergent Intelligence

## Project Overview
Emergent Intelligence is a comprehensive AI-powered project management platform featuring task management, calendar integration, research capabilities, and a complete triple voice system. The platform implements persistent memory, autonomous task creation, and intelligent workflow automation.

## System Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Storage**: In-memory with file persistence (transitioning to PostgreSQL)
- **AI Integration**: OpenAI GPT-4o, ElevenLabs ConvAI, Whisper
- **Automation**: N8N integration
- **Styling**: Tailwind CSS + shadcn/ui components

### Project Structure
```
/
├── client/                      # React frontend
│   └── src/
│       ├── components/          # Reusable UI components
│       │   ├── AutonomousChat.tsx    # GPT-5 chat with file upload
│       │   ├── CompactTaskManager.tsx # Task management UI
│       │   ├── GPTSupervisor.tsx     # AI workflow suggestions
│       │   └── ui/              # shadcn/ui components
│       ├── pages/               # Route components
│       ├── lib/                 # Utilities and configurations
│       └── hooks/               # Custom React hooks
├── server/                      # Express backend
│   ├── routes.ts               # Main API routes
│   ├── storage.ts              # Data persistence layer
│   ├── autonomous-chat.ts      # GPT-5 chat service
│   ├── gpt-diary.ts           # Persistent memory system
│   ├── gpt-supervisor.ts      # Workflow analysis
│   └── elevenlabs-integration.ts # Voice AI integration
├── shared/                      # Shared TypeScript types
│   └── schema.ts               # Database models and types
├── uploads/                     # Temporary file storage
├── data/                       # Persistent data files
└── docs/                       # Documentation (this folder)
```

### Key Components Explained

#### 1. Task Management System
**Files**: `client/src/components/CompactTaskManager.tsx`, `server/storage.ts`
- Hierarchical task structure with subtasks
- Context-aware filtering (Computer/Phone/Physical)
- Time window organization (Morning/Midday/Evening/Any)
- Click-to-complete functionality
- Session-based task isolation

#### 2. Autonomous Chat System
**Files**: `client/src/components/AutonomousChat.tsx`, `server/autonomous-chat.ts`
- GPT-4o powered conversational AI (Colby)
- Persistent memory and relationship tracking
- Autonomous action capabilities (CREATE_TASK, RESEARCH, etc.)
- File upload and image analysis
- Trust level system (starts at 50%, evolves with interactions)

#### 3. GPT Diary & Memory System
**Files**: `server/gpt-diary.ts`
- Persistent memory across sessions
- Personality profiling and relationship tracking
- Success/failure pattern recognition
- Knowledge base accumulation
- Trust level management

#### 4. ElevenLabs Voice Integration
**Files**: Multiple (see docs/elevenlabs/)
- ConvAI widget for voice interactions
- Agent ID: `agent_7401k28d3x9kfdntv7cjrj6t43be` (Colby Black - Task Manager)
- Dynamic session variable injection
- Voice-to-task creation pipeline

#### 5. File Upload System
**Files**: `server/autonomous-chat.ts` (multer configuration)
- Multi-format support (images, PDFs, documents)
- Image analysis with GPT-4o vision
- Automatic task extraction from screenshots
- 10MB file size limit
- Automatic cleanup after processing

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon recommended)
- API Keys:
  - OpenAI API Key
  - ElevenLabs API Key
  - YouTube Data API Key (optional)

### Environment Variables Required
```env
DATABASE_URL=postgresql://[connection_string]
OPENAI_API_KEY=sk-[your_key]
ELEVENLABS_API_KEY=[your_key]
YOUTUBE_API_KEY=[your_key]
PGHOST=[host]
PGPORT=[port]
PGUSER=[user]
PGPASSWORD=[password]
PGDATABASE=[database]
```

### Installation Steps

1. **Clone and Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   ```bash
   npm run db:push  # Pushes schema to database
   ```

3. **Start Development Server**
   ```bash
   npm run dev  # Starts both frontend and backend
   ```

4. **ElevenLabs Configuration**
   - Follow docs/elevenlabs/SETUP_GUIDE.md
   - Configure agent_7401k28d3x9kfdntv7cjrj6t43be
   - Set up dynamic variables and actions

### File Hierarchy Naming Conventions

#### Frontend Components
- **PascalCase** for component files: `AutonomousChat.tsx`
- **camelCase** for hooks: `useTaskManager.ts`
- **kebab-case** for utility files: `query-client.ts`

#### Backend Services
- **kebab-case** for service files: `autonomous-chat.ts`
- **camelCase** for function names: `processMessage()`
- **PascalCase** for classes: `AutonomousChatService`

#### Data Models
- **camelCase** for properties: `sessionId`, `timeWindow`
- **PascalCase** for types: `ChatMessage`, `TaskData`

## Data Flow Architecture

### 1. User Interaction Flow
```
User Input → Frontend Component → API Route → Service Layer → Storage Layer
```

### 2. Voice Interaction Flow
```
ElevenLabs Widget → Dynamic Variables → Agent Actions → Task Creation
```

### 3. File Upload Flow
```
Frontend Upload → Multer Processing → GPT-4o Analysis → Task Extraction
```

### 4. Memory System Flow
```
User Interaction → GPT Diary Reflection → Memory Update → Trust Adjustment
```

## Database Schema

### Core Tables
- **tasks**: Main task entities with hierarchy support
- **chat_messages**: Conversation history storage
- **diary_entries**: AI memory and reflection entries
- **workflows**: N8N automation definitions
- **calendar_events**: Calendar integration data

### Key Relationships
- Tasks have many subtasks (self-referential)
- Sessions contain multiple tasks and messages
- Diary entries link to sessions and tasks
- Workflows can reference tasks and sessions

## API Endpoints Reference

### Task Management
- `GET /api/tasks?sessionId=X` - Get tasks for session
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Chat System
- `GET /api/chat/:sessionId` - Get conversation history
- `POST /api/chat/:sessionId` - Send message (with file upload)
- `GET /api/diary` - Get AI memory/diary data

### Workflow Automation
- `GET /api/n8n/workflows` - Get automation workflows
- `POST /api/n8n/suggest-workflows` - Get AI workflow suggestions

## Security Considerations

### File Upload Security
- File type validation (images, PDFs, documents only)
- 10MB size limit
- Automatic file cleanup after processing
- No executable file uploads

### API Security
- Session-based isolation
- Input validation with Zod schemas
- Error handling without information leakage

### Environment Security
- All API keys in environment variables
- No hardcoded credentials
- Database connection via secure environment variables

## Performance Considerations

### Frontend Performance
- React Query for efficient caching
- Component-level state management
- Lazy loading for large components
- Debounced user inputs

### Backend Performance
- In-memory storage for fast access
- File cleanup to prevent disk bloat
- Connection pooling for database
- Async operations throughout

## Deployment Architecture

### Replit Deployment
- Single workflow: "Start application" (`npm run dev`)
- Automatic environment variable injection
- Built-in PostgreSQL database
- File upload to temporary directory

### Production Considerations
- Migrate to persistent file storage (S3/GCS)
- Database connection pooling
- Error monitoring and logging
- Rate limiting for API endpoints

## Integration Points

### ElevenLabs Integration
- Widget mounting in React components
- Dynamic variable injection for sessions
- Agent action handling for task creation
- Voice feedback integration

### OpenAI Integration
- GPT-4o for chat and analysis
- Vision API for image processing
- Structured output for task creation
- Function calling for autonomous actions

### N8N Integration
- Webhook endpoints for automation
- Workflow suggestion generation
- Task-triggered automations
- External service integrations

## Development Workflow

### Adding New Features
1. Update shared schema types
2. Create/modify storage interface
3. Implement API routes
4. Build frontend components
5. Test integration points
6. Update documentation

### Database Changes
1. Modify `shared/schema.ts`
2. Run `npm run db:push`
3. Update storage interfaces
4. Test data migrations

### Component Development
1. Use TypeScript throughout
2. Implement proper error boundaries
3. Add loading and error states
4. Include accessibility attributes
5. Write component documentation

This handover guide provides everything needed to understand, maintain, and extend the Emergent Intelligence platform. For specific troubleshooting scenarios, see TROUBLESHOOTING.md.