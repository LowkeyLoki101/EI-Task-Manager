# Emergent Intelligence

## Overview
Emergent Intelligence is a comprehensive AI-powered project management platform featuring task management, calendar integration (with iPhone sync), research capabilities, project-focused conversations, and a central knowledge base. The platform implements a complete triple voice system with ElevenLabs Actions, GPT Realtime WebRTC, and Whisper transcription. The system includes full n8n automation integration, autonomous chat system with persistent memory, GPT-5 diary system for relationship building and idea generation, file access capabilities for tool suggestions, knowledge base with markdown RAG retrieval, and iPhone calendar sync. Key capabilities include conversational task creation, automated workflow suggestions, cross-device calendar synchronization, AI-powered research assistance, and persistent memory that builds relationships over time.

## Recent Changes
**Date: August 12, 2025**
- ✅ **MAJOR: AI Workstation Autonomous Mode Implemented** - Replaced wasted header space with dynamic AI workstation featuring two modes
- ✅ **AI Autonomous Mode** - ChatGPT-5 can now autonomously control workstation with built-in self-prompts and maintenance schedules
- ✅ **Human Control Mode** - User controls workstation while AI observes all actions at console level for learning
- ✅ **Dynamic Tool System** - Calendar, Diary, Docs, Media, Browser, and Research tools with real-time AI control
- ✅ **Task Completion Learning** - AI stores learned information from completed tasks in knowledge base for future use
- ✅ **File and Knowledge Base Integration** - AI can save files to knowledge base and attach them to tasks
- ✅ **Console-Level AI Observation** - In human mode, AI observes and logs all user actions for learning patterns
- ✅ **Sleek Metallic Design** - Professional workstation interface matching EMERGENT INTELLIGENCE brand
- ✅ **BREAKTHROUGH: Complete Knowledge Base System Implemented** - Enterprise-grade knowledge management with metadata, search, export/import
- ✅ **Auto-Capture Functionality** - Tasks and conversations automatically captured to knowledge base with rich metadata
- ✅ **Advanced Search Engine** - Full-text search with relevance scoring, filtering by type/tags/category/dates
- ✅ **Zip Export/Import System** - Complete knowledge base export as zip with merge strategies and organized file structure
- ✅ **Analytics Dashboard** - Real-time statistics by type, category, tags with visual cards and insights
- ✅ **Session-Scoped Data** - Knowledge base entries properly isolated by session for data privacy
- ✅ **Navigation Integration** - Knowledge Base accessible from main navigation with dedicated page
- ✅ **Live Testing Completed** - Created test task, verified auto-capture, confirmed search functionality working perfectly
- ✅ **Complete intelligent code analysis system implemented** - GPT-5 powered code recommendations with voting system and approval workflow
- ✅ **Advanced code recommendation engine** - AI analyzes codebase for improvements, bugs, optimizations, and security issues
- ✅ **Voting and feedback system** - Users can vote on recommendations to help AI learn preferences with thumbs up/down interface
- ✅ **Automatic development requests** - Approved recommendations are automatically sent to development agent for implementation
- ✅ **Multi-format export functionality** - Export insights in JSON, Text, TypeScript, and Markdown formats
- ✅ **Comprehensive system insights** - Real-time analytics of development patterns and recommendation effectiveness
- ✅ **Complete UI integration** - Code Analysis page accessible from autonomous chat and main navigation
- ✅ **Complete file upload system implemented** - GPT-5 chat now supports image, PDF, and document uploads with automatic task extraction
- ✅ **Fixed file validation issues** - Resolved restrictive MIME type validation that was rejecting screenshots
- ✅ **Enhanced error handling** - Added comprehensive logging and error recovery for file upload process
- ✅ **Documentation organization** - Created comprehensive docs/ folder structure for developer handover
- ✅ **ElevenLabs integration consolidated** - All voice AI documentation moved to docs/elevenlabs/
- ✅ **Troubleshooting guide created** - Documented all technical issues encountered and solutions implemented

## User Preferences
Preferred communication style: Simple, everyday language.
Interface design: Clean, mobile-first interface without technical backend details exposed to users. Single voice interface only.
Chat behavior: No disruptive auto-scrolling when user is typing - allow natural interaction without forcing scroll position changes.

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
- **Intelligent Code Analysis**: Complete GPT-5 powered code recommendation system with voting, approval workflow, and multi-format export.
- **File Upload System**: Multi-format handling (images, PDFs, documents) with GPT-4o vision analysis and automatic task extraction from screenshots.
- **Workflow Automation**: Visual workflow suggestions powered by GPT-5 analysis and N8N integration.
- **iPhone Calendar Sync**: Full CalDAV integration for cross-device task synchronization.
- **Conversation History**: Real-time chat with AI responses and memory persistence.
- **Code Proposals**: AI-driven code suggestions and implementation with preview.
- **Video Integration**: YouTube search and embedding.

### Documentation Structure
- **docs/**: Comprehensive developer documentation
  - **DEVELOPER_HANDOVER.md**: Complete setup and architecture guide
  - **TROUBLESHOOTING.md**: Technical issues and solutions
  - **elevenlabs/**: All ElevenLabs integration documentation
  - **architecture/**: System architecture documentation
  - **notes/**: Development logs and research

### AI Integration
- **Supervisor Agent**: GPT-5 processes conversations and manages workflows.
- **Autonomous Chat**: GPT-5 assistant with persistent memory, trust levels, and relationship building.
- **Intelligent Code Analysis**: GPT-5 analyzes codebase for improvements, bugs, security issues, and optimizations with confidence scoring.
- **Code Recommendation Engine**: AI generates actionable development suggestions with priority scoring and effort estimation.
- **Voting & Learning System**: Machine learning from user feedback to improve recommendation quality and relevance.
- **Automatic Development Requests**: Approved recommendations automatically trigger development tasks for implementation.
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