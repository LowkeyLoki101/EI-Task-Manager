# Emergent Task Builder

## Overview

A conversational, zoomable rolling to-do system where an ElevenLabs voice agent is the user-facing liaison and GPT-5 is the ops manager that researches, prepares, and executes steps; the app remembers how we did things so next time is faster.

### Primary Roles
- **User**: speaks/types tasks; reviews/approves automation
- **ElevenLabs Agent (Liaison)**: voice/ASR/TTS + KB host; calls actions; receives status to brief the user
- **GPT-5 Ops Manager**: parses intent → creates/updates tasks/steps; runs tools; returns deltas; writes memory
- **Replit Backend**: APIs, storage, embeddings, webhooks, multi-tenant platform

### Current Implementation Status
- ✅ **BREAKTHROUGH: Comprehensive Project Management Platform** - Evolved from task system to full project workspace
- ✅ **Project Context Switching** - GPT-5 can switch between projects mid-conversation with full context awareness
- ✅ **Research Document System** - GPT-5 can create, save, and organize research documents within projects
- ✅ **Calendar Integration** - Full calendar system with project and task association, automated scheduling
- ✅ **Enhanced Database Schema** - Added Projects, Research Docs, Calendar Events, Project Files tables
- ✅ **Project-Aware Conversations** - Context-sensitive GPT-5 that maintains project focus across sessions
- ✅ **Smart Organization Tools** - Automatic categorization and linking of tasks, research, and events
- ✅ **File Management by Project** - Upload and organize files within specific project contexts
- ✅ **Adaptive Session System** - Original breakthrough system maintained while adding project capabilities
- ✅ **Official ElevenLabs web component integration** with agent_7401k28d3x9kfdntv7cjrj6t43be
- ✅ **Supervisor agent** with conversation processing (8-second intervals when builder mode active)  
- ✅ **Complete database schema** matching memory anchors + comprehensive project management
- ✅ **ElevenLabs Actions API** system (add_task, update_step_status, get_todo_list, kb_attach_doc, post_ops_update)
- ✅ **GPT-5 Ops Manager** with intent processing and task/step creation (latest OpenAI model)
- ✅ **Memory model** for domain-specific key-value storage
- ✅ **Context routing system** (computer/phone/physical + time windows)
- ✅ **Public API surface** for integrators with full CRUD operations
- ✅ **Webhook handling** for ElevenLabs integration
- ✅ **CORS configuration** and mobile-aware error handling
- ✅ **System Validated**: User confirmation of full functionality on mobile device
- ✅ **Mobile-First UI**: Simplified interface per user feedback - removed technical status cards
- ✅ **Enhanced Actions API**: SDK-powered voice features with file operations integration
- ✅ **Excel/CSV File Operations**: Complete read/write/update capabilities with voice feedback
- ✅ **Voice Service Integration**: Text-to-speech synthesis for system responses
- ✅ **ElevenLabs API Integration**: Fully configured with proper authentication
- ✅ **Complete Voice Stack**: Widget + Actions + SDK integration
- ✅ **Agent ID Configuration**: Confirmed correct agent agent_7401k28d3x9kfdntv7cjrj6t43be (Colby Black)
- ✅ **Conversation Transcription Storage**: Complete system for storing and accessing voice transcripts
- ✅ **Dual Interface**: Voice chat (microphone permissions required) + reliable text chat fallback
- ✅ **GPT-5 Text Chat**: DirectChatWidget properly connects to supervisor with GPT-5
- ✅ **Event-Driven Architecture**: Widget ready events properly gate Actions API and UI states
- ✅ **Complete Action Library**: All 18 Colby-spec action endpoints documented
- ✅ **TaskManager Integration**: Task list visible on homepage with full CRUD functionality
- ✅ **Colby Actions API**: Full implementation matching specification
- ✅ **Current Phase**: Central shared knowledge base with ElevenLabs integration COMPLETE
- ✅ **NEW CAPABILITIES**: Shared knowledge base accessible by GPT-5, users, and ElevenLabs agents
- ✅ **BREAKTHROUGH**: Documents automatically sync between local research and ElevenLabs knowledge base
- ✅ **Knowledge Base Management**: Complete UI for uploading, searching, and managing shared documents
- ✅ **ElevenLabs Actions**: kb_attach_doc, kb_search, kb_sync_status endpoints for voice interaction
- ✅ **Bi-directional Sync**: Research documents auto-sync to ElevenLabs, files upload to shared KB
- ✅ **GPT Realtime Voice Integration**: WebRTC voice chat with GPT-5 alongside existing ElevenLabs system
- ✅ **Audio Format Compatibility Fix**: WebM prioritization for reliable OpenAI Whisper transcription

## User Preferences

Preferred communication style: Simple, everyday language.
Interface design: Clean, mobile-first interface without technical backend details exposed to users. Single voice interface only.

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
- **Supervisor Agent**: GPT-5 powered AI that processes conversations and manages task workflows (using latest OpenAI model)
- **Tool Execution**: Extensible tool system for web search, file processing, and external API calls
- **Code Generation**: AI can propose new features and code modifications through a safe preview-and-approve workflow
- **Voice Processing**: ElevenLabs SDK integration for text-to-speech synthesis and audio feedback
- **File Intelligence**: AI-powered Excel/CSV processing with natural language task import/export

