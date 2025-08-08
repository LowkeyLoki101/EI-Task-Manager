# Emergent Task Builder

## Overview

A conversational, zoomable rolling to-do system where an ElevenLabs voice agent is the user-facing liaison and GPT-5 is the ops manager that researches, prepares, and executes steps; the app remembers how we did things so next time is faster.

### Primary Roles
- **User**: speaks/types tasks; reviews/approves automation
- **ElevenLabs Agent (Liaison)**: voice/ASR/TTS + KB host; calls actions; receives status to brief the user
- **GPT-5 Ops Manager**: parses intent → creates/updates tasks/steps; runs tools; returns deltas; writes memory
- **Replit Backend**: APIs, storage, embeddings, webhooks, multi-tenant platform

### Current Implementation Status
- ✅ Official ElevenLabs web component integration with agent_8201k251883jf0hr1ym7d6dbymxc
- ✅ Supervisor agent with conversation processing (8-second intervals when builder mode active)
- ✅ Complete database schema matching memory anchors (Tasks, Steps, Artifacts, Memory, Installations)
- ✅ ElevenLabs Actions API system (add_task, update_step_status, get_todo_list, kb_attach_doc, post_ops_update)
- ✅ GPT-5 Ops Manager with intent processing and task/step creation
- ✅ Memory model for domain-specific key-value storage
- ✅ Context routing system (computer/phone/physical + time windows)
- ✅ Public API surface for integrators with full CRUD operations
- ✅ Webhook handling for ElevenLabs integration
- ✅ CORS configuration and mobile-aware error handling
- ✅ **System Validated**: User confirmation of full functionality on mobile device
- 🚧 **Next Phase**: Full toolbelt implementation (web search, QR generation, page scaffolding), ElevenLabs KB management

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **UI Components**: shadcn/ui component library with Radix UI primitives and Tailwind CSS for styling
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **File Uploads**: Uppy integration with support for drag-and-drop and AWS S3 compatibility

### Backend Architecture
- **Server**: Express.js with TypeScript, serving both API routes and static assets
- **Data Storage**: In-memory storage implementation with file system persistence (JSON files)
- **Database Schema**: Drizzle ORM with PostgreSQL schema definitions for future database migration
- **API Design**: RESTful API with dedicated routes for tasks, conversations, proposals, files, and AI supervision

### Key Components
- **Voice Widget**: Integration point for ElevenLabs voice interaction
- **Task Manager**: Hierarchical task management with subtasks, priorities, and due dates
- **Conversation History**: Real-time chat interface with AI responses
- **File Upload System**: Multi-format file handling with cloud storage integration
- **Code Proposals**: Self-updating system where AI can propose and implement code changes
- **Video Integration**: YouTube search and embedding for task-related tutorials

### AI Integration
- **Supervisor Agent**: GPT-4 powered AI that processes conversations and manages task workflows
- **Tool Execution**: Extensible tool system for web search, file processing, and external API calls
- **Code Generation**: AI can propose new features and code modifications through a safe preview-and-approve workflow

### Data Models (Target Architecture)
- **Task**: title, status(backlog/today/doing/done), context(computer/phone/physical), time_window
- **Step**: belongs to task; status(pending/running/blocked/done); can_auto(bool); tool_hint; parent_step for sub-steps
- **Artifact**: link/file/note/html attached to a step
- **Memory**: per-domain key→value store (e.g., DNS path for GoDaddy, provider docs used)
- **Conversation/Transcript**: sessions + ASR text tied to tasks
- **Installation**: tenant/project/domain/keys for third-party sites

### Context Routing System
Every step labeled with:
- **Context**: Computer / Phone / Physical
- **Time Window**: Morning / Midday / Evening / Any
UI filters use these labels to show the right list at the right time.

### Memory Model
- Save successful paths (URLs, flows, provider choices, export settings)
- On next run: prefill links, suggest defaults, auto-run prep work
- Memory keys example: dns:getskyclaim.com, print:sticker_export_profile, kb:starlight_battery_manuals_v1

## External Dependencies

### Cloud Services
- **Google Cloud Storage**: File upload and storage backend
- **Neon Database**: PostgreSQL database service (configured via Drizzle)
- **OpenAI API**: ✅ CONNECTED - GPT-4 integration for AI processing and conversations
- **ElevenLabs API**: ✅ CONNECTED - Conversational AI Agent (agent_8201k251883jf0hr1ym7d6dbymxc) for natural voice conversations

### Third-Party APIs
- **YouTube Data API**: ✅ CONNECTED - Video search functionality for task-related tutorials
- **Bing Search API**: Web search capabilities for information gathering (planned)

### Development Tools
- **Replit Integration**: Development environment with hot reload and error reporting
- **Drizzle Kit**: Database migration and schema management tools
- **ESBuild**: Production build optimization for server-side code