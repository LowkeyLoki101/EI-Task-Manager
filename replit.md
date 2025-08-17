# Emergent Intelligence

## Overview
Emergent Intelligence is an AI-powered project management platform designed to streamline project workflows through advanced AI capabilities. It integrates task management, calendar synchronization, research assistance, and a central knowledge base. The platform features a triple voice system, n8n automation, an autonomous chat system with persistent memory, and a GPT-5 diary system for relationship building and idea generation. A key feature is its role as a central hub in a distributed AI agent network, enabling cross-service collaboration, task delegation to specialized AI agents, and shared research capabilities. The system supports conversational task creation, automated workflow suggestions, cross-device calendar sync, and AI-powered research, with a focus on building relationships and coordinating AI agents across a network. It also includes an autopoietic (self-growing) diary system that autonomously thinks, researches, and builds knowledge, incorporating a 5-step thinking methodology (Colby-Style Lens Processing) and an evolving self-question pool. This system can generate actionable business tasks from its thinking cycles and visually displays its cognitive processes in real-time within an AI workstation.

## Recent System Updates (August 17, 2025)
- **🚨 CRITICAL FIXES IMPLEMENTED**: Comprehensive task completion workflow system
- **✅ Task Detail Modal**: Rich task interaction with AI focus capability, notes, tools, manual completion
- **✅ Task Completion System**: 5-stage completion workflow (Research → Planning → Execution → Knowledge → Publication)  
- **✅ Task Creation Limits**: Maximum 5 incomplete tasks before forcing completion cycles
- **✅ Knowledge Base RAG**: System now queries previous work to prevent repetitive content creation
- **✅ AI Focus Feature**: Manual AI focus on specific tasks with instruction capability
- **✅ Task Lifecycle**: Completed tasks automatically convert to knowledge base entries and diary narratives
- **✅ Autopoietic Integration**: Task limits integrated with autonomous diary to prevent endless task creation
- **✅ AI Workstation Mode Switching**: Fixed conflicting mode switchers, tools now work in Human/Hybrid/AI modes
- **✅ Content Generation Systems**: Knowledge base and diary systems operational with quota management
- **✅ Development Framework**: Implemented Self-Diagnostic & Improvement Framework for code quality
- **✅ INTELLIGENT QUOTA MANAGEMENT**: PostgreSQL-based job queue with circuit breaker, exponential backoff, and comprehensive error handling
- **✅ AI Worker System**: Production-ready AI content generation with real-time status tracking and graceful degradation
- **✅ Frontend Status Indicators**: User-visible AI generation progress with queue status and circuit breaker state
- **✅ KNOWLEDGE BASE DRAFT CACHE**: Complete content workflow system with approval pipeline (content → draft → approval → blog)
- **✅ AI KNOWLEDGE ACTIONS**: Direct knowledge base integration - AI assistant (Colby) can now save structured content directly
- **✅ CONTENT WORKFLOW API**: Full draft management system with approve/reject, bulk operations, and download capabilities
- **✅ ELEVENLABS AI TOOL INTEGRATION**: Fixed authentication bypass for ElevenLabs webhooks - Conversational AI (Colby) now has full access to knowledge base and advanced tools
- **📊 Current Scale**: 417+ tasks identified, 0% completion rate detected and FIXED

## User Preferences
Preferred communication style: Simple, everyday language.
Interface design: Clean, mobile-first interface without technical backend details exposed to users. Single voice interface only.
Chat behavior: No disruptive auto-scrolling when user is typing - allow natural interaction without forcing scroll position changes.

## Development Methodology
**Self-Diagnostic & Improvement Framework**: All code generation, editing, and refactoring must follow the 6-step framework:
1. **Investigation** - Parse output critically for truncation, paraphrasing, missing details
2. **Diagnostic Report** - Structured analysis before final code output
3. **Fortify & Enhance** - Rewrite weak sections completely, expand placeholders
4. **Adjust for Drift** - Compare against earlier instructions, realign to canonical form
5. **Final Output Policy** - Provide both diagnostic report and corrected code separately
6. **Continuous Improvement** - Integrate lessons from prior diagnostics
Never skip steps. Always investigate → diagnose → fortify → correct → output.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript (Vite).
- **UI Components**: shadcn/ui, Radix UI, Tailwind CSS.
- **State Management**: TanStack Query.
- **Routing**: Wouter.
- **File Uploads**: Uppy with drag-and-drop.
- **UI/UX Decisions**: Sleek metallic design matching the brand, dynamic container sizing for flexible layouts, and visual integration of the AI's thinking process.

### Backend Architecture
- **Server**: Express.js with TypeScript.
- **Data Storage**: PostgreSQL with Drizzle ORM, intelligent AI job queue for quota management.
- **API Design**: RESTful API for tasks, conversations, proposals, files, and AI supervision, including endpoints for autopoietic loops and knowledge management.

### Key Components
- **Voice Widget**: ElevenLabs integration for conversational AI.
- **Project-Based Task Manager**: Organized task management with project categorization, clickable task details, AI focus capability, and 5-stage completion workflow.
- **Autonomous Chat**: GPT-5 powered assistant with persistent memory and relationship building.
- **Intelligent Code Analysis**: GPT-5 powered code recommendation system with voting, approval, and multi-format export.
- **File Upload System**: Multi-format handling (images, PDFs, documents) with GPT-4o vision analysis and automatic task extraction.
- **Workflow Automation**: Visual workflow suggestions powered by GPT-5 analysis and N8N integration.
- **iPhone Calendar Sync**: CalDAV integration for cross-device task synchronization.
- **Knowledge Base RAG System**: Enterprise-grade knowledge management with metadata, search, auto-capture, and RAG integration to prevent repetitive content creation by analyzing previous work.
- **AI Workstation**: Dynamic interface with autonomous and human control modes, integrated tools (Calendar, Diary, Docs, Media, Browser, Research), and real-time AI observation.
- **Autopoietic Diary System**: Autonomous AI that conducts research, builds knowledge, and generates tasks based on its internal thought processes (Colby-Style Lens Processing).
- **Microservice Integration Network**: Comprehensive connector for cross-service AI collaboration, task delegation, and knowledge sharing.
- **Blog System**: AI-powered research publication platform where autonomous agents publish polished blog posts from completion cycles.
- **Task Completion System**: 5-stage completion workflow (Research → Planning → Execution → Knowledge → Publication) with automatic knowledge base integration and narrative diary entries.
- **Task Creation Limits**: Maximum 5 incomplete tasks before system forces completion cycles, preventing endless task generation.
- **Intelligent Quota Management**: PostgreSQL-based AI job queue with circuit breaker pattern, exponential backoff, rate limiting, and comprehensive error handling for sustainable API usage.
- **AI Worker System**: Production-ready background worker with graceful degradation, real-time status tracking, and automatic retry logic for reliable AI content generation.
- **Frontend Status Integration**: Real-time AI queue status indicators, circuit breaker state visualization, and user-facing progress tracking for transparent AI operations.
- **Knowledge Base Draft Cache**: Complete content creation → draft storage → approval workflow → blog publishing pipeline with AI and human approval options.
- **AI Knowledge Base Actions**: Direct API integration allowing AI assistant (Colby) to save structured knowledge entries with proper validation and storage.
- **Content Workflow Management**: Full draft management system with approval/rejection, bulk operations, format downloads (MD/HTML/JSON), and task-to-knowledge conversion.

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
- **Smart Workflow Engine**: AI analyzes tasks and suggests 6 automation patterns (email, data, research, social, files, AI assistant).
- **Visual Workflow Builder**: Convert any task into n8n workflow JSON with automated triggers and actions.
- **LLM Automation Chains**: OpenAI + n8n workflows for intelligent task processing.
- **Real-time Monitoring**: Track workflow executions and results integration.