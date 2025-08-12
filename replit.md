# Emergent Task Builder

## Overview
The Emergent Task Builder is a conversational, zoomable project management system. It leverages an ElevenLabs voice agent as the user-facing liaison and a GPT-5 Ops Manager for research, task execution, and learning. The system remembers past workflows to improve efficiency over time, evolving from a simple task system into a comprehensive project workspace. Key capabilities include project context switching, integrated research document management, calendar integration with automated scheduling, and smart organization tools. The business vision is to provide a seamless, AI-powered assistant that adapts to user workflows, automating complex tasks and managing projects efficiently.

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
- **Voice Widget**: ElevenLabs integration.
- **Task Manager**: Hierarchical task management with subtasks, priorities, and due dates.
- **Conversation History**: Real-time chat with AI responses.
- **File Upload System**: Multi-format handling with cloud storage integration.
- **Code Proposals**: AI-driven code suggestions and implementation with preview.
- **Video Integration**: YouTube search and embedding.

### AI Integration
- **Supervisor Agent**: GPT-5 processes conversations and manages workflows.
- **Tool Execution**: Extensible system for web search, file processing, and external APIs.
- **Code Generation**: AI proposes new features and code modifications.
- **Voice Processing**: ElevenLabs SDK for text-to-speech and audio feedback.
- **File Intelligence**: AI-powered Excel/CSV processing with natural language import/export.

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