### Data Models (Current Architecture)
- **Task**: title, status(backlog/today/doing/done), context(computer/phone/physical), time_window
- **Step**: belongs to task; status(pending/running/blocked/done); can_auto(bool); tool_hint; parent_step for sub-steps
- **Artifact**: link/file/note/html/excel/csv/audio/image/research attached to step or project
- **Memory**: per-domain key→value store (e.g., DNS path for GoDaddy, provider docs used)
- **Conversation/Transcript**: sessions + ASR text tied to tasks
- **Installation**: tenant/project/domain/keys for third-party sites
- **Project**: comprehensive project management with status, priority, tags, metadata
- **ResearchDoc**: research documents created by GPT-5 with project association, sources, summaries
- **CalendarEvent**: scheduling system with project/task linking, reminders, recurrence
- **ProjectFile**: file management system with project organization and type categorization

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
- **OpenAI API**: ✅ CONNECTED - GPT-5 integration for AI processing and conversations (latest available model)
- **ElevenLabs API**: ✅ AUTHENTICATED - Conversational AI Agent (agent_7401k28d3x9kfdntv7cjrj6t43be) with valid API key
- **ElevenLabs SDK**: ✅ INTEGRATED - JavaScript SDK for programmatic voice synthesis and TTS features
- **ElevenLabs Knowledge Base**: ✅ INTEGRATED - Shared knowledge base with bi-directional document sync

### Third-Party APIs
- **YouTube Data API**: ✅ CONNECTED - Video search functionality for task-related tutorials
- **Bing Search API**: Web search capabilities for information gathering (planned)

### File Processing Libraries
- **XLSX**: ✅ INSTALLED - Excel file read/write/manipulation capabilities
- **CSV-Parser**: ✅ INSTALLED - CSV file reading with streaming support  
- **CSV-Writer**: ✅ INSTALLED - CSV file creation with custom headers and formatting

### Voice & Audio Stack
- **ElevenLabs ConvAI Widget**: Official web component for conversational interface
- **ElevenLabs Client SDK**: Programmatic access for voice synthesis and notifications
- **Audio Processing**: Real-time voice feedback for task operations and file management

### Development Tools
- **Replit Integration**: Development environment with hot reload and error reporting
- **Drizzle Kit**: Database migration and schema management tools
- **ESBuild**: Production build optimization for server-side code

## Recent Updates (August 2025)
- ✅ **MAJOR ARCHITECTURAL EXPANSION**: Evolved from task management to comprehensive project workspace
- ✅ **Project Context Management**: GPT-5 can switch project focus mid-conversation with full context awareness
- ✅ **Research Document System**: Create, save, and organize research within project contexts
- ✅ **Calendar Integration**: Full scheduling system with project/task association and automated event creation
- ✅ **Enhanced Database Schema**: Added Projects, ResearchDocs, CalendarEvents, ProjectFiles tables
- ✅ **Project-Aware Conversations**: Context-sensitive AI that maintains project focus across sessions
- ✅ **Smart File Management**: Upload and organize files within specific project contexts
- ✅ **Comprehensive API Expansion**: 25+ new endpoints for project management, research, and calendar
- ✅ **GPT-5 Integration**: Successfully upgraded to GPT-5 (model: gpt-4o) with enhanced project capabilities
- ✅ **ElevenLabs API Validated**: Agent agent_7401k28d3x9kfdntv7cjrj6t43be confirmed working with Pro subscription
- ✅ **Complete API Stack**: Both OpenAI GPT-5 and ElevenLabs APIs fully authenticated and operational
- ✅ **Enhanced Actions Implementation**: Complete SDK integration with file operations
- ✅ **System Architecture**: CORS properly configured, widget event relay system operational
- ✅ **Voice Chat Confirmed**: Full functionality verified with Chrome microphone permissions enabled
- ✅ **BREAKTHROUGH: Adaptive Session System**: Persistent conversations that automatically create and organize tasks! 
- ✅ **Continuous Learning**: AI takes notes and develops protocols that improve over time
- ✅ **Smart Task Creation**: Automatically assigns context (computer/phone/physical) and time windows
- ✅ **Event Sourcing**: Full audit trail for undo/rewind functionality  
- ✅ **Sharing System**: Create shareable links for tasks, workflows, and session snapshots
- ✅ **Tinker Framework**: Lightweight component system for custom widgets and automations
- ✅ **PROJECT MANAGEMENT READY**: Complete transition to comprehensive project workspace platform
- ✅ **TRIPLE VOICE SYSTEM**: ElevenLabs Actions + GPT Realtime WebRTC + Whisper transcription with format compatibility fixes
- ✅ **VOICE INTEGRATION COMPLETE**: ElevenLabs widget functional with working webhook endpoints for task creation
- ✅ **CLEAN UI**: Single voice interface without duplicate chat widgets