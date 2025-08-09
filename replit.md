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
- ✅ GPT-5 Ops Manager with intent processing and task/step creation (latest OpenAI model)
- ✅ Memory model for domain-specific key-value storage
- ✅ Context routing system (computer/phone/physical + time windows)
- ✅ Public API surface for integrators with full CRUD operations
- ✅ Webhook handling for ElevenLabs integration
- ✅ CORS configuration and mobile-aware error handling
- ✅ **System Validated**: User confirmation of full functionality on mobile device
- ✅ **Mobile-First UI**: Simplified interface per user feedback - removed technical status cards, clean single voice interface
- ✅ **Enhanced Actions API**: SDK-powered voice features with file operations integration
- ✅ **Excel/CSV File Operations**: Complete read/write/update capabilities with voice feedback
- ✅ **Voice Service Integration**: Text-to-speech synthesis for system responses and notifications  
- ✅ **Task Reporting**: Export tasks and steps to Excel/CSV with voice confirmations
- ✅ **File Import System**: Import tasks from Excel/CSV files with validation and voice feedback
- ✅ **ElevenLabs API Integration**: Fully configured with proper authentication and voice synthesis
- ✅ **Complete Voice Stack**: Widget + Actions + SDK integration for comprehensive voice experience
- ✅ **Dual Interface**: Voice chat (microphone permissions required) + reliable text chat fallback
- ⚠️ **Voice Chat Status**: ElevenLabs widget loaded but requires dashboard configuration (domain allowlist)
- ✅ **Primary Interface**: Blue text chat fully operational with GPT-5 and automatic task creation
- ✅ **Action Endpoints Ready**: /api/actions/research, /api/actions/qr, /api/actions/scaffold_page fully implemented
- ✅ **Enhanced CORS**: Proper CORS configuration for ElevenLabs widget and API access in server/index.ts
- ✅ **Widget Event Relay**: ConvAI event handling via /api/convai/relay for frontend widget events
- 🚧 **Next Phase**: Steps Visualizer component integration, ElevenLabs KB management

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

### Data Models (Target Architecture)
- **Task**: title, status(backlog/today/doing/done), context(computer/phone/physical), time_window
- **Step**: belongs to task; status(pending/running/blocked/done); can_auto(bool); tool_hint; parent_step for sub-steps
- **Artifact**: link/file/note/html/excel/csv/audio attached to a step
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
- **OpenAI API**: ✅ CONNECTED - GPT-5 integration for AI processing and conversations (latest available model)
- **ElevenLabs API**: ✅ AUTHENTICATED - Conversational AI Agent (agent_8201k251883jf0hr1ym7d6dbymxc) with valid API key
- **ElevenLabs SDK**: ✅ INTEGRATED - JavaScript SDK for programmatic voice synthesis and TTS features

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
- ✅ **GPT-5 Integration**: Successfully upgraded to GPT-5 (model: gpt-5-2025-08-07) with corrected API parameters
- ✅ **ElevenLabs API Validated**: Agent agent_8201k251883jf0hr1ym7d6dbymxc confirmed working with Pro subscription
- ✅ **Complete API Stack**: Both OpenAI GPT-5 and ElevenLabs APIs fully authenticated and operational
- ✅ **Enhanced Actions Implementation**: Complete SDK integration with file operations
- ✅ **Excel/CSV Voice Integration**: File operations now provide audio confirmations  
- ✅ **ElevenLabs React SDK Integration**: Proper useConversation hook implementation with WebSocket connection
- ✅ **Text Chat Fallback**: Reliable DirectChatWidget for environments with microphone restrictions
- ✅ **Mobile Voice Experience**: Dual interface with voice + text options positioned clearly
- ✅ **Steps Visualizer Backend**: Implemented research, QR generation, and page scaffolding endpoints
- ✅ **System Architecture**: CORS properly configured, widget event relay system operational