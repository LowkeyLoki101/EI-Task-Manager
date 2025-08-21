# Emergent Intelligence

## Overview
Emergent Intelligence is an AI-powered project management platform designed to streamline project workflows through advanced AI capabilities. It integrates task management, calendar synchronization, research assistance, and a central knowledge base. The platform features a triple voice system, n8n automation, an autonomous chat system with persistent memory, and a GPT-5 diary system for relationship building and idea generation. A key feature is its role as a central hub in a distributed AI agent network, enabling cross-service collaboration, task delegation to specialized AI agents, and shared research capabilities. The system supports conversational task creation, automated workflow suggestions, cross-device calendar sync, and AI-powered research, with a focus on building relationships and coordinating AI agents across a network. It also includes an autopoietic (self-growing) diary system that autonomously thinks, researches, and builds knowledge, incorporating a 5-step thinking methodology and an evolving self-question pool. This system can generate actionable business tasks from its thinking cycles and visually displays its cognitive processes in real-time within an AI workstation.

## User Preferences
**User Profile: Colby Black**
Background: Entrepreneur and systems thinker in Houston, TX, operating across solar/energy, AI agents, drone inspections, and voice-first products.

**Communication Style:**
- Everyday conversational language with technical precision when needed
- Low hype, practical, forward-looking outputs
- Short paragraphs, scannable bullets
- Mark (Assumptions) and (Risks) inline when present
- Clever/quick humor when appropriate, never forced

**Interface Design:**
- Clean, mobile-first interface without technical backend details exposed to users
- Single voice interface only
- Daily-use tools prominent, setup/maintenance interfaces collapsed behind "Settings & Setup" section
- Title attributes on UI elements should remain for LLM context understanding, not user help
- Knowledge Base entries must be clickable and navigable from all interface locations

**Recent Fixes (2025-08-21):**
- **Fixed critical workstation expansion issue** - Removed 600px height constraint that was clipping workstation content; now properly expands to full viewport
- **Implemented functional workspace modes** - Human/Hybrid/AI modes now have real permission enforcement and centralized tool management
- **Added workspace system** - Event bus (workspaceBus.ts), WorkspaceProvider, and PanelDock enable AI agents to open tools and coordinate with human actions
- **Fixed chat container height** - Added max-h-[85vh] constraint to prevent excessive scrolling while maintaining workstation expansion capability
- **Mobile-first responsive layout** - Removed overflow constraints and fixed heights for flexible, adaptive interface design
- **Auto-expanding chat input** - Replaced fixed Input with dynamic Textarea that grows from 1 line to 4 lines maximum, supporting text wrapping and smooth height transitions
- **Chat interface cleanup** - Removed redundant labeling, moved logo to chat header, positioned trust score properly
- **Streamlined button layout** - Moved help button to top header and send button to same row as upload for compact, efficient interface

**Chat Behavior:**
- No disruptive auto-scrolling when user is typing
- Allow natural interaction without forcing scroll position changes

**Active Projects:**
- SkyClaim: Drone roof inspection + AI storm reports
- Starlight Solar: Fence-mounted solar, solar pergolas, DC heat pumps
- Conversational Voicemail: ElevenLabs conversational agent built on Replit web apps
- Emergent Intelligence: Digital avatars, knowledge-base construction, ethical frameworks
- SyncWave/VibraRest: Vibro-acoustic sleep & relief products

**Content Creation Preferences:**
- One-pagers/PDFs, landing pages, avatar scripts, SMS/email templates
- Research briefs: 5-10 bullets with citations, dates, and 2-3 counterpoints
- Clear separation of facts vs. claims vs. opinions with sources and timestamps

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript (Vite).
- **UI Components**: shadcn/ui, Radix UI, Tailwind CSS.
- **State Management**: TanStack Query.
- **Routing**: Wouter.
- **File Uploads**: Uppy with drag-and-drop.
- **UI/UX Decisions**: Sleek metallic design matching the brand, dynamic container sizing for flexible layouts, and visual integration of the AI's thinking process. Mobile-first design with responsive layouts (desktop: side-by-side grid; mobile: stacked layout).

### Backend Architecture
- **Server**: Express.js with TypeScript.
- **Data Storage**: PostgreSQL with Drizzle ORM, intelligent AI job queue for quota management.
- **API Design**: RESTful API for tasks, conversations, proposals, files, and AI supervision, including endpoints for autopoietic loops and knowledge management.

### Key Components
- **Voice Widget**: ElevenLabs integration for conversational AI.
- **Project-Based Task Manager**: Organized task management with project categorization, clickable task details, AI focus capability, and a 5-stage completion workflow (Research → Planning → Execution → Knowledge → Publication). Enforces a maximum of 5 incomplete tasks.
- **Autonomous Chat**: GPT-5 powered assistant with persistent memory and relationship building.
- **Intelligent Code Analysis**: GPT-5 powered code recommendation system.
- **File Upload System**: Multi-format handling with GPT-4o vision analysis and automatic task extraction.
- **Workflow Automation**: Visual workflow suggestions powered by GPT-5 analysis and N8N integration.
- **iPhone Calendar Sync**: CalDAV integration for cross-device task synchronization.
- **Knowledge Base RAG System**: Enterprise-grade knowledge management with metadata, search, auto-capture, and RAG integration to prevent repetitive content creation. Includes a draft cache and approval pipeline for content publishing. Features individual entry export (markdown) and copy-to-clipboard functionality.
- **AI Workstation**: Dynamic interface with autonomous and human control modes, integrated tools (Calendar, Diary, Docs, Media, Browser, Research), and real-time AI observation.
- **Autopoietic Diary System**: Autonomous AI that conducts research, builds knowledge, and generates tasks based on its internal thought processes (Colby-Style Lens Processing).
- **Microservice Integration Network**: Comprehensive connector for cross-service AI collaboration, task delegation, and knowledge sharing.
- **Blog System**: AI-powered research publication platform for autonomous agents.
- **Intelligent Quota Management**: PostgreSQL-based AI job queue with circuit breaker, exponential backoff, and error handling for sustainable API usage.
- **AI Worker System**: Production-ready background worker for AI content generation with real-time status tracking and graceful degradation.

### AI Integration
- **Supervisor Agent**: GPT-5 processes conversations and manages workflows.
- **Autonomous Chat**: GPT-5 assistant with persistent memory, trust levels, and relationship building.
- **Intelligent Code Analysis**: GPT-5 analyzes codebase for improvements, bugs, security issues, and optimizations.
- **GPT Diary System**: Persistent memory system recording reflections, ideas, and learnings.
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

## External Dependencies

### Cloud Services
- **Google Cloud Storage**: File upload and storage.
- **Neon Database**: PostgreSQL database service (via Drizzle).
- **OpenAI API**: GPT-5 integration.
- **ElevenLabs API**: Conversational AI agent integration.
- **ElevenLabs SDK**: JavaScript SDK for voice synthesis.
- **ElevenLabs Knowledge Base**: Shared knowledge base with bi-directional document sync.

### Third-Party APIs
- **YouTube Data API**: Video search.

### File Processing Libraries
- **XLSX**: Excel file read/write/manipulation.
- **CSV-Parser**: CSV file reading.
- **CSV-Writer**: CSV file creation.

### Workflow Automation Stack
- **n8n Integration**: Complete workflow automation with smart suggestions, task conversion, LLM workflows, and execution monitoring.