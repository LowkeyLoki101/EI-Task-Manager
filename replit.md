# Emergent Intelligence

## Overview
Emergent Intelligence is a comprehensive AI-powered project management platform featuring task management, calendar integration (with iPhone sync), research capabilities, project-focused conversations, and a central knowledge base. The platform implements a complete triple voice system with ElevenLabs Actions, GPT Realtime WebRTC, and Whisper transcription. The system includes full n8n automation integration, autonomous chat system with persistent memory, GPT-5 diary system for relationship building and idea generation, file access capabilities for tool suggestions, knowledge base with markdown RAG retrieval, and iPhone calendar sync. Key capabilities include conversational task creation, automated workflow suggestions, cross-device calendar synchronization, AI-powered research assistance, and persistent memory that builds relationships over time.

## User Preferences
Preferred communication style: Simple, everyday language.
Interface design: Clean, mobile-first interface without technical backend details exposed to users. Single voice interface only.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript (Vite).
- **UI Components**: shadcn/ui, Radix UI, Tailwind CSS.
- **State Management**: TanStack Query.
- **Routing**: Wouter.
- **File Uploads**: Uppy with drag-and-drop and AWS S3 compatibility.

### Backend Architecture
- **Server**: Express.js with TypeScript.
- **Data Storage**: In-memory with file system persistence (JSON), Drizzle ORM for future PostgreSQL migration.
- **API Design**: RESTful API for tasks, conversations, proposals, files, and AI supervision.

### Key Components
- **Voice Widget**: ElevenLabs integration with conversational AI agent (agent_7401k28d3x9kfdntv7cjrj6t43be).
- **Task Manager**: Hierarchical task management with subtasks, priorities, due dates, and click-to-complete functionality.
- **Autonomous Chat**: GPT-5 powered assistant with persistent memory positioned directly under task manager.
- **Workflow Automation**: Visual workflow suggestions powered by GPT-5 analysis and N8N integration.
- **iPhone Calendar Sync**: Full CalDAV integration for cross-device task synchronization.
- **Conversation History**: Real-time chat with AI responses and memory persistence.
- **File Upload System**: Multi-format handling with cloud storage integration.
- **Code Proposals**: AI-driven code suggestions and implementation with preview.
- **Video Integration**: YouTube search and embedding.

### AI Integration
- **Supervisor Agent**: GPT-5 processes conversations and manages workflows.
- **Autonomous Chat**: GPT-5 assistant with persistent memory, trust levels, and relationship building.
- **GPT Diary System**: Persistent memory system that records reflections, ideas, problems, solutions, and learnings.
- **Tool Execution**: Extensible system for web search, file processing, and external APIs.
- **Code Generation**: AI proposes new features and code modifications.
- **Voice Processing**: ElevenLabs SDK for text-to-speech and audio feedback.
- **File Intelligence**: AI-powered Excel/CSV processing with natural language import/export.
- **Workflow Analysis**: Real-time analysis of user patterns to suggest automation opportunities.

### Data Models
- **Task**: title, status, context, time_window.
- **Step**: status, can_auto, tool_hint, parent_step.
- **Artifact**: link/file/note/html/excel/csv/audio/image/research.
- **Memory**: domain-specific key-value store for successful paths.
- **Conversation/Transcript**: sessions and ASR text.
- **Installation**: tenant/project/domain/keys for third-party sites.
- **Project**: comprehensive project management with status, priority, tags, metadata.
- **ResearchDoc**: GPT-5 created research documents with project association.
- **CalendarEvent**: scheduling system with project/task linking.
- **ProjectFile**: file management with project organization.

### Context Routing System
Steps are labeled with `Context` (Computer/Phone/Physical) and `Time Window` (Morning/Midday/Evening/Any) for UI filtering.

### Memory Model
Saves successful workflows (URLs, flows, provider choices) to prefill links, suggest defaults, and automate prep work for future runs.

## External Dependencies

### Cloud Services
- **Google Cloud Storage**: File upload and storage.
- **Neon Database**: PostgreSQL database service (via Drizzle).
- **OpenAI API**: GPT-5 integration.
- **ElevenLabs API**: Conversational AI Agent (agent_7401k28d3x9kfdntv7cjrj6t43be).
- **ElevenLabs SDK**: JavaScript SDK for voice synthesis.
- **ElevenLabs Knowledge Base**: Shared knowledge base with bi-directional document sync.

### Third-Party APIs
- **YouTube Data API**: Video search.
- **Bing Search API**: Web search (planned).

### File Processing Libraries
- **XLSX**: Excel file read/write/manipulation.
- **CSV-Parser**: CSV file reading.
- **CSV-Writer**: CSV file creation.

### Voice & Audio Stack
- **ElevenLabs ConvAI Widget**: Official web component.
- **ElevenLabs Client SDK**: Programmatic access for voice and notifications.
- **Audio Processing**: Real-time voice feedback.

### Workflow Automation Stack
- **n8n Integration**: Visual workflow automation.
- **LLM Workflow Tools**: AI-powered workflow creation.
- **400+ Service Integrations**: Various service integrations (e.g., email, Slack, GitHub).

### Development Tools
- **Replit Integration**: Development environment.
- **Drizzle Kit**: Database migration.
- **ESBuild**: Production build optimization.