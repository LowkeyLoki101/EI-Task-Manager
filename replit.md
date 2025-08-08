# Emergent Task Builder

## Overview

This is a conversational AI-powered task management and automation platform that combines voice interaction, intelligent task orchestration, and self-updating capabilities. The system allows users to interact naturally through voice or text to create, manage, and execute tasks, with an AI supervisor that can propose and implement code changes to extend functionality.

The platform features a React frontend with shadcn/ui components, an Express.js backend with in-memory storage, and integrations for voice interaction (ElevenLabs), AI processing (OpenAI GPT), file uploads with Google Cloud Storage, and YouTube video search for task-related tutorials.

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

### Data Models
- **Sessions**: User session management with unique identifiers
- **Tasks**: Hierarchical task structure with status, priority, due dates, and attachments
- **Conversations**: Message history between user and AI with role-based organization
- **Proposals**: Code change requests with diff summaries and preview capabilities
- **Files**: Uploaded file metadata with cloud storage references

## External Dependencies

### Cloud Services
- **Google Cloud Storage**: File upload and storage backend
- **Neon Database**: PostgreSQL database service (configured via Drizzle)
- **OpenAI API**: GPT-4 integration for AI processing and conversations
- **ElevenLabs API**: Voice interaction and synthesis capabilities

### Third-Party APIs
- **YouTube Data API**: Video search functionality for task-related tutorials
- **Bing Search API**: Web search capabilities for information gathering

### Development Tools
- **Replit Integration**: Development environment with hot reload and error reporting
- **Drizzle Kit**: Database migration and schema management tools
- **ESBuild**: Production build optimization for server-side